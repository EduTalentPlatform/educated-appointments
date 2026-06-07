'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Vacancy = {
  id: string
  title: string
  status: string
  sector: string | null
  location: string | null
  salary_display: string | null
  created_at: string
  clients?: {
    company_name?: string | null
  } | null
  applications?: any[]
}

interface Props {
  initialVacancies: Vacancy[]
}

const STATUS_COLOURS: Record<string, { bg: string; text: string }> = {
  live: { bg: '#e8f5e8', text: '#217822' },
  draft: { bg: '#f0f0f2', text: '#737373' },
  on_hold: { bg: '#fffbeb', text: '#d97706' },
  filled: { bg: '#e0f0fb', text: '#0B72B8' },
  closed: { bg: '#fef2f2', text: '#e53e3e' },
}

const STATUS_TABS = [
  { value: 'active', label: 'Live / Draft' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'filled', label: 'Filled' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title_az', label: 'Role A–Z' },
  { value: 'title_za', label: 'Role Z–A' },
  { value: 'client_az', label: 'Client A–Z' },
  { value: 'location_az', label: 'Location A–Z' },
  { value: 'status', label: 'Status' },
  { value: 'applications_high', label: 'Most applications' },
  { value: 'applications_low', label: 'Fewest applications' },
]

function getStatusLabel(status: string) {
  if (status === 'on_hold') return 'On hold'
  return status.replace(/_/g, ' ')
}

function getTabCount(vacancies: Vacancy[], tabValue: string) {
  if (tabValue === 'active') {
    return vacancies.filter(v => v.status === 'live' || v.status === 'draft')
      .length
  }

  if (tabValue === 'all') {
    return vacancies.length
  }

  return vacancies.filter(v => v.status === tabValue).length
}

export default function VacanciesList({ initialVacancies }: Props) {
  const router = useRouter()

  // Default view is now Live + Draft vacancies
  const [statusFilter, setStatusFilter] = useState('active')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  const filtered = useMemo(() => {
    const searchTerm = search.toLowerCase().trim()

    const results = initialVacancies.filter(v => {
      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
            ? v.status === 'live' || v.status === 'draft'
            : v.status === statusFilter

      const matchSearch =
        !searchTerm ||
        v.title.toLowerCase().includes(searchTerm) ||
        (v.clients?.company_name ?? '').toLowerCase().includes(searchTerm) ||
        (v.location ?? '').toLowerCase().includes(searchTerm) ||
        (v.sector ?? '').toLowerCase().includes(searchTerm)

      return matchStatus && matchSearch
    })

    return [...results].sort((a, b) => {
      const aTitle = a.title ?? ''
      const bTitle = b.title ?? ''
      const aClient = a.clients?.company_name ?? ''
      const bClient = b.clients?.company_name ?? ''
      const aLocation = a.location ?? ''
      const bLocation = b.location ?? ''
      const aStatus = a.status ?? ''
      const bStatus = b.status ?? ''
      const aApps = a.applications?.length ?? 0
      const bApps = b.applications?.length ?? 0

      switch (sortBy) {
        case 'oldest':
          return (
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()
          )

        case 'title_az':
          return aTitle.localeCompare(bTitle)

        case 'title_za':
          return bTitle.localeCompare(aTitle)

        case 'client_az':
          return aClient.localeCompare(bClient)

        case 'location_az':
          return aLocation.localeCompare(bLocation)

        case 'status':
          return aStatus.localeCompare(bStatus)

        case 'applications_high':
          return bApps - aApps

        case 'applications_low':
          return aApps - bApps

        case 'newest':
        default:
          return (
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
          )
      }
    })
  }, [initialVacancies, search, statusFilter, sortBy])

  const liveCount = initialVacancies.filter(v => v.status === 'live').length
  const draftCount = initialVacancies.filter(v => v.status === 'draft').length
  const activeCount = liveCount + draftCount
  const filledCount = initialVacancies.filter(v => v.status === 'filled').length
  const closedCount = initialVacancies.filter(v => v.status === 'closed').length

  return (
    <div className="crm-page">
      <div className="crm-page-header">
  <div>
    <h1 className="crm-page-title">Vacancies</h1>
    <p className="crm-page-sub">
      {activeCount} active vacancies · {liveCount} live · {draftCount}{' '}
      draft · {filledCount} filled · {closedCount} closed
    </p>
  </div>

  <Link href="/crm/vacancies/new" className="crm-btn-primary">
    + Add vacancy
  </Link>
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
            placeholder="Search vacancies..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <div className="crm-status-filters">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.value}
                className={`crm-status-filter${
                  statusFilter === tab.value ? ' active' : ''
                }`}
                onClick={() => setStatusFilter(tab.value)}
              >
                {tab.label}

                <span className="crm-filter-count">
                  {getTabCount(initialVacancies, tab.value)}
                </span>
              </button>
            ))}
          </div>

          <select
            className="crm-select crm-select-sm"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ minWidth: 170 }}
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                Sort: {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="crm-card crm-table-card">
        <table className="crm-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Client</th>
              <th>Location</th>
              <th>Salary</th>
              <th>Applications</th>
              <th>Status</th>
              <th>Added</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map(v => (
              <tr
                key={v.id}
                onClick={() => router.push(`/crm/vacancies/${v.id}`)}
                className="crm-table-row-clickable"
              >
                <td>
                  <p className="crm-table-main">{v.title}</p>
                  {v.sector && <p className="crm-table-sub">{v.sector}</p>}
                </td>

                <td>
                  {v.clients?.company_name || (
                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                  )}
                </td>

                <td>{v.location || '—'}</td>

                <td>{v.salary_display || '—'}</td>

                <td>
                  <span className="crm-badge crm-badge-blue">
                    {v.applications?.length ?? 0}
                  </span>
                </td>

                <td>
                  <span
                    className="crm-badge"
                    style={{
                      background: STATUS_COLOURS[v.status]?.bg ?? '#f0f0f2',
                      color: STATUS_COLOURS[v.status]?.text ?? '#737373',
                      textTransform: 'capitalize',
                    }}
                  >
                    {getStatusLabel(v.status)}
                  </span>
                </td>

                <td>{new Date(v.created_at).toLocaleDateString('en-GB')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <p className="crm-empty crm-empty-table">No vacancies found.</p>
        )}
      </div>
    </div>
  )
}