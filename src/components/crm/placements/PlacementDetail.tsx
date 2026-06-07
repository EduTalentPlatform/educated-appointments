'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

type Props = {
  placement: any
  documents: any[]
  tasks: any[]
  releases: any[]
}

function normaliseRelation<T = any>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function formatDate(value?: string | null) {
  if (!value) return '—'

  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatMoney(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '—'

  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(Number(value))
}

function cleanNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return null

  const number = Number(String(value).replace(/[^0-9.-]/g, ''))

  return Number.isFinite(number) ? number : null
}

function calculateFeeAmount(
  salary?: string | number | null,
  feePercentage?: string | number | null,
) {
  const salaryNumber = cleanNumber(salary)
  const percentageNumber = cleanNumber(feePercentage)

  if (!salaryNumber || !percentageNumber) return null

  return Math.round((salaryNumber * percentageNumber) / 100)
}

function candidateName(candidate: any) {
  return `${candidate?.first_name ?? ''} ${candidate?.last_name ?? ''}`.trim() || 'Unknown candidate'
}

function documentLabel(type?: string | null) {
  return String(type || 'other').replace(/_/g, ' ')
}

export default function PlacementDetail({
  placement: initialPlacement,
  documents: initialDocuments,
  tasks: initialTasks,
  releases,
}: Props) {
  const [placement, setPlacement] = useState(initialPlacement)
  const [documents, setDocuments] = useState(initialDocuments)
  const [tasks, setTasks] = useState(initialTasks)

  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [releasingDocs, setReleasingDocs] = useState(false)
  const [confirmingPlaced, setConfirmingPlaced] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const candidate = normaliseRelation(placement.candidates)
  const vacancy = normaliseRelation(placement.vacancies)
  const application = normaliseRelation(placement.applications)
  const vacancyClient = normaliseRelation(vacancy?.clients)
  const client = normaliseRelation(placement.clients) || vacancyClient

  const releasedDocIds = useMemo(() => {
    const fromReleaseRows = releases.map(release => release.candidate_document_id)
    const fromDocuments = documents
      .filter(doc => doc.released || doc.visible_to_employer)
      .map(doc => doc.id)

    return new Set([...fromReleaseRows, ...fromDocuments])
  }, [documents, releases])

  const [form, setForm] = useState({
    offer_date: placement.offer_date || '',
    accepted_date: placement.accepted_date || '',
    start_date: placement.start_date || '',
    salary: placement.salary || '',
    salary_period: placement.salary_period || 'annual',
    fee_type: placement.fee_type || 'percentage',
    fee_percentage: placement.fee_percentage || '',
fee_amount:
  placement.fee_amount ||
  calculateFeeAmount(placement.salary, placement.fee_percentage) ||
  '',
    candidate_accepted: Boolean(placement.candidate_accepted),
    employer_confirmed: Boolean(placement.employer_confirmed),
    invoice_status: placement.invoice_status || 'not_invoiced',
    invoice_number: placement.invoice_number || '',
    payment_terms: placement.payment_terms || '',
    purchase_order_number: placement.purchase_order_number || '',
    guarantee_period: placement.guarantee_period || '',
    rebate_terms: placement.rebate_terms || '',
    notes: placement.notes || '',
  })

  const calculatedFeeAmount = calculateFeeAmount(
  form.salary,
  form.fee_percentage,
)

function updateSalary(value: string) {
  setForm(current => {
    const nextFeeAmount = calculateFeeAmount(value, current.fee_percentage)

    return {
      ...current,
      salary: value,
      fee_amount: nextFeeAmount || '',
    }
  })
}

function updateFeePercentage(value: string) {
  setForm(current => {
    const nextFeeAmount = calculateFeeAmount(current.salary, value)

    return {
      ...current,
      fee_percentage: value,
      fee_amount: nextFeeAmount || '',
    }
  })
}

function buildPlacementPayload() {
  const nextFeeAmount = calculateFeeAmount(form.salary, form.fee_percentage)

  return {
    ...form,
    fee_amount: nextFeeAmount || form.fee_amount || '',
  }
}
  
  const canConfirmPlaced =
  Boolean(form.start_date) &&
  Boolean(form.salary) &&
  Boolean(form.fee_percentage) &&
  Boolean(calculatedFeeAmount || form.fee_amount) &&
  form.candidate_accepted &&
  form.employer_confirmed

  async function savePlacement() {
    setSaving(true)
    setMessage(null)

    const res = await fetch('/api/crm/placements', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
  id: placement.id,
  ...buildPlacementPayload(),
}),
    })

    const data = await res.json()

    if (!res.ok) {
      setMessage(data.error || 'Could not save placement.')
      setSaving(false)
      return
    }

    if (data.placement) {
      setPlacement((current: any) => ({
        ...current,
        ...data.placement,
      }))
      setMessage('Placement saved.')
    }

    setSaving(false)
  }

  async function releaseDocuments() {
    if (selectedDocIds.length === 0) {
      setMessage('Select at least one document to release.')
      return
    }

    setReleasingDocs(true)
    setMessage(null)

    const res = await fetch('/api/crm/placements', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'release_documents',
        placement_id: placement.id,
        document_ids: selectedDocIds,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setMessage(data.error || 'Could not release documents.')
      setReleasingDocs(false)
      return
    }

    if (data.placement) {
      setPlacement((current: any) => ({
        ...current,
        ...data.placement,
      }))
    }

    if (data.documents) {
      const releasedIds = new Set(data.documents.map((doc: any) => doc.id))

      setDocuments(current =>
        current.map(doc =>
          releasedIds.has(doc.id)
            ? {
                ...doc,
                released: true,
                visible_to_employer: true,
                visibility: 'employer',
                released_at: new Date().toISOString(),
              }
            : doc,
        ),
      )
    }

    setSelectedDocIds([])
    setMessage('Documents released to employer.')
    setReleasingDocs(false)
  }

  async function confirmPlaced() {
    setConfirmingPlaced(true)
    setMessage(null)

    const saveRes = await fetch('/api/crm/placements', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
  id: placement.id,
  ...buildPlacementPayload(),
}),
    })

    const saveData = await saveRes.json()

    if (!saveRes.ok) {
      setMessage(saveData.error || 'Could not save placement before confirming.')
      setConfirmingPlaced(false)
      return
    }

    const res = await fetch('/api/crm/placements', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'confirm_placed',
        id: placement.id,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setMessage(data.error || 'Could not confirm placement.')
      setConfirmingPlaced(false)
      return
    }

    if (data.placement) {
      setPlacement((current: any) => ({
        ...current,
        ...data.placement,
      }))
      setMessage('Placement confirmed. Application moved to placed.')
    }

    setConfirmingPlaced(false)
  }

  async function toggleTask(task: any) {
    const nextCompleted = !task.completed

    const res = await fetch('/api/crm/placements', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'toggle_task',
        task_id: task.id,
        completed: nextCompleted,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setMessage(data.error || 'Could not update task.')
      return
    }

    if (data.task) {
      setTasks(current =>
        current.map(item => (item.id === task.id ? data.task : item)),
      )
    }
  }

  return (
    <div className="crm-page">
      <div className="crm-page-header">
        <div>
          <div className="crm-breadcrumb">
            <Link href="/crm/placements" className="crm-breadcrumb-link">
              Placements
            </Link>
            <span>/</span>
            <span>{placement.placement_ref || 'Placement'}</span>
          </div>

          <h1 className="crm-page-title">
            {placement.placement_ref || 'Placement'}
          </h1>

          <p className="crm-page-sub">
            {candidateName(candidate)} · {client?.company_name || 'No client'} ·{' '}
            {vacancy?.title || 'No vacancy'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span
            className="crm-badge"
            style={{
              background: placement.status === 'placed' ? '#e8f5e8' : '#fffbeb',
              color: placement.status === 'placed' ? '#217822' : '#d97706',
            }}
          >
            {String(placement.status || 'draft').replace(/_/g, ' ')}
          </span>

          {application?.id && (
            <Link href={`/crm/applications/${application.id}`} className="crm-btn-ghost">
              Open application
            </Link>
          )}

          {candidate?.id && (
            <Link href={`/crm/candidates/${candidate.id}`} className="crm-btn-ghost">
              Open candidate
            </Link>
          )}
        </div>
      </div>

      {message && (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            marginBottom: 16,
            background: message.toLowerCase().includes('could not')
              ? '#fef2f2'
              : '#e8f5e8',
            color: message.toLowerCase().includes('could not')
              ? '#e53e3e'
              : '#217822',
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 360px',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="crm-card">
            <div className="crm-card-header">
              <h2 className="crm-card-title">Placement details</h2>
              <button
                type="button"
                className="crm-btn-primary"
                onClick={savePlacement}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save placement'}
              </button>
            </div>

            <div className="crm-form-row">
              <div className="crm-field">
                <label className="crm-label">Offer date</label>
                <input
                  className="crm-input"
                  type="date"
                  value={form.offer_date}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      offer_date: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="crm-field">
                <label className="crm-label">Accepted date</label>
                <input
                  className="crm-input"
                  type="date"
                  value={form.accepted_date}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      accepted_date: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="crm-form-row">
              <div className="crm-field">
                <label className="crm-label">Start date *</label>
                <input
                  className="crm-input"
                  type="date"
                  value={form.start_date}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      start_date: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="crm-field">
                <label className="crm-label">Salary / rate *</label>
                <input
  className="crm-input"
  type="number"
  value={form.salary}
  onChange={event => updateSalary(event.target.value)}
/>
              </div>
            </div>

            <div className="crm-form-row">
              <div className="crm-field">
                <label className="crm-label">Salary period</label>
                <select
                  className="crm-select"
                  value={form.salary_period}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      salary_period: event.target.value,
                    }))
                  }
                >
                  <option value="annual">Annual</option>
                  <option value="daily">Daily</option>
                  <option value="hourly">Hourly</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>

              <div className="crm-field">
                <label className="crm-label">Fee type</label>
                <select
                  className="crm-select"
                  value={form.fee_type}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      fee_type: event.target.value,
                    }))
                  }
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed fee</option>
                  <option value="retained">Retained</option>
                </select>
              </div>
            </div>

            <div className="crm-form-row">
              <div className="crm-field">
                <label className="crm-label">Fee %</label>
                <input
  className="crm-input"
  type="number"
  step="0.01"
  value={form.fee_percentage}
  onChange={event => updateFeePercentage(event.target.value)}
