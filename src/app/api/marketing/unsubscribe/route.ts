import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

function normaliseEmail(value: unknown) {
  const text = clean(value).toLowerCase()
  return text || null
}

function isValidEmail(value: string | null) {
  if (!value) return false
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)
}

async function parseRequestBody(request: NextRequest) {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return request.json()
  }

  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const formData = await request.formData()
    return Object.fromEntries(formData.entries())
  }

  return {}
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseRequestBody(request)
    const token = clean((body as any).token)

    if (!token) {
      return NextResponse.json(
        { error: 'Unsubscribe token is required.' },
        { status: 400 },
      )
    }

    const supabase = getServiceClient()

    const { data: unsubscribeRecord, error: unsubscribeError } = await supabase
      .from('marketing_unsubscribes')
      .select('*')
      .eq('token', token)
      .maybeSingle()

    if (unsubscribeError) {
      return NextResponse.json(
        { error: unsubscribeError.message },
        { status: 400 },
      )
    }

    if (!unsubscribeRecord) {
      return NextResponse.json(
        { error: 'This unsubscribe link is not valid.' },
        { status: 404 },
      )
    }

    const email = clean(unsubscribeRecord.email)
    const emailNormalised = normaliseEmail(
      unsubscribeRecord.email_normalised || unsubscribeRecord.email,
    )

    if (!isValidEmail(emailNormalised)) {
      return NextResponse.json(
        { error: 'This unsubscribe link does not contain a valid email address.' },
        { status: 400 },
      )
    }

    const now = new Date().toISOString()

    await supabase
      .from('marketing_unsubscribes')
      .update({
        unsubscribed_at: unsubscribeRecord.unsubscribed_at || now,
      })
      .eq('id', unsubscribeRecord.id)

    await supabase
      .from('marketing_suppression_list')
      .upsert(
        {
          email: email || emailNormalised,
          email_normalised: emailNormalised,
          reason: 'unsubscribe',
          source: 'Public unsubscribe link',
          notes:
            'Recipient unsubscribed using the public unsubscribe link in a marketing email.',
        },
        {
          onConflict: 'email_normalised',
        },
      )

    await Promise.all([
      supabase
        .from('client_contacts')
        .update({
          marketing_status: 'unsubscribed',
          marketing_consent_status: 'not_consented',
          do_not_email: true,
          unsubscribed_at: now,
          marketing_notes:
            'Recipient unsubscribed using the public unsubscribe link in a marketing email.',
        })
        .eq('email_normalised', emailNormalised),

      supabase
        .from('lead_contacts')
        .update({
          marketing_status: 'unsubscribed',
          marketing_consent_status: 'not_consented',
          do_not_email: true,
          unsubscribed_at: now,
          marketing_notes:
            'Recipient unsubscribed using the public unsubscribe link in a marketing email.',
        })
        .eq('email_normalised', emailNormalised),
    ])

    if (unsubscribeRecord.campaign_recipient_id) {
      await supabase
        .from('marketing_campaign_recipients')
        .update({
          status: 'unsubscribed',
          unsubscribed_at: now,
        })
        .eq('id', unsubscribeRecord.campaign_recipient_id)
    } else if (unsubscribeRecord.campaign_id) {
      await supabase
        .from('marketing_campaign_recipients')
        .update({
          status: 'unsubscribed',
          unsubscribed_at: now,
        })
        .eq('campaign_id', unsubscribeRecord.campaign_id)
        .eq('email_normalised', emailNormalised)
    }

    await supabase.from('marketing_events').insert({
      campaign_id: unsubscribeRecord.campaign_id || null,
      campaign_recipient_id: unsubscribeRecord.campaign_recipient_id || null,
      event_type: 'unsubscribed',
      event_payload: {
        email: email || emailNormalised,
        email_normalised: emailNormalised,
        source: 'public_unsubscribe_link',
      },
    })

    return NextResponse.json({
      success: true,
      email: email || emailNormalised,
      message: 'You have been unsubscribed from marketing emails.',
    })
  } catch (error: any) {
    console.error('Public unsubscribe error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not process unsubscribe request.' },
      { status: 500 },
    )
  }
}