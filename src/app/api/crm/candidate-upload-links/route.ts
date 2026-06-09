import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/sendEmail'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const allowedDocumentTypes = [
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

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')
}

function candidateName(candidate: any) {
  return `${candidate.first_name ?? ''} ${candidate.last_name ?? ''}`.trim()
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function buildCandidatePortalEmail({
  firstName,
  uploadUrl,
  requestedDocumentTypes,
  message,
}: {
  firstName: string
  uploadUrl: string
  requestedDocumentTypes: string[]
  message: string | null
}) {
  const requestedLabels = requestedDocumentTypes
    .map(type => documentLabels[type] || type)
    .filter(Boolean)

  const subject =
    'Educated Appointments - Secure Document Upload & Privacy Confirmation'

  const text = [
    `Hi ${firstName || 'there'},`,
    '',
    'Please use the secure link below to upload the documents we need for your recruitment file:',
    '',
    uploadUrl,
    '',
    requestedLabels.length > 0 ? 'Requested documents:' : '',
    ...requestedLabels.map(label => `- ${label}`),
    requestedLabels.length > 0 ? '' : '',
    message || '',
    '',
    'The portal will also ask you to review and accept our Candidate Privacy Notice if this has not already been completed.',
    '',
    'Documents uploaded through this link go directly into the Educated Appointments CRM and are not automatically released to employers.',
    '',
    'If you have any questions, please contact us at info@educatedappointments.co.uk.',
    '',
    'Kind regards,',
    'Joe',
    'Educated Appointments',
  ]
    .filter(line => line !== null)
    .join('\n')

  const requestedHtml =
    requestedLabels.length > 0
      ? `<p><strong>Requested documents:</strong></p><ul>${requestedLabels
          .map(label => `<li>${escapeHtml(label)}</li>`)
          .join('')}</ul>`
      : ''

  const messageHtml = message
    ? `<p>${escapeHtml(message).replace(/\n/g, '<br />')}</p>`
    : ''

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#111827;">
      <p>Hi ${escapeHtml(firstName || 'there')},</p>

      <p>Please use the secure link below to upload the documents we need for your recruitment file:</p>

      <p>
        <a href="${escapeHtml(uploadUrl)}" style="display:inline-block;background:#352DEB;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:700;">
          Open secure candidate portal
        </a>
      </p>

      <p style="word-break:break-all;">
        <a href="${escapeHtml(uploadUrl)}">${escapeHtml(uploadUrl)}</a>
      </p>

      ${requestedHtml}

      ${messageHtml}

      <p>The portal will also ask you to review and accept our Candidate Privacy Notice if this has not already been completed.</p>

      <p>Documents uploaded through this link go directly into the Educated Appointments CRM and are not automatically released to employers.</p>

      <p>If you have any questions, please contact us at info@educatedappointments.co.uk.</p>

      <p>
        Kind regards,<br />
        Joe<br />
        Educated Appointments
      </p>
    </div>
  `

  return { subject, text, html }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    const candidateId = String(body.candidate_id || '').trim()
    const message = String(body.message || '').trim() || null

    const requestedDocumentTypes: string[] = Array.isArray(
  body.requested_document_types,
)
  ? body.requested_document_types
      .map((item: unknown) => String(item || '').trim())
      .filter((item: string) => allowedDocumentTypes.includes(item))
  : []

    if (!candidateId) {
      return NextResponse.json(
        { error: 'Missing candidate id.' },
        { status: 400 },
      )
    }

    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('id, first_name, last_name, email')
      .eq('id', candidateId)
      .maybeSingle()

    if (candidateError) {
      return NextResponse.json(
        { error: candidateError.message },
        { status: 400 },
      )
    }

    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate not found.' },
        { status: 404 },
      )
    }

    if (!candidate.email) {
      return NextResponse.json(
        {
          error:
            'Candidate must have an email address before sending a portal link.',
        },
        { status: 400 },
      )
    }

    const { data: uploadLink, error } = await supabase
      .from('candidate_upload_links')
      .insert({
        candidate_id: candidateId,
        requested_document_types: requestedDocumentTypes,
        message,
        sent_to_email: candidate.email,
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const uploadUrl = `${getSiteUrl()}/candidate-portal/upload/${uploadLink.token}`

    const firstName = candidate.first_name || 'there'
    const email = buildCandidatePortalEmail({
      firstName,
      uploadUrl,
      requestedDocumentTypes,
      message,
    })

    await sendEmail({
      to: candidate.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: 'info@educatedappointments.co.uk',
    })

    const sentAt = new Date().toISOString()

    const { data: updatedUploadLink } = await supabase
      .from('candidate_upload_links')
      .update({
        sent_at: sentAt,
        sent_to_email: candidate.email,
      })
      .eq('id', uploadLink.id)
      .select('*')
      .maybeSingle()

    await supabase.from('candidate_activities').insert({
      candidate_id: candidate.id,
      activity_type: 'email',
      content: [
        'Candidate portal link sent.',
        `Email: ${candidate.email}`,
        `Portal link: ${uploadUrl}`,
        requestedDocumentTypes.length > 0
          ? `Requested documents: ${requestedDocumentTypes
              .map((type: string) => documentLabels[type] || type)
              .join(', ')}`
          : 'Requested documents: Any relevant documents',
      ].join('\n'),
    })

    return NextResponse.json({
      uploadLink: updatedUploadLink || uploadLink,
      uploadUrl,
      candidate,
      sent: true,
      message: `Candidate portal link sent to ${candidate.email}.`,
    })
  } catch (error: any) {
    console.error('Create candidate upload link error:', error)

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Something went wrong creating or sending the upload link.',
      },
      { status: 500 },
    )
  }
}