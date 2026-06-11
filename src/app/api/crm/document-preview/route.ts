import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function clean(value: unknown) {
  return String(value ?? '').trim()
}

function getStoragePathFromSupabaseUrl(fileUrl?: string | null) {
  const value = String(fileUrl || '').trim()

  if (!value) return null

  try {
    const url = new URL(value)

    const publicMarker = '/storage/v1/object/public/'
    const signedMarker = '/storage/v1/object/sign/'

    const publicIndex = url.pathname.indexOf(publicMarker)

    if (publicIndex !== -1) {
      const rest = decodeURIComponent(
        url.pathname.slice(publicIndex + publicMarker.length),
      )

      const [bucket, ...pathParts] = rest.split('/')

      if (bucket && pathParts.length > 0) {
        return {
          bucket,
          path: pathParts.join('/'),
        }
      }
    }

    const signedIndex = url.pathname.indexOf(signedMarker)

    if (signedIndex !== -1) {
      const rest = decodeURIComponent(
        url.pathname.slice(signedIndex + signedMarker.length),
      )

      const [bucket, ...pathParts] = rest.split('/')

      if (bucket && pathParts.length > 0) {
        return {
          bucket,
          path: pathParts.join('/'),
        }
      }
    }

    return null
  } catch {
    return null
  }
}

function getDocumentStorageInfo(document: {
  file_url?: string | null
  storage_bucket?: string | null
  storage_path?: string | null
}) {
  if (document.storage_bucket && document.storage_path) {
    return {
      bucket: document.storage_bucket,
      path: document.storage_path,
    }
  }

  return getStoragePathFromSupabaseUrl(document.file_url)
}

function getContentType(fileName?: string | null) {
  const cleanName = String(fileName || '').toLowerCase()

  if (cleanName.endsWith('.pdf')) return 'application/pdf'
  if (cleanName.endsWith('.png')) return 'image/png'
  if (cleanName.endsWith('.jpg') || cleanName.endsWith('.jpeg')) return 'image/jpeg'
  if (cleanName.endsWith('.webp')) return 'image/webp'
  if (cleanName.endsWith('.gif')) return 'image/gif'
  if (cleanName.endsWith('.doc')) return 'application/msword'

  if (cleanName.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }

  return 'application/octet-stream'
}

function safeFileName(value?: string | null) {
  const name = String(value || 'document').trim() || 'document'

  return name.replace(/["\r\n]/g, '')
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const documentId = clean(searchParams.get('document_id') || searchParams.get('id'))
    const documentKind = clean(
      searchParams.get('document_kind') ||
        searchParams.get('kind') ||
        'candidate',
    )

    const download = searchParams.get('download') === '1'

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required.' },
        { status: 400 },
      )
    }

    if (!['candidate', 'vacancy'].includes(documentKind)) {
      return NextResponse.json(
        { error: 'Invalid document kind.' },
        { status: 400 },
      )
    }

    const supabase = getServiceClient()

    const table =
      documentKind === 'vacancy' ? 'vacancy_documents' : 'candidate_documents'

    const { data: document, error } = await supabase
      .from(table)
      .select('id, name, file_url, storage_bucket, storage_path')
      .eq('id', documentId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found.' },
        { status: 404 },
      )
    }

    const storageInfo = getDocumentStorageInfo(document)

    if (!storageInfo?.bucket || !storageInfo?.path) {
      return NextResponse.json(
        { error: 'No document file is attached.' },
        { status: 404 },
      )
    }

    const fallbackBuckets =
      documentKind === 'vacancy'
        ? ['vacancy-documents']
        : ['candidate-documents', 'cvs']

    const bucketsToTry = Array.from(
      new Set([storageInfo.bucket, ...fallbackBuckets].filter(Boolean)),
    )

    const storageErrors: string[] = []
    let fileBlob: Blob | null = null
    let usedBucket = storageInfo.bucket

    for (const bucket of bucketsToTry) {
      const { data, error: downloadError } = await supabase.storage
        .from(bucket)
        .download(storageInfo.path)

      if (data) {
        fileBlob = data
        usedBucket = bucket
        break
      }

      if (downloadError?.message) {
        storageErrors.push(`${bucket}: ${downloadError.message}`)
      }
    }

    if (!fileBlob) {
      return NextResponse.json(
        {
          error:
            storageErrors.join(' | ') ||
            'Could not load this document from storage.',
        },
        { status: 404 },
      )
    }

    const fileName = safeFileName(document.name)
    const contentType = getContentType(document.name || storageInfo.path)
    const arrayBuffer = await fileBlob.arrayBuffer()

    return new NextResponse(Buffer.from(arrayBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${fileName}"`,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Document-Bucket': usedBucket,
      },
    })
  } catch (error: any) {
    console.error('CRM document preview error:', error)

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Could not preview this document.',
      },
      { status: 500 },
    )
  }
}