'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'

type Campaign = {
  id: string
  name: string
  subject: string
  preview_text: string | null
  body_text: string | null
  audience_type: string
  status: string
  sender_name: string | null
  sender_email: string | null
  reply_to: string | null
  scheduled_at: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
  template_id: string | null
}

type EmailTemplate = {
  id: string
  name: string
  template_type: string
  subject: string
  body: string
  is_active: boolean
}

type CampaignForm = {
  id: string
  name: string
  subject: string
  preview_text: string
  body_text: string
  audience_type: string
  status: string
  sender_name: string
  sender_email: string
  reply_to: string
  template_id: string
}

const AUDIENCE_TYPES = [
  { value: 'client_contacts', label: 'Client contacts' },
  { value: 'lead_contacts', label: 'Lead contacts' },
  { value: 'mixed', label: 'Clients and leads' },
]

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready' },
  { value: 'paused', label: 'Paused' },
  { value: 'cancelled', label: 'Cancelled' },
]

const DEFAULT_CANDIDATE_AVAILABILITY_BODY = `Hi {{client.contact_name}},

I hope you’re well.

I wanted to share a candidate who may be worth knowing about.

{{candidate.profile_text}}

They are actively looking and could be a strong fit if you have anything suitable either now or coming up.

Would you like me to send over more details?`

const DEFAULT_MARKETING_FOOTER_TEXT = `
You can unsubscribe from these emails at any time here: {{unsubscribe_url}}

But before you go…

We use these emails to share genuinely useful updates from Educated Appointments. That may include candidate availability, recruitment insight, sector updates, employer portal improvements, compliance support, or practical advice that could save you time.

Sometimes it might be the perfect candidate for a role you’re struggling to fill. Other times it might simply be something that makes recruitment, safer hiring or document chasing a little less painful.

No waffle. No spam. No “just checking in for the 47th time this week.”
`.trim()

function emptyForm(): CampaignForm {
  return {
    id: '',
    name: '',
    subject: '',
    preview_text: '',
    body_text: DEFAULT_CANDIDATE_AVAILABILITY_BODY,
    audience_type: 'client_contacts',
    status: 'draft',
    sender_name: 'Educated Appointments',
    sender_email: 'noreply@educatedappointments.co.uk',
    reply_to: '',
    template_id: '',
  }
}

