import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/sendEmail'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const POLICY_VERSION = 'Candidate Privacy Notice v1'
const INTERNAL_NOTIFICATION_EMAIL = 'joseph@educatedappointments.co.uk'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')
}

function normaliseEmail(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

function getIp(request: NextRequest) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  )
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

function documentLabel(docType: string | null | undefined) {
  const labels: Record<string, string> = {
    cv: 'CV',
    qualification: 'Certificate / qualification',
    right_to_work: 'Right to work document',
    dbs: 'DBS document',
    reference: 'Reference',
    interview_prep: 'Interview preparation document',
    gdpr_acceptance: 'GDPR / Privacy acceptance',
    other: 'Other document',
  }

  return labels[String(docType || '')] || String(docType || 'Document')
}

function buildInternalCompletionEmail({
  candidate,
  uploadLink,
  documents,
  gdprStatus,
}: {
  candidate: any
  uploadLink: any
  documents: any[]
  gdprStatus: string
}) {
  const name = candidateName(candidate) || 'Candidate'
  const candidateEmail = candidate.email || 'Not recorded'
  const completedAt = uploadLink.completed_at
    ? new Date(uploadLink.completed_at).toLocaleString('en-GB')
    : new Date().toLocaleString('en-GB')

  const documentRows =
    documents.length > 0
      ? documents
          .map(
            doc =>
              `<li><strong>${escapeHtml(documentLabel(doc.doc_type))}</strong> — ${escapeHtml(doc.name || 'Untitled document')}</li>`,
          )
          .join('')
      : '<li>No documents were uploaded through this portal link.</li>'

  const textDocuments =
    documents.length > 0
      ? documents
          .map(
            doc =>
              `- ${documentLabel(doc.doc_type)} — ${doc.name || 'Untitled document'}`,
          )
          .join('\n')
      : '- No documents were uploaded through this portal link.'

  const subject = `Candidate portal completed - ${name}`

  const text = [
    `Candidate portal completed - ${name}`,
    '',
    `Candidate: ${name}`,
    `Email: ${candidateEmail}`,
    `Completed at: ${completedAt}`,
    `GDPR / Privacy: ${gdprStatus}`,
    '',
    'Documents uploaded:',
    textDocuments,
  ].join('\n')

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#111827;">
      <h2 style="margin:0 0 12px;">Candidate portal completed</h2>

      <p><strong>Candidate:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(candidateEmail)}</p>
      <p><strong>Completed at:</strong> ${escapeHtml(completedAt)}</p>
      <p><strong>GDPR / Privacy:</strong> ${escapeHtml(gdprStatus)}</p>

      <h3 style="margin-top:20px;">Documents uploaded</h3>
      <ul>
        ${documentRows}
      </ul>
    </div>
  `

  return { subject, text, html }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = String(body.token || '').trim()

    if (!token) {
      return NextResponse.json(
        { error: 'Missing portal token.' },
        { status: 400 },
      )
    }

    const supabase = getServiceClient()

    const { data: uploadLink, error: linkError } = await supabase
      .from('candidate_upload_links')
      .select(
        `
        id,
        candidate_id,
        token,
        requested_document_types,
        message,
        expires_at,
        revoked_at,
        first_accessed_at,
        completed_at,
        completion_notification_sent_at,
        created_at,
        candidates (
          id,
          first_name,
          last_name,
          email,
          gdpr_status,
          gdpr_accepted_at
        )
      `,
      )
      .eq('token', token)
      .maybeSingle()

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 400 })
    }

    if (!uploadLink) {
      return NextResponse.json(
        { error: 'Portal link not found.' },
        { status: 404 },
      )
    }

    if (uploadLink.revoked_at) {
      return NextResponse.json(
        { error: 'This portal link has been revoked.' },
        { status: 403 },
      )
    }

    if (new Date(uploadLink.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'This portal link has expired.' },
        { status: 403 },
      )
    }

    const candidate = Array.isArray(uploadLink.candidates)
      ? uploadLink.candidates[0]
      : uploadLink.candidates

    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate record not found.' },
        { status: 404 },
      )
    }

    const now = new Date().toISOString()
    const policyUrl = `${getSiteUrl()}/policies/candidate-privacy-notice`
    const ipAddress = getIp(request)
    const userAgent = request.headers.get('user-agent') || null

    const gdprAlreadyAccepted = Boolean(
      candidate.gdpr_accepted_at || candidate.gdpr_status === 'accepted',
    )

    let gdprStatus = gdprAlreadyAccepted
      ? 'Already accepted before this portal submission'
      : 'Accepted through this portal submission'

    if (!gdprAlreadyAccepted) {
      if (body.read_and_understood !== true) {
        return NextResponse.json(
          {
            error:
              'Please confirm that you have read and understood the Candidate Privacy Notice.',
          },
          { status: 400 },
        )
      }

      const typedName = String(body.typed_name || '').trim()
      const typedEmail = normaliseEmail(body.typed_email)
      const candidateEmail = normaliseEmail(candidate.email)

      if (!typedName) {
        return NextResponse.json(
          { error: 'Please enter your name.' },
          { status: 400 },
        )
      }

      if (!typedEmail) {
        return NextResponse.json(
          { error: 'Please enter your email address.' },
          { status: 400 },
        )
      }

      if (typedEmail !== candidateEmail) {
        return NextResponse.json(
          { error: 'The email entered does not match this portal link.' },
          { status: 400 },
        )
      }

      const futureConsent = body.future_opportunities_consent === true
      const vacancyUpdatesConsent = body.vacancy_updates_consent === true

      const declarationDetails = {
        candidate_id: candidate.id,
        candidate_name: candidateName(candidate),
        candidate_email: candidate.email,
        typed_name: typedName,
        typed_email: typedEmail,
        policy_version: POLICY_VERSION,
        policy_url: policyUrl,
        accepted_at: now,
        read_and_understood: true,
        future_opportunities_consent: futureConsent,
        vacancy_updates_consent: vacancyUpdatesConsent,
        ip_address: ipAddress,
        user_agent: userAgent,
        source: 'candidate_upload_portal',
        upload_link_id: uploadLink.id,
      }

      const { error: candidateUpdateError } = await supabase
        .from('candidates')
        .update({
          gdpr_status: 'accepted',
          gdpr_accepted_at: now,
          gdpr_policy_version: POLICY_VERSION,
          gdpr_policy_url: policyUrl,
          gdpr_future_opportunities_consent: futureConsent,
          gdpr_marketing_consent: vacancyUpdatesConsent,
        })
        .eq('id', candidate.id)

      if (candidateUpdateError) {
        return NextResponse.json(
          { error: candidateUpdateError.message },
          { status: 400 },
        )
      }

      await supabase.from('candidate_documents').insert({
        candidate_id: candidate.id,
        source_upload_link_id: uploadLink.id,
        name: `GDPR Acceptance - ${candidateName(candidate)} - ${new Date().toLocaleDateString('en-GB')}`,
        doc_type: 'gdpr_acceptance',
        file_url: null,
        released: false,
        summary: `Candidate accepted the Candidate Privacy Notice, version ${POLICY_VERSION}, on ${new Date(now).toLocaleString('en-GB')}.`,
        details: declarationDetails,
        visibility: 'internal',
        visible_to_employer: false,
      })

      await supabase.from('candidate_activities').insert({
        candidate_id: candidate.id,
        activity_type: 'note',
        content: [
          'Candidate Privacy Notice accepted through the candidate portal.',
          `Policy version: ${POLICY_VERSION}`,
          `Accepted at: ${new Date(now).toLocaleString('en-GB')}`,
          `IP address: ${ipAddress || 'Unknown'}`,
          `Browser / device: ${userAgent || 'Unknown'}`,
          `Future opportunities consent: ${futureConsent ? 'Yes' : 'No'}`,
          `Vacancy updates consent: ${vacancyUpdatesConsent ? 'Yes' : 'No'}`,
        ].join('\n'),
      })
    }

    const { data: documents } = await supabase
      .from('candidate_documents')
      .select('id, name, doc_type, created_at')
      .eq('source_upload_link_id', uploadLink.id)
      .order('created_at', { ascending: true })

    const completionSummary = {
      completed_at: now,
      gdpr_status: gdprStatus,
      documents:
        documents?.map(doc => ({
          id: doc.id,
          name: doc.name,
          doc_type: doc.doc_type,
          created_at: doc.created_at,
        })) || [],
    }

    const shouldSendNotification = !uploadLink.completion_notification_sent_at

    const { data: completedLink, error: completeError } = await supabase
      .from('candidate_upload_links')
      .update({
        completed_at: uploadLink.completed_at || now,
        completion_summary: completionSummary,
      })
      .eq('id', uploadLink.id)
      .select('*')
      .maybeSingle()

    if (completeError) {
      return NextResponse.json(
        { error: completeError.message },
        { status: 400 },
      )
    }

    if (shouldSendNotification) {
      const notificationEmail = buildInternalCompletionEmail({
        candidate,
        uploadLink: completedLink || { ...uploadLink, completed_at: now },
        documents: documents || [],
        gdprStatus,
      })

      await sendEmail({
        to: INTERNAL_NOTIFICATION_EMAIL,
        subject: notificationEmail.subject,
        html: notificationEmail.html,
        text: notificationEmail.text,
        replyTo: candidate.email || undefined,
      })

      await supabase
        .from('candidate_upload_links')
        .update({ completion_notification_sent_at: new Date().toISOString() })
        .eq('id', uploadLink.id)
    }

    return NextResponse.json({
      success: true,
      completed: true,
      notificationSent: shouldSendNotification,
      documents: documents || [],
      gdprStatus,
    })
  } catch (error: any) {
    console.error('Candidate portal completion error:', error)

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Something went wrong completing the candidate portal.',
      },
      { status: 500 },
    )
  }
}