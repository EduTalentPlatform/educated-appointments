import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CANDIDATE_DOCUMENT_BUCKET = 'candidate-documents'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_CV_EXTENSIONS = ['pdf', 'doc', 'docx']
const ALLOWED_CV_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

function cleanString(value: unknown) {
  return String(value ?? '').trim()
}

function normaliseEmail(value: unknown) {
  return cleanString(value).toLowerCase()
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function getFileExtension(fileName: string) {
  const parts = String(fileName || '').toLowerCase().split('.')
  return parts.length > 1 ? parts.pop() || '' : ''
}

function isAllowedCvFile(file: File) {
  const extension = getFileExtension(file.name)
  const mimeType = String(file.type || '').toLowerCase()

  return (
    ALLOWED_CV_EXTENSIONS.includes(extension) ||
    ALLOWED_CV_MIME_TYPES.includes(mimeType)
  )
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function safeFileName(name: string) {
  return String(name || 'candidate-cv')
    .replace(/[^a-zA-Z0-9.\-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const firstName = cleanString(formData.get('firstName'))
    const lastName = cleanString(formData.get('lastName'))
    const email = normaliseEmail(formData.get('email'))
    const phone = cleanString(formData.get('phone'))
    const currentRole = cleanString(formData.get('currentRole'))
    const location = cleanString(formData.get('location'))
    const roleType = cleanString(formData.get('roleType'))
    const subjectArea = cleanString(formData.get('subjectArea'))
    const cvFile = formData.get('cv') as File | null

    if (!firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { success: false, error: 'Please fill in all required fields.' },
        { status: 400 },
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 },
      )
    }

    if (cvFile && cvFile.size > 0) {
      if (cvFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error: `${cvFile.name} is too large. Maximum file size is 10MB.`,
          },
          { status: 400 },
        )
      }

      if (!isAllowedCvFile(cvFile)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Please upload a CV as a PDF, DOC or DOCX file.',
          },
          { status: 400 },
        )
      }
    }

    const supabase = getServiceClient()

    // ── 1. Upsert candidate record ────────────────────────────────────────
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .upsert(
        {
          first_name:           firstName,
          last_name:            lastName,
          email:                email.toLowerCase().trim(),
          phone,
          job_title:            currentRole || null,
          preferred_location:   location || null,
          seeking_role_type:    roleType || null,
          seeking_subject:      subjectArea || null,
          cv_url:               null,
          source:               'registration',
        },
        { onConflict: 'email', ignoreDuplicates: false }
      )
      .select('id')
      .single()

        if (candidateError || !candidate) {
      console.error('Candidate upsert error:', candidateError)
      return NextResponse.json(
        { success: false, error: 'Something went wrong. Please try again.' },
        { status: 500 }
      )
    }

    // ── 2. Upload CV to private candidate documents storage ───────────────
    if (cvFile && cvFile.size > 0) {
      const cleanName = safeFileName(cvFile.name)
      const filePath = `${candidate.id}/${Date.now()}-cv-${cleanName}`

      const arrayBuffer = await cvFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const { error: uploadError } = await supabase.storage
        .from(CANDIDATE_DOCUMENT_BUCKET)
        .upload(filePath, buffer, {
          contentType: cvFile.type || 'application/octet-stream',
          upsert: false,
        })

      if (uploadError) {
        console.error('CV upload error:', uploadError)
      } else {
        const { error: documentError } = await supabase
          .from('candidate_documents')
          .insert({
            candidate_id: candidate.id,
            name: 'CV',
            doc_type: 'cv',
            file_url: null,
            storage_bucket: CANDIDATE_DOCUMENT_BUCKET,
            storage_path: filePath,
            visibility: 'internal',
            visible_to_employer: false,
            show_in_employer_portal: false,
            released: false,
            released_at: null,
          })

        if (documentError) {
          console.error('Candidate document insert error:', documentError)

          await supabase.storage
            .from(CANDIDATE_DOCUMENT_BUCKET)
            .remove([filePath])
        }
      }
    }

    // ── 3. Email notification to EA ───────────────────────────────────────
    // Future note: if email notifications are re-enabled, do not include a public CV link.
    // The CV is now stored securely in candidate_documents.

    return NextResponse.json({ success: true, candidateId: candidate?.id })
  } catch (err) {
    console.error('Registration error:', err)
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}