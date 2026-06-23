'use client'

import { useEffect, useMemo, useState } from 'react'

type SuppressionRow = {
  id: string
  email: string
  email_normalised: string
  reason: string
  source: string | null
  notes: string | null
  created_at: string
}

const REASONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'unsubscribe', label: 'Unsubscribe' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'complaint', label: 'Complaint' },
  { value: 'do_not_contact', label: 'Do not contact' },
  { value: 'invalid_email', label: 'Invalid email' },
]

const FILTER_REASONS = [
  { value: 'all', label: 'All reasons' },
  ...REASONS,
]

function reasonLabel(value: string) {
  return REASONS.find(reason => reason.value === value)?.label || value
}

function formatDate(value?: string | null) {
  if (!value) return '—'

  try {
    return new Date(value).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

export default function MarketingSuppressionPage() {
  const [rows, setRows] = useState<SuppressionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [reasonFilter, setReasonFilter] = useState('all')

  const [form, setForm] = useState({
    email: '',
    reason: 'manual',
    source: 'CRM manual suppression',
    notes: '',
  })

  const reasonCounts = useMemo(() => {
    return rows.reduce<Record<string, number>>((acc, row) => {
      const reason = row.reason || 'manual'
      acc[reason] = (acc[reason] || 0) + 1
      return acc
    }, {})
  }, [rows])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadRows()
    }, 250)

    return () => window.clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, reasonFilter])

  async function loadRows() {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    params.set('search', search)
    params.set('reason', reasonFilter)

    const res = await fetch(`/api/crm/marketing/suppression?${params.toString()}`, {
      cache: 'no-store',
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setError(json?.error || 'Could not load suppression list.')
      setLoading(false)
      return
    }

    setRows(Array.isArray(json?.data) ? json.data : [])
    setLoading(false)
  }

  async function addSuppression(event: React.FormEvent) {
    event.preventDefault()

    if (!form.email.trim()) {
      setError('Please enter an email address.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    const res = await fetch('/api/crm/marketing/suppression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setError(json?.error || 'Could not add suppressed email.')
      setSaving(false)
      return
    }

    setForm({
      email: '',
      reason: 'manual',
      source: 'CRM manual suppression',
      notes: '',
    })

    setSuccess('Email added to the suppression list.')
    setTimeout(() => setSuccess(null), 2500)

    await loadRows()
    setSaving(false)
  }

  async function removeSuppression(row: SuppressionRow) {
    const confirmed = window.confirm(
      `Remove ${row.email} from the suppression list? This does not automatically resubscribe them. It only removes the global suppression record.`,
    )

    if (!confirmed) return

    setDeletingId(row.id)
    setError(null)
    setSuccess(null)

    const res = await fetch('/api/crm/marketing/suppression', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id }),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setError(json?.error || 'Could not remove suppressed email.')
      setDeletingId(null)
      return
    }

    setRows(current => current.filter(item => item.id !== row.id))
    setSuccess('Suppression record removed.')
    setTimeout(() => setSuccess(null), 2500)
    setDeletingId(null)
  }

  return (
    <div className="crm-page">
      <div className="crm-page-header">
        <div>
          <h1 className="crm-page-title">Suppression List</h1>
          <p className="crm-page-sub">
            Block people from receiving marketing emails before campaigns are sent.
          </p>
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
          <p className="crm-small-label">Suppressed emails</p>
          <h2 style={{ margin: '6px 0 0' }}>{rows.length}</h2>
        </div>

        <div className="crm-card">
          <p className="crm-small-label">Unsubscribes</p>
          <h2 style={{ margin: '6px 0 0' }}>
            {reasonCounts.unsubscribe || 0}
          </h2>
        </div>

        <div className="crm-card">
          <p className="crm-small-label">Bounces</p>
          <h2 style={{ margin: '6px 0 0' }}>
            {reasonCounts.bounce || 0}
          </h2>
        </div>

        <div className="crm-card">
          <p className="crm-small-label">Complaints</p>
          <h2 style={{ margin: '6px 0 0' }}>
            {reasonCounts.complaint || 0}
          </h2>
        </div>
      </div>

      <div className="crm-card" style={{ marginBottom: 18 }}>
        <h2 style={{ marginTop: 0 }}>Add suppressed email</h2>
        <p className="crm-page-sub">
          Use this if someone asks not to receive marketing, an email bounces, or you want to block an address manually.
        </p>

        <form onSubmit={addSuppression}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            <label>
              <span className="crm-small-label">Email address</span>
              <input
                className="crm-input"
                type="email"
                value={form.email}
                onChange={event =>
                  setForm(current => ({ ...current, email: event.target.value }))
                }
                placeholder="name@example.co.uk"
              />
            </label>

            <label>
              <span className="crm-small-label">Reason</span>
              <select
                className="crm-input"
                value={form.reason}
                onChange={event =>
                  setForm(current => ({ ...current, reason: event.target.value }))
                }
              >
                {REASONS.map(reason => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="crm-small-label">Source</span>
              <input
                className="crm-input"
                value={form.source}
                onChange={event =>
                  setForm(current => ({ ...current, source: event.target.value }))
                }
                placeholder="CRM manual suppression"
              />
            </label>
          </div>

          <label style={{ display: 'block', marginTop: 12 }}>
            <span className="crm-small-label">Notes</span>
            <textarea
              className="crm-input"
              value={form.notes}
              onChange={event =>
                setForm(current => ({ ...current, notes: event.target.value }))
              }
              rows={3}
              placeholder="Optional note, e.g. requested by phone, bounced from Resend, complaint received..."
            />
          </label>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 14,
            }}
          >
            <button className="crm-btn-primary" type="submit" disabled={saving}>
              {saving ? 'Adding...' : 'Add to suppression list'}
            </button>

            {success && <span style={{ color: '#217822' }}>{success}</span>}
            {error && <span style={{ color: '#e53e3e' }}>{error}</span>}
          </div>
        </form>
      </div>

      <div className="crm-card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
            marginBottom: 14,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Suppressed emails</h2>
            <p className="crm-page-sub" style={{ margin: '4px 0 0' }}>
              These emails will be excluded from marketing audiences.
            </p>
          </div>

          {loading && <span className="crm-small-label">Loading...</span>}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(240px, 1fr) minmax(180px, 260px)',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <input
            className="crm-input"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search email, reason, source or notes..."
          />

          <select
            className="crm-input"
            value={reasonFilter}
            onChange={event => setReasonFilter(event.target.value)}
          >
            {FILTER_REASONS.map(reason => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="crm-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Reason</th>
                <th>Source</th>
                <th>Notes</th>
                <th>Added</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={6}>No suppressed emails found.</td>
                </tr>
              )}

              {rows.map(row => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.email}</strong>
                    <p className="crm-table-sub">{row.email_normalised}</p>
                  </td>
                  <td>{reasonLabel(row.reason)}</td>
                  <td>{row.source || '—'}</td>
                  <td>{row.notes || '—'}</td>
                  <td>{formatDate(row.created_at)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="crm-btn-secondary"
                      type="button"
                      onClick={() => removeSuppression(row)}
                      disabled={deletingId === row.id}
                    >
                      {deletingId === row.id ? 'Removing...' : 'Remove'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="crm-page-sub" style={{ marginTop: 12 }}>
          Removing someone from this list does not automatically opt them back into marketing. It only removes the global block.
        </p>
      </div>
    </div>
  )
}