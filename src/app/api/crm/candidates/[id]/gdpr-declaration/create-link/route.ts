import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash, randomBytes } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const POLICY_VERSION = '1.0'

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

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function candidateName(candidate: any) {
  return `${candidate.first_name ?? ''} ${candidate.last_name ?? ''}`.trim()
}

type Context = {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, { params }: Context) {
  try {
    const { id } = await params
    const supabase = getServiceClient()
    const siteUrl = getSiteUrl()

    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('id, first_name, last_name, email')
      .eq('id', id)
      .single()

    if (candidateError || !candidate) {
      return NextResponse.json(
        { error: candidateError?.message || 'Candidate not found.' },
        { status: 404 },
      )
    }

    if (!candidate.email) {
      return NextResponse.json(
        { error: 'Candidate must have an email address before creating a GDPR declaration link.' },
        { status: 400 },
      )
    }

    if (!candidateName(candidate)) {
      return NextResponse.json(
        { error: 'Candidate must have a first name or last name before creating a GDPR declaration link.' },
        { status: 400 },
      )
    }

    const token = randomBytes(32).toString('hex')
    const tokenHash = hashToken(token)
    const policyUrl = `${siteUrl}/policies/candidate-privacy-notice`
    const declarationUrl = `${siteUrl}/candidate-declaration/${token}`
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

    const { error: linkError } = await supabase
      .from('candidate_gdpr_declaration_links')
      .insert({
        candidate_id: candidate.id,
        token_hash: tokenHash,
        status: 'created',
        policy_version: POLICY_VERSION,
        policy_url: policyUrl,
        sent_to_email: candidate.email,
        expires_at: expiresAt,
      })

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 400 })
    }

    const { data: updatedCandidate, error: updateError } = await supabase
      .from('candidates')
      .update({
        gdpr_status: 'sent',
        gdpr_sent_at: new Date().toISOString(),
        gdpr_policy_version: POLICY_VERSION,
        gdpr_policy_url: policyUrl,
      })
      .eq('id', candidate.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        {
          error: 'GDPR link created, but candidate record could not be updated.',
          details: updateError.message,
          declarationUrl,
        },
        { status: 500 },
      )
    }

    await supabase.from('candidate_activities').insert({
      candidate_id: candidate.id,
      activity_type: 'email',
      content: [
        'GDPR declaration link created.',
        `Candidate: ${candidateName(candidate)}`,
        `Email: ${candidate.email}`,
        `Policy version: ${POLICY_VERSION}`,
        `Link expires: ${expiresAt}`,
        `Declaration link: ${declarationUrl}`,
      ].join('\n'),
    })

    return NextResponse.json({
      data: updatedCandidate,
      declarationUrl,
      expiresAt,
    })
  } catch (error: any) {
    console.error('Create GDPR declaration link error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not create GDPR declaration link.' },
      { status: 500 },
    )
  }
}