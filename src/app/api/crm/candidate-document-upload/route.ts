import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CANDIDATE_DOCUMENT_BUCKET = 'candidate-documents'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const ALLOWED_DOCUMENT_TYPES = new Set([
  'cv',
  'formatted_cv',
  'qualification',
  'certificate',
  'certificates',
  'right_to_work',
  'dbs',
  'reference',
  'interview_prep',
  'gdpr_acceptance',
  'other',
])

const ALLOWED_FILE_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'jpg',
  'jpeg',
  'png',
  'webp',
])

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
])

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function clean(value: unknown) {
  return String(value ?? '').trim()
}

function safeFileName(name: string) {
  return String(name || 'document')
    .replace(/[^a-zA-Z0-9.\-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function normaliseDocType(value: unknown) {
  return String(value || 'other')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
}

function getFileExtension(fileName: string) {
  const parts = String(fileName || '').toLowerCase().split('.')
  return parts.length > 1 ? parts.pop() || '' : ''
}

function isAllowedFile(file: File) {
  const extension = getFileExtension(file.name)
  const mimeType = String(file.type || '').toLowerCase()

  return (
    ALLOWED_FILE_EXTENSIONS.has(extension) ||
    ALLOWED_MIME_TYPES.has(mimeType)
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    const formData = await request.formData()

    const candidateId = clean(formData.get('candidate_id'))
    const name = clean(formData.get('name'))
    const docType = normaliseDocType(formData.get('doc_type'))
    const file = formData.get('file') as File | null

    if (!candidateId) {
      return NextResponse.json(
        { error: 'Candidate ID is required.' },
        { status: 400 },
      )
    }

    if (!file || file.size <= 0) {
      return NextResponse.json(
        { error: 'No file selected.' },
        { status: 400 },
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `${file.name} is too large. Maximum file size is 10MB.` },
        { status: 400 },
      )
    }

    if (!ALLOWED_DOCUMENT_TYPES.has(docType)) {
      return NextResponse.json(
        { error: 'Invalid document type.' },
        { status: 400 },
      )
    }

    if (!isAllowedFile(file)) {
      return NextResponse.json(
        {
          error:
            'Unsupported file type. Please upload PDF, DOC, DOCX, JPG, PNG or WEBP files only.',
        },
        { status: 400 },
      )
    }

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
      return NextResponse.json({ error: uploadError.message }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('candidate_documents')
      .insert({
        candidate_id: candidateId,
        name: name || file.name,
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
      .select()
      .single()

    if (error) {
      await supabase.storage.from(CANDIDATE_DOCUMENT_BUCKET).remove([filePath])

      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Candidate document upload error:', error)

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Something went wrong uploading the candidate document.',
      },
      { status: 500 },
    )
  }
}