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

function cleanString(value: unknown) {
  return String(value ?? '').trim()
}

function normaliseEmail(value: unknown) {
  return cleanString(value).toLowerCase()
}

function eventDate(value: unknown) {
  const text = cleanText(value)
  return text || new Date().toISOString()
}

function getEmailId(event: any) {
  return (
    cleanText(event?.data?.email_id) ||
    cleanText(event?.data?.id) ||
    cleanText(event?.email_id) ||
    cleanText(event?.id)
  )
}

function getEventUrl(event: any) {
  return (
    cleanText(event?.data?.click?.url) ||
    cleanText(event?.data?.link?.url) ||
    cleanText(event?.data?.url) ||
    null
  )
}

function marketingEventName(eventType: string) {
  if (eventType === 'email.delivered') return 'delivered'
  if (eventType === 'email.opened') return 'opened'
  if (eventType === 'email.clicked') return 'clicked'
  if (eventType === 'email.bounced') return 'bounced'
  if (eventType === 'email.complained') return 'complained'
  if (eventType === 'email.delivery_delayed') return 'delivery_delayed'
  if (eventType === 'email.sent') return 'sent'
  if (eventType === 'email.unsubscribed') return 'unsubscribed'

  return eventType.replace(/^email\./, '')
}

function shouldMoveStatus(currentStatus: unknown, nextStatus: string) {
  const current = cleanString(currentStatus) || 'pending'

  const priority: Record<string, number> = {
    pending: 0,
    failed: 0,
    sent: 1,
    delivery_delayed: 1,
    delivered: 2,
    opened: 3,
    clicked: 4,
    bounced: 5,
    unsubscribed: 5,
  }

  return (priority[nextStatus] ?? 0) >= (priority[current] ?? 0)
}

async function findMarketingRecipient(input: {
  supabase: ReturnType<typeof getServiceClient>
  emailId: string
  tracking?: any
}) {
  const { supabase, emailId, tracking } = input

  if (tracking?.marketing_campaign_recipient_id) {
    const { data } = await supabase
      .from('marketing_campaign_recipients')
      .select('*')
      .eq('id', tracking.marketing_campaign_recipient_id)
      .maybeSingle()

    if (data) return data
  }

  const { data } = await supabase
    .from('marketing_campaign_recipients')
    .select('*')
    .eq('resend_email_id', emailId)
    .maybeSingle()

  return data || null
}

async function insertMarketingEvent(input: {
  supabase: ReturnType<typeof getServiceClient>
  eventType: string
  eventCreatedAt: string
  emailId: string
  event: any
  tracking?: any
  recipient?: any
}) {
  const {
    supabase,
    eventType,
    eventCreatedAt,
    emailId,
    event,
    tracking,
    recipient,
  } = input

  const campaignId =
    recipient?.campaign_id ||
    tracking?.marketing_campaign_id ||
    null

  const campaignRecipientId =
    recipient?.id ||
    tracking?.marketing_campaign_recipient_id ||
    null

  if (!campaignId && !campaignRecipientId) return

  await supabase.from('marketing_events').insert({
    campaign_id: campaignId,
    campaign_recipient_id: campaignRecipientId,
    event_type: marketingEventName(eventType),
    event_payload: {
      resend_event_type: eventType,
      resend_email_id: emailId,
      event_created_at: eventCreatedAt,
      url: getEventUrl(event),
      data: event?.data || null,
    },
  })
}

async function updateMarketingRecipient(input: {
  supabase: ReturnType<typeof getServiceClient>
  eventType: string
  eventCreatedAt: string
  recipient: any
  emailId: string
}) {
  const { supabase, eventType, eventCreatedAt, recipient, emailId } = input

  const updates: Record<string, any> = {
    resend_email_id: recipient.resend_email_id || emailId,
  }

  if (eventType === 'email.delivered') {
    updates.delivered_at = recipient.delivered_at || eventCreatedAt

    if (shouldMoveStatus(recipient.status, 'delivered')) {
      updates.status = 'delivered'
    }
  }

  if (eventType === 'email.opened') {
    updates.opened_at = recipient.opened_at || eventCreatedAt

    if (shouldMoveStatus(recipient.status, 'opened')) {
      updates.status = 'opened'
    }
  }

  if (eventType === 'email.clicked') {
    updates.clicked_at = eventCreatedAt

    if (shouldMoveStatus(recipient.status, 'clicked')) {
      updates.status = 'clicked'
    }
  }

  if (eventType === 'email.bounced') {
    updates.bounced_at = recipient.bounced_at || eventCreatedAt
    updates.status = 'bounced'
    updates.last_error = 'Email bounced.'
  }

  if (eventType === 'email.complained') {
    updates.status = 'failed'
    updates.failed_at = eventCreatedAt
    updates.last_error = 'Recipient marked the email as spam/complaint.'
  }

  if (eventType === 'email.delivery_delayed') {
    if (shouldMoveStatus(recipient.status, 'delivery_delayed')) {
      updates.status = 'delivery_delayed'
    }

    updates.last_error = 'Delivery delayed by email provider.'
  }

  if (eventType === 'email.unsubscribed') {
    updates.unsubscribed_at = recipient.unsubscribed_at || eventCreatedAt
    updates.status = 'unsubscribed'
  }

  if (Object.keys(updates).length === 0) return

  await supabase
    .from('marketing_campaign_recipients')
    .update(updates)
    .eq('id', recipient.id)
}

