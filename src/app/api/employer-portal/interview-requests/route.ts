import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/sendEmail'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function clean(value: unknown) {
  return String(value || '').trim()
}

function normaliseRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function labelInterviewFormat(value?: string | null) {
  if (!value) return 'Not specified'

  const labels: Record<string, string> = {
    face_to_face: 'Face to face',
    video: 'Video call',
    telephone: 'Telephone',
    flexible: 'Flexible',
  }

  return labels[value] || value.replace(/_/g, ' ')
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

async function requirePortalUser() {
  const authSupabase = await createServerClient()
  const {
    data: { user },
  } = await authSupabase.auth.getUser()

  if (!user) return null

  const supabase = getServiceClient()

  const { data: portalUser } = await supabase
    .from('client_portal_users')
    .select('*')
    .eq('auth_user_id', user.id)
    .eq('active', true)
    .maybeSingle()

  return portalUser
}

export async function POST(request: Request) {
  const portalUser = await requirePortalUser()

  if (!portalUser) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = await request.json()

  const vacancyId = clean(body.vacancy_id)
  const applicationId = clean(body.application_id)
  const availabilityNotes = clean(body.availability_notes)
  const interviewFormat = clean(body.interview_format) || null
  const interviewLocation = clean(body.interview_location) || null
  const employerMessage = clean(body.employer_message) || null

  if (!vacancyId || !applicationId) {
    return NextResponse.json(
      { error: 'Vacancy and application are required.' },
      { status: 400 },
    )
  }

  if (!availabilityNotes) {
    return NextResponse.json(
      { error: 'Please suggest interview availability.' },
      { status: 400 },
    )
  }

  const supabase = getServiceClient()

  const { data: access } = await supabase
    .from('portal_vacancy_access')
    .select('*')
    .eq('portal_user_id', portalUser.id)
    .eq('vacancy_id', vacancyId)
    .eq('can_view_vacancy', true)
    .eq('can_view_submissions', true)
    .maybeSingle()

  if (!access) {
    return NextResponse.json(
      { error: 'You do not have access to this vacancy.' },
      { status: 403 },
    )
  }

  const { data: application } = await supabase
    .from('applications')
    .select(`
      id,
      vacancy_id,
      candidate_id,
      candidates (
        id,
        first_name,
        last_name,
        email,
        phone,
        job_title
      ),
      vacancies (
        id,
        title,
        location,
        region,
        clients (
          id,
          company_name,
          contact_name,
          email
        )
      )
    `)
    .eq('id', applicationId)
    .eq('vacancy_id', vacancyId)
    .maybeSingle()

  if (!application) {
    return NextResponse.json(
      { error: 'Application not found.' },
      { status: 404 },
    )
  }

  const candidate = normaliseRelation((application as any).candidates)
  const vacancy = normaliseRelation((application as any).vacancies)
  const client = normaliseRelation((vacancy as any)?.clients)

  const candidateName =
    `${candidate?.first_name ?? ''} ${candidate?.last_name ?? ''}`.trim() ||
    'Candidate'

  const vacancyTitle = vacancy?.title || 'Vacancy'
  const clientName = client?.company_name || 'Employer'

  const { data, error } = await supabase
    .from('employer_interview_requests')
    .insert({
      client_id: portalUser.client_id,
      vacancy_id: vacancyId,
      application_id: applicationId,
      candidate_id: (application as any).candidate_id,
      portal_user_id: portalUser.id,
      availability_notes: availabilityNotes,
      interview_format: interviewFormat,
      interview_location: interviewLocation,
      employer_message: employerMessage,
      status: 'requested',
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'

  const crmApplicationUrl = `${siteUrl}/crm/applications/${applicationId}`

  const toEmail =
    process.env.INTERVIEW_REQUEST_TO_EMAIL ||
    'educatedappointments@gmail.com'

  const subject = `Interview request — ${candidateName} for ${vacancyTitle}`

  const text = [
    `Interview request received`,
    ``,
    `Employer: ${clientName}`,
    `Requested by: ${portalUser.name} <${portalUser.email}>`,
    `Candidate: ${candidateName}`,
    `Candidate email: ${candidate?.email || 'Not recorded'}`,
    `Candidate phone: ${candidate?.phone || 'Not recorded'}`,
    `Vacancy: ${vacancyTitle}`,
    `Interview format: ${labelInterviewFormat(interviewFormat)}`,
    `Location / link / instructions: ${interviewLocation || 'Not specified'}`,
    ``,
    `Suggested availability:`,
    availabilityNotes,
    ``,
    `Employer message:`,
    employerMessage || 'None',
    ``,
    `Open CRM application: ${crmApplicationUrl}`,
  ].join('\n')

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #1a1a2e;">
      <div style="background:#352DEB; color:#fff; padding:22px; border-radius:16px 16px 0 0;">
        <p style="margin:0; font-size:12px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#5DDBDB;">
          Educated Appointments
        </p>
        <h1 style="margin:8px 0 0; font-size:24px; line-height:1.2;">
          Interview request received
        </h1>
      </div>

      <div style="border:1px solid #e4e4e7; border-top:0; padding:22px; border-radius:0 0 16px 16px;">
        <h2 style="margin:0 0 16px; font-size:18px;">${escapeHtml(candidateName)}</h2>

        <table style="width:100%; border-collapse:collapse; font-size:14px;">
          <tr>
            <td style="padding:8px 0; color:#737373; width:180px;">Employer</td>
            <td style="padding:8px 0; font-weight:700;">${escapeHtml(clientName)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0; color:#737373;">Requested by</td>
            <td style="padding:8px 0; font-weight:700;">${escapeHtml(portalUser.name)} &lt;${escapeHtml(portalUser.email)}&gt;</td>
          </tr>
          <tr>
            <td style="padding:8px 0; color:#737373;">Vacancy</td>
            <td style="padding:8px 0; font-weight:700;">${escapeHtml(vacancyTitle)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0; color:#737373;">Candidate email</td>
            <td style="padding:8px 0;">${escapeHtml(candidate?.email || 'Not recorded')}</td>
          </tr>
          <tr>
            <td style="padding:8px 0; color:#737373;">Candidate phone</td>
            <td style="padding:8px 0;">${escapeHtml(candidate?.phone || 'Not recorded')}</td>
          </tr>
          <tr>
            <td style="padding:8px 0; color:#737373;">Interview format</td>
            <td style="padding:8px 0; font-weight:700;">${escapeHtml(labelInterviewFormat(interviewFormat))}</td>
          </tr>
          <tr>
            <td style="padding:8px 0; color:#737373;">Location / link</td>
            <td style="padding:8px 0;">${escapeHtml(interviewLocation || 'Not specified')}</td>
          </tr>
        </table>

        <div style="margin-top:18px; padding:16px; background:#f5f5f7; border-radius:12px;">
          <p style="margin:0 0 6px; font-size:12px; color:#352DEB; font-weight:800; text-transform:uppercase; letter-spacing:0.8px;">
            Suggested availability
          </p>
          <p style="margin:0; white-space:pre-wrap; line-height:1.6;">${escapeHtml(availabilityNotes)}</p>
        </div>

        ${
          employerMessage
            ? `
              <div style="margin-top:12px; padding:16px; background:#fff0ee; border-radius:12px;">
                <p style="margin:0 0 6px; font-size:12px; color:#cc4a35; font-weight:800; text-transform:uppercase; letter-spacing:0.8px;">
                  Employer message
                </p>
                <p style="margin:0; white-space:pre-wrap; line-height:1.6;">${escapeHtml(employerMessage)}</p>
              </div>
            `
            : ''
        }

        <a
          href="${crmApplicationUrl}"
          style="display:inline-block; margin-top:20px; background:#5DDBDB; color:#1a1a2e; text-decoration:none; font-weight:800; padding:12px 16px; border-radius:10px;"
        >
          Open CRM application →
        </a>
      </div>
    </div>
  `

  try {
    await sendEmail({
      to: toEmail,
      subject,
      html,
      text,
      replyTo: portalUser.email,
    })
  } catch (emailError) {
    console.error('Interview request email error:', emailError)

    return NextResponse.json(
      {
        request: data,
        warning:
          'Interview request saved, but the email notification could not be sent.',
      },
      { status: 202 },
    )
  }

  return NextResponse.json({ request: data })
}