import { NextResponse } from 'next/server'
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

function clean(value: unknown) {
  return String(value ?? '').trim()
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function textToHtml(text: string) {
  return `
    <div style="font-family: Arial, sans-serif; color: #17172f; line-height: 1.6; font-size: 14px;">
      ${escapeHtml(text)
        .split('\n\n')
        .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br />')}</p>`)
        .join('')}
    </div>
  `
}

function uniqueEmails(rows: Array<{ email?: string | null; name?: string | null }>) {
  const seen = new Set<string>()

  return rows
    .map(row => ({
      email: clean(row.email).toLowerCase(),
      name: clean(row.name),
    }))
    .filter(row => row.email)
    .filter(row => {
      if (seen.has(row.email)) return false
      seen.add(row.email)
      return true
    })
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)

    const applicationId = clean(body?.application_id || body?.applicationId)
    const employerProfileNotes = clean(body?.employer_profile_notes)

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required.' },
        { status: 400 },
      )
    }

    const supabase = getServiceClient()
    const submittedAt = new Date().toISOString()

    const { data: application, error: appError } = await supabase
      .from('applications')
      .update({
        status: 'submitted',
        profile_sent_at: submittedAt,
        employer_profile_notes: employerProfileNotes || null,
      })
      .eq('id', applicationId)
      .select('id, candidate_id, vacancy_id, status, employer_profile_notes, profile_sent_at')
      .single()

    if (appError || !application) {
      return NextResponse.json(
        { error: appError?.message || 'Application not found.' },
        { status: 400 },
      )
    }

    const [{ data: candidate }, { data: vacancy }] = await Promise.all([
      supabase
        .from('candidates')
        .select('id, first_name, last_name, email')
        .eq('id', application.candidate_id)
        .single(),

      supabase
        .from('vacancies')
        .select('id, title, client_id')
        .eq('id', application.vacancy_id)
        .single(),
    ])

    if (!vacancy?.client_id) {
      return NextResponse.json({
        data: application,
        notified: 0,
        warning: 'Application submitted, but no linked client was found for email notification.',
      })
    }

    const { data: client } = await supabase
      .from('clients')
      .select('id, company_name, contact_name, email')
      .eq('id', vacancy.client_id)
      .single()

    const { data: accessRows } = await supabase
      .from('portal_vacancy_access')
      .select('portal_user_id')
      .eq('vacancy_id', vacancy.id)
      .eq('can_view_vacancy', true)

    const accessUserIds = Array.from(
      new Set((accessRows || []).map(row => row.portal_user_id).filter(Boolean)),
    )

    let portalUsersQuery = supabase
      .from('client_portal_users')
      .select('id, name, email')
      .eq('client_id', vacancy.client_id)
      .eq('active', true)

    if (accessUserIds.length > 0) {
      portalUsersQuery = portalUsersQuery.in('id', accessUserIds)
    }

    const { data: portalUsers } = await portalUsersQuery

    const fallbackRows =
      portalUsers && portalUsers.length > 0
        ? portalUsers
        : client?.email
          ? [{ name: client.contact_name, email: client.email }]
          : []

    const recipients = uniqueEmails(fallbackRows)

    const candidateName =
      `${candidate?.first_name || ''} ${candidate?.last_name || ''}`.trim() ||
      'a candidate'

    const companyName = client?.company_name || 'your organisation'
    const portalBaseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      'https://www.educatedappointments.co.uk'

    const portalLink = `${portalBaseUrl.replace(/\/$/, '')}/employer-portal/vacancies/${vacancy.id}`

    const subject = `New candidate submitted - ${vacancy.title || 'Vacancy'}`

    const text = `Hi,

A new candidate has been submitted to your Educated Appointments employer portal for ${vacancy.title || 'your vacancy'}.

Candidate: ${candidateName}
Employer: ${companyName}

You can review the candidate by signing in to the employer portal here:

${portalLink}

Once logged in, you will be able to view the candidate profile, CV and any supporting document visibility available for this submission.

Kind regards,

Joe
Educated Appointments`

    const sendResults = []

    for (const recipient of recipients) {
      try {
        const result = await sendEmail({
          to: recipient.email,
          subject,
          text,
          html: textToHtml(text),
          replyTo: process.env.CRM_REPLY_TO_EMAIL || 'joseph@educatedappointments.co.uk',
        })

        sendResults.push({
          email: recipient.email,
          success: true,
          result,
        })
      } catch (error: any) {
        console.error('Could not send employer portal submission email:', error)

        sendResults.push({
          email: recipient.email,
          success: false,
          error: error?.message || 'Could not send email.',
        })
      }
    }

    await supabase.from('candidate_activities').insert({
      candidate_id: application.candidate_id,
      activity_type: 'email',
      content: [
        'Candidate submitted to employer portal.',
        vacancy?.title ? `Vacancy: ${vacancy.title}` : '',
        client?.company_name ? `Client: ${client.company_name}` : '',
        recipients.length > 0
          ? `Notification sent to: ${recipients.map(item => item.email).join(', ')}`
          : 'No notification recipient found.',
      ]
        .filter(Boolean)
        .join('\n'),
    })

    return NextResponse.json({
      data: application,
      notified: sendResults.filter(result => result.success).length,
      notification_results: sendResults,
      portal_link: portalLink,
    })
  } catch (error: any) {
    console.error('Confirm application submission error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not confirm application submission.' },
      { status: 500 },
    )
  }
}
