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

type RoleEmailContext = {
  applicationId: string | null
  roleTitle: string
  employerName: string
  location: string
  salary: string
  employerWebsite: string
  employerWebsiteUrl: string
  jobDescription: string
}

type RequestMode = 'initial' | 'interview_chase'

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')
}

function clean(value: unknown) {
  return String(value ?? '').trim()
}

function candidateName(candidate: any) {
  return `${candidate.first_name ?? ''} ${candidate.last_name ?? ''}`.trim()
}

function firstNonBlank(...values: unknown[]) {
  return values.map(clean).find(Boolean) || ''
}

function relationOne(value: any) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function normaliseWebsiteUrl(value: unknown) {
  const website = clean(value)

  if (!website) return ''
  if (/^https?:\/\//i.test(website)) return website

  return `https://${website}`
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function multilineHtml(value: unknown) {
  return escapeHtml(value).replace(/\n/g, '<br />')
}

function buildRoleEmailContext(application: any): RoleEmailContext | null {
  if (!application) return null

  const vacancy = relationOne(application.vacancies)
  const client = relationOne(vacancy?.clients)

  if (!vacancy) return null

  const employerWebsite = clean(client?.website)
  const jobDescription = firstNonBlank(
    vacancy?.employer_job_description,
    vacancy?.description,
    vacancy?.anonymous_description,
    vacancy?.briefing_notes,
  )

  return {
    applicationId: clean(application.id) || null,
    roleTitle: firstNonBlank(vacancy?.title, 'Opportunity'),
    employerName: clean(client?.company_name),
    location: firstNonBlank(vacancy?.location, vacancy?.region),
    salary: clean(vacancy?.salary_display),
    employerWebsite,
    employerWebsiteUrl: normaliseWebsiteUrl(employerWebsite),
    jobDescription,
  }
}

function buildCandidatePortalEmail({
  firstName,
  uploadUrl,
  requestedDocumentTypes,
  message,
  roleContext,
  requestMode,
}: {
  firstName: string
  uploadUrl: string
  requestedDocumentTypes: string[]
  message: string | null
  roleContext?: RoleEmailContext | null
  requestMode: RequestMode
}) {
  const requestedLabels = requestedDocumentTypes
    .map(type => documentLabels[type] || type)
    .filter(Boolean)

  const isInterviewChase = requestMode === 'interview_chase'

const subject = isInterviewChase
  ? 'Reminder: documents required ahead of your client interview'
  : roleContext?.roleTitle
    ? `Educated Appointments - ${roleContext.roleTitle} information & secure candidate portal`
    : 'Educated Appointments - Secure Document Upload & Privacy Confirmation'

  const introText = isInterviewChase
  ? [
      'Just a quick reminder to upload the outstanding documents requested below.',
      'As you are now booked in for interview with our client, we need to make sure everything is ready ahead of the next stage.',
      '',
    ]
  : roleContext
    ? [
        'Further to our conversation, please find the details for the opportunity we discussed below.',
        '',
      ]
    : []

  const portalActionText = isInterviewChase
  ? [
      'Please use the secure link below to upload the outstanding documents:',
      '',
      'UPLOAD YOUR DOCUMENTS HERE:',
      uploadUrl,
      '',
      'This helps us make sure your file is complete ahead of your client interview.',
      '',
    ]
  : [
      'Please complete your candidate portal using the secure link below:',
      '',
      'IMPORTANT - COMPLETE YOUR CANDIDATE PORTAL HERE:',
      uploadUrl,
      '',
      'This allows us to keep your application details, documents and compliance information in one secure place.',
      '',
    ]

  const roleText: string[] = []

  if (roleContext) {
    roleText.push(`Role: ${roleContext.roleTitle || 'Not specified'}`)

    if (roleContext.employerName) {
      roleText.push(`Employer: ${roleContext.employerName}`)
    }

    if (roleContext.location) {
      roleText.push(`Location: ${roleContext.location}`)
    }

    if (roleContext.salary) {
      roleText.push(`Salary: ${roleContext.salary}`)
    }

    if (roleContext.employerWebsite) {
      roleText.push(
        `Employer website: ${roleContext.employerWebsiteUrl || roleContext.employerWebsite}`,
      )
    }

    roleText.push(
      '',
      'Role information:',
      '',
      roleContext.jobDescription || 'Role information to follow.',
      '',
    )
  }

  const text = [
    `Hi ${firstName || 'there'},`,
    '',
    ...introText,
    ...portalActionText,
    ...roleText,
    ...(requestedLabels.length > 0 ? ['', 'Requested documents:'] : []),
    ...requestedLabels.map(label => `- ${label}`),
    requestedLabels.length > 0 ? '' : '',
    message || '',
    '',
    'The portal will also ask you to review and accept our Candidate Privacy Notice if this has not already been completed.',
    '',
    'Documents uploaded through this link go directly into the Educated Appointments CRM and are not automatically released to employers.',
    '',
    'If you have any questions, please contact us at joseph@educatedappointments.co.uk.',
    '',
    'Kind regards,',
    'Joe',
    'Educated Appointments',
  ]
    .filter(line => line !== null)
    .join('\n')

  const requestedHtml =
    requestedLabels.length > 0
      ? `
        <div style="margin:22px 0 0 0;">
          <p style="margin:0 0 8px 0;"><strong>Requested documents:</strong></p>
          <ul style="margin:0 0 18px 20px;padding:0;">
            ${requestedLabels
              .map(label => `<li>${escapeHtml(label)}</li>`)
              .join('')}
          </ul>
        </div>
      `
      : ''

  const messageHtml = message
    ? `<p style="margin:18px 0;">${escapeHtml(message).replace(/\n/g, '<br />')}</p>`
    : ''

  const portalCtaHtml = `
    <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;padding:18px;margin:18px 0 22px 0;">
      <p style="margin:0 0 8px 0;font-size:16px;">
        <strong>${isInterviewChase ? 'Reminder: documents required ahead of your client interview' : 'Action required: please complete your candidate portal'}</strong>
      </p>

      <p style="margin:0 0 14px 0;">
        ${isInterviewChase
  ? 'Please use the secure link below to upload the outstanding documents so we can make sure everything is ready ahead of your client interview.'
  : 'Please use the secure link below so we can progress your application and keep your documents, key details and compliance information in one place.'}
      </p>

      <p style="margin:0 0 12px 0;">
        <a href="${escapeHtml(uploadUrl)}" style="display:inline-block;background:#352DEB;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:700;">
          ${isInterviewChase ? 'Upload outstanding documents' : 'Complete candidate portal'}
        </a>
      </p>

      <p style="margin:0;word-break:break-all;">
        <strong>
          <a href="${escapeHtml(uploadUrl)}" style="color:#111827;text-decoration:underline;">
            ${escapeHtml(uploadUrl)}
          </a>
        </strong>
      </p>
    </div>
  `

  const roleHtml = roleContext
    ? `
      <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:22px 0;">
        <p style="margin:0 0 10px 0;"><strong>Role:</strong> ${escapeHtml(roleContext.roleTitle || 'Not specified')}</p>
        ${
          roleContext.employerName
            ? `<p style="margin:0 0 10px 0;"><strong>Employer:</strong> ${escapeHtml(roleContext.employerName)}</p>`
            : ''
        }
        ${
          roleContext.location
            ? `<p style="margin:0 0 10px 0;"><strong>Location:</strong> ${escapeHtml(roleContext.location)}</p>`
            : ''
        }
        ${
          roleContext.salary
            ? `<p style="margin:0 0 10px 0;"><strong>Salary:</strong> ${escapeHtml(roleContext.salary)}</p>`
            : ''
        }
        ${
          roleContext.employerWebsite
            ? `<p style="margin:0 0 10px 0;"><strong>Employer website:</strong> <a href="${escapeHtml(roleContext.employerWebsiteUrl)}">${escapeHtml(roleContext.employerWebsite)}</a></p>`
            : ''
        }

        <p style="margin:16px 0 8px 0;"><strong>Role information:</strong></p>
        <div style="white-space:normal;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;">
          ${multilineHtml(roleContext.jobDescription || 'Role information to follow.')}
        </div>
      </div>
    `
    : ''

  const introHtml = isInterviewChase
  ? `<p style="margin:0 0 16px 0;">Just a quick reminder to upload the outstanding documents requested below. As you are now booked in for interview with our client, we need to make sure everything is ready ahead of the next stage.</p>`
  : roleContext
    ? `<p style="margin:0 0 16px 0;">Further to our conversation, please find the details for the opportunity we discussed below.</p>`
    : `<p style="margin:0 0 16px 0;">Please complete your secure candidate portal using the link below.</p>`

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#111827;">
      <p>Hi ${escapeHtml(firstName || 'there')},</p>

      ${introHtml}

      ${portalCtaHtml}

      ${roleHtml}

      ${requestedHtml}

      ${messageHtml}

      <p>The portal will also ask you to review and accept our Candidate Privacy Notice if this has not already been completed.</p>

      <p>Documents uploaded through this link go directly into the Educated Appointments CRM and are not automatically released to employers.</p>

      <p>If you have any questions, please contact us at joseph@educatedappointments.co.uk.</p>

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

    const candidateId = clean(body.candidate_id)
const applicationId = clean(body.application_id || body.applicationId)
const message = clean(body.message) || null
const previewOnly = body.preview_only === true || body.previewOnly === true
const requestMode: RequestMode =
  body.request_mode === 'interview_chase' || body.requestMode === 'interview_chase'
    ? 'interview_chase'
    : 'initial'

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

    let roleContext: RoleEmailContext | null = null

    if (applicationId) {
      const { data: application, error: applicationError } = await supabase
        .from('applications')
        .select(`
          id,
          candidate_id,
          vacancy_id,
          candidates (
            id,
            first_name,
            last_name,
            email
          ),
          vacancies (
            id,
            title,
            location,
            region,
            salary_display,
            description,
            employer_job_description,
            anonymous_description,
            briefing_notes,
            clients (
              id,
              company_name,
              website
            )
          )
        `)
        .eq('id', applicationId)
        .maybeSingle()

      if (applicationError) {
        return NextResponse.json(
          { error: applicationError.message },
          { status: 400 },
        )
      }

      if (!application) {
        return NextResponse.json(
          { error: 'Application not found.' },
          { status: 404 },
        )
      }

      const applicationCandidate = relationOne((application as any).candidates)
      const applicationCandidateId = clean(
        (application as any).candidate_id || applicationCandidate?.id,
      )

      if (applicationCandidateId && applicationCandidateId !== candidateId) {
        return NextResponse.json(
          {
            error:
              'This application is not linked to the selected candidate.',
          },
          { status: 400 },
        )
      }

      roleContext = buildRoleEmailContext(application)
    }

        if (previewOnly) {
      const previewUploadUrl = `${getSiteUrl()}/candidate-portal/upload/[secure-link-created-when-sent]`

      const firstName = candidate.first_name || 'there'
      const emailPreview = buildCandidatePortalEmail({
  firstName,
  uploadUrl: previewUploadUrl,
  requestedDocumentTypes,
  message,
  roleContext,
  requestMode,
})

      return NextResponse.json({
        preview: true,
        emailPreview,
        roleContext,
        candidate,
      })
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
  roleContext,
  requestMode,
})

    const emailResult = await sendEmail({
  to: candidate.email,
  subject: email.subject,
  html: email.html,
  text: email.text,
  replyTo: 'joseph@educatedappointments.co.uk',
})

const resendEmailId = emailResult?.id || emailResult?.data?.id || null

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
        requestMode === 'interview_chase'
  ? 'Candidate document chase sent ahead of client interview.'
  : roleContext
    ? 'Role-specific candidate portal link sent.'
    : 'Candidate portal link sent.',
        `Email: ${candidate.email}`,
        roleContext?.roleTitle ? `Role: ${roleContext.roleTitle}` : null,
        roleContext?.employerName ? `Employer: ${roleContext.employerName}` : null,
        roleContext?.employerWebsite
          ? `Employer website: ${roleContext.employerWebsiteUrl || roleContext.employerWebsite}`
          : null,
        applicationId ? `Application ID: ${applicationId}` : null,
        `Portal link: ${uploadUrl}`,
        requestedDocumentTypes.length > 0
          ? `Requested documents: ${requestedDocumentTypes
              .map((type: string) => documentLabels[type] || type)
              .join(', ')}`
          : 'Requested documents: Any relevant documents',
      ]
        .filter(Boolean)
        .join('\n'),
    })

    if (resendEmailId) {
  await supabase.from('crm_email_tracking').insert({
    resend_email_id: resendEmailId,
    candidate_id: candidate.id,
    related_application_id: applicationId || null,
    related_upload_link_id: uploadLink.id,
    to_email: candidate.email,
    subject: email.subject,
    email_type:
  requestMode === 'interview_chase'
    ? 'candidate_document_interview_chase'
    : roleContext
      ? 'role_candidate_portal_upload_link'
      : 'candidate_portal_upload_link',
    status: 'sent',
    sent_at: sentAt,
    last_event: 'sent',
    last_event_at: sentAt,
  })
}

    return NextResponse.json({
      uploadLink: updatedUploadLink || uploadLink,
      uploadUrl,
      candidate,
      sent: true,
      roleContext,
      message:
  requestMode === 'interview_chase'
    ? `Candidate document chase sent to ${candidate.email}.`
    : roleContext
      ? `Role-specific candidate portal email sent to ${candidate.email}.`
      : `Candidate portal link sent to ${candidate.email}.`,
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