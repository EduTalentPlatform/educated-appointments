'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'

type Campaign = {
  id: string
  name: string
  subject: string
  preview_text: string | null
  body_text: string | null
  body_html: string | null
  audience_type: string
  campaign_type: string | null
  header_label: string | null
  hero_title: string | null
  cta_text: string | null
  cta_url: string | null
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
  campaign_type: string
  header_label: string
  hero_title: string
  cta_text: string
  cta_url: string
  status: string
  sender_name: string
  sender_email: string
  reply_to: string
  template_id: string
}

type CampaignRecipient = {
  id: string
  campaign_id: string
  source_type: string
  source_contact_id: string | null
  client_id: string | null
  lead_id: string | null
  company_name: string | null
  contact_name: string | null
  contact_title: string | null
  role_type: string | null
  email: string | null
  email_normalised: string | null
  status: string
  created_at: string
  sent_at: string | null
  delivered_at: string | null
  opened_at: string | null
  clicked_at: string | null
  bounced_at: string | null
  unsubscribed_at: string | null
}

type RecipientSummary = {
  total?: number
  pending?: number
  sent?: number
  delivered?: number
  opened?: number
  clicked?: number
  bounced?: number
  unsubscribed?: number
  failed?: number
  [key: string]: number | undefined
}

type SnapshotSummary = {
  campaign_id: string
  source: string
  total_checked: number
  eligible_count: number
  inserted_count: number
  excluded_count: number
  exclusion_counts: Record<string, number>
}

type LiveSendSummary = {
  attempted?: number
  sent?: number
  failed?: number
  skipped?: number
  remaining_pending?: number
}

type CampaignReport = {
  totals: {
    recipients?: number
    pending?: number
    sent?: number
    delivered?: number
    opened?: number
    clicked?: number
    bounced?: number
    failed?: number
    unsubscribed?: number
    delivery_delayed?: number
  }
  rates: {
    sent_rate?: number
    delivery_rate?: number
    open_rate?: number
    click_rate?: number
    bounce_rate?: number
    unsubscribe_rate?: number
    failure_rate?: number
  }
  status_counts: Record<string, number>
  event_counts: Record<string, number>
  latest_activity_at: string | null
  recent_events: Array<{
    id?: string
    event_type?: string
    created_at?: string
    event_payload?: Record<string, any> | null
  }>
  recent_recipients: CampaignRecipient[]
}

const AUDIENCE_TYPES = [
  { value: 'client_contacts', label: 'Client contacts' },
  { value: 'lead_contacts', label: 'Lead contacts' },
  { value: 'mixed', label: 'Clients and leads' },
]

const CAMPAIGN_TYPES = [
  { value: 'general', label: 'General update' },
  { value: 'candidate_availability', label: 'Candidate availability' },
  { value: 'client_newsletter', label: 'Client newsletter' },
  { value: 'sector_insight', label: 'Sector insight' },
  { value: 'hiring_advice', label: 'Hiring advice' },
  { value: 'crm_portal_update', label: 'CRM / portal update' },
  { value: 'compliance_update', label: 'Compliance update' },
  { value: 'event_invite', label: 'Event invite' },
  { value: 'case_study', label: 'Case study' },
]

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready' },
  { value: 'paused', label: 'Paused' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'sent', label: 'Sent' },
]

const SNAPSHOT_SOURCES = [
  { value: 'clients', label: 'Client contacts' },
  { value: 'leads', label: 'Lead contacts' },
  { value: 'all', label: 'Clients and leads' },
]

const ROLE_TYPE_OPTIONS = [
  { value: '', label: 'All role types' },
  { value: 'primary', label: 'Primary' },
  { value: 'hiring_manager', label: 'Hiring manager' },
  { value: 'decision_maker', label: 'Decision maker' },
  { value: 'hr', label: 'HR' },
  { value: 'finance', label: 'Finance' },
  { value: 'other', label: 'Other' },
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
    campaign_type: 'general',
    header_label: '',
    hero_title: '',
    cta_text: '',
    cta_url: '',
    status: 'draft',
    sender_name: 'Educated Appointments',
    sender_email: 'noreply@send.educatedappointments.co.uk',
    reply_to: 'info@educatedappointments.co.uk',
    template_id: '',
  }
}

