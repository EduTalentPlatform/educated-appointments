'use server'

import { createClient } from '@supabase/supabase-js'
import { ActionResult } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT — TABLE NAMES
// Update these to match your Supabase table names if they differ:
const CANDIDATES_TABLE = 'candidates'
const APPLICATIONS_TABLE = 'applications'
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
// ─────────────────────────────────────────────────────────────────────────────

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

export async function submitApplication(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = getServiceClient()

  // ── 1. Pull form values ───────────────────────────────────────────────────
  const firstName = cleanString(formData.get('firstName'))
  const lastName = cleanString(formData.get('lastName'))
  const email = normaliseEmail(formData.get('email'))
  const phone = cleanString(formData.get('phone'))
  const coverNote = cleanString(formData.get('coverNote'))
  const vacancyId = cleanString(formData.get('vacancyId'))
  const cvFile = formData.get('cv') as File | null

  // Basic validation
  if (!firstName || !lastName || !email || !phone || !vacancyId) {
    return { success: false, error: 'Please fill in all required fields.' }
  }

  if (!isValidEmail(email)) {
    return { success: false, error: 'Please enter a valid email address.' }
  }

  try {
    // ── 2. Prepare CV upload for private candidate documents storage ────────
    const hasCvFile = Boolean(cvFile && cvFile.size > 0)

    if (cvFile && cvFile.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `${cvFile.name} is too large. Maximum file size is 10MB.`,
      }
    }

    if (cvFile && cvFile.size > 0 && !isAllowedCvFile(cvFile)) {
      return {
        success: false,
        error: 'Please upload your CV as a PDF, DOC or DOCX file.',
      }
    }

    // ── 3. Upsert candidate ─────────────────────────────────────────────────
    const { data: candidate, error: candidateError } = await supabase
      .from(CANDIDATES_TABLE)
      .upsert(
        {
          first_name: firstName,
          last_name: lastName,
          email: email.toLowerCase().trim(),
          phone,
        },
        {
          onConflict: 'email',
          ignoreDuplicates: false,
        },
      )
      .select('id')
      .single()

    if (candidateError || !candidate) {
      console.error('Candidate upsert error:', candidateError)

      return {
        success: false,
        error: 'Something went wrong. Please try again.',
      }
    }

    // ── 4. Upload CV as private candidate document ──────────────────────────
    if (hasCvFile && cvFile) {
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

    // ── 5. Create application record ────────────────────────────────────────
    const { error: applicationError } = await supabase
      .from(APPLICATIONS_TABLE)
      .insert({
        candidate_id: candidate.id,
        vacancy_id: vacancyId,
        status: 'applied',
        cover_note: coverNote || null,
        cv_url: null,
      })

    if (applicationError) {
      console.error('Application insert error:', applicationError)

      return {
        success: false,
        error: 'Something went wrong. Please try again.',
      }
    }

    return { success: true }
  } catch (err) {
    console.error('Unexpected error:', err)

    return {
      success: false,
      error: 'Something went wrong. Please try again.',
    }
  }
}