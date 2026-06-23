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

function percentage(part: number, total: number) {
  if (!total || total <= 0) return 0
  return Math.round((part / total) * 1000) / 10
}

function countByStatus(rows: any[]) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const status = clean(row.status) || 'unknown'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})
}

function countEvents(rows: any[]) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const eventType = clean(row.event_type) || 'unknown'
    acc[eventType] = (acc[eventType] || 0) + 1
    return acc
  }, {})
}

function latestDate(values: Array<string | null | undefined>) {
  const validDates = values
    .map(value => {
      if (!value) return null
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? null : date
    })
    .filter(Boolean) as Date[]

  if (validDates.length === 0) return null

  return validDates
    .sort((a, b) => b.getTime() - a.getTime())[0]
    .toISOString()
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    const { searchParams } = new URL(request.url)

    const campaignId = clean(searchParams.get('campaign_id'))

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required.' },
        { status: 400 },
      )
    }

    const { data: campaign, error: campaignError } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('id', campaignId)
      .maybeSingle()

    if (campaignError) {
      return NextResponse.json({ error: campaignError.message }, { status: 400 })
    }

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found.' },
        { status: 404 },
      )
    }

    const { data: recipients, error: recipientsError } = await supabase
      .from('marketing_campaign_recipients')
      .select('*')
      .eq('campaign_id', campaignId)

    if (recipientsError) {
      return NextResponse.json({ error: recipientsError.message }, { status: 400 })
    }

    const { data: events, error: eventsError } = await supabase
      .from('marketing_events')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .range(0, 499)

    if (eventsError) {
      return NextResponse.json({ error: eventsError.message }, { status: 400 })
    }

    const safeRecipients = Array.isArray(recipients) ? recipients : []
    const safeEvents = Array.isArray(events) ? events : []

    const statusCounts = countByStatus(safeRecipients)
    const eventCounts = countEvents(safeEvents)

    const totalRecipients = safeRecipients.length
    const pending = statusCounts.pending || 0
    const sent =
      (statusCounts.sent || 0) +
      (statusCounts.delivered || 0) +
      (statusCounts.opened || 0) +
      (statusCounts.clicked || 0)

    const delivered =
      (statusCounts.delivered || 0) +
      (statusCounts.opened || 0) +
      (statusCounts.clicked || 0)

    const opened =
      (statusCounts.opened || 0) +
      (statusCounts.clicked || 0)

    const clicked = statusCounts.clicked || 0
    const bounced = statusCounts.bounced || 0
    const failed = statusCounts.failed || 0
    const unsubscribed = statusCounts.unsubscribed || 0
    const deliveryDelayed = statusCounts.delivery_delayed || 0

    const report = {
      campaign,
      totals: {
        recipients: totalRecipients,
        pending,
        sent,
        delivered,
        opened,
        clicked,
        bounced,
        failed,
        unsubscribed,
        delivery_delayed: deliveryDelayed,
      },
      rates: {
        sent_rate: percentage(sent, totalRecipients),
        delivery_rate: percentage(delivered, sent),
        open_rate: percentage(opened, delivered || sent),
        click_rate: percentage(clicked, delivered || sent),
        bounce_rate: percentage(bounced, sent || totalRecipients),
        unsubscribe_rate: percentage(unsubscribed, sent || totalRecipients),
        failure_rate: percentage(failed, totalRecipients),
      },
      status_counts: statusCounts,
      event_counts: eventCounts,
      latest_activity_at: latestDate([
        ...safeRecipients.map(row => row.clicked_at),
        ...safeRecipients.map(row => row.opened_at),
        ...safeRecipients.map(row => row.delivered_at),
        ...safeRecipients.map(row => row.bounced_at),
        ...safeRecipients.map(row => row.unsubscribed_at),
        ...safeRecipients.map(row => row.failed_at),
        ...safeEvents.map(row => row.created_at),
      ]),
      recent_events: safeEvents.slice(0, 25),
      recent_recipients: safeRecipients
        .slice()
        .sort((a, b) => {
          const aDate = new Date(
            a.clicked_at ||
              a.opened_at ||
              a.delivered_at ||
              a.sent_at ||
              a.created_at,
          ).getTime()

          const bDate = new Date(
            b.clicked_at ||
              b.opened_at ||
              b.delivered_at ||
              b.sent_at ||
              b.created_at,
          ).getTime()

          return bDate - aDate
        })
        .slice(0, 50),
    }

    return NextResponse.json({ data: report })
  } catch (error: any) {
    console.error('Campaign report GET error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not load campaign report.' },
      { status: 500 },
    )
  }
}