function sourceFromAudienceType(audienceType: string) {
  if (audienceType === 'lead_contacts') return 'leads'
  if (audienceType === 'mixed') return 'all'
  return 'clients'
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

function campaignTypeLabel(value?: string | null) {
  return CAMPAIGN_TYPES.find(type => type.value === value)?.label || 'General update'
}

function sourceTypeLabel(value?: string | null) {
  if (value === 'client_contact') return 'Client'
  if (value === 'lead_contact') return 'Lead'
  return value || '—'
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

function formatPercent(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '0%'
  }

  return `${Number(value).toFixed(1).replace(/\.0$/, '')}%`
}

function hasFooter(body: string) {
  return body.includes('{{unsubscribe_url}}')
}

function formatExclusionReason(value: string) {
  return value
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function MarketingCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [form, setForm] = useState<CampaignForm>(() => emptyForm())

  const [recipients, setRecipients] = useState<CampaignRecipient[]>([])
  const [recipientSummary, setRecipientSummary] = useState<RecipientSummary>({})
  const [snapshotSummary, setSnapshotSummary] = useState<SnapshotSummary | null>(null)

  const [snapshotSource, setSnapshotSource] = useState('clients')
  const [snapshotRoleType, setSnapshotRoleType] = useState('')
  const [snapshotSearch, setSnapshotSearch] = useState('')
  const [snapshotPrimaryOnly, setSnapshotPrimaryOnly] = useState(false)
  const [snapshotIncludeUnknownConsent, setSnapshotIncludeUnknownConsent] = useState(true)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [recipientsLoading, setRecipientsLoading] = useState(false)
  const [generatingRecipients, setGeneratingRecipients] = useState(false)
  const [clearingRecipients, setClearingRecipients] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [recipientError, setRecipientError] = useState<string | null>(null)
  const [recipientSuccess, setRecipientSuccess] = useState<string | null>(null)

  const [testEmail, setTestEmail] = useState('educatedappointments@gmail.com')
  const [sendingTest, setSendingTest] = useState(false)
  const [testSendMessage, setTestSendMessage] = useState<string | null>(null)
  const [testSendError, setTestSendError] = useState<string | null>(null)

  const [liveSendLimit, setLiveSendLimit] = useState('25')
  const [liveSendConfirm, setLiveSendConfirm] = useState('')
  const [sendingLiveBatch, setSendingLiveBatch] = useState(false)
  const [liveSendSummary, setLiveSendSummary] = useState<LiveSendSummary | null>(null)
  const [liveSendMessage, setLiveSendMessage] = useState<string | null>(null)
  const [liveSendError, setLiveSendError] = useState<string | null>(null)

  const [campaignReport, setCampaignReport] = useState<CampaignReport | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)

  const campaignCounts = useMemo(() => {
    return campaigns.reduce<Record<string, number>>((acc, campaign) => {
      acc[campaign.status] = (acc[campaign.status] || 0) + 1
      return acc
    }, {})
  }, [campaigns])

  const activeTemplates = useMemo(() => {
    return templates.filter(template => template.is_active !== false)
  }, [templates])

  const selectedCampaign = useMemo(() => {
    return campaigns.find(campaign => campaign.id === form.id) || null
  }, [campaigns, form.id])

  const canClearRecipients = useMemo(() => {
    return recipients.length > 0 && recipients.every(recipient => recipient.status === 'pending')
  }, [recipients])

  const canSendLiveBatch = useMemo(() => {
    return (
      Boolean(form.id) &&
      form.status === 'ready' &&
      (recipientSummary.pending || 0) > 0 &&
      liveSendConfirm.trim() === 'SEND_CAMPAIGN' &&
      !sendingLiveBatch
    )
  }, [form.id, form.status, liveSendConfirm, recipientSummary.pending, sendingLiveBatch])

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

  useEffect(() => {
    if (!form.id) {
      setRecipients([])
      setRecipientSummary({})
      setSnapshotSummary(null)
      setCampaignReport(null)
      setReportError(null)
      return
    }

    loadRecipients(form.id)
    loadCampaignReport(form.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.id])

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

  async function loadRecipients(campaignId: string) {
    setRecipientsLoading(true)
    setRecipientError(null)

    const params = new URLSearchParams()
    params.set('campaign_id', campaignId)

    const res = await fetch(
      `/api/crm/marketing/campaign-recipients?${params.toString()}`,
      {
        cache: 'no-store',
      },
    )

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setRecipientError(json?.error || 'Could not load campaign recipients.')
      setRecipientsLoading(false)
      return
    }

    setRecipients(Array.isArray(json?.data) ? json.data : [])
    setRecipientSummary(json?.summary || {})
    setRecipientsLoading(false)
  }

  async function loadCampaignReport(campaignId: string) {
    setReportLoading(true)
    setReportError(null)

    const params = new URLSearchParams()
    params.set('campaign_id', campaignId)

    const res = await fetch(
      `/api/crm/marketing/campaign-reports?${params.toString()}`,
      {
        cache: 'no-store',
      },
    )

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setReportError(json?.error || 'Could not load campaign report.')
      setReportLoading(false)
      return
    }

    setCampaignReport(json?.data || null)
    setReportLoading(false)
  }

  async function sendTestEmail() {
    if (!form.id) {
      setTestSendError('Save the campaign before sending a test email.')
      return
    }

    if (!testEmail.trim()) {
      setTestSendError('Enter a test email address.')
      return
    }

    setSendingTest(true)
    setTestSendMessage(null)
    setTestSendError(null)

    const res = await fetch('/api/crm/marketing/campaigns/test-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: form.id,
        to: testEmail,
      }),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setTestSendError(json?.error || 'Could not send test email.')
      setSendingTest(false)
      return
    }

    setTestSendMessage(json?.message || `Test email sent to ${testEmail}.`)
    setSendingTest(false)

    setTimeout(() => setTestSendMessage(null), 3500)
  }

  async function sendLiveBatch() {
    if (!form.id) {
      setLiveSendError('Save the campaign before sending.')
      return
    }

    if (form.status !== 'ready') {
      setLiveSendError('Campaign must be ready before live sending. Generate and review recipients first.')
      return
    }

    if ((recipientSummary.pending || 0) <= 0) {
      setLiveSendError('There are no pending recipients to send.')
      return
    }

    if (liveSendConfirm.trim() !== 'SEND_CAMPAIGN') {
      setLiveSendError('Type SEND_CAMPAIGN to confirm this live send batch.')
      return
    }

    const confirmed = window.confirm(
      `Send this campaign to the next ${liveSendLimit} pending recipients? This is a live email send.`,
    )

    if (!confirmed) return

    setSendingLiveBatch(true)
    setLiveSendMessage(null)
    setLiveSendError(null)
    setLiveSendSummary(null)

    const res = await fetch('/api/crm/marketing/campaigns/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: form.id,
        confirm_send: 'SEND_CAMPAIGN',
        limit: Number(liveSendLimit) || 25,
      }),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setLiveSendError(json?.error || 'Could not send live campaign batch.')
      setSendingLiveBatch(false)
      return
    }

    setLiveSendSummary(json?.summary || null)
    setLiveSendMessage(json?.message || 'Live campaign batch processed.')
    setLiveSendConfirm('')

    await loadRecipients(form.id)
    await loadCampaignReport(form.id)
    await loadCampaigns()

    if (json?.summary?.remaining_pending === 0) {
      setForm(current => ({ ...current, status: 'sent' }))
    } else {
      setForm(current => ({ ...current, status: 'ready' }))
    }

    setSendingLiveBatch(false)
  }

  function selectCampaign(campaign: Campaign) {
    setForm({
      id: campaign.id,
      name: campaign.name ?? '',
      subject: campaign.subject ?? '',
      preview_text: campaign.preview_text ?? '',
      body_text: campaign.body_text ?? '',
      audience_type: campaign.audience_type ?? 'client_contacts',
      campaign_type: campaign.campaign_type ?? 'general',
      header_label: campaign.header_label ?? '',
      hero_title: campaign.hero_title ?? '',
      cta_text: campaign.cta_text ?? '',
      cta_url: campaign.cta_url ?? '',
      status: campaign.status ?? 'draft',
      sender_name: campaign.sender_name ?? 'Educated Appointments',
      sender_email: 'noreply@send.educatedappointments.co.uk',
      reply_to: 'info@educatedappointments.co.uk',
      template_id: campaign.template_id ?? '',
    })

    setSnapshotSource(sourceFromAudienceType(campaign.audience_type ?? 'client_contacts'))
    setSnapshotSummary(null)
    setError(null)
    setSuccess(null)
    setRecipientError(null)
    setRecipientSuccess(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function newCampaign() {
    const nextForm = emptyForm()
    setForm(nextForm)
    setSnapshotSource(sourceFromAudienceType(nextForm.audience_type))
    setSnapshotRoleType('')
    setSnapshotSearch('')
    setSnapshotPrimaryOnly(false)
    setSnapshotIncludeUnknownConsent(true)
    setRecipients([])
    setRecipientSummary({})
    setSnapshotSummary(null)
    setCampaignReport(null)
    setReportError(null)
    setError(null)
    setSuccess(null)
    setRecipientError(null)
    setRecipientSuccess(null)
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
        campaign_type: json.data.campaign_type ?? 'general',
        header_label: json.data.header_label ?? '',
        hero_title: json.data.hero_title ?? '',
        cta_text: json.data.cta_text ?? '',
        cta_url: json.data.cta_url ?? '',
        status: json.data.status ?? 'draft',
        sender_name: json.data.sender_name ?? 'Educated Appointments',
        sender_email: 'noreply@send.educatedappointments.co.uk',
      reply_to: 'info@educatedappointments.co.uk',
        template_id: json.data.template_id ?? '',
      })

      setSnapshotSource(sourceFromAudienceType(json.data.audience_type ?? 'client_contacts'))
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

  async function generateRecipients() {
    if (!form.id) {
      setRecipientError('Save the campaign before generating recipients.')
      return
    }

    const confirmed = window.confirm(
      'Generate a recipient snapshot for this campaign? Existing pending recipients for this campaign will be replaced.',
    )

    if (!confirmed) return

    setGeneratingRecipients(true)
    setRecipientError(null)
    setRecipientSuccess(null)
    setSnapshotSummary(null)

    const res = await fetch('/api/crm/marketing/campaign-recipients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: form.id,
        source: snapshotSource,
        role_type: snapshotRoleType,
        search: snapshotSearch,
        primary_only: snapshotPrimaryOnly,
        include_unknown_consent: snapshotIncludeUnknownConsent,
      }),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setRecipientError(json?.error || 'Could not generate campaign recipients.')
      setGeneratingRecipients(false)
      return
    }

    setSnapshotSummary(json?.summary || null)
    setRecipientSuccess(
      `Recipient snapshot generated. ${json?.summary?.inserted_count || 0} recipients added.`,
    )

    await loadRecipients(form.id)
    await loadCampaignReport(form.id)
    await loadCampaigns()

    setForm(current => ({
      ...current,
      status: current.status === 'draft' ? 'ready' : current.status,
    }))

    setTimeout(() => setRecipientSuccess(null), 3500)
    setGeneratingRecipients(false)
  }

  async function clearRecipients() {
    if (!form.id) return

    const confirmed = window.confirm(
      'Clear the current pending recipient snapshot? This is only allowed before any recipients have been sent.',
    )

    if (!confirmed) return

    setClearingRecipients(true)
    setRecipientError(null)
    setRecipientSuccess(null)
    setSnapshotSummary(null)

    const res = await fetch('/api/crm/marketing/campaign-recipients', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: form.id,
      }),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setRecipientError(json?.error || 'Could not clear campaign recipients.')
      setClearingRecipients(false)
      return
    }

    await loadRecipients(form.id)
    await loadCampaignReport(form.id)
    setRecipientSuccess(`Recipient snapshot cleared.`)
    setTimeout(() => setRecipientSuccess(null), 2500)
    setClearingRecipients(false)
  }

  return (
    <div className="crm-page">
      <div className="crm-page-header">
        <div>
          <h1 className="crm-page-title">Campaigns</h1>
          <p className="crm-page-sub">
            Create useful branded mailers, generate safe recipient snapshots, then review before sending.
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
          <p className="crm-small-label">Selected recipients</p>
          <h2 style={{ margin: '6px 0 0' }}>{recipientSummary.total || 0}</h2>
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
              No emails are sent from this screen. This saves the campaign and prepares it for review.
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
                placeholder="June employer update"
              />
            </label>

            <label>
              <span className="crm-small-label">Campaign type</span>
              <select
                className="crm-input"
                value={form.campaign_type}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    campaign_type: event.target.value,
                  }))
                }
              >
                {CAMPAIGN_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="crm-small-label">Audience</span>
              <select
                className="crm-input"
                value={form.audience_type}
                onChange={event => {
                  const nextAudienceType = event.target.value

                  setForm(current => ({
                    ...current,
                    audience_type: nextAudienceType,
                  }))
                  setSnapshotSource(sourceFromAudienceType(nextAudienceType))
                }}
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

            <label>
              <span className="crm-small-label">Header label</span>
              <input
                className="crm-input"
                value={form.header_label}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    header_label: event.target.value,
                  }))
                }
                placeholder="Useful hiring update"
              />
            </label>

            <label>
              <span className="crm-small-label">Hero title</span>
              <input
                className="crm-input"
                value={form.hero_title}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    hero_title: event.target.value,
                  }))
                }
                placeholder="Optional branded email heading"
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
              <span className="crm-small-label">Subject</span>
              <input
                className="crm-input"
                value={form.subject}
                onChange={event =>
                  setForm(current => ({ ...current, subject: event.target.value }))
                }
                placeholder="A useful update from Educated Appointments"
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
                placeholder="A quick update that may be useful..."
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
              <span className="crm-small-label">CTA button text</span>
              <input
                className="crm-input"
                value={form.cta_text}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    cta_text: event.target.value,
                  }))
                }
                placeholder="Optional, e.g. View the portal"
              />
            </label>

            <label>
              <span className="crm-small-label">CTA button URL</span>
              <input
                className="crm-input"
                value={form.cta_url}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    cta_url: event.target.value,
                  }))
                }
                placeholder="https://..."
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

      {form.id && (
        <div className="crm-card" style={{ marginBottom: 18 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              marginBottom: 14,
            }}
          >
            <div>
              <h2 style={{ margin: 0 }}>Recipient snapshot</h2>
              <p className="crm-page-sub" style={{ margin: '4px 0 0' }}>
                Freeze a safe recipient list for this campaign before sending.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="crm-btn-secondary"
                onClick={() => loadRecipients(form.id)}
                disabled={recipientsLoading}
              >
                {recipientsLoading ? 'Refreshing...' : 'Refresh recipients'}
              </button>

              <button
                type="button"
                className="crm-btn-primary"
                onClick={generateRecipients}
                disabled={generatingRecipients}
              >
                {generatingRecipients ? 'Generating...' : 'Generate recipients'}
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 14,
              marginBottom: 16,
            }}
          >
            <div className="crm-card" style={{ boxShadow: 'none' }}>
              <p className="crm-small-label">Recipients</p>
              <h2 style={{ margin: '6px 0 0' }}>{recipientSummary.total || 0}</h2>
            </div>

            <div className="crm-card" style={{ boxShadow: 'none' }}>
              <p className="crm-small-label">Pending</p>
              <h2 style={{ margin: '6px 0 0' }}>{recipientSummary.pending || 0}</h2>
            </div>

            <div className="crm-card" style={{ boxShadow: 'none' }}>
              <p className="crm-small-label">Campaign status</p>
              <h2 style={{ margin: '6px 0 0' }}>{statusLabel(form.status)}</h2>
            </div>

            <div className="crm-card" style={{ boxShadow: 'none' }}>
              <p className="crm-small-label">Campaign type</p>
              <h2 style={{ margin: '6px 0 0' }}>{campaignTypeLabel(form.campaign_type)}</h2>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
              marginBottom: 14,
            }}
          >
            <label>
              <span className="crm-small-label">Snapshot source</span>
              <select
                className="crm-input"
                value={snapshotSource}
                onChange={event => setSnapshotSource(event.target.value)}
              >
                {SNAPSHOT_SOURCES.map(source => (
                  <option key={source.value} value={source.value}>
                    {source.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="crm-small-label">Role type</span>
              <select
                className="crm-input"
                value={snapshotRoleType}
                onChange={event => setSnapshotRoleType(event.target.value)}
              >
                {ROLE_TYPE_OPTIONS.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="crm-small-label">Search/filter</span>
              <input
                className="crm-input"
                value={snapshotSearch}
                onChange={event => setSnapshotSearch(event.target.value)}
                placeholder="Company, contact, title, email..."
              />
            </label>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={snapshotPrimaryOnly}
                onChange={event => setSnapshotPrimaryOnly(event.target.checked)}
              />
              <span>Primary contacts only</span>
            </label>

            <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={snapshotIncludeUnknownConsent}
                onChange={event => setSnapshotIncludeUnknownConsent(event.target.checked)}
              />
              <span>Include unknown marketing consent</span>
            </label>

            {canClearRecipients && (
              <button
                type="button"
                className="crm-btn-secondary"
                onClick={clearRecipients}
                disabled={clearingRecipients}
              >
                {clearingRecipients ? 'Clearing...' : 'Clear pending snapshot'}
              </button>
            )}
          </div>

          {recipientSuccess && (
            <p style={{ color: '#217822', fontWeight: 700 }}>{recipientSuccess}</p>
          )}

          {recipientError && (
            <p style={{ color: '#e53e3e', fontWeight: 700 }}>{recipientError}</p>
          )}

          {snapshotSummary && (
            <div
              style={{
                marginBottom: 16,
                padding: 14,
                borderRadius: 14,
                background: '#f8fafc',
                border: '1px solid #e5e7eb',
              }}
            >
              <strong>Snapshot result:</strong>{' '}
              {snapshotSummary.inserted_count} recipients inserted from{' '}
              {snapshotSummary.total_checked} checked.{' '}
              {snapshotSummary.excluded_count} excluded.

              {Object.keys(snapshotSummary.exclusion_counts || {}).length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <span className="crm-small-label">Exclusions</span>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {Object.entries(snapshotSummary.exclusion_counts).map(([reason, count]) => (
                      <span
                        key={reason}
                        style={{
                          display: 'inline-flex',
                          gap: 6,
                          padding: '6px 10px',
                          borderRadius: 999,
                          background: '#ffffff',
                          border: '1px solid #e5e7eb',
                          fontSize: 13,
                        }}
                      >
                        <strong>{formatExclusionReason(reason)}</strong>
                        {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Company</th>
                  <th>Source</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {recipients.length === 0 && !recipientsLoading && (
                  <tr>
                    <td colSpan={7}>No recipients generated yet.</td>
                  </tr>
                )}

                {recipientsLoading && (
                  <tr>
                    <td colSpan={7}>Loading recipients...</td>
                  </tr>
                )}

                {recipients.slice(0, 100).map(recipient => (
                  <tr key={recipient.id}>
                    <td>
                      <strong>{recipient.contact_name || 'Unnamed contact'}</strong>
                      {recipient.contact_title && (
                        <p className="crm-table-sub">{recipient.contact_title}</p>
                      )}
                    </td>
                    <td>{recipient.company_name || '—'}</td>
                    <td>{sourceTypeLabel(recipient.source_type)}</td>
                    <td>{recipient.role_type || '—'}</td>
                    <td>{recipient.email || '—'}</td>
                    <td>{statusLabel(recipient.status || 'pending')}</td>
                    <td>{formatDate(recipient.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {recipients.length > 100 && (
            <p className="crm-page-sub" style={{ marginTop: 12 }}>
              Showing the first 100 recipients. Full sending will still use the complete snapshot.
            </p>
          )}

          <p className="crm-page-sub" style={{ marginTop: 12 }}>
            Review this list carefully before using the live send panel below.
          </p>
        </div>
      )}

      {form.id && (
  <div className="crm-card" style={{ marginBottom: 18 }}>
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        marginBottom: 14,
      }}
    >
      <div>
        <h2 style={{ margin: 0 }}>Send test email</h2>
        <p className="crm-page-sub" style={{ margin: '4px 0 0' }}>
          Send this campaign to yourself first to check the branding, layout, links and wording.
        </p>
      </div>
    </div>

    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(240px, 1fr) auto',
        gap: 12,
        alignItems: 'end',
      }}
    >
      <label>
        <span className="crm-small-label">Test email address</span>
        <input
          className="crm-input"
          value={testEmail}
          onChange={event => setTestEmail(event.target.value)}
          placeholder="educatedappointments@gmail.com"
        />
      </label>

      <button
        type="button"
        className="crm-btn-primary"
        onClick={sendTestEmail}
        disabled={sendingTest}
      >
        {sendingTest ? 'Sending...' : 'Send test'}
      </button>
    </div>

    {testSendMessage && (
      <p style={{ color: '#217822', fontWeight: 700, marginTop: 12 }}>
        {testSendMessage}
      </p>
    )}

    {testSendError && (
      <p style={{ color: '#e53e3e', fontWeight: 700, marginTop: 12 }}>
        {testSendError}
      </p>
    )}

    <p className="crm-page-sub" style={{ marginTop: 12 }}>
      This only sends to the test address. It does not update campaign recipient statuses or send to the full snapshot.
    </p>
  </div>
)}


      {form.id && (
        <div className="crm-card" style={{ marginBottom: 18 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              marginBottom: 14,
            }}
          >
            <div>
              <h2 style={{ margin: 0 }}>Live send</h2>
              <p className="crm-page-sub" style={{ margin: '4px 0 0' }}>
                Send this campaign in controlled batches after you have tested it and reviewed the recipient snapshot.
              </p>
            </div>
          </div>

          <div
            style={{
              padding: 14,
              borderRadius: 14,
              background: '#fff7ed',
              border: '1px solid #fed7aa',
              marginBottom: 14,
            }}
          >
            <strong>Live send warning:</strong>{' '}
            This will send real emails to pending recipients in the snapshot. Test the campaign first and check the recipient list before continuing.
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 14,
              marginBottom: 16,
            }}
          >
            <div className="crm-card" style={{ boxShadow: 'none' }}>
              <p className="crm-small-label">Campaign status</p>
              <h2 style={{ margin: '6px 0 0' }}>{statusLabel(form.status)}</h2>
            </div>

            <div className="crm-card" style={{ boxShadow: 'none' }}>
              <p className="crm-small-label">Total recipients</p>
              <h2 style={{ margin: '6px 0 0' }}>{recipientSummary.total || 0}</h2>
            </div>

            <div className="crm-card" style={{ boxShadow: 'none' }}>
              <p className="crm-small-label">Pending</p>
              <h2 style={{ margin: '6px 0 0' }}>{recipientSummary.pending || 0}</h2>
            </div>

            <div className="crm-card" style={{ boxShadow: 'none' }}>
              <p className="crm-small-label">Sent/tracked</p>
              <h2 style={{ margin: '6px 0 0' }}>
                {(recipientSummary.sent || 0) +
                  (recipientSummary.delivered || 0) +
                  (recipientSummary.opened || 0) +
                  (recipientSummary.clicked || 0)}
              </h2>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
              alignItems: 'end',
            }}
          >
            <label>
              <span className="crm-small-label">Batch size</span>
              <select
                className="crm-input"
                value={liveSendLimit}
                onChange={event => setLiveSendLimit(event.target.value)}
              >
                <option value="10">10 recipients</option>
                <option value="25">25 recipients</option>
                <option value="50">50 recipients</option>
                <option value="100">100 recipients</option>
              </select>
            </label>

            <label>
              <span className="crm-small-label">Type SEND_CAMPAIGN to confirm</span>
              <input
                className="crm-input"
                value={liveSendConfirm}
                onChange={event => setLiveSendConfirm(event.target.value)}
                placeholder="SEND_CAMPAIGN"
              />
            </label>

            <button
              type="button"
              className="crm-btn-primary"
              onClick={sendLiveBatch}
              disabled={!canSendLiveBatch}
            >
              {sendingLiveBatch ? 'Sending batch...' : 'Send live batch'}
            </button>
          </div>

          {form.status !== 'ready' && (
            <p className="crm-page-sub" style={{ marginTop: 12 }}>
              Campaign status must be Ready before live sending. Generate recipients first, then review the list.
            </p>
          )}

          {(recipientSummary.pending || 0) <= 0 && form.status === 'ready' && (
            <p className="crm-page-sub" style={{ marginTop: 12 }}>
              There are no pending recipients left to send.
            </p>
          )}

          {liveSendMessage && (
            <p style={{ color: '#217822', fontWeight: 700, marginTop: 12 }}>
              {liveSendMessage}
            </p>
          )}

          {liveSendError && (
            <p style={{ color: '#e53e3e', fontWeight: 700, marginTop: 12 }}>
              {liveSendError}
            </p>
          )}

          {liveSendSummary && (
            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 14,
                background: '#f8fafc',
                border: '1px solid #e5e7eb',
              }}
            >
              <strong>Batch result:</strong>{' '}
              Attempted {liveSendSummary.attempted || 0}. Sent {liveSendSummary.sent || 0}. Failed {liveSendSummary.failed || 0}. Skipped {liveSendSummary.skipped || 0}. Remaining pending {liveSendSummary.remaining_pending || 0}.
            </div>
          )}

          <p className="crm-page-sub" style={{ marginTop: 12 }}>
            The send route re-checks suppression, creates a unique unsubscribe link per recipient, and updates recipient statuses after each send.
          </p>
        </div>
      )}

      {form.id && (
        <div className="crm-card" style={{ marginBottom: 18 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              marginBottom: 14,
            }}
          >
            <div>
              <h2 style={{ margin: 0 }}>Campaign report</h2>
              <p className="crm-page-sub" style={{ margin: '4px 0 0' }}>
                Track delivery, engagement and issues for the selected campaign.
              </p>
            </div>

            <button
              type="button"
              className="crm-btn-secondary"
              onClick={() => loadCampaignReport(form.id)}
              disabled={reportLoading}
            >
              {reportLoading ? 'Refreshing...' : 'Refresh report'}
            </button>
          </div>

          {reportError && (
            <p style={{ color: '#e53e3e', fontWeight: 700 }}>{reportError}</p>
          )}

          {!campaignReport && !reportLoading && !reportError && (
            <p className="crm-page-sub">
              No reporting data yet. Generate recipients and send a test/live batch to start building the report.
            </p>
          )}

          {reportLoading && (
            <p className="crm-page-sub">Loading campaign report...</p>
          )}

          {campaignReport && (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 14,
                  marginBottom: 16,
                }}
              >
                <div className="crm-card" style={{ boxShadow: 'none' }}>
                  <p className="crm-small-label">Recipients</p>
                  <h2 style={{ margin: '6px 0 0' }}>{campaignReport.totals.recipients || 0}</h2>
                </div>

                <div className="crm-card" style={{ boxShadow: 'none' }}>
                  <p className="crm-small-label">Sent</p>
                  <h2 style={{ margin: '6px 0 0' }}>{campaignReport.totals.sent || 0}</h2>
                </div>

                <div className="crm-card" style={{ boxShadow: 'none' }}>
                  <p className="crm-small-label">Delivered</p>
                  <h2 style={{ margin: '6px 0 0' }}>{campaignReport.totals.delivered || 0}</h2>
                </div>

                <div className="crm-card" style={{ boxShadow: 'none' }}>
                  <p className="crm-small-label">Opened</p>
                  <h2 style={{ margin: '6px 0 0' }}>{campaignReport.totals.opened || 0}</h2>
                </div>

                <div className="crm-card" style={{ boxShadow: 'none' }}>
                  <p className="crm-small-label">Clicked</p>
                  <h2 style={{ margin: '6px 0 0' }}>{campaignReport.totals.clicked || 0}</h2>
                </div>

                <div className="crm-card" style={{ boxShadow: 'none' }}>
                  <p className="crm-small-label">Bounced</p>
                  <h2 style={{ margin: '6px 0 0' }}>{campaignReport.totals.bounced || 0}</h2>
                </div>

                <div className="crm-card" style={{ boxShadow: 'none' }}>
                  <p className="crm-small-label">Unsubscribed</p>
                  <h2 style={{ margin: '6px 0 0' }}>{campaignReport.totals.unsubscribed || 0}</h2>
                </div>

                <div className="crm-card" style={{ boxShadow: 'none' }}>
                  <p className="crm-small-label">Failed</p>
                  <h2 style={{ margin: '6px 0 0' }}>{campaignReport.totals.failed || 0}</h2>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 14,
                  marginBottom: 16,
                }}
              >
                <div className="crm-card" style={{ boxShadow: 'none' }}>
                  <p className="crm-small-label">Delivery rate</p>
                  <h2 style={{ margin: '6px 0 0' }}>{formatPercent(campaignReport.rates.delivery_rate)}</h2>
                </div>

                <div className="crm-card" style={{ boxShadow: 'none' }}>
                  <p className="crm-small-label">Open rate</p>
                  <h2 style={{ margin: '6px 0 0' }}>{formatPercent(campaignReport.rates.open_rate)}</h2>
                </div>

                <div className="crm-card" style={{ boxShadow: 'none' }}>
                  <p className="crm-small-label">Click rate</p>
                  <h2 style={{ margin: '6px 0 0' }}>{formatPercent(campaignReport.rates.click_rate)}</h2>
                </div>

                <div className="crm-card" style={{ boxShadow: 'none' }}>
                  <p className="crm-small-label">Bounce rate</p>
                  <h2 style={{ margin: '6px 0 0' }}>{formatPercent(campaignReport.rates.bounce_rate)}</h2>
                </div>

                <div className="crm-card" style={{ boxShadow: 'none' }}>
                  <p className="crm-small-label">Unsubscribe rate</p>
                  <h2 style={{ margin: '6px 0 0' }}>{formatPercent(campaignReport.rates.unsubscribe_rate)}</h2>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 16,
                }}
              >
                <div>
                  <h3 style={{ marginTop: 0 }}>Recent activity</h3>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="crm-table">
                      <thead>
                        <tr>
                          <th>Event</th>
                          <th>When</th>
                          <th>Detail</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaignReport.recent_events.length === 0 && (
                          <tr>
                            <td colSpan={3}>No events yet.</td>
                          </tr>
                        )}

                        {campaignReport.recent_events.slice(0, 10).map((event, index) => (
                          <tr key={event.id || `${event.event_type}-${index}`}>
                            <td>{statusLabel(event.event_type || 'event')}</td>
                            <td>{formatDate(event.created_at)}</td>
                            <td>
                              {event.event_payload?.url ||
                                event.event_payload?.email ||
                                event.event_payload?.resend_email_id ||
                                '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 style={{ marginTop: 0 }}>Recently active recipients</h3>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="crm-table">
                      <thead>
                        <tr>
                          <th>Contact</th>
                          <th>Status</th>
                          <th>Latest</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaignReport.recent_recipients.length === 0 && (
                          <tr>
                            <td colSpan={3}>No recipient activity yet.</td>
                          </tr>
                        )}

                        {campaignReport.recent_recipients.slice(0, 10).map(recipient => (
                          <tr key={recipient.id}>
                            <td>
                              <strong>{recipient.contact_name || 'Unnamed contact'}</strong>
                              <p className="crm-table-sub">{recipient.email || '—'}</p>
                            </td>
                            <td>{statusLabel(recipient.status || 'pending')}</td>
                            <td>
                              {formatDate(
                                recipient.clicked_at ||
                                  recipient.opened_at ||
                                  recipient.delivered_at ||
                                  recipient.sent_at ||
                                  recipient.created_at,
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <p className="crm-page-sub" style={{ marginTop: 12 }}>
                Open and click tracking can be helpful, but it is not perfect. Treat it as a useful signal rather than absolute proof someone read every word.
              </p>
            </>
          )}
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
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Saved campaigns</h2>
            <p className="crm-page-sub" style={{ margin: '4px 0 0' }}>
              Select a campaign to edit it or generate recipients.
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
                <th>Type</th>
                <th>Audience</th>
                <th>Status</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 && !loading && (
                <tr>
                  <td colSpan={7}>No campaigns found.</td>
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
                  <td>{campaignTypeLabel(campaign.campaign_type)}</td>
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
          Select a campaign above to test, generate recipients and send controlled live batches.
        </p>
      </div>
    </div>
  )
}