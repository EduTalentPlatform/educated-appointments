import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CANDIDATE_DOCUMENT_BUCKET = 'candidate-documents'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILES = 10

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const allowedTypes = [
  'cv',
  'qualification',
  'right_to_work',
  'dbs',
  'reference',
  'interview_prep',
  'gdpr_acceptance',
  'other',
]

function safeFileName(name: string) {
  return name
    .replace(/[^a-zA-Z0-9.\-_]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
}

async function uploadDocument({
  supabase,
  candidateId,
  file,
  docType,
}: {
  supabase: ReturnType<typeof getServiceClient>
  candidateId: string
  file: File
  docType: string
}) {
  const cleanName = safeFileName(file.name)
  const filePath = `${candidateId}/${Date.now()}-${docType}-${cleanName}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error: uploadError } = await supabase.storage
    .from(CANDIDATE_DOCUMENT_BUCKET)
    .upload(filePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { error: insertError } = await supabase
    .from('candidate_documents')
    .insert({
      candidate_id: candidateId,
      name: file.name,
      doc_type: docType,
      file_url: null,
      storage_bucket: CANDIDATE_DOCUMENT_BUCKET,
      storage_path: filePath,
      show_in_employer_portal: false,
      visible_to_employer: false,
      released: false,
      released_at: null,
      visibility: 'internal',
    })

  if (insertError) {
    await supabase.storage.from(CANDIDATE_DOCUMENT_BUCKET).remove([filePath])
    throw new Error(insertError.message)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    const formData = await request.formData()

    const token = String(formData.get('token') || '').trim()
    const docType = String(formData.get('doc_type') || '').trim()
    const files = formData.getAll('files') as File[]

    if (!token) {
      return NextResponse.json(
        { error: 'Missing upload token.' },
        { status: 400 },
      )
    }

    if (!allowedTypes.includes(docType)) {
      return NextResponse.json(
        { error: 'Invalid document type.' },
        { status: 400 },
      )
    }

    const realFiles = files.filter(file => file && file.size > 0)

    if (realFiles.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one file.' },
        { status: 400 },
      )
    }

    if (realFiles.length > MAX_FILES) {
      return NextResponse.json(
        { error: `You can upload a maximum of ${MAX_FILES} files at once.` },
        { status: 400 },
      )
    }

    const oversizedFile = realFiles.find(file => file.size > MAX_FILE_SIZE)

    if (oversizedFile) {
      return NextResponse.json(
        {
          error: `${oversizedFile.name} is too large. Maximum file size is 10MB.`,
        },
        { status: 400 },
      )
    }

        const { data: uploadLink, error: linkError } = await supabase
      .from('candidate_upload_links')
      .select(
        'id, candidate_id, requested_document_types, expires_at, revoked_at, used_at',
      )
      .eq('token', token)
      .maybeSingle()

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 400 })
    }

    if (!uploadLink) {
      return NextResponse.json(
        { error: 'Upload link not found.' },
        { status: 404 },
      )
    }

    if (uploadLink.revoked_at) {
      return NextResponse.json(
        { error: 'This upload link has been revoked.' },
        { status: 403 },
      )
    }

    if (new Date(uploadLink.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'This upload link has expired.' },
        { status: 403 },
      )
    }

        const requestedTypes = Array.isArray(uploadLink.requested_document_types)
      ? uploadLink.requested_document_types
          .map((item: unknown) => String(item || '').trim())
          .filter(Boolean)
      : []

    if (requestedTypes.length > 0 && !requestedTypes.includes(docType)) {
      return NextResponse.json(
        {
          error:
            'This upload link is not set up for that document type. Please use one of the requested document types.',
        },
        { status: 403 },
      )
    }

    for (const file of realFiles) {
      await uploadDocument({
        supabase,
        candidateId: uploadLink.candidate_id,
        file,
        docType,
      })
    }

    await supabase
      .from('candidate_upload_links')
      .update({ used_at: new Date().toISOString() })
      .eq('id', uploadLink.id)

    return NextResponse.json({
      success: true,
      uploaded: realFiles.length,
    })
  } catch (error: any) {
    console.error('Candidate portal upload error:', error)

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Something went wrong uploading the document.',
      },
      { status: 500 },
    )
  }
}