'use client'

import { useEffect, useMemo, useState } from 'react'

type AudienceRow = {
  source_type: 'client_contact' | 'lead_contact'
  source_contact_id: string
  company_id: string
  company_name: string
  company_status: string | null
  contact_name: string
  contact_title: string | null
  role_type: string | null
  is_primary: boolean | null
  email: string | null
  email_normalised: string | null
  phone: string | null
  linkedin: string | null
  sector: string | null
  region: string | null
  marketing_status: string | null
  marketing_consent_status: string | null
  marketing_consent_source: string | null
  marketing_consent_date: string | null
  unsubscribed_at: string | null
  bounced_at: string | null
  do_not_email: boolean | null
  last_marketing_email_sent_at: string | null
  marketing_notes: string | null
  eligible: boolean
  excluded_reason: string | null
}

type AudienceSummary = {
  total: number
  eligible: number
  excluded: number
  exclusion_counts: Record<string, number>
}

const SOURCE_OPTIONS = [
  { value: 'clients', label: 'Client contacts' },
  { value: 'leads', label: 'Lead contacts' },
  { value: 'all', label: 'Clients and leads' },
]

const ROLE_TYPES = [
  'all',
  'Decision Maker',
  'Influencer',
  'Day-to-day',
  'Finance',
  'HR',
]

const CLIENT_STATUSES = [
  'all',
  'active',
  'inactive',
  'lost',
  'do_not_contact',
]

const LEAD_STATUSES = [
  'all',
  'new',
  'contacted',
  'meeting_booked',
  'proposal_sent',
  'follow_up',
  'lost',
  'converted',
]

function formatDate(value?: string | null) {
  if (!value) return '—'

  try {
    return new Date(value).toLocaleDateString('en-GB')
  } catch {
    return '—'
  }
}

