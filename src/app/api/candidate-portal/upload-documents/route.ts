import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import PDFDocument from 'pdfkit'

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
  'other',
]

const documentLabels: Record<string, string> = {
  cv: 'CV',
  qualification: 'Certificate / qualification',
  right_to_work: 'Right to work document',
  dbs: 'DBS document',
  reference: 'Reference',
  interview_prep: 'Interview preparation document',
  other: 'Other document',
}

type ReferenceInput = {
  referee_name: string
  referee_job_title: string
  organisation: string
  relationship: string
  email: string
  phone: string
  reference_type: string
  notes: string
}

function safeFileName(name: string) {
  return String(name || 'document')
    .replace(/[^a-zA-Z0-9.\-_]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
}

function cleanText(value: unknown) {
  return String(value ?? '').trim()
}

function parseMetadata(value: FormDataEntryValue | null) {
  if (!value) return {}

  try {
    return JSON.parse(String(value))
  } catch {
    return {}
  }
}

function candidateName(candidate: any) {
  return `${candidate?.first_name ?? ''} ${candidate?.last_name ?? ''}`.trim()
}

function buildDocumentDetails({
  docType,
  metadata,
  uploadLinkId,
}: {
  docType: string
  metadata: any
  uploadLinkId: string
}) {
  const base = {
    source: 'candidate_upload_portal',
    upload_link_id: uploadLinkId,
    submitted_at: new Date().toISOString(),
  }

  if (docType === 'qualification') {
    return {
      ...base,
      certificate_name: cleanText(metadata.certificate_name),
    }
  }

  if (docType === 'right_to_work') {
    return {
      ...base,
      right_to_work_document_type: cleanText(
        metadata.right_to_work_document_type,
      ),
    }
  }

  if (docType === 'dbs') {
    return {
      ...base,
      dbs_on_update_service: metadata.dbs_on_update_service === true,
      dbs_date_of_birth: cleanText(metadata.dbs_date_of_birth),
      dbs_certificate_number: cleanText(metadata.dbs_certificate_number),
      dbs_surname_on_certificate: cleanText(
        metadata.dbs_surname_on_certificate,
      ),
    }
  }

  return base
}

function buildDocumentSummary(docType: string, metadata: any) {
  if (docType === 'qualification' && metadata.certificate_name) {
    return `Certificate / qualification uploaded: ${metadata.certificate_name}`
  }

  if (docType === 'right_to_work' && metadata.right_to_work_document_type) {
    return `Right to work document uploaded: ${metadata.right_to_work_document_type}`
  }

  if (docType === 'dbs') {
    const onUpdateService =
      metadata.dbs_on_update_service === true ? 'Yes' : 'No'

    return `DBS document uploaded. On update service: ${onUpdateService}.`
  }

  return `${documentLabels[docType] || 'Document'} uploaded through candidate portal.`
}

async function uploadDocument({
  supabase,
  candidateId,
  uploadLinkId,
  file,
  docType,
  metadata,
}: {
  supabase: ReturnType<typeof getServiceClient>
  candidateId: string
  uploadLinkId: string
  file: File
  docType: string
  metadata: any
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

  const details = buildDocumentDetails({
    docType,
    metadata,
    uploadLinkId,
  })

  const { data, error: insertError } = await supabase
    .from('candidate_documents')
    .insert({
      candidate_id: candidateId,
      source_upload_link_id: uploadLinkId,
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
      summary: buildDocumentSummary(docType, metadata),
      details,
    })
    .select('id, name, doc_type')
    .single()

  if (insertError) {
    await supabase.storage.from(CANDIDATE_DOCUMENT_BUCKET).remove([filePath])
    throw new Error(insertError.message)
  }

  return data
}

function normaliseReference(value: any): ReferenceInput {
  return {
    referee_name: cleanText(value?.referee_name),
    referee_job_title: cleanText(value?.referee_job_title),
    organisation: cleanText(value?.organisation),
    relationship: cleanText(value?.relationship),
    email: cleanText(value?.email),
    phone: cleanText(value?.phone),
    reference_type: cleanText(value?.reference_type),
    notes: cleanText(value?.notes),
  }
}

function getReferences(metadata: any) {
  const rawReferences = Array.isArray(metadata.references)
    ? metadata.references
    : []

  return rawReferences.slice(0, 2).map(normaliseReference)
}

function validateReferences(references: ReferenceInput[]) {
  if (references.length < 2) {
    return 'Please provide two references.'
  }

  for (let index = 0; index < 2; index += 1) {
    const reference = references[index]
    const label = `Reference ${index + 1}`

    if (!reference.referee_name) {
      return `${label}: please enter the referee name.`
    }

    if (!reference.relationship) {
      return `${label}: please enter the relationship to the candidate.`
    }

    if (
      !reference.email &&
      !reference.phone &&
      !reference.organisation
    ) {
      return `${label}: please add at least an email, phone number or organisation.`
    }
  }

  return null
}

function pdfRow(doc: PDFKit.PDFDocument, label: string, value: string) {
  doc.font('Helvetica-Bold').text(label)
  doc.font('Helvetica').text(value || 'Not provided')
  doc.moveDown(0.7)
}

function createReferencePdfBuffer({
  candidateDisplayName,
  reference,
  referenceNumber,
}: {
  candidateDisplayName: string
  reference: ReferenceInput
  referenceNumber: number
}) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
    })

    const chunks: Buffer[] = []

    doc.on('data', chunk => chunks.push(Buffer.from(chunk)))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.font('Helvetica-Bold').fontSize(20).text('Candidate Reference Details')
    doc.moveDown(0.5)

    doc.font('Helvetica').fontSize(11).text('Educated Appointments CRM')
    doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`)
    doc.moveDown(1.2)

    doc.font('Helvetica-Bold').fontSize(13).text('Candidate')
    doc.moveDown(0.4)
    pdfRow(doc, 'Candidate name', candidateDisplayName || 'Candidate')
    pdfRow(doc, 'Reference number', String(referenceNumber))
    doc.moveDown(0.5)

    doc.font('Helvetica-Bold').fontSize(13).text('Referee details')
    doc.moveDown(0.4)

    doc.fontSize(11)
    pdfRow(doc, 'Referee name', reference.referee_name)
    pdfRow(doc, 'Job title', reference.referee_job_title)
    pdfRow(doc, 'Organisation', reference.organisation)
    pdfRow(doc, 'Relationship to candidate', reference.relationship)
    pdfRow(doc, 'Reference type', reference.reference_type)
    pdfRow(doc, 'Email', reference.email)
    pdfRow(doc, 'Phone', reference.phone)
    pdfRow(doc, 'Notes', reference.notes)

    doc.moveDown(1)
    doc
      .font('Helvetica-Oblique')
      .fontSize(9)
      .text(
        'This document was generated from reference details supplied by the candidate through the Educated Appointments candidate portal.',
      )

    doc.end()
  })
}

async function createReferenceDocument({
  supabase,
  candidateId,
  uploadLinkId,
  candidateDisplayName,
  reference,
  referenceNumber,
}: {
  supabase: ReturnType<typeof getServiceClient>
  candidateId: string
  uploadLinkId: string
  candidateDisplayName: string
  reference: ReferenceInput
  referenceNumber: number
}) {
  const pdfBuffer = await createReferencePdfBuffer({
    candidateDisplayName,
    reference,
    referenceNumber,
  })

  const cleanRefereeName = safeFileName(reference.referee_name || 'reference')
  const fileName = `Reference ${referenceNumber} - ${reference.referee_name || 'Referee'}.pdf`
  const filePath = `${candidateId}/${Date.now()}-reference-${referenceNumber}-${cleanRefereeName}.pdf`

  const { error: uploadError } = await supabase.storage
    .from(CANDIDATE_DOCUMENT_BUCKET)
    .upload(filePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const details = {
    source: 'candidate_upload_portal',
    upload_link_id: uploadLinkId,
    reference_number: referenceNumber,
    submitted_at: new Date().toISOString(),
    ...reference,
  }

  const { data, error: insertError } = await supabase
    .from('candidate_documents')
    .insert({
      candidate_id: candidateId,
      source_upload_link_id: uploadLinkId,
      name: fileName,
      doc_type: 'reference',
      file_url: null,
      storage_bucket: CANDIDATE_DOCUMENT_BUCKET,
      storage_path: filePath,
      show_in_employer_portal: false,
      visible_to_employer: false,
      released: false,
      released_at: null,
      visibility: 'internal',
      summary: `Reference ${referenceNumber} details supplied for ${reference.referee_name}.`,
      details,
    })
    .select('id, name, doc_type')
    .single()

  if (insertError) {
    await supabase.storage.from(CANDIDATE_DOCUMENT_BUCKET).remove([filePath])
    throw new Error(insertError.message)
  }

  return data
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    const formData = await request.formData()

    const token = String(formData.get('token') || '').trim()
    const docType = String(formData.get('doc_type') || '').trim()
    const metadata = parseMetadata(formData.get('metadata'))
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

    const { data: uploadLink, error: linkError } = await supabase
      .from('candidate_upload_links')
      .select(
        'id, candidate_id, requested_document_types, expires_at, revoked_at',
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

    const { data: candidate } = await supabase
      .from('candidates')
      .select('id, first_name, last_name')
      .eq('id', uploadLink.candidate_id)
      .maybeSingle()

    const candidateDisplayName = candidateName(candidate)

    if (docType === 'reference') {
      const references = getReferences(metadata)
      const referenceError = validateReferences(references)

      if (referenceError) {
        return NextResponse.json({ error: referenceError }, { status: 400 })
      }

      const uploadedReferenceDocuments = []

      for (let index = 0; index < 2; index += 1) {
        const uploadedReference = await createReferenceDocument({
          supabase,
          candidateId: uploadLink.candidate_id,
          uploadLinkId: uploadLink.id,
          candidateDisplayName,
          reference: references[index],
          referenceNumber: index + 1,
        })

        uploadedReferenceDocuments.push(uploadedReference)
      }

      await supabase
        .from('candidate_upload_links')
        .update({ used_at: new Date().toISOString() })
        .eq('id', uploadLink.id)

      await supabase.from('candidate_activities').insert({
        candidate_id: uploadLink.candidate_id,
        activity_type: 'note',
        content: [
          'Candidate supplied two reference details through the candidate portal.',
          ...references.map(
  (reference: ReferenceInput, index: number) =>
    `Reference ${index + 1}: ${reference.referee_name} (${reference.relationship || 'relationship not provided'})`,
),
        ].join('\n'),
      })

      return NextResponse.json({
        success: true,
        uploaded: uploadedReferenceDocuments.length,
        documents: uploadedReferenceDocuments,
      })
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

    const uploadedDocuments = []

    for (const file of realFiles) {
      const uploadedDocument = await uploadDocument({
        supabase,
        candidateId: uploadLink.candidate_id,
        uploadLinkId: uploadLink.id,
        file,
        docType,
        metadata,
      })

      uploadedDocuments.push(uploadedDocument)
    }

    await supabase
      .from('candidate_upload_links')
      .update({ used_at: new Date().toISOString() })
      .eq('id', uploadLink.id)

    return NextResponse.json({
      success: true,
      uploaded: uploadedDocuments.length,
      documents: uploadedDocuments,
    })
  } catch (error: any) {
    console.error('Candidate portal upload error:', error)

    return NextResponse.json(
      {
        error:
          error?.message || 'Something went wrong uploading the document.',
      },
      { status: 500 },
    )
  }
}