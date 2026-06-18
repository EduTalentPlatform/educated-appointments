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

function cleanText(value: unknown) {
  const text = String(value ?? '').trim()
  return text || null
}

function eventDate(value: unknown) {
  const text = cleanText(value)
  return text || new Date().toISOString()
}

export async function POST(request: NextRequest) {
  try {
    const expectedSecret = process.env.RESEND_WEBHOOK_SECRET

    if (expectedSecret) {
      const receivedSecret = request.nextUrl.searchParams.get('secret')

      if (receivedSecret !== expectedSecret) {
  return NextResponse.json(
    {
      error: 'Unauthorised webhook.',
      hasExpectedSecret: Boolean(expectedSecret),
      receivedSecretLength: receivedSecret?.length ?? 0,
      expectedSecretLength: expectedSecret?.length ?? 0,
    },
    { status: 401 },
  )
}
    }

    const event = await request.json()
    const supabase = getServiceClient()

    const eventType = cleanText(event?.type)
    const eventCreatedAt = eventDate(event?.created_at)
    const emailId =
      cleanText(event?.data?.email_id) ||
      cleanText(event?.data?.id)

    if (!eventType || !emailId) {
      return NextResponse.json({ ok: true, ignored: true })
    }

    const { data: tracking } = await supabase
      .from('crm_email_tracking')
      .select('*')
      .eq('resend_email_id', emailId)
      .maybeSingle()

    if (!tracking) {
      return NextResponse.json({ ok: true, tracked: false })
    }

    if (eventType === 'email.delivered') {
      await supabase
        .from('crm_email_tracking')
        .update({
          status: 'delivered',
          delivered_at: eventCreatedAt,
          last_event: eventType,
          last_event_at: eventCreatedAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tracking.id)

      return NextResponse.json({ ok: true })
    }

    if (eventType === 'email.opened') {
      const previousOpenCount = Number(tracking.open_count || 0)
      const nextOpenCount = previousOpenCount + 1

      await supabase
        .from('crm_email_tracking')
        .update({
          status: 'opened',
          opened_at: tracking.opened_at || eventCreatedAt,
          last_opened_at: eventCreatedAt,
          open_count: nextOpenCount,
          last_event: eventType,
          last_event_at: eventCreatedAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tracking.id)

      if (previousOpenCount === 0 && tracking.candidate_id) {
        await supabase.from('candidate_activities').insert({
          candidate_id: tracking.candidate_id,
          activity_type: 'email',
          content: [
            'Email opened by recipient.',
            tracking.subject ? `Subject: ${tracking.subject}` : null,
            tracking.to_email ? `Email: ${tracking.to_email}` : null,
            `Opened: ${new Date(eventCreatedAt).toLocaleString('en-GB')}`,
            'Note: open tracking confirms the email was opened, but does not guarantee it was fully read.',
          ]
            .filter(Boolean)
            .join('\n'),
        })
      }

      return NextResponse.json({ ok: true })
    }

    if (eventType === 'email.clicked') {
      const previousClickCount = Number(tracking.click_count || 0)

      await supabase
        .from('crm_email_tracking')
        .update({
          status: 'clicked',
          clicked_at: eventCreatedAt,
          click_count: previousClickCount + 1,
          last_event: eventType,
          last_event_at: eventCreatedAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tracking.id)

      return NextResponse.json({ ok: true })
    }

    await supabase
      .from('crm_email_tracking')
      .update({
        last_event: eventType,
        last_event_at: eventCreatedAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tracking.id)

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Resend webhook error:', error)

    return NextResponse.json(
      { error: error?.message || 'Webhook failed.' },
      { status: 500 },
    )
  }
}