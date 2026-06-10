'use client'

import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type ClientRef = {
  id: string
  company_name: string
}

type Application = {
  id: string
  status: string
  created_at: string
  updated_at: string | null
  viewed_at?: string | null
  application_source?: string | null
  source?: string | null
  candidates?: {
    id: string
    first_name: string
    last_name: string
    email: string | null
    phone?: string | null
    job_title: string | null
    main_role_type: string | null
    sub_role_type: string | null
  } | null
  vacancies?: {
    id: string
    title: string
    location: string | null
    region: string | null
    potential_fee_billed?: number | string | null
    clients?: ClientRef | ClientRef[] | null
  } | null
}

type CandidateOption = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone?: string | null
  job_title: string | null
  main_role_type: string | null
  sub_role_type: string | null
}

type VacancyOption = {
  id: string
  title: string
  status: string
  location: string | null
  region: string | null
  potential_fee_billed?: number | string | null
  clients?: ClientRef | ClientRef[] | null
}

type VacancyGroup = {
  key: string
  vacancyId: string | null
  vacancyTitle: string
  clientName: string
  location: string
  potentialFee: number | null
  latestUpdated: number
  applications: Application[]
}

interface Props {
  initialApplications: Application[]
  allCandidates: CandidateOption[]
  allVacancies: VacancyOption[]
}

const STAGE_COLOURS: Record<string, { bg: string; text: string }> = {
  screening: { bg: '#f0f0f2', text: '#737373' },
  ea_interview: { bg: '#e0f0fb', text: '#0B72B8' },
  docs_received: { bg: '#f3f0ff', text: '#7c3aed' },
  ready_to_present: { bg: '#fffbeb', text: '#d97706' },
  presented: { bg: '#e8f5e8', text: '#217822' },
  client_interview: { bg: '#f3f0ff', text: '#7c3aed' },
  offer: { bg: '#e8f5e8', text: '#1a6e1a' },
  placed: { bg: '#e8f5e8', text: '#1a6e1a' },
  rejected: { bg: '#fef2f2', text: '#e53e3e' },
  withdrawn: { bg: '#f0f0f2', text: '#737373' },
  not_interested: { bg: '#f0f0f2', text: '#737373' },
}

const LIVE_STAGES = [
  'screening',
  'ea_interview',
  'docs_received',
  'ready_to_present',
  'presented',
  'client_interview',
  'offer',
]

const ARCHIVED_STAGES = ['placed', 'rejected', 'withdrawn', 'not_interested']
const CLOSED_STAGES = ['placed', 'rejected', 'withdrawn', 'not_interested']

const SORT_OPTIONS = [
  { value: 'last_updated', label: 'Last updated' },
  { value: 'vacancy_az', label: 'Vacancy A–Z' },
  { value: 'vacancy_za', label: 'Vacancy Z–A' },
  { value: 'client_az', label: 'Client A–Z' },
  { value: 'candidate_az', label: 'Candidate A–Z' },
  { value: 'newest', label: 'Newest applications' },
  { value: 'oldest', label: 'Oldest applications' },
  { value: 'stage', label: 'Stage' },
]

const STARTING_STAGES = [
  { value: 'screening', label: 'Screening' },
  { value: 'ea_interview', label: 'EA interview' },
  { value: 'docs_received', label: 'Docs received' },
  { value: 'ready_to_present', label: 'Ready to present' },
  { value: 'presented', label: 'Presented' },
  { value: 'client_interview', label: 'Client interview' },
  { value: 'offer', label: 'Offer' },
]

