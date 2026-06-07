import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = String(body.token || '').trim()

    if (!token) {
      return NextResponse.json(
        { error: 'Declaration token missing.' },
        { status: 400 },
      )
    }

    if (body.read_and_understood !== true) {
      return NextResponse.json(
        { error: 'You must confirm that you have read and understood the Candidate Privacy Notice.' },
        { status: 400 },
      )
    }

    const typedName = String(body.typed_name || '').trim()
    const typedEmail = normaliseEmail(body.typed_email)

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

    const supabase = getServiceClient()
    const tokenHash = hashToken(token)

    const { data: linkRecord, error: linkError } = await supabase
    .from('candidate_gdpr_declaration_links')
    .select(
      'id, candidate_id, status, used_at, expires_at, policy_version, policy_url',
    )
    .eq('token_hash', tokenHash)
    .maybeSingle()

    if (linkError || !linkRecord) {
      return NextResponse.json(
        { error: 'Declaration link not found.' },
        { status: 404 },
      )
    }

    if (linkRecord.used_at || linkRecord.status === 'accepted') {
      return NextResponse.json(
        { error: 'This declaration has already been submitted.' },
        { status: 400 },
      )
    }

    if (new Date(linkRecord.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'This declaration link has expired.' },
        { status: 400 },
      )
    }

    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('id, first_name, last_name, email')
      .eq('id', linkRecord.candidate_id)
      .single()

    if (candidateError || !candidate) {
      return NextResponse.json(
        { error: candidateError?.message || 'Candidate not found.' },
        { status: 404 },
      )
    }

    const candidateEmail = normaliseEmail(candidate.email)

    if (typedEmail !== candidateEmail) {
      return NextResponse.json(
        { error: 'The email entered does not match the declaration link.' },
        { status: 400 },
      )
    }

    const now = new Date().toISOString()
    const ipAddress = getIp(request)
    const userAgent = request.headers.get('user-agent') || null

    const futureConsent = body.future_opportunities_consent === true
    const vacancyUpdatesConsent = body.vacancy_updates_consent === true

    const declarationDetails = {
      candidate_id: candidate.id,
      candidate_name: candidateName(candidate),
      candidate_email: candidate.email,
      typed_name: typedName,
      typed_email: typedEmail,
      policy_version: linkRecord.policy_version,
      policy_url: linkRecord.policy_url,
      accepted_at: now,
      read_and_understood: true,
      future_opportunities_consent: futureConsent,
      vacancy_updates_consent: vacancyUpdatesConsent,
      ip_address: ipAddress,
      user_agent: userAgent,
    }

    const { data: updatedCandidate, error: updateError } = await supabase
      .from('candidates')
      .update({
        gdpr_status: 'accepted',
        gdpr_accepted_at: now,
        gdpr_policy_version: linkRecord.policy_version,
        gdpr_policy_url: linkRecord.policy_url,
        gdpr_future_opportunities_consent: futureConsent,
        gdpr_marketing_consent: vacancyUpdatesConsent,
      })
      .eq('id', candidate.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    await supabase
  .from('candidate_gdpr_declaration_links')
  .update({
    status: 'accepted',
    used_at: now,
    accepted_at: now,
    accepted_ip: ipAddress,
    accepted_user_agent: userAgent,
  })
  .eq('id', linkRecord.id)

    await supabase.from('candidate_documents').insert({
      candidate_id: candidate.id,
      name: `GDPR Acceptance - ${candidateName(candidate)} - ${new Date().toLocaleDateString('en-GB')}`,
      doc_type: 'gdpr_acceptance',
      file_url: null,
      released: false,
      summary: `Candidate accepted the Candidate Privacy Notice, version ${linkRecord.policy_version}, on ${new Date(now).toLocaleString('en-GB')}.`,
      details: declarationDetails,
      visibility: 'internal',
      visible_to_employer: false,
    })

    await supabase.from('candidate_activities').insert({
  candidate_id: candidate.id,
  activity_type: 'note',
  content: [
    'GDPR declaration accepted.',
    `Policy version: ${linkRecord.policy_version}`,
    `Accepted at: ${new Date(now).toLocaleString('en-GB')}`,
    `IP address: ${ipAddress || 'Unknown'}`,
    `Browser / device: ${userAgent || 'Unknown'}`,
    `Future opportunities consent: ${futureConsent ? 'Yes' : 'No'}`,
    `Vacancy updates consent: ${vacancyUpdatesConsent ? 'Yes' : 'No'}`,
  ].join('\n'),
})

    return NextResponse.json({
      data: updatedCandidate,
      accepted: true,
    })
  } catch (error: any) {
    console.error('Candidate declaration submit error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not submit declaration.' },
      { status: 500 },
    )
  }
}