function statusLabel(value?: string | null) {
  if (!value) return 'Unknown'

  return value
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function sourceLabel(value: string) {
  if (value === 'lead_contact') return 'Lead'
  return 'Client'
}

export default function MarketingAudiencePage() {
  const [source, setSource] = useState('clients')
  const [roleType, setRoleType] = useState('all')
  const [status, setStatus] = useState('active')
  const [search, setSearch] = useState('')
  const [primaryOnly, setPrimaryOnly] = useState(false)
  const [includeUnknownConsent, setIncludeUnknownConsent] = useState(true)

  const [summary, setSummary] = useState<AudienceSummary>({
    total: 0,
    eligible: 0,
    excluded: 0,
    exclusion_counts: {},
  })
  const [rows, setRows] = useState<AudienceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const statuses = useMemo(() => {
    if (source === 'leads') return LEAD_STATUSES
    if (source === 'all') return ['all']
    return CLIENT_STATUSES
  }, [source])

  const eligibleRows = useMemo(
    () => rows.filter(row => row.eligible),
    [rows],
  )

  const excludedRows = useMemo(
    () => rows.filter(row => !row.eligible),
    [rows],
  )

  useEffect(() => {
    if (source === 'leads') {
      setStatus('all')
      return
    }

    if (source === 'all') {
      setStatus('all')
      return
    }

    setStatus('active')
  }, [source])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadAudience()
    }, 250)

    return () => window.clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, roleType, status, search, primaryOnly, includeUnknownConsent])

  async function loadAudience() {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    params.set('source', source)
    params.set('role_type', roleType)
    params.set('status', status)
    params.set('search', search)
    params.set('primary_only', String(primaryOnly))
    params.set('include_unknown_consent', String(includeUnknownConsent))

    const res = await fetch(`/api/crm/marketing/audience?${params.toString()}`, {
      cache: 'no-store',
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setError(json?.error || 'Could not load audience preview.')
      setLoading(false)
      return
    }

    setSummary(
      json?.data?.summary ?? {
        total: 0,
        eligible: 0,
        excluded: 0,
        exclusion_counts: {},
      },
    )
    setRows(Array.isArray(json?.data?.rows) ? json.data.rows : [])
    setLoading(false)
  }

  return (
    <div className="crm-page">
      <div className="crm-page-header">
        <div>
          <h1 className="crm-page-title">Audience Preview</h1>
          <p className="crm-page-sub">
            Check who is eligible before creating or sending a campaign.
          </p>
        </div>
      </div>

      <div className="crm-card" style={{ marginBottom: 18 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
          }}
        >
          <label>
            <span className="crm-small-label">Source</span>
            <select
              className="crm-input"
              value={source}
              onChange={event => setSource(event.target.value)}
            >
              {SOURCE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="crm-small-label">Role type</span>
            <select
              className="crm-input"
              value={roleType}
              onChange={event => setRoleType(event.target.value)}
            >
              {ROLE_TYPES.map(option => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All role types' : option}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="crm-small-label">Status</span>
            <select
              className="crm-input"
              value={status}
              onChange={event => setStatus(event.target.value)}
              disabled={source === 'all'}
            >
              {statuses.map(option => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All statuses' : statusLabel(option)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="crm-small-label">Search</span>
            <input
              className="crm-input"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Company, contact, email..."
            />
          </label>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 18,
            flexWrap: 'wrap',
            marginTop: 14,
          }}
        >
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={primaryOnly}
              onChange={event => setPrimaryOnly(event.target.checked)}
            />
            Primary contacts only
          </label>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={includeUnknownConsent}
              onChange={event => setIncludeUnknownConsent(event.target.checked)}
            />
            Include unknown consent for preview
          </label>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
          marginBottom: 18,
        }}
      >
        <div className="crm-card">
          <p className="crm-small-label">Total checked</p>
          <h2 style={{ margin: '6px 0 0' }}>{summary.total}</h2>
        </div>

        <div className="crm-card">
          <p className="crm-small-label">Eligible</p>
          <h2 style={{ margin: '6px 0 0' }}>{summary.eligible}</h2>
        </div>

        <div className="crm-card">
          <p className="crm-small-label">Excluded</p>
          <h2 style={{ margin: '6px 0 0' }}>{summary.excluded}</h2>
        </div>
      </div>

      {Object.keys(summary.exclusion_counts || {}).length > 0 && (
        <div className="crm-card" style={{ marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>Exclusion reasons</h2>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(summary.exclusion_counts).map(([reason, count]) => (
              <span
                key={reason}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  borderRadius: 999,
                  background: '#f5f5f7',
                  fontSize: 13,
                }}
              >
                {reason}: <strong>{count}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="crm-card" style={{ borderColor: '#e53e3e', marginBottom: 18 }}>
          <p style={{ color: '#e53e3e', margin: 0 }}>{error}</p>
        </div>
      )}

      <div className="crm-card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Eligible contacts</h2>
            <p className="crm-page-sub" style={{ margin: '4px 0 0' }}>
              These are the contacts that would currently be safe to include.
            </p>
          </div>

          {loading && <span className="crm-small-label">Loading...</span>}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="crm-table">
            <thead>
              <tr>
                <th>Contact</th>
                <th>Company</th>
                <th>Source</th>
                <th>Role</th>
                <th>Email</th>
                <th>Consent</th>
                <th>Last marketing email</th>
              </tr>
            </thead>
            <tbody>
              {eligibleRows.length === 0 && !loading && (
                <tr>
                  <td colSpan={7}>No eligible contacts found.</td>
                </tr>
              )}

              {eligibleRows.map(row => (
                <tr key={`${row.source_type}-${row.source_contact_id}`}>
                  <td>
                    <strong>{row.contact_name}</strong>
                    {row.contact_title && (
                      <p className="crm-table-sub">{row.contact_title}</p>
                    )}
                  </td>
                  <td>
                    {row.company_name}
                    <p className="crm-table-sub">
                      {[row.sector, row.region].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </td>
                  <td>{sourceLabel(row.source_type)}</td>
                  <td>
                    {row.role_type || '—'}
                    {row.is_primary && <p className="crm-table-sub">Primary</p>}
                  </td>
                  <td>{row.email || '—'}</td>
                  <td>
                    {statusLabel(row.marketing_consent_status)}
                    <p className="crm-table-sub">
                      Status: {statusLabel(row.marketing_status)}
                    </p>
                  </td>
                  <td>{formatDate(row.last_marketing_email_sent_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="crm-card" style={{ marginTop: 18 }}>
        <h2 style={{ marginTop: 0 }}>Excluded contacts</h2>
        <p className="crm-page-sub">
          These contacts are deliberately excluded from sending.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table className="crm-table">
            <thead>
              <tr>
                <th>Contact</th>
                <th>Company</th>
                <th>Email</th>
                <th>Reason</th>
                <th>Marketing status</th>
              </tr>
            </thead>
            <tbody>
              {excludedRows.length === 0 && !loading && (
                <tr>
                  <td colSpan={5}>No excluded contacts found.</td>
                </tr>
              )}

              {excludedRows.map(row => (
                <tr key={`excluded-${row.source_type}-${row.source_contact_id}`}>
                  <td>
                    <strong>{row.contact_name}</strong>
                    {row.contact_title && (
                      <p className="crm-table-sub">{row.contact_title}</p>
                    )}
                  </td>
                  <td>
                    {row.company_name}
                    <p className="crm-table-sub">{sourceLabel(row.source_type)}</p>
                  </td>
                  <td>{row.email || '—'}</td>
                  <td>{row.excluded_reason || 'Excluded'}</td>
                  <td>
                    {statusLabel(row.marketing_status)}
                    <p className="crm-table-sub">
                      Consent: {statusLabel(row.marketing_consent_status)}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length >= 500 && (
          <p className="crm-page-sub" style={{ marginTop: 12 }}>
            Showing first 500 results. Use search or filters to narrow the audience.
          </p>
        )}
      </div>
    </div>
  )
}