'use client'

import { useEffect, useMemo, useState } from 'react'

type AnalyticsData = {
  configured: boolean
  message?: string
  range?: string
  summary?: {
    activeUsers: number
    newUsers: number
    sessions: number
    views: number
    engagementRate: number
    averageSessionDuration: number
  }
  topPages?: any[]
  channels?: any[]
  devices?: any[]
}

const RANGE_OPTIONS = [
  { value: '7daysAgo', label: 'Last 7 days' },
  { value: '30daysAgo', label: 'Last 30 days' },
  { value: '90daysAgo', label: 'Last 90 days' },
]

function formatNumber(value: number | undefined) {
  return new Intl.NumberFormat('en-GB').format(Number(value || 0))
}

function formatPercent(value: number | undefined) {
  return `${Math.round(Number(value || 0) * 100)}%`
}

function formatDuration(seconds: number | undefined) {
  const value = Math.round(Number(seconds || 0))

  if (value < 60) return `${value}s`

  const minutes = Math.floor(value / 60)
  const remainingSeconds = value % 60

  return `${minutes}m ${remainingSeconds}s`
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string
  value: string
  helper?: string
}) {
  return (
    <div
      style={{
        background: 'var(--white)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        padding: 18,
        boxShadow: '0 12px 35px rgba(15,23,42,0.06)',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin: 0,
          marginTop: 8,
          color: 'var(--text-dark)',
          fontSize: 30,
          fontWeight: 900,
          letterSpacing: -1,
        }}
      >
        {value}
      </p>

      {helper && (
        <p
          style={{
            margin: 0,
            marginTop: 5,
            color: 'var(--text-muted)',
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {helper}
        </p>
      )}
    </div>
  )
}

function DataTable({
  title,
  rows,
  firstColumn,
  emptyText,
}: {
  title: string
  rows: any[]
  firstColumn: {
    key: string
    label: string
    fallback?: string
  }
  emptyText: string
}) {
  return (
    <section
      style={{
        background: 'var(--white)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: 20,
        boxShadow: '0 12px 35px rgba(15,23,42,0.06)',
      }}
    >
      <h2
        style={{
          margin: 0,
          marginBottom: 14,
          color: 'var(--text-dark)',
          fontSize: 19,
          letterSpacing: -0.4,
        }}
      >
        {title}
      </h2>

      {rows.length === 0 ? (
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
          {emptyText}
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '10px 8px',
                    borderBottom: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: 0.7,
                  }}
                >
                  {firstColumn.label}
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: '10px 8px',
                    borderBottom: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: 0.7,
                  }}
                >
                  Users
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: '10px 8px',
                    borderBottom: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: 0.7,
                  }}
                >
                  Sessions
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: '10px 8px',
                    borderBottom: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: 0.7,
                  }}
                >
                  Views
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row[firstColumn.key] || index}-${index}`}>
                  <td
                    style={{
                      padding: '11px 8px',
                      borderBottom: '1px solid var(--border-light)',
                      color: 'var(--text-dark)',
                      fontWeight: 800,
                      maxWidth: 360,
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {row[firstColumn.key] || firstColumn.fallback || 'Unknown'}
                    </span>

                    {row.pagePath && (
                      <span
                        style={{
                          display: 'block',
                          marginTop: 2,
                          color: 'var(--text-muted)',
                          fontSize: 11,
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {row.pagePath}
                      </span>
                    )}
                  </td>

                  <td
                    style={{
                      padding: '11px 8px',
                      borderBottom: '1px solid var(--border-light)',
                      textAlign: 'right',
                      color: 'var(--text-dark)',
                      fontWeight: 800,
                    }}
                  >
                    {formatNumber(row.activeUsers)}
                  </td>

                  <td
                    style={{
                      padding: '11px 8px',
                      borderBottom: '1px solid var(--border-light)',
                      textAlign: 'right',
                      color: 'var(--text-dark)',
                      fontWeight: 800,
                    }}
                  >
                    {formatNumber(row.sessions)}
                  </td>

                  <td
                    style={{
                      padding: '11px 8px',
                      borderBottom: '1px solid var(--border-light)',
                      textAlign: 'right',
                      color: 'var(--text-dark)',
                      fontWeight: 800,
                    }}
                  >
                    {formatNumber(row.views)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default function AnalyticsDashboard() {
  const [range, setRange] = useState('30daysAgo')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const rangeLabel = useMemo(() => {
    return RANGE_OPTIONS.find(option => option.value === range)?.label || range
  }, [range])

  useEffect(() => {
    let cancelled = false

    async function loadAnalytics() {
      setLoading(true)

      const res = await fetch(`/api/crm/analytics?range=${range}`)
      const json = await res.json().catch(() => null)

      if (!cancelled) {
        setData(json)
        setLoading(false)
      }
    }

    loadAnalytics()

    return () => {
      cancelled = true
    }
  }, [range])

  const summary = data?.summary

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section
        style={{
          background: 'var(--white)',
          border: '1px solid var(--border)',
          borderRadius: 22,
          padding: 22,
          boxShadow: '0 18px 55px rgba(15,23,42,0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            alignItems: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <p className="section-eyebrow">Website Analytics</p>

            <h1
              style={{
                margin: 0,
                color: 'var(--text-dark)',
                fontSize: 34,
                letterSpacing: -1,
              }}
            >
              Google Analytics
            </h1>

            <p
              style={{
                margin: 0,
                marginTop: 8,
                color: 'var(--text-muted)',
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              View website users, sessions, page views, traffic sources and
              device activity from GA4.
            </p>
          </div>

          <select
            value={range}
            onChange={event => setRange(event.target.value)}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '11px 13px',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 800,
              background: 'var(--white)',
            }}
          >
            {RANGE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {loading && (
        <section
          style={{
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 18,
            padding: 22,
          }}
        >
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
            Loading analytics...
          </p>
        </section>
      )}

      {!loading && data?.configured === false && (
        <section
          style={{
            background: '#fff7ed',
            border: '1px solid #fed7aa',
            borderRadius: 18,
            padding: 22,
          }}
        >
          <h2 style={{ margin: 0, color: '#c2410c', fontSize: 18 }}>
            Google Analytics is not configured yet
          </h2>

          <p
            style={{
              margin: 0,
              marginTop: 8,
              color: '#9a3412',
              fontSize: 13,
              lineHeight: 1.7,
              fontWeight: 700,
            }}
          >
            {data.message ||
              'Add the Google Analytics environment variables once the live website is ready.'}
          </p>
        </section>
      )}

      {!loading && data?.configured && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: 12,
            }}
          >
            <StatCard
              label="Users"
              value={formatNumber(summary?.activeUsers)}
              helper={rangeLabel}
            />
            <StatCard
              label="New users"
              value={formatNumber(summary?.newUsers)}
              helper={rangeLabel}
            />
            <StatCard
              label="Sessions"
              value={formatNumber(summary?.sessions)}
              helper={rangeLabel}
            />
            <StatCard
              label="Page views"
              value={formatNumber(summary?.views)}
              helper={rangeLabel}
            />
            <StatCard
              label="Engagement rate"
              value={formatPercent(summary?.engagementRate)}
              helper="GA4 engaged sessions"
            />
            <StatCard
              label="Avg session"
              value={formatDuration(summary?.averageSessionDuration)}
              helper="Average session duration"
            />
          </div>

          <DataTable
            title="Top pages"
            rows={data.topPages || []}
            firstColumn={{
              key: 'pageTitle',
              label: 'Page',
              fallback: 'Untitled page',
            }}
            emptyText="No page data found for this period."
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 14,
            }}
          >
            <DataTable
              title="Traffic channels"
              rows={data.channels || []}
              firstColumn={{
                key: 'sessionDefaultChannelGroup',
                label: 'Channel',
                fallback: 'Unassigned',
              }}
              emptyText="No channel data found for this period."
            />

            <DataTable
              title="Devices"
              rows={data.devices || []}
              firstColumn={{
                key: 'deviceCategory',
                label: 'Device',
                fallback: 'Unknown',
              }}
              emptyText="No device data found for this period."
            />
          </div>
        </>
      )}
    </div>
  )
}