export default function ApplicationsList({
  initialApplications,
  allCandidates,
  allVacancies,
}: Props) {
  const router = useRouter()

  const applications = initialApplications
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [sortBy, setSortBy] = useState('last_updated')
  const [viewMode, setViewMode] = useState<'live' | 'archived'>('live')

  const [showAddApplication, setShowAddApplication] = useState(false)
  const [creatingApplication, setCreatingApplication] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [newApplicationForm, setNewApplicationForm] = useState({
    candidate_id: '',
    vacancy_id: '',
    status: 'screening',
  })

  function getClient(clientField: ClientRef | ClientRef[] | null | undefined) {
    if (Array.isArray(clientField)) return clientField[0] ?? null
    return clientField ?? null
  }

  function getCandidateName(app: Application) {
    return `${app.candidates?.first_name ?? ''} ${
      app.candidates?.last_name ?? ''
    }`.trim()
  }

  function getUpdatedTime(app: Application) {
    return new Date(app.updated_at || app.created_at || 0).getTime()
  }

  function getCreatedTime(app: Application) {
    return new Date(app.created_at || 0).getTime()
  }

  function parseMoney(value: number | string | null | undefined) {
    if (value === null || value === undefined || value === '') return null

    const parsed =
      typeof value === 'number'
        ? value
        : Number(String(value).replace(/[^0-9.-]/g, ''))

    return Number.isFinite(parsed) ? parsed : null
  }

  function formatMoney(value: number | null) {
    if (value === null) return null

    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      maximumFractionDigits: 0,
    }).format(value)
  }

  function isNewApplication(app: Application) {
    return !app.viewed_at
  }

  function isWebsiteApplication(app: Application) {
    const source = String(app.application_source || app.source || '').toLowerCase()
    return source.includes('website') || source.includes('web')
  }

  function sortApplications(a: Application, b: Application) {
    const aCandidate = getCandidateName(a)
    const bCandidate = getCandidateName(b)

    switch (sortBy) {
      case 'candidate_az':
        return aCandidate.localeCompare(bCandidate)

      case 'newest':
        return getCreatedTime(b) - getCreatedTime(a)

      case 'oldest':
        return getCreatedTime(a) - getCreatedTime(b)

      case 'stage':
        return (a.status || '').localeCompare(b.status || '')

      case 'last_updated':
      case 'vacancy_az':
      case 'vacancy_za':
      case 'client_az':
      default:
        return getUpdatedTime(b) - getUpdatedTime(a)
    }
  }

  const liveApplications = useMemo(() => {
    return applications.filter(app => !CLOSED_STAGES.includes(app.status))
  }, [applications])

  const archivedApplications = useMemo(() => {
    return applications.filter(app => CLOSED_STAGES.includes(app.status))
  }, [applications])

  const currentApplications =
    viewMode === 'archived' ? archivedApplications : liveApplications

  const currentStages =
    viewMode === 'archived' ? ARCHIVED_STAGES : LIVE_STAGES

  const filteredApplications = useMemo(() => {
    const searchTerm = search.toLowerCase().trim()

    const results = currentApplications.filter(app => {
      const candidateName = getCandidateName(app).toLowerCase()
      const vacancyTitle = (app.vacancies?.title ?? '').toLowerCase()
      const clientName = (
        getClient(app.vacancies?.clients)?.company_name ?? ''
      ).toLowerCase()
      const location = (
        app.vacancies?.location ||
        app.vacancies?.region ||
        ''
      ).toLowerCase()
      const phone = (app.candidates?.phone ?? '').toLowerCase()

      const matchSearch =
        !searchTerm ||
        candidateName.includes(searchTerm) ||
        vacancyTitle.includes(searchTerm) ||
        clientName.includes(searchTerm) ||
        location.includes(searchTerm) ||
        phone.includes(searchTerm)

      const matchStage = stageFilter === 'all' || app.status === stageFilter

      return matchSearch && matchStage
    })

    return [...results].sort(sortApplications)
  }, [currentApplications, search, stageFilter, sortBy])

  const groupedByVacancy = useMemo(() => {
    const map = new Map<string, VacancyGroup>()

    filteredApplications.forEach(app => {
      const vacancyId = app.vacancies?.id ?? null
      const key = vacancyId || 'no-vacancy'
      const client = getClient(app.vacancies?.clients)

      if (!map.has(key)) {
        map.set(key, {
          key,
          vacancyId,
          vacancyTitle: app.vacancies?.title || 'No vacancy linked',
          clientName: client?.company_name || 'No client linked',
          location: app.vacancies?.location || app.vacancies?.region || '—',
          potentialFee: parseMoney(app.vacancies?.potential_fee_billed),
          latestUpdated: getUpdatedTime(app),
          applications: [],
        })
      }

      const group = map.get(key)!

      group.applications.push(app)
      group.latestUpdated = Math.max(group.latestUpdated, getUpdatedTime(app))
    })

    const groups = Array.from(map.values()).map(group => ({
      ...group,
      applications: [...group.applications].sort(sortApplications),
    }))

    return groups.sort((a, b) => {
      switch (sortBy) {
        case 'vacancy_az':
          return a.vacancyTitle.localeCompare(b.vacancyTitle)

        case 'vacancy_za':
          return b.vacancyTitle.localeCompare(a.vacancyTitle)

        case 'client_az':
          return a.clientName.localeCompare(b.clientName)

        case 'candidate_az':
          return a.vacancyTitle.localeCompare(b.vacancyTitle)

        case 'newest':
        case 'oldest':
        case 'stage':
        case 'last_updated':
        default:
          return b.latestUpdated - a.latestUpdated
      }
    })
  }, [filteredApplications, sortBy])

  const countByStage = (stage: string) =>
    currentApplications.filter(app => app.status === stage).length

  function switchView(mode: 'live' | 'archived') {
    setViewMode(mode)
    setStageFilter('all')
    setSearch('')
  }

  function getGroupStageCounts(group: VacancyGroup) {
    return group.applications.reduce<Record<string, number>>((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1
      return acc
    }, {})
  }

  async function createApplication(e: FormEvent) {
    e.preventDefault()

    setCreatingApplication(true)
    setCreateError(null)

    if (!newApplicationForm.candidate_id || !newApplicationForm.vacancy_id) {
      setCreateError('Please select a candidate and vacancy.')
      setCreatingApplication(false)
      return
    }

    const res = await fetch('/api/crm/vacancies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        addCandidate: true,
        candidateId: newApplicationForm.candidate_id,
        vacancyId: newApplicationForm.vacancy_id,
        initialStatus: newApplicationForm.status,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setCreateError(data.error || 'Could not create application.')
      setCreatingApplication(false)
      return
    }

    if (data.application?.id) {
  router.refresh()
  router.push(`/crm/applications/${data.application.id}`)
  return
}

    setCreateError('Application created, but no application ID was returned.')
    setCreatingApplication(false)
  }

  function resetAddApplicationModal() {
    setNewApplicationForm({
      candidate_id: '',
      vacancy_id: '',
      status: 'screening',
    })
    setCreateError(null)
    setShowAddApplication(false)
  }

  return (
    <div className="crm-page">
      <div className="crm-page-header">
        <div>
          <h1 className="crm-page-title">Applications</h1>
          <p className="crm-page-sub">
            {liveApplications.length} live · {archivedApplications.length} archived · grouped by vacancy
          </p>
        </div>

        <button
          className="crm-btn-primary"
          onClick={() => setShowAddApplication(true)}
        >
          + Add Application
        </button>
      </div>

      <div
        className="crm-filters-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div
          className="crm-search-wrap"
          style={{
            minWidth: 260,
            maxWidth: 460,
            flex: '1 1 340px',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>

          <input
            className="crm-search"
            placeholder={
              viewMode === 'archived'
                ? 'Search archived applications...'
                : 'Search live applications...'
            }
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="crm-select crm-select-sm"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{ minWidth: 210 }}
        >
          {SORT_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              Sort: {option.label}
            </option>
          ))}
        </select>
      </div>

      <div
        className="crm-status-filters"
        style={{ flexWrap: 'wrap', marginBottom: 8 }}
      >
        <button
          className={`crm-status-filter${viewMode === 'live' ? ' active' : ''}`}
          onClick={() => switchView('live')}
        >
          Live Applications ({liveApplications.length})
        </button>

        <button
          className={`crm-status-filter${
            viewMode === 'archived' ? ' active' : ''
          }`}
          onClick={() => switchView('archived')}
        >
          Archived Applications ({archivedApplications.length})
        </button>
      </div>

      <div className="crm-status-filters" style={{ flexWrap: 'wrap' }}>
        <button
          className={`crm-status-filter${
            stageFilter === 'all' ? ' active' : ''
          }`}
          onClick={() => setStageFilter('all')}
        >
          All ({currentApplications.length})
        </button>

        {currentStages.map(stage => {
          const count = countByStage(stage)
          if (count === 0) return null

          return (
            <button
              key={stage}
              className={`crm-status-filter${
                stageFilter === stage ? ' active' : ''
              }`}
              onClick={() => setStageFilter(stage)}
              style={{ whiteSpace: 'nowrap' }}
            >
              {stage.replace(/_/g, ' ')} ({count})
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {groupedByVacancy.map(group => {
          const stageCounts = getGroupStageCounts(group)
          const formattedFee = formatMoney(group.potentialFee)

          return (
            <div key={group.key} className="crm-card crm-table-card">
              <div
                style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--border-light)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                      marginBottom: 4,
                    }}
                  >
                    <p
                      className="crm-table-main"
                      style={{
                        fontSize: 16,
                      }}
                    >
                      {group.vacancyTitle}
                    </p>

                    {formattedFee && (
                      <span className="crm-badge crm-badge-blue">
                        Potential fee: {formattedFee}
                      </span>
                    )}
                  </div>

                  <p className="crm-table-sub">
                    {group.clientName} · {group.location}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                      marginTop: 8,
                    }}
                  >
                    {Object.entries(stageCounts).map(([stage, count]) => (
                      <span
                        key={stage}
                        className="crm-badge"
                        style={{
                          background: STAGE_COLOURS[stage]?.bg ?? '#f0f0f2',
                          color: STAGE_COLOURS[stage]?.text ?? '#737373',
                        }}
                      >
                        {stage.replace(/_/g, ' ')}: {count}
                      </span>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span className="crm-badge crm-badge-blue">
                    {group.applications.length} application
                    {group.applications.length === 1 ? '' : 's'}
                  </span>

                  {group.vacancyId && (
                    <button
                      type="button"
                      className="crm-btn-ghost crm-btn-sm"
                      onClick={() => router.push(`/crm/vacancies/${group.vacancyId}`)}
                    >
                      Open vacancy
                    </button>
                  )}
                </div>
              </div>

              <table className="crm-table">
                <thead>
  <tr>
    <th>Name</th>
    <th>Phone</th>
    <th>Stage</th>
    <th>Last updated</th>
    <th />
  </tr>
</thead>

                <tbody>
                  {group.applications.map(app => (
                    <tr
                      key={app.id}
                      className="crm-table-row-clickable"
                      onClick={() => router.push(`/crm/applications/${app.id}`)}
                    >
                      <td>
  <Link
    href={`/crm/applications/${app.id}`}
    className="crm-table-main"
    onClick={event => event.stopPropagation()}
    style={{
      color: 'var(--primary)',
      textDecoration: 'none',
      fontWeight: 900,
    }}
  >
    {getCandidateName(app) || 'Unknown candidate'}
  </Link>
</td>

                      <td>
                        {app.candidates?.phone ? (
                          <a
                            href={`tel:${app.candidates.phone}`}
                            className="crm-detail-link"
                            onClick={event => event.stopPropagation()}
                          >
                            {app.candidates.phone}
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      <td>
                        <span
                          className="crm-badge"
                          style={{
                            background: STAGE_COLOURS[app.status]?.bg ?? '#f0f0f2',
                            color: STAGE_COLOURS[app.status]?.text ?? '#737373',
                          }}
                        >
                          {app.status.replace(/_/g, ' ')}
                        </span>

                        {isNewApplication(app) && (
                          <span
                            className="crm-badge"
                            style={{
                              background: '#dcfce7',
                              color: '#166534',
                              border: '1px solid #bbf7d0',
                            }}
                          >
                            NEW
                          </span>
                        )}

                        {isWebsiteApplication(app) && (
                          <span
                            className="crm-badge"
                            style={{
                              background: '#dbeafe',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                            }}
                          >
                            WEBSITE APPLICATION
                          </span>
                        )}
                      </td>

                      <td>
  {new Date(
    app.updated_at ?? app.created_at,
  ).toLocaleDateString('en-GB')}
</td>

<td>
  <Link
    href={`/crm/applications/${app.id}`}
    className="crm-card-link"
    onClick={event => event.stopPropagation()}
    style={{ whiteSpace: 'nowrap' }}
  >
    Open →
  </Link>
</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}

        {groupedByVacancy.length === 0 && (
          <div className="crm-card">
            <p className="crm-empty crm-empty-table">
              {viewMode === 'archived'
                ? 'No archived applications found.'
                : 'No live applications found.'}
            </p>
          </div>
        )}
      </div>

      {showAddApplication && (
        <>
          <div
            className="crm-modal-backdrop"
            onClick={resetAddApplicationModal}
          />

          <div className="crm-modal">
            <div className="crm-modal-header">
              <h2 className="crm-modal-title">Add Application</h2>

              <button
                className="crm-modal-close"
                onClick={resetAddApplicationModal}
              >
                ✕
              </button>
            </div>

            <form onSubmit={createApplication} className="crm-modal-form">
              <div className="crm-field">
                <label className="crm-label">Candidate *</label>

                <select
                  className="crm-select"
                  required
                  value={newApplicationForm.candidate_id}
                  onChange={e =>
                    setNewApplicationForm(form => ({
                      ...form,
                      candidate_id: e.target.value,
                    }))
                  }
                >
                  <option value="">Select candidate...</option>

                  {allCandidates.map(candidate => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.first_name} {candidate.last_name}
                      {candidate.sub_role_type || candidate.job_title
                        ? ` — ${candidate.sub_role_type || candidate.job_title}`
                        : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="crm-field">
                <label className="crm-label">Vacancy *</label>

                <select
                  className="crm-select"
                  required
                  value={newApplicationForm.vacancy_id}
                  onChange={e =>
                    setNewApplicationForm(form => ({
                      ...form,
                      vacancy_id: e.target.value,
                    }))
                  }
                >
                  <option value="">Select vacancy...</option>

                  {allVacancies.map(vacancy => {
                    const client = getClient(vacancy.clients)
                    const fee = formatMoney(parseMoney(vacancy.potential_fee_billed))

                    return (
                      <option key={vacancy.id} value={vacancy.id}>
                        {vacancy.title}
                        {client?.company_name ? ` — ${client.company_name}` : ''}
                        {fee ? ` — ${fee}` : ''}
                        {vacancy.status ? ` (${vacancy.status})` : ''}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="crm-field">
                <label className="crm-label">Starting stage</label>

                <select
                  className="crm-select"
                  value={newApplicationForm.status}
                  onChange={e =>
                    setNewApplicationForm(form => ({
                      ...form,
                      status: e.target.value,
                    }))
                  }
                >
                  {STARTING_STAGES.map(stage => (
                    <option key={stage.value} value={stage.value}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </div>

              {createError && (
                <div
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#e53e3e',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {createError}
                </div>
              )}

              <div className="crm-modal-footer">
                <button
                  type="button"
                  className="crm-btn-ghost"
                  onClick={resetAddApplicationModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="crm-btn-primary"
                  disabled={creatingApplication}
                >
                  {creatingApplication ? 'Creating...' : 'Create application'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}