/>
              </div>

              <div className="crm-field">
                <label className="crm-label">Fee amount</label>
                <input
  className="crm-input"
  type="number"
  step="0.01"
  value={form.fee_amount}
  readOnly
  placeholder="Auto-calculated from salary and fee %"
  style={{
    background: 'var(--light-bg)',
    fontWeight: 800,
  }}
/>
<p
  style={{
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 4,
    lineHeight: 1.5,
  }}
>
  Auto-calculated as salary × fee percentage. Enter 15 for 15%, not 0.15.
</p>
              </div>
            </div>

            <div className="crm-form-row">
              <label
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  fontSize: 13,
                  fontWeight: 800,
                  color: 'var(--text-dark)',
                }}
              >
                <input
                  type="checkbox"
                  checked={form.candidate_accepted}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      candidate_accepted: event.target.checked,
                    }))
                  }
                />
                Candidate accepted
              </label>

              <label
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  fontSize: 13,
                  fontWeight: 800,
                  color: 'var(--text-dark)',
                }}
              >
                <input
                  type="checkbox"
                  checked={form.employer_confirmed}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      employer_confirmed: event.target.checked,
                    }))
                  }
                />
                Employer confirmed
              </label>
            </div>
          </div>

          <div className="crm-card">
            <h2 className="crm-card-title" style={{ marginBottom: 14 }}>
              Invoice / commercial notes
            </h2>

            <div className="crm-form-row">
              <div className="crm-field">
                <label className="crm-label">Invoice status</label>
                <select
                  className="crm-select"
                  value={form.invoice_status}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      invoice_status: event.target.value,
                    }))
                  }
                >
                  <option value="not_invoiced">Not invoiced</option>
                  <option value="ready_to_invoice">Ready to invoice</option>
                  <option value="invoiced">Invoiced</option>
                  <option value="paid">Paid</option>
                  <option value="on_hold">On hold</option>
                </select>
              </div>

              <div className="crm-field">
                <label className="crm-label">Invoice number</label>
                <input
                  className="crm-input"
                  value={form.invoice_number}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      invoice_number: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="crm-form-row">
              <div className="crm-field">
                <label className="crm-label">Payment terms</label>
                <input
                  className="crm-input"
                  placeholder="e.g. 14 days from start date"
                  value={form.payment_terms}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      payment_terms: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="crm-field">
                <label className="crm-label">Purchase order number</label>
                <input
                  className="crm-input"
                  value={form.purchase_order_number}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      purchase_order_number: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="crm-form-row">
              <div className="crm-field">
                <label className="crm-label">Guarantee period</label>
                <input
                  className="crm-input"
                  placeholder="e.g. 8 weeks"
                  value={form.guarantee_period}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      guarantee_period: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="crm-field">
                <label className="crm-label">Rebate terms</label>
                <input
                  className="crm-input"
                  placeholder="e.g. sliding scale"
                  value={form.rebate_terms}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      rebate_terms: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="crm-field">
              <label className="crm-label">Placement notes</label>
              <textarea
                className="crm-input"
                rows={5}
                value={form.notes}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="crm-card">
            <div className="crm-card-header">
              <h2 className="crm-card-title">Final document release</h2>
              <button
                type="button"
                className="crm-btn-primary"
                disabled={releasingDocs || selectedDocIds.length === 0}
                onClick={releaseDocuments}
              >
                {releasingDocs ? 'Releasing...' : 'Release selected documents'}
              </button>
            </div>

            <p
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                lineHeight: 1.5,
                marginBottom: 12,
              }}
            >
              Release final documents to the employer once the offer has been accepted.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {documents.map(doc => {
                const isReleased = releasedDocIds.has(doc.id)
                const checked = selectedDocIds.includes(doc.id)

                return (
                  <label
                    key={doc.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto',
                      gap: 10,
                      alignItems: 'center',
                      border: '1px solid var(--border-light)',
                      borderRadius: 10,
                      padding: 10,
                      cursor: isReleased ? 'default' : 'pointer',
                      background: isReleased ? '#e8f5e8' : '#fff',
                    }}
                  >
                    <input
                      type="checkbox"
                      disabled={isReleased}
                      checked={checked || isReleased}
                      onChange={event =>
                        setSelectedDocIds(current =>
                          event.target.checked
                            ? [...current, doc.id]
                            : current.filter(id => id !== doc.id),
                        )
                      }
                    />

                    <div>
                      <p style={{ fontSize: 13, fontWeight: 900 }}>
                        {doc.name || documentLabel(doc.doc_type)}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {documentLabel(doc.doc_type)}
                        {doc.created_at ? ` · added ${formatDate(doc.created_at)}` : ''}
                      </p>
                    </div>

                    {isReleased ? (
                      <span
                        className="crm-badge"
                        style={{ background: '#e8f5e8', color: '#217822' }}
                      >
                        Released
                      </span>
                    ) : (
                      <span className="crm-badge">Internal</span>
                    )}
                  </label>
                )
              })}

              {documents.length === 0 && (
                <p className="crm-empty">No candidate documents found.</p>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="crm-card">
            <h2 className="crm-card-title" style={{ marginBottom: 12 }}>
              Summary
            </h2>

            <div className="crm-detail-list">
              <DetailRow label="Candidate">{candidateName(candidate)}</DetailRow>
              <DetailRow label="Client">{client?.company_name || '—'}</DetailRow>
              <DetailRow label="Vacancy">{vacancy?.title || '—'}</DetailRow>
              <DetailRow label="Start date">{formatDate(form.start_date)}</DetailRow>
              <DetailRow label="Salary">{formatMoney(form.salary)}</DetailRow>
              <DetailRow label="Fee">
                {form.fee_amount
                  ? formatMoney(form.fee_amount)
                  : form.fee_percentage
                    ? `${form.fee_percentage}%`
                    : '—'}
              </DetailRow>
              <DetailRow label="Documents">
                {placement.final_documents_released ? 'Released' : 'Not released'}
              </DetailRow>
            </div>

            <button
              type="button"
              className="crm-btn-primary"
              style={{
                width: '100%',
                marginTop: 14,
                background: canConfirmPlaced ? '#217822' : undefined,
              }}
              disabled={!canConfirmPlaced || confirmingPlaced || placement.status === 'placed'}
              onClick={confirmPlaced}
            >
              {placement.status === 'placed'
                ? 'Placement confirmed'
                : confirmingPlaced
                  ? 'Confirming...'
                  : 'Confirm placed'}
            </button>

            {!canConfirmPlaced && placement.status !== 'placed' && (
              <p
                style={{
                  fontSize: 11,
                  color: '#d97706',
                  lineHeight: 1.5,
                  marginTop: 8,
                  fontWeight: 700,
                }}
              >
                Complete start date, salary, fee, candidate accepted and employer confirmed
                before confirming placed.
              </p>
            )}
          </div>

          <div className="crm-card">
            <div className="crm-card-header">
              <h2 className="crm-card-title">Aftercare tasks</h2>
              <span className="crm-card-count">{tasks.length}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tasks.map(task => (
                <div
                  key={task.id}
                  style={{
                    border: '1px solid var(--border-light)',
                    borderRadius: 10,
                    padding: 10,
                    background: task.completed ? '#e8f5e8' : '#fff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 900,
                          color: task.completed ? '#217822' : 'var(--text-dark)',
                        }}
                      >
                        {task.title}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                        Due {formatDate(task.due_date)}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="crm-btn-ghost crm-btn-sm"
                      onClick={() => toggleTask(task)}
                    >
                      {task.completed ? 'Reopen' : 'Done'}
                    </button>
                  </div>
                </div>
              ))}

              {tasks.length === 0 && (
                <p className="crm-empty">
                  No aftercare tasks yet. Add a start date and save the placement.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="crm-detail-row">
      <span className="crm-detail-label">{label}</span>
      <span className="crm-detail-value">{children}</span>
    </div>
  )
}