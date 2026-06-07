import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const OLD_BUCKET = 'cvs'
const NEW_BUCKET = 'candidate-documents'
const BATCH_SIZE = 100

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return

  const content = fs.readFileSync(filePath, 'utf8')

  content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .forEach(line => {
      const equalsIndex = line.indexOf('=')
      if (equalsIndex === -1) return

      const key = line.slice(0, equalsIndex).trim()
      let value = line.slice(equalsIndex + 1).trim()

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      if (!process.env[key]) {
        process.env[key] = value
      }
    })
}

loadEnvFile(path.join(process.cwd(), '.env.local'))

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local',
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

const dryRun = process.argv.includes('--dry-run')
const limitArg = process.argv.find(arg => arg.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.split('=')[1]) : null

function safeFileName(name) {
  return String(name || 'document')
    .replace(/[^a-zA-Z0-9.\-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function getOldCvsStoragePath(fileUrl) {
  const value = String(fileUrl || '').trim()
  if (!value) return null

  try {
    const url = new URL(value)

    const publicMarker = '/storage/v1/object/public/cvs/'
    const publicIndex = url.pathname.indexOf(publicMarker)

    if (publicIndex !== -1) {
      return decodeURIComponent(
        url.pathname.slice(publicIndex + publicMarker.length),
      )
    }

    const signedMarker = '/storage/v1/object/sign/cvs/'
    const signedIndex = url.pathname.indexOf(signedMarker)

    if (signedIndex !== -1) {
      return decodeURIComponent(
        url.pathname.slice(signedIndex + signedMarker.length),
      )
    }

    return null
  } catch {
    return null
  }
}

function getTargetPath(document, oldPath) {
  const oldFileName = oldPath.split('/').filter(Boolean).pop()
  const cleanName = safeFileName(oldFileName || document.name || document.id)

  return `${document.candidate_id}/${document.id}-${cleanName}`
}

async function fetchRows() {
  return supabase
    .from('candidate_documents')
    .select('id, candidate_id, name, file_url, storage_bucket, storage_path')
    .is('storage_path', null)
    .ilike('file_url', '%/storage/v1/object/public/cvs/%')
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE)
}

async function migrateDocument(document) {
  const oldPath = getOldCvsStoragePath(document.file_url)

  if (!oldPath) {
    return {
      id: document.id,
      ok: false,
      reason: 'Could not parse old cvs storage path from file_url',
    }
  }

  const targetPath = getTargetPath(document, oldPath)

  if (dryRun) {
    return {
      id: document.id,
      ok: true,
      dryRun: true,
      oldPath,
      targetPath,
    }
  }

  const { data: downloadedFile, error: downloadError } = await supabase.storage
    .from(OLD_BUCKET)
    .download(oldPath)

  if (downloadError || !downloadedFile) {
    return {
      id: document.id,
      ok: false,
      oldPath,
      targetPath,
      reason: downloadError?.message || 'Download failed',
    }
  }

  const arrayBuffer = await downloadedFile.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error: uploadError } = await supabase.storage
    .from(NEW_BUCKET)
    .upload(targetPath, buffer, {
      contentType: downloadedFile.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) {
    const alreadyExists =
      uploadError.message &&
      uploadError.message.toLowerCase().includes('already exists')

    if (!alreadyExists) {
      return {
        id: document.id,
        ok: false,
        oldPath,
        targetPath,
        reason: uploadError.message,
      }
    }
  }

  const { error: updateError } = await supabase
    .from('candidate_documents')
    .update({
      storage_bucket: NEW_BUCKET,
      storage_path: targetPath,
    })
    .eq('id', document.id)

  if (updateError) {
    return {
      id: document.id,
      ok: false,
      oldPath,
      targetPath,
      reason: updateError.message,
    }
  }

  return {
    id: document.id,
    ok: true,
    oldPath,
    targetPath,
  }
}

async function main() {
  console.log(
    dryRun
      ? 'DRY RUN: checking old public cvs documents...'
      : 'LIVE RUN: migrating old public cvs documents...',
  )

    let processed = 0
  let migrated = 0
  let failed = 0
  const failures = []

  while (true) {
    if (limit !== null && processed >= limit) break

    const { data, error } = await fetchRows()

    if (error) {
      console.error('Could not fetch candidate_documents:', error.message)
      process.exit(1)
    }

    const rows = data || []
    if (rows.length === 0) break

    for (const document of rows) {
      if (limit !== null && processed >= limit) break

      processed += 1

      const result = await migrateDocument(document)

      if (result.ok) {
        migrated += 1
        console.log(
          `[OK] ${document.id} ${result.oldPath || ''} → ${result.targetPath || ''}`,
        )
      } else {
        failed += 1
        failures.push(result)
        console.warn(`[FAILED] ${document.id}: ${result.reason}`)
      }
    }
  }

  console.log('')
  console.log('Migration summary')
  console.log('-----------------')
  console.log(`Mode: ${dryRun ? 'dry run' : 'live'}`)
  console.log(`Processed: ${processed}`)
  console.log(`Successful: ${migrated}`)
  console.log(`Failed: ${failed}`)

  if (failures.length > 0) {
    const outputPath = path.join(
      process.cwd(),
      'scripts',
      'migrate-cvs-failures.json',
    )

    fs.writeFileSync(outputPath, JSON.stringify(failures, null, 2))

    console.log('')
    console.log(`Failure log written to: ${outputPath}`)
  }
}

main().catch(error => {
  console.error('Unexpected migration error:', error)
  process.exit(1)
})