async function suppressMarketingEmail(input: {
  supabase: ReturnType<typeof getServiceClient>
  recipient?: any
  tracking?: any
  eventType: string
  eventCreatedAt: string
}) {
  const { supabase, recipient, tracking, eventType, eventCreatedAt } = input

  if (
    eventType !== 'email.bounced' &&
    eventType !== 'email.complained' &&
    eventType !== 'email.unsubscribed'
  ) {
    return
  }

  const email =
    cleanText(recipient?.email) ||
    cleanText(tracking?.to_email)

  const emailNormalised =
    cleanText(recipient?.email_normalised) ||
    normaliseEmail(email)

  if (!email || !emailNormalised) return

  const reason =
    eventType === 'email.bounced'
      ? 'bounce'
      : eventType === 'email.complained'
        ? 'complaint'
        : 'unsubscribe'

  const source =
    eventType === 'email.bounced'
      ? 'Resend bounce webhook'
      : eventType === 'email.complained'
        ? 'Resend complaint webhook'
        : 'Resend unsubscribe webhook'

  const notes =
    eventType === 'email.bounced'
      ? 'Email address was suppressed automatically after a Resend bounce event.'
      : eventType === 'email.complained'
        ? 'Email address was suppressed automatically after a Resend complaint/spam event.'
        : 'Email address was suppressed automatically after a Resend unsubscribe event.'

  await supabase
    .from('marketing_suppression_list')
    .upsert(
      {
        email,
        email_normalised: emailNormalised,
        reason,
        source,
        notes,
      },
      {
        onConflict: 'email_normalised',
      },
    )

  const contactUpdates: Record<string, any> = {
    do_not_email: true,
    marketing_notes: notes,
  }

  if (eventType === 'email.bounced') {
    contactUpdates.marketing_status = 'bounced'
    contactUpdates.bounced_at = eventCreatedAt
  }

  if (eventType === 'email.complained') {
    contactUpdates.marketing_status = 'suppressed'
    contactUpdates.marketing_consent_status = 'not_consented'
  }

  if (eventType === 'email.unsubscribed') {
    contactUpdates.marketing_status = 'unsubscribed'
    contactUpdates.marketing_consent_status = 'not_consented'
    contactUpdates.unsubscribed_at = eventCreatedAt
  }

  if (recipient?.source_type === 'client_contact' && recipient?.source_contact_id) {
    await supabase
      .from('client_contacts')
      .update(contactUpdates)
      .eq('id', recipient.source_contact_id)
  }

  if (recipient?.source_type === 'lead_contact' && recipient?.source_contact_id) {
    await supabase
      .from('lead_contacts')
      .update(contactUpdates)
      .eq('id', recipient.source_contact_id)
  }

  if (!recipient?.source_contact_id) {
    await Promise.all([
      supabase
        .from('client_contacts')
        .update(contactUpdates)
        .eq('email_normalised', emailNormalised),

      supabase
        .from('lead_contacts')
        .update(contactUpdates)
        .eq('email_normalised', emailNormalised),
    ])
  }
}

async function updateCrmTracking(input: {
  supabase: ReturnType<typeof getServiceClient>
  tracking: any
  eventType: string
  eventCreatedAt: string
}) {
  const { supabase, tracking, eventType, eventCreatedAt } = input

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

    return
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

    return
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

    return
  }

  await supabase
    .from('crm_email_tracking')
    .update({
      status:
        eventType === 'email.bounced'
          ? 'bounced'
          : eventType === 'email.complained'
            ? 'complained'
            : tracking.status,
      last_event: eventType,
      last_event_at: eventCreatedAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tracking.id)
}

export async function POST(request: NextRequest) {
  try {
    const event = await request.json()
    const supabase = getServiceClient()

    const eventType = cleanText(event?.type)
    const eventCreatedAt = eventDate(event?.created_at)
    const emailId = getEmailId(event)

    if (!eventType || !emailId) {
      return NextResponse.json({ ok: true, ignored: true })
    }

    const { data: tracking } = await supabase
      .from('crm_email_tracking')
      .select('*')
      .eq('resend_email_id', emailId)
      .maybeSingle()

    const recipient = await findMarketingRecipient({
      supabase,
      emailId,
      tracking,
    })

    if (tracking) {
      await updateCrmTracking({
        supabase,
        tracking,
        eventType,
        eventCreatedAt,
      })
    }

    if (recipient) {
      await updateMarketingRecipient({
        supabase,
        eventType,
        eventCreatedAt,
        recipient,
        emailId,
      })

      await suppressMarketingEmail({
        supabase,
        recipient,
        tracking,
        eventType,
        eventCreatedAt,
      })
    }

    await insertMarketingEvent({
      supabase,
      eventType,
      eventCreatedAt,
      emailId,
      event,
      tracking,
      recipient,
    })

    if (!tracking && !recipient) {
      return NextResponse.json({ ok: true, tracked: false })
    }

    return NextResponse.json({
      ok: true,
      tracked: Boolean(tracking),
      marketing_tracked: Boolean(recipient),
    })
  } catch (error: any) {
    console.error('Resend webhook error:', error)

    return NextResponse.json(
      { error: error?.message || 'Webhook failed.' },
      { status: 500 },
    )
  }
}