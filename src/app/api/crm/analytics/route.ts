import { NextResponse } from 'next/server'
import { BetaAnalyticsDataClient } from '@google-analytics/data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_RANGES = new Set(['7daysAgo', '30daysAgo', '90daysAgo'])

function cleanPrivateKey(value: string) {
  return value.replace(/\\n/g, '\n')
}

function getAnalyticsClient() {
  const clientEmail = process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_ANALYTICS_PRIVATE_KEY

  if (!clientEmail || !privateKey) {
    return null
  }

  return new BetaAnalyticsDataClient({
    credentials: {
      client_email: clientEmail,
      private_key: cleanPrivateKey(privateKey),
    },
  })
}

function metricValue(row: any, index: number) {
  return Number(row?.metricValues?.[index]?.value || 0)
}

function dimensionValue(row: any, index: number) {
  return String(row?.dimensionValues?.[index]?.value || '')
}

function formatRows(rows: any[] | null | undefined, dimensions: string[]) {
  return (rows || []).map(row => {
    const item: Record<string, any> = {}

    dimensions.forEach((dimension, index) => {
      item[dimension] = dimensionValue(row, index)
    })

    item.activeUsers = metricValue(row, 0)
    item.sessions = metricValue(row, 1)
    item.views = metricValue(row, 2)

    return item
  })
}

export async function GET(request: Request) {
  try {
    const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID
    const client = getAnalyticsClient()

    const url = new URL(request.url)
    const requestedRange = url.searchParams.get('range') || '30daysAgo'
    const startDate = ALLOWED_RANGES.has(requestedRange)
      ? requestedRange
      : '30daysAgo'

    if (!propertyId || !client) {
      return NextResponse.json({
        configured: false,
        message:
          'Google Analytics is not configured yet. Add GOOGLE_ANALYTICS_PROPERTY_ID, GOOGLE_ANALYTICS_CLIENT_EMAIL and GOOGLE_ANALYTICS_PRIVATE_KEY to your environment variables.',
      })
    }

    const property = `properties/${propertyId}`

    const [summaryResponse] = await client.runReport({
      property,
      dateRanges: [{ startDate, endDate: 'today' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'engagementRate' },
        { name: 'averageSessionDuration' },
      ],
    })

    const [topPagesResponse] = await client.runReport({
      property,
      dateRanges: [{ startDate, endDate: 'today' }],
      dimensions: [{ name: 'pageTitle' }, { name: 'pagePath' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
      ],
      orderBys: [
        {
          metric: { metricName: 'screenPageViews' },
          desc: true,
        },
      ],
      limit: 10,
    })

    const [channelsResponse] = await client.runReport({
      property,
      dateRanges: [{ startDate, endDate: 'today' }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
      ],
      orderBys: [
        {
          metric: { metricName: 'sessions' },
          desc: true,
        },
      ],
      limit: 10,
    })

    const [devicesResponse] = await client.runReport({
      property,
      dateRanges: [{ startDate, endDate: 'today' }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
      ],
      orderBys: [
        {
          metric: { metricName: 'sessions' },
          desc: true,
        },
      ],
      limit: 10,
    })

    const summaryRow = summaryResponse.rows?.[0]

    const summary = {
      activeUsers: metricValue(summaryRow, 0),
      newUsers: metricValue(summaryRow, 1),
      sessions: metricValue(summaryRow, 2),
      views: metricValue(summaryRow, 3),
      engagementRate: metricValue(summaryRow, 4),
      averageSessionDuration: metricValue(summaryRow, 5),
    }

    return NextResponse.json({
      configured: true,
      range: startDate,
      summary,
      topPages: formatRows(topPagesResponse.rows, ['pageTitle', 'pagePath']),
      channels: formatRows(channelsResponse.rows, [
        'sessionDefaultChannelGroup',
      ]),
      devices: formatRows(devicesResponse.rows, ['deviceCategory']),
    })
  } catch (error: any) {
    console.error('Google Analytics API error:', error)

    return NextResponse.json(
      {
        configured: false,
        message:
          error?.message ||
          'Could not load Google Analytics data. Check your GA4 property ID and service account access.',
      },
      { status: 500 },
    )
  }
}