function statusLabel(value: string) {
  return value
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function audienceLabel(value: string) {
  return AUDIENCE_TYPES.find(type => type.value === value)?.label || value
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

function hasFooter(body: string) {
  return body.includes('{{unsubscribe_url}}')
}

export default function MarketingCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [form, setForm] = useState<CampaignForm>(() => emptyForm())

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const campaignCounts = useMemo(() => {
    return campaigns.reduce<Record<string, number>>((acc, campaign) => {
      acc[campaign.status] = (acc[campaign.status] || 0) + 1
      return acc
    }, {})
  }, [campaigns])

  const activeTemplates = useMemo(() => {
    return templates.filter(template => template.is_active !== false)
  }, [templates])

  useEffect(() => {
    loadTemplates()
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadCampaigns()
    }, 250)

    return () => window.clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter])

  async function loadTemplates() {
    const res = await fetch('/api/crm/email-templates', {
      cache: 'no-store',
    })

    const json = await res.json().catch(() => null)

    if (res.ok) {
      setTemplates(Array.isArray(json?.data) ? json.data : [])
    }
  }

  async function loadCampaigns() {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    params.set('search', search)
    params.set('status', statusFilter)

    const res = await fetch(`/api/crm/marketing/campaigns?${params.toString()}`, {
      cache: 'no-store',
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setError(json?.error || 'Could not load marketing campaigns.')
      setLoading(false)
      return
    }

    setCampaigns(Array.isArray(json?.data) ? json.data : [])
    setLoading(false)
  }

  function selectCampaign(campaign: Campaign) {
    setForm({
      id: campaign.id,
      name: campaign.name ?? '',
      subject: campaign.subject ?? '',
      preview_text: campaign.preview_text ?? '',
      body_text: campaign.body_text ?? '',
      audience_type: campaign.audience_type ?? 'client_contacts',
      status: campaign.status ?? 'draft',
      sender_name: campaign.sender_name ?? 'Educated Appointments',
      sender_email: campaign.sender_email ?? 'noreply@educatedappointments.co.uk',
      reply_to: campaign.reply_to ?? '',
      template_id: campaign.template_id ?? '',
    })

    setError(null)
    setSuccess(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function newCampaign() {
    setForm(emptyForm())
    setError(null)
    setSuccess(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function applyTemplate(templateId: string) {
    const template = activeTemplates.find(item => item.id === templateId)

    setForm(current => ({
      ...current,
      template_id: templateId,
      subject: template?.subject || current.subject,
      body_text: template?.body || current.body_text,
    }))
  }

  function addFooterToBody() {
    setForm(current => {
      if (hasFooter(current.body_text)) return current

      return {
        ...current,
        body_text: `${current.body_text.trim()}\n\n---\n\n${DEFAULT_MARKETING_FOOTER_TEXT}`,
      }
    })
  }

  async function saveCampaign(event: FormEvent) {
    event.preventDefault()

    if (!form.name.trim()) {
      setError('Campaign name is required.')
      return
    }

    if (!form.subject.trim()) {
      setError('Subject line is required.')
      return
    }

    if (!form.body_text.trim()) {
      setError('Campaign body is required.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    const method = form.id ? 'PATCH' : 'POST'

    const res = await fetch('/api/crm/marketing/campaigns', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setError(json?.error || 'Could not save campaign.')
      setSaving(false)
      return
    }

    if (json?.data) {
      setForm({
        id: json.data.id,
        name: json.data.name ?? '',
        subject: json.data.subject ?? '',
        preview_text: json.data.preview_text ?? '',
        body_text: json.data.body_text ?? '',
        audience_type: json.data.audience_type ?? 'client_contacts',
        status: json.data.status ?? 'draft',
        sender_name: json.data.sender_name ?? 'Educated Appointments',
        sender_email: json.data.sender_email ?? 'noreply@educatedappointments.co.uk',
        reply_to: json.data.reply_to ?? '',
        template_id: json.data.template_id ?? '',
      })
    }

    await loadCampaigns()

    setSuccess('Campaign draft saved.')
    setTimeout(() => setSuccess(null), 2500)
    setSaving(false)
  }

  async function cancelCampaign(campaign: Campaign) {
    const confirmed = window.confirm(
      `Cancel "${campaign.name}"? This will keep the campaign history but remove it from active draft use.`,
    )

    if (!confirmed) return

    setCancellingId(campaign.id)
    setError(null)
    setSuccess(null)

    const res = await fetch('/api/crm/marketing/campaigns', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: campaign.id }),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setError(json?.error || 'Could not cancel campaign.')
      setCancellingId(null)
      return
    }

    await loadCampaigns()
    setSuccess('Campaign cancelled.')
    setTimeout(() => setSuccess(null), 2500)
    setCancellingId(null)
  }

  return (
    <div className="crm-page">
      <div className="crm-page-header">
        <div>
          <h1 className="crm-page-title">Campaigns</h1>
          <p className="crm-page-sub">
            Create human, useful candidate availability campaigns before sending.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/crm/marketing/audience" className="crm-btn-secondary">
            Audience Preview
          </Link>
          <Link href="/crm/marketing/suppression" className="crm-btn-secondary">
            Suppression List
          </Link>
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
          <p className="crm-small-label">Total campaigns</p>
          <h2 style={{ margin: '6px 0 0' }}>{campaigns.length}</h2>
        </div>

        <div className="crm-card">
          <p className="crm-small-label">Drafts</p>
          <h2 style={{ margin: '6px 0 0' }}>{campaignCounts.draft || 0}</h2>
        </div>

        <div className="crm-card">
          <p className="crm-small-label">Ready</p>
          <h2 style={{ margin: '6px 0 0' }}>{campaignCounts.ready || 0}</h2>
        </div>

        <div className="crm-card">
          <p className="crm-small-label">Sent</p>
          <h2 style={{ margin: '6px 0 0' }}>{campaignCounts.sent || 0}</h2>
        </div>
      </div>

      <div className="crm-card" style={{ marginBottom: 18 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: 14,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>
              {form.id ? 'Edit campaign draft' : 'Create campaign draft'}
            </h2>
            <p className="crm-page-sub" style={{ margin: '4px 0 0' }}>
              No emails are sent from this screen. This only saves the draft.
            </p>
          </div>

          <button type="button" className="crm-btn-secondary" onClick={newCampaign}>
            + New draft
          </button>
        </div>

        <form onSubmit={saveCampaign}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            <label>
              <span className="crm-small-label">Campaign name</span>
              <input
                className="crm-input"
                value={form.name}
                onChange={event =>
                  setForm(current => ({ ...current, name: event.target.value }))
                }
                placeholder="Candidate availability - Electrical Tutors"
              />
            </label>

            <label>
              <span className="crm-small-label">Audience</span>
              <select
                className="crm-input"
                value={form.audience_type}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    audience_type: event.target.value,
                  }))
                }
              >
                {AUDIENCE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="crm-small-label">Status</span>
              <select
                className="crm-input"
                value={form.status}
                onChange={event =>
                  setForm(current => ({ ...current, status: event.target.value }))
                }
              >
                {STATUS_OPTIONS.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="crm-small-label">Template</span>
              <select
                className="crm-input"
                value={form.template_id}
                onChange={event => applyTemplate(event.target.value)}
              >
                <option value="">No template</option>
                {activeTemplates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
              marginTop: 12,
            }}
          >
            <label>
              <span className="crm-small-label">Subject</span>
              <input
                className="crm-input"
                value={form.subject}
                onChange={event =>
                  setForm(current => ({ ...current, subject: event.target.value }))
                }
                placeholder="Potential candidate availability"
              />
            </label>

            <label>
              <span className="crm-small-label">Preview text</span>
              <input
                className="crm-input"
                value={form.preview_text}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    preview_text: event.target.value,
                  }))
                }
                placeholder="A quick candidate update that may be useful..."
              />
            </label>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
              marginTop: 12,
            }}
          >
            <label>
              <span className="crm-small-label">Sender name</span>
              <input
                className="crm-input"
                value={form.sender_name}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    sender_name: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              <span className="crm-small-label">Sender email</span>
              <input
                className="crm-input"
                value={form.sender_email}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    sender_email: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              <span className="crm-small-label">Reply-to</span>
              <input
                className="crm-input"
                value={form.reply_to}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    reply_to: event.target.value,
                  }))
                }
                placeholder="Optional"
              />
            </label>
          </div>

          <label style={{ display: 'block', marginTop: 12 }}>
            <span className="crm-small-label">Email body</span>
            <textarea
              className="crm-input"
              rows={14}
              value={form.body_text}
              onChange={event =>
                setForm(current => ({ ...current, body_text: event.target.value }))
              }
              placeholder="Write your campaign email..."
            />
          </label>

          <div
            style={{
              marginTop: 10,
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              className="crm-btn-secondary"
              onClick={addFooterToBody}
              disabled={hasFooter(form.body_text)}
            >
              {hasFooter(form.body_text)
                ? 'Human unsubscribe footer included'
                : 'Add human unsubscribe footer'}
            </button>

            <span className="crm-page-sub">
              The save route will also add the footer automatically if it is missing.
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 16,
              flexWrap: 'wrap',
            }}
          >
            <button className="crm-btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save campaign draft'}
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
            <h2 style={{ margin: 0 }}>Saved campaigns</h2>
            <p className="crm-page-sub" style={{ margin: '4px 0 0' }}>
              Drafts are saved here before recipients are generated.
            </p>
          </div>

          {loading && <span className="crm-small-label">Loading...</span>}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(240px, 1fr) minmax(180px, 240px)',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <input
            className="crm-input"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search campaign name, subject or audience..."
          />

          <select
            className="crm-input"
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
            <option value="paused">Paused</option>
            <option value="sent">Sent</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="crm-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Subject</th>
                <th>Audience</th>
                <th>Status</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 && !loading && (
                <tr>
                  <td colSpan={6}>No campaigns found.</td>
                </tr>
              )}

              {campaigns.map(campaign => (
                <tr key={campaign.id}>
                  <td>
                    <strong>{campaign.name}</strong>
                    <p className="crm-table-sub">
                      Updated: {formatDate(campaign.updated_at)}
                    </p>
                  </td>
                  <td>
                    {campaign.subject}
                    {campaign.preview_text && (
                      <p className="crm-table-sub">{campaign.preview_text}</p>
                    )}
                  </td>
                  <td>{audienceLabel(campaign.audience_type)}</td>
                  <td>{statusLabel(campaign.status)}</td>
                  <td>{formatDate(campaign.created_at)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        gap: 8,
                        justifyContent: 'flex-end',
                      }}
                    >
                      <button
                        className="crm-btn-secondary"
                        type="button"
                        onClick={() => selectCampaign(campaign)}
                      >
                        Edit
                      </button>

                      {campaign.status !== 'cancelled' && campaign.status !== 'sent' && (
                        <button
                          className="crm-btn-secondary"
                          type="button"
                          onClick={() => cancelCampaign(campaign)}
                          disabled={cancellingId === campaign.id}
                        >
                          {cancellingId === campaign.id ? 'Cancelling...' : 'Cancel'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="crm-page-sub" style={{ marginTop: 12 }}>
          Sending is deliberately not available yet. Next we will create a recipient snapshot from the audience preview.
        </p>
      </div>
    </div>
  )
}