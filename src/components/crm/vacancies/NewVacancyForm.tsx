'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCrmRoleSettings } from '@/hooks/useCrmRoleSettings'
import StandardsSelector from '@/components/crm/StandardsSelector'

type Client = {
  id: string
  company_name: string
  region: string | null
  status: string | null
}

type Props = {
  clients: Client[]
}

const VACANCY_REGIONS = [
  '',
  'East of England',
  'East Midlands',
  'West Midlands',
  'North West',
  'North East',
  'Yorkshire & Humber',
  'South East',
  'South West',
  'London',
  'Wales',
  'Scotland',
  'Northern Ireland',
  'National (Multi-site)',
  'Remote',
  'Hybrid',
]

export default function NewVacancyForm({
 clients }: Props) {
  const { roleTypeHierarchy: crmRoleTypeHierarchy, mainRoleTypes: crmMainRoleTypes } = useCrmRoleSettings()

  const router = useRouter()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [mainRoleType, setMainRoleType] = useState('')
  const [standards, setStandards] = useState<string[]>([])

  const [form, setForm] = useState({
    client_id: '',
    title: '',
    sector: '',
    type: 'Permanent',
    location: '',
    region: '',
    salary_min: '',
    salary_max: '',
    description: '',
  })

  const selectedClient = useMemo(
    () => clients.find(client => client.id === form.client_id) ?? null,
    [clients, form.client_id],
  )

  async function createVacancy(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.client_id) {
      setError('Please select a client.')
      return
    }

    if (!form.title.trim()) {
      setError('Job title is required.')
      return
    }

    setSaving(true)

    const salaryMin = parseInt(form.salary_min, 10) || null
    const salaryMax = parseInt(form.salary_max, 10) || null

    const salaryDisplay =
      salaryMin && salaryMax
        ? `£${salaryMin.toLocaleString()} – £${salaryMax.toLocaleString()}`
        : salaryMin
          ? `From £${salaryMin.toLocaleString()}`
          : salaryMax
            ? `Up to £${salaryMax.toLocaleString()}`
            : null

    const slug = `${form.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')}-${Date.now()}`

    const res = await fetch('/api/crm/vacancies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title.trim(),
        sector: form.sector || null,
        type: form.type,
        location: form.location || null,
        region: form.region || null,
        salary_min: salaryMin,
        salary_max: salaryMax,
        salary_display: salaryDisplay,
        description: form.description || null,
        slug,
        client_id: form.client_id,
        status: 'draft',
        subject_area: standards.length > 0 ? standards.join(', ') : null,
      }),
    })

    const result = await res.json().catch(() => null)

    if (!res.ok || result?.error) {
      setError(result?.error || 'Could not create vacancy.')
      setSaving(false)
      return
    }

    const vacancy = result?.data || result?.vacancy

    if (vacancy?.id) {
      router.push(`/crm/vacancies/${vacancy.id}`)
      return
    }

    router.push('/crm/vacancies')
  }

  return (
    <div className="crm-page">
      <div className="crm-page-header">
        <div>
          <div className="crm-breadcrumb">
            <Link href="/crm/vacancies" className="crm-breadcrumb-link">
              Vacancies
            </Link>
            <span>/</span>
            <span>New vacancy</span>
          </div>

          <h1 className="crm-page-title">Add vacancy</h1>

          <p className="crm-page-sub">
            Create a draft vacancy and link it to a client.
          </p>
        </div>

        <Link href="/crm/vacancies" className="crm-btn-ghost">
          Back to vacancies
        </Link>
      </div>

      <form onSubmit={createVacancy} className="crm-card" style={{ maxWidth: 860 }}>
        <div className="crm-field" style={{ marginBottom: 14 }}>
          <label className="crm-label">Client *</label>
          <select
            className="crm-select"
            required
            value={form.client_id}
            onChange={e =>
              setForm(current => ({
                ...current,
                client_id: e.target.value,
              }))
            }
          >
            <option value="">Select client...</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.company_name}
                {client.region ? ` — ${client.region}` : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedClient && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 12,
              background: 'var(--primary-light)',
              border: '1px solid rgba(53,45,235,0.14)',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 800,
                color: 'var(--primary)',
              }}
            >
              Vacancy will be linked to {selectedClient.company_name}
            </p>
          </div>
        )}

        <div className="crm-field" style={{ marginBottom: 14 }}>
          <label className="crm-label">Job title *</label>
          <input
            className="crm-input"
            required
            value={form.title}
            onChange={e =>
              setForm(current => ({
                ...current,
                title: e.target.value,
              }))
            }
            placeholder="e.g. Quality Manager"
          />
        </div>

        <div className="crm-form-row">
          <div className="crm-field">
            <label className="crm-label">Main role type</label>
            <select
              className="crm-select"
              value={mainRoleType}
              onChange={e => {
                setMainRoleType(e.target.value)
                setForm(current => ({
                  ...current,
                  sector: '',
                }))
                setStandards([])
              }}
            >
              <option value="">Select type...</option>
              {crmMainRoleTypes.map(role => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <div className="crm-field">
            <label className="crm-label">Specific role</label>
            <select
              className="crm-select"
              value={form.sector}
              disabled={!mainRoleType}
              onChange={e =>
                setForm(current => ({
                  ...current,
                  sector: e.target.value,
                }))
              }
            >
              <option value="">
                {mainRoleType ? 'Select role...' : 'Select type first'}
              </option>

              {mainRoleType &&
                crmRoleTypeHierarchy[mainRoleType]?.subTypes.map(role => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {mainRoleType && crmRoleTypeHierarchy[mainRoleType]?.hasStandards && (
          <div className="crm-field" style={{ marginTop: 14 }}>
            <label className="crm-label">Apprenticeship standards required</label>
            <StandardsSelector selected={standards} onChange={setStandards} />
          </div>
        )}

        <div className="crm-form-row" style={{ marginTop: 14 }}>
          <div className="crm-field">
            <label className="crm-label">Contract type</label>
            <select
              className="crm-select"
              value={form.type}
              onChange={e =>
                setForm(current => ({
                  ...current,
                  type: e.target.value,
                }))
              }
            >
              <option>Permanent</option>
              <option>Contract</option>
              <option>Freelance</option>
            </select>
          </div>

          <div className="crm-field">
            <label className="crm-label">Location</label>
            <input
              className="crm-input"
              value={form.location}
              onChange={e =>
                setForm(current => ({
                  ...current,
                  location: e.target.value,
                }))
              }
              placeholder="e.g. Derby, Remote, Hybrid"
            />
          </div>
        </div>

        <div className="crm-form-row">
          <div className="crm-field">
            <label className="crm-label">Region</label>
            <select
              className="crm-select"
              value={form.region}
              onChange={e =>
                setForm(current => ({
                  ...current,
                  region: e.target.value,
                }))
              }
            >
              {VACANCY_REGIONS.map(region => (
                <option key={region} value={region}>
                  {region || 'Select region...'}
                </option>
              ))}
            </select>
          </div>

          <div className="crm-field">
            <label className="crm-label">Salary min</label>
            <input
              className="crm-input"
              type="number"
              value={form.salary_min}
              onChange={e =>
                setForm(current => ({
                  ...current,
                  salary_min: e.target.value,
                }))
              }
              placeholder="35000"
            />
          </div>
        </div>

        <div className="crm-field" style={{ marginBottom: 14 }}>
          <label className="crm-label">Salary max</label>
          <input
            className="crm-input"
            type="number"
            value={form.salary_max}
            onChange={e =>
              setForm(current => ({
                ...current,
                salary_max: e.target.value,
              }))
            }
            placeholder="45000"
          />
        </div>

        <div className="crm-field" style={{ marginBottom: 14 }}>
          <label className="crm-label">Description / notes</label>
          <textarea
            className="crm-input"
            rows={6}
            value={form.description}
            onChange={e =>
              setForm(current => ({
                ...current,
                description: e.target.value,
              }))
            }
            placeholder="Paste the job description, notes or role requirements..."
          />
        </div>

        {error && (
          <p
            style={{
              fontSize: 12,
              color: '#e53e3e',
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            {error}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            borderTop: '1px solid var(--border-light)',
            paddingTop: 14,
          }}
        >
          <Link href="/crm/vacancies" className="crm-btn-ghost">
            Cancel
          </Link>

          <button type="submit" className="crm-btn-primary" disabled={saving}>
            {saving ? 'Creating...' : 'Create vacancy'}
          </button>
        </div>
      </form>
    </div>
  )
}