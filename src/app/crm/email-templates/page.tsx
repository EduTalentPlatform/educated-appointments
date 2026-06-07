'use client'

import { useEffect, useMemo, useState } from 'react'

type EmailTemplate = {
  id: string
  name: string
  template_type: string
  subject: string
  body: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

type TemplateForm = {
  id: string
  name: string
  template_type: string
  subject: string
  body: string
  description: string
  is_active: boolean
}

const TEMPLATE_TYPES = [
  { value: 'candidate_outreach', label: 'Candidate outreach' },
  { value: 'client_outreach', label: 'Client outreach' },
  { value: 'client_interview_confirmation', label: 'Client interview confirmation' },
  { value: 'candidate_profile_submission', label: 'Candidate profile submission' },
  { value: 'candidate_document_request', label: 'Candidate document request' },
  { value: 'candidate_rejection', label: 'Candidate rejection / not suitable' },
  { value: 'employer_feedback', label: 'Employer feedback to candidate' },
  { value: 'offer_confirmation', label: 'Offer confirmation' },
  { value: 'placement_confirmation', label: 'Placement confirmation' },
  { value: 'reference_request', label: 'Reference request' },
  { value: 'bd_follow_up', label: 'BD follow-up' },
  { value: 'general', label: 'General' },
]

const MERGE_FIELDS = [
  {
    group: 'Candidate',
    fields: [
      '{{candidate.first_name}}',
      '{{candidate.last_name}}',
      '{{candidate.full_name}}',
      '{{candidate.email}}',
      '{{candidate.phone}}',
      '{{candidate.location}}',
      '{{candidate.notice_period}}',
      '{{candidate.salary_expected}}',
      '{{candidate.dbs_status}}',
      '{{candidate.linkedin}}',
    ],
  },
  {
    group: 'Client',
    fields: [
      '{{client.company_name}}',
      '{{client.contact_name}}',
      '{{client.email}}',
      '{{client.website}}',
    ],
  },
  {
    group: 'Vacancy',
    fields: [
      '{{vacancy.title}}',
      '{{vacancy.location}}',
      '{{vacancy.region}}',
      '{{vacancy.salary_display}}',
    ],
  },
  {
    group: 'Application',
    fields: [
      '{{application.profile_text}}',
      '{{application.ea_interview_notes}}',
      '{{application.cover_note}}',
    ],
  },
  {
    group: 'Interview',
    fields: [
      '{{interview.date}}',
      '{{interview.time}}',
      '{{interview.location}}',
      '{{interview.instructions}}',
    ],
  },
]

const PREVIEW_CONTEXT: Record<string, string> = {
  '{{candidate.first_name}}': 'Sarah',
  '{{candidate.last_name}}': 'Example',
  '{{candidate.full_name}}': 'Sarah Example',
  '{{candidate.email}}': 'sarah@example.com',
  '{{candidate.phone}}': '07123 456789',
  '{{candidate.location}}': 'Derbyshire',
  '{{candidate.notice_period}}': '4 weeks',
  '{{candidate.salary_expected}}': '£38,000',
  '{{candidate.dbs_status}}': 'On update service',
  '{{candidate.linkedin}}': 'https://www.linkedin.com/in/example',

  '{{client.company_name}}': 'Example Training Ltd',
  '{{client.contact_name}}': 'James',
  '{{client.email}}': 'james@exampletraining.co.uk',
  '{{client.website}}': 'www.exampletraining.co.uk',

  '{{vacancy.title}}': 'Account Manager',
  '{{vacancy.location}}': 'Derby',
  '{{vacancy.region}}': 'East Midlands',
  '{{vacancy.salary_display}}': '£35,000 - £40,000',

  '{{application.profile_text}}':
    'Candidate profile summary will appear here when generated from an application.',
  '{{application.ea_interview_notes}}':
    'EA interview notes will appear here when generated from an application.',
  '{{application.cover_note}}': 'Cover note will appear here.',

  '{{interview.date}}': '24 June 2026',
  '{{interview.time}}': '10:00am',
  '{{interview.location}}': 'Client office address or Teams link',
  '{{interview.instructions}}': 'Please arrive 10 minutes early and ask for reception.',
}

function emptyForm(): TemplateForm {
  return {
    id: '',
    name: '',
    template_type: 'general',
    subject: '',
    body: '',
    description: '',
    is_active: true,
  }
}

function getTemplateTypeLabel(value: string) {
  return TEMPLATE_TYPES.find(type => type.value === value)?.label || value
}

function renderPreview(text: string) {
  let output = text || ''

  Object.entries(PREVIEW_CONTEXT).forEach(([key, value]) => {
    output = output.split(key).join(value)
  })

  return output
}

function appendMergeFieldToBody(
  field: string,
  setForm: React.Dispatch<React.SetStateAction<TemplateForm>>,
) {
  setForm(current => {
    const currentBody = current.body || ''
    const needsSpacing =
      currentBody.length > 0 &&
      !currentBody.endsWith(' ') &&
      !currentBody.endsWith('\n')

    return {
      ...current,
      body: `${currentBody}${needsSpacing ? ' ' : ''}${field}`,
    }
  })
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [form, setForm] = useState<TemplateForm>(() => emptyForm())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState('all')
  const [showInactive, setShowInactive] = useState(false)
  const [copiedPreview, setCopiedPreview] = useState(false)

  useEffect(() => {
    loadTemplates()
  }, [])

  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      if (!showInactive && template.is_active === false) return false
      if (filterType !== 'all' && template.template_type !== filterType) return false
      return true
    })
  }, [templates, filterType, showInactive])

  const previewSubject = useMemo(() => renderPreview(form.subject), [form.subject])
  const previewBody = useMemo(() => renderPreview(form.body), [form.body])

  async function loadTemplates() {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/crm/email-templates', {
      cache: 'no-store',
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setError(json?.error || 'Could not load email templates.')
      setLoading(false)
      return
    }

    setTemplates(Array.isArray(json?.data) ? json.data : [])
    setLoading(false)
  }

  function selectTemplate(template: EmailTemplate) {
    setForm({
      id: template.id,
      name: template.name ?? '',
      template_type: template.template_type ?? 'general',
      subject: template.subject ?? '',
      body: template.body ?? '',
      description: template.description ?? '',
      is_active: template.is_active !== false,
    })

    setSaved(false)
    setCopiedPreview(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function newTemplate() {
    setForm(emptyForm())
    setSaved(false)
    setCopiedPreview(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveTemplate() {
    if (!form.name.trim()) {
      alert('Template name is required.')
      return
    }

    if (!form.template_type.trim()) {
      alert('Template type is required.')
      return
    }

    setSaving(true)
    setError(null)

    const method = form.id ? 'PATCH' : 'POST'

    const res = await fetch('/api/crm/email-templates', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setError(json?.error || 'Could not save email template.')
      setSaving(false)
      return
    }

    if (json?.data) {
      setForm({
        id: json.data.id,
        name: json.data.name ?? '',
        template_type: json.data.template_type ?? 'general',
        subject: json.data.subject ?? '',
        body: json.data.body ?? '',
        description: json.data.description ?? '',
        is_active: json.data.is_active !== false,
      })
    }

    await loadTemplates()

    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
    setSaving(false)
  }

  async function deactivateTemplate() {
    if (!form.id) return

    const confirmed = window.confirm(
      'Deactivate this template? You can reactivate it later.',
    )

    if (!confirmed) return

    setSaving(true)

    const res = await fetch('/api/crm/email-templates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: form.id }),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      alert(json?.error || 'Could not deactivate template.')
      setSaving(false)
      return
    }

    await loadTemplates()
    newTemplate()
    setSaving(false)
  }

  async function duplicateTemplate() {
    if (!form.name.trim()) return

    setSaving(true)

    const res = await fetch('/api/crm/email-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        id: '',
        name: `${form.name} copy`,
      }),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      alert(json?.error || 'Could not duplicate template.')
      setSaving(false)
      return
    }

    await loadTemplates()

    if (json?.data) {
      selectTemplate(json.data)
    }

    setSaving(false)
  }

  async function copyPreview() {
    const text = [`Subject: ${previewSubject}`, '', previewBody].join('\n')

    await navigator.clipboard.writeText(text)

    setCopiedPreview(true)
    setTimeout(() => setCopiedPreview(false), 1800)
  }

  return (
    <div className="crm-page">
      <div className="crm-page-header">
        <div>
          <p className="crm-eyebrow">CRM Admin</p>
          <h1 className="crm-page-title">Email Templates</h1>
          <p style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: 13 }}>
            Create reusable email templates with merge fields for candidates,
            clients, vacancies, applications and interviews.
          </p>
        </div>

        <button type="button" className="crm-btn-primary" onClick={newTemplate}>
          + New template
        </button>
      </div>

      {error && (
        <div
          className="crm-card"
          style={{
            border: '1px solid #fecaca',
            background: '#fef2f2',
            color: '#991b1b',
            marginBottom: 14,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 360px',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                <p className="crm-card-title">
                  {form.id ? 'Edit template' : 'Create template'}
                </p>
                <p
                  style={{
                    margin: 0,
                    marginTop: 4,
                    fontSize: 12,
                    color: 'var(--text-muted)',
                  }}
                >
                  Use merge fields such as {'{{candidate.first_name}}'} to
                  personalise emails.
                </p>
              </div>

              {saved && (
                <span className="crm-badge crm-badge-green">Saved</span>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 260px',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div className="crm-field">
                <label className="crm-label">Template name</label>
                <input
                  className="crm-input"
                  value={form.name}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g. Client Interview Confirmation"
                />
              </div>

              <div className="crm-field">
                <label className="crm-label">Template type</label>
                <select
                  className="crm-select"
                  value={form.template_type}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      template_type: event.target.value,
                    }))
                  }
                >
                  {TEMPLATE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="crm-field" style={{ marginBottom: 12 }}>
              <label className="crm-label">Description</label>
              <input
                className="crm-input"
                value={form.description}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Internal note about when to use this template..."
              />
            </div>

            <div className="crm-field" style={{ marginBottom: 12 }}>
              <label className="crm-label">Subject</label>
              <input
                className="crm-input"
                value={form.subject}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    subject: event.target.value,
                  }))
                }
                placeholder="e.g. Interview confirmation - {{vacancy.title}}"
              />
            </div>

            <div className="crm-field">
              <label className="crm-label">Body</label>
              <textarea
                className="crm-input"
                rows={18}
                value={form.body}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    body: event.target.value,
                  }))
                }
                placeholder="Write the reusable email template..."
                style={{ lineHeight: 1.65, fontFamily: 'inherit' }}
              />
            </div>

            <div
              style={{
                marginTop: 14,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--text-dark)',
                }}
              >
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      is_active: event.target.checked,
                    }))
                  }
                />
                Active template
              </label>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {form.id && (
                  <>
                    <button
                      type="button"
                      className="crm-btn-ghost crm-btn-sm"
                      onClick={duplicateTemplate}
                      disabled={saving}
                    >
                      Duplicate
                    </button>

                    <button
                      type="button"
                      className="crm-btn-ghost crm-btn-sm"
                      onClick={deactivateTemplate}
                      disabled={saving}
                    >
                      Deactivate
                    </button>
                  </>
                )}

                <button
                  type="button"
                  className="crm-btn-primary"
                  onClick={saveTemplate}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save template'}
                </button>
              </div>
            </div>
          </div>

          <div className="crm-card">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <div>
                <p className="crm-card-title">Preview</p>
                <p
                  style={{
                    margin: 0,
                    marginTop: 4,
                    fontSize: 12,
                    color: 'var(--text-muted)',
                  }}
                >
                  This shows example data so you can check the wording.
                </p>
              </div>

              <button
                type="button"
                className="crm-btn-ghost crm-btn-sm"
                onClick={copyPreview}
              >
                {copiedPreview ? 'Copied ✓' : 'Copy preview'}
              </button>
            </div>

            <div
              style={{
                border: '1px solid var(--border-light)',
                borderRadius: 12,
                overflow: 'hidden',
                background: '#fff',
              }}
            >
              <div
                style={{
                  padding: 12,
                  borderBottom: '1px solid var(--border-light)',
                  background: '#f8fafc',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    fontWeight: 900,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.7,
                  }}
                >
                  Subject
                </p>
                <p
                  style={{
                    margin: 0,
                    marginTop: 4,
                    fontSize: 13,
                    fontWeight: 800,
                    color: 'var(--text-dark)',
                  }}
                >
                  {previewSubject || 'No subject yet'}
                </p>
              </div>

              <pre
                style={{
                  margin: 0,
                  padding: 14,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  lineHeight: 1.65,
                  color: 'var(--text-dark)',
                  minHeight: 160,
                }}
              >
                {previewBody || 'No body yet'}
              </pre>
            </div>
          </div>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="crm-card">
            <p className="crm-card-title" style={{ marginBottom: 12 }}>
              Template library
            </p>

            <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
              <select
                className="crm-select crm-select-sm"
                value={filterType}
                onChange={event => setFilterType(event.target.value)}
              >
                <option value="all">All template types</option>
                {TEMPLATE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  fontWeight: 700,
                }}
              >
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={event => setShowInactive(event.target.checked)}
                />
                Show inactive templates
              </label>
            </div>

            {loading ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Loading templates...
              </p>
            ) : filteredTemplates.length === 0 ? (
              <div
                style={{
                  padding: 14,
                  border: '1px dashed var(--border)',
                  borderRadius: 12,
                  background: '#f8fafc',
                  textAlign: 'center',
                }}
              >
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800 }}>
                  No templates found
                </p>
                <p
                  style={{
                    margin: 0,
                    marginTop: 4,
                    fontSize: 12,
                    color: 'var(--text-muted)',
                  }}
                >
                  Create your first template on the left.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {filteredTemplates.map(template => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => selectTemplate(template)}
                    style={{
                      textAlign: 'left',
                      border:
                        form.id === template.id
                          ? '1.5px solid var(--primary)'
                          : '1px solid var(--border-light)',
                      background:
                        form.id === template.id ? '#eef2ff' : '#fff',
                      borderRadius: 12,
                      padding: 11,
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 8,
                        alignItems: 'flex-start',
                      }}
                    >
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 13,
                            fontWeight: 900,
                            color:
                              form.id === template.id
                                ? 'var(--primary)'
                                : 'var(--text-dark)',
                          }}
                        >
                          {template.name}
                        </p>

                        <p
                          style={{
                            margin: 0,
                            marginTop: 3,
                            fontSize: 11,
                            color: 'var(--text-muted)',
                          }}
                        >
                          {getTemplateTypeLabel(template.template_type)}
                        </p>
                      </div>

                      <span
                        className={`crm-badge ${
                          template.is_active ? 'crm-badge-green' : ''
                        }`}
                      >
                        {template.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="crm-card">
            <p className="crm-card-title" style={{ marginBottom: 10 }}>
              Merge fields
            </p>

            <p
              style={{
                margin: 0,
                marginBottom: 12,
                fontSize: 12,
                color: 'var(--text-muted)',
                lineHeight: 1.5,
              }}
            >
              Click a field to add it to the email body. You can also paste it
              into the subject line.
            </p>

            <div style={{ display: 'grid', gap: 12 }}>
              {MERGE_FIELDS.map(group => (
                <div key={group.group}>
                  <p
                    style={{
                      margin: 0,
                      marginBottom: 6,
                      fontSize: 11,
                      fontWeight: 900,
                      color: 'var(--text-dark)',
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                    }}
                  >
                    {group.group}
                  </p>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {group.fields.map(field => (
                      <button
                        key={field}
                        type="button"
                        className="crm-status-filter"
                        style={{ fontSize: 11 }}
                        onClick={() => appendMergeFieldToBody(field, setForm)}
                      >
                        {field}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}