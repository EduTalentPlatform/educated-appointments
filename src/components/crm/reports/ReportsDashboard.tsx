'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'

type Props = {
  applications: any[]
  placements: any[]
  candidateActivities: any[]
  candidates: any[]
  vacancies: any[]
  clients: any[]
}

type ReportView =
  | 'overview'
  | 'financials'
  | 'jobs'
  | 'applications'
  | 'interviews'
  | 'placements'
  | 'activity'
  | 'data_quality'

const DATE_PRESETS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
  { value: 'all', label: 'All time' },
]

const PERIOD_GROUPS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]

const ACTIVITY_TYPES = [
  { value: 'all', label: 'All activity' },
  { value: 'call', label: 'Calls' },
  { value: 'email', label: 'Emails' },
  { value: 'whatsapp', label: 'WhatsApps' },
  { value: 'sms', label: 'SMS' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'meeting', label: 'Meetings' },
  { value: 'note', label: 'Notes' },
]

const PIPELINE_STAGES = [
  'screening',
  'ea_interview',
  'docs_received',
  'ready_to_present',
  'presented',
  'client_interview',
  'offer',
  'placed',
  'rejected',
  'not_interested',
  'withdrawn',
]

const VIEW_TABS: Array<{ id: ReportView; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'financials', label: 'Financials' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'applications', label: 'Applications' },
  { id: 'interviews', label: 'Interviews' },
  { id: 'placements', label: 'Placements / Starts' },
  { id: 'activity', label: 'Activity' },
  { id: 'data_quality', label: 'Data quality' },
]

function normaliseRelation<T = any>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function asDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(value?: string | null) {
  const date = asDate(value)
  if (!date) return '—'

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatMoney(value?: number | string | null) {
  const amount = Number(value || 0)

  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(amount)
}

function percentage(part: number, total: number) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

function isWithinRange(value: string | null | undefined, days: string) {
  if (days === 'all') return true

  const date = asDate(value)
  if (!date) return false

  const start = new Date()
  start.setDate(start.getDate() - Number(days))
  start.setHours(0, 0, 0, 0)

  return date >= start
}

function isWithinCurrentMonth(value?: string | null) {
  const date = asDate(value)
  if (!date) return false

  const now = new Date()

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  )
}

function isFutureOrToday(value?: string | null) {
  const date = asDate(value)
  if (!date) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return date >= today
}

function daysBetween(start?: string | null, end?: string | null) {
  const startDate = asDate(start)
  const endDate = asDate(end)

  if (!startDate || !endDate) return null

  const diff = endDate.getTime() - startDate.getTime()
  if (diff < 0) return null

  return Math.round(diff / 86400000)
}

function getWeekNumber(date: Date) {
  const copied = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNumber = copied.getUTCDay() || 7

  copied.setUTCDate(copied.getUTCDate() + 4 - dayNumber)

  const yearStart = new Date(Date.UTC(copied.getUTCFullYear(), 0, 1))

  return Math.ceil(((copied.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function getPeriodKey(value: string | null | undefined, groupBy: string) {
  const date = asDate(value)
  if (!date) return null

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  if (groupBy === 'daily') return `${year}-${month}-${day}`

  if (groupBy === 'weekly') {
    const week = String(getWeekNumber(date)).padStart(2, '0')
    return `${year}-W${week}`
  }

  if (groupBy === 'monthly') return `${year}-${month}`

  if (groupBy === 'quarterly') {
    const quarter = Math.floor(date.getMonth() / 3) + 1
    return `${year}-Q${quarter}`
  }

  return String(year)
}

function getPeriodLabel(key: string, groupBy: string) {
  if (groupBy === 'daily') {
    return new Date(key).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  if (groupBy === 'monthly') {
    const [year, month] = key.split('-')

    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
      'en-GB',
      {
        month: 'short',
        year: 'numeric',
      },
    )
  }

  return key
}

function candidateName(candidate: any) {
  return (
    `${candidate?.first_name ?? ''} ${candidate?.last_name ?? ''}`.trim() ||
    'Unknown candidate'
  )
}

function getClientFromVacancy(vacancy: any) {
  return normaliseRelation(vacancy?.clients)
}

function getClientFromPlacement(placement: any) {
  return normaliseRelation(placement.clients) || getClientFromVacancy(placement.vacancies)
}

function vacancyTitle(vacancy: any) {
  return vacancy?.title || 'Unknown vacancy'
}

function statusLabel(value?: string | null) {
  return String(value || 'unknown').replace(/_/g, ' ')
}

export default function ReportsDashboard({
  applications,
  placements,
  candidateActivities,
  candidates,
  vacancies,
  clients,
}: Props) {
  const [datePreset, setDatePreset] = useState('30')
  const [periodGrouping, setPeriodGrouping] = useState('weekly')
  const [clientFilter, setClientFilter] = useState('all')
  const [vacancyFilter, setVacancyFilter] = useState('all')
  const [activityTypeFilter, setActivityTypeFilter] = useState('all')
  const [viewMode, setViewMode] = useState<ReportView>('overview')

  const clientOptions = useMemo(() => {
    return [...clients].sort((a, b) =>
      String(a.company_name || '').localeCompare(String(b.company_name || '')),
    )
  }, [clients])

  const vacancyOptions = useMemo(() => {
    return [...vacancies].sort((a, b) =>
      String(a.title || '').localeCompare(String(b.title || '')),
    )
  }, [vacancies])

  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const vacancy = normaliseRelation(app.vacancies)
      const client = getClientFromVacancy(vacancy)

      return (
        isWithinRange(app.created_at, datePreset) &&
        (clientFilter === 'all' || client?.id === clientFilter) &&
        (vacancyFilter === 'all' || vacancy?.id === vacancyFilter)
      )
    })
  }, [applications, datePreset, clientFilter, vacancyFilter])

  const filteredPlacementsByPlacedDate = useMemo(() => {
    return placements.filter(placement => {
      const vacancy = normaliseRelation(placement.vacancies)
      const client = getClientFromPlacement(placement)
      const dateToCheck = placement.placed_at || placement.created_at

      return (
        isWithinRange(dateToCheck, datePreset) &&
        (clientFilter === 'all' || client?.id === clientFilter) &&
        (vacancyFilter === 'all' || vacancy?.id === vacancyFilter)
      )
    })
  }, [placements, datePreset, clientFilter, vacancyFilter])

  const filteredPlacementsByStartDate = useMemo(() => {
    return placements.filter(placement => {
      const vacancy = normaliseRelation(placement.vacancies)
      const client = getClientFromPlacement(placement)

      return (
        isWithinRange(placement.start_date, datePreset) &&
        (clientFilter === 'all' || client?.id === clientFilter) &&
        (vacancyFilter === 'all' || vacancy?.id === vacancyFilter)
      )
    })
  }, [placements, datePreset, clientFilter, vacancyFilter])

  const filteredActivities = useMemo(() => {
    return candidateActivities.filter(activity => {
      return (
        isWithinRange(activity.created_at, datePreset) &&
        (activityTypeFilter === 'all' ||
          activity.activity_type === activityTypeFilter)
      )
    })
  }, [candidateActivities, datePreset, activityTypeFilter])

  const filteredCandidates = useMemo(() => {
    return candidates.filter(candidate => isWithinRange(candidate.created_at, datePreset))
  }, [candidates, datePreset])

  const filteredVacancies = useMemo(() => {
    return vacancies.filter(vacancy => {
      const client = getClientFromVacancy(vacancy)

      return (
        isWithinRange(vacancy.created_at, datePreset) &&
        (clientFilter === 'all' || client?.id === clientFilter) &&
        (vacancyFilter === 'all' || vacancy.id === vacancyFilter)
      )
    })
  }, [vacancies, datePreset, clientFilter, vacancyFilter])

  const totalApplications = filteredApplications.length

  const eaInterviews = filteredApplications.filter(app =>
    Boolean(app.ea_interview_date) ||
    ['ea_interview', 'docs_received', 'ready_to_present', 'presented', 'client_interview', 'offer', 'placed'].includes(String(app.status || '')),
  ).length

  const employerInterviews = new Set(
    filteredApplications
      .filter(app =>
        Boolean(app.client_interview_date) ||
        ['client_interview', 'offer', 'placed'].includes(String(app.status || '')),
      )
      .map(app => app.id),
  ).size

  const presented = filteredApplications.filter(app =>
    ['presented', 'client_interview', 'offer', 'placed'].includes(String(app.status || '')),
  ).length

  const offers = filteredApplications.filter(app =>
    ['offer', 'placed'].includes(String(app.status || '')),
  ).length

  const placedApplications = filteredApplications.filter(app => app.status === 'placed').length

  const confirmedPlacementsByPlacedDate = filteredPlacementsByPlacedDate.filter(
    placement => placement.status === 'placed',
  )

  const confirmedPlacementsByStartDate = filteredPlacementsByStartDate.filter(
    placement => placement.status === 'placed',
  )

  const billingMadeValue = confirmedPlacementsByPlacedDate.reduce(
    (sum, placement) => sum + Number(placement.fee_amount || 0),
    0,
  )

  const invoiceStartDateValue = confirmedPlacementsByStartDate.reduce(
    (sum, placement) => sum + Number(placement.fee_amount || 0),
    0,
  )

  const placementsThisMonth = placements.filter(
    placement => placement.status === 'placed' && isWithinCurrentMonth(placement.placed_at || placement.created_at),
  )

  const startsThisMonth = placements.filter(
    placement => placement.status === 'placed' && isWithinCurrentMonth(placement.start_date),
  )

  const upcomingStarts = placements
    .filter(placement => placement.status === 'placed' && isFutureOrToday(placement.start_date))
    .sort((a, b) => String(a.start_date || '').localeCompare(String(b.start_date || '')))
    .slice(0, 12)

  const jobsRegistered = filteredVacancies.length
  const jobsLive = filteredVacancies.filter(vacancy => vacancy.status === 'live').length
  const jobsLost = filteredVacancies.filter(vacancy =>
    ['lost', 'closed_lost', 'cancelled'].includes(String(vacancy.status || '')),
  ).length
  const jobsFilled = filteredVacancies.filter(vacancy =>
    ['filled', 'placed', 'closed_filled'].includes(String(vacancy.status || '')),
  ).length

  const applicationsToPresentedRate = percentage(presented, totalApplications)
  const presentedToEmployerInterviewRate = percentage(employerInterviews, presented)
  const employerInterviewToOfferRate = percentage(offers, employerInterviews)
  const offerToPlacementRate = percentage(placedApplications, offers)
  const applicationToPlacementRate = percentage(placedApplications, totalApplications)
  const eaToEmployerInterviewRate = percentage(employerInterviews, eaInterviews)

  const averageFee =
    confirmedPlacementsByPlacedDate.length > 0
      ? Math.round(billingMadeValue / confirmedPlacementsByPlacedDate.length)
      : 0

  const salaryRows = confirmedPlacementsByPlacedDate
    .map(placement => Number(placement.salary || 0))
    .filter(value => value > 0)

  const averageSalary =
    salaryRows.length > 0
      ? Math.round(salaryRows.reduce((sum, value) => sum + value, 0) / salaryRows.length)
      : 0

  const daysToPlaceRows = confirmedPlacementsByPlacedDate
    .map(placement => daysBetween(placement.created_at, placement.placed_at || placement.start_date))
    .filter((value): value is number => value !== null)

  const averageDaysToPlace =
    daysToPlaceRows.length > 0
      ? Math.round(daysToPlaceRows.reduce((sum, value) => sum + value, 0) / daysToPlaceRows.length)
      : 0

  const readyToInvoice = filteredPlacementsByStartDate.filter(
    placement =>
      placement.status === 'placed' &&
      ['ready_to_invoice', 'not_invoiced', null, undefined, ''].includes(
        placement.invoice_status,
      ),
  )

  const documentsNotReleased = filteredPlacementsByStartDate.filter(
    placement => !placement.final_documents_released,
  )

  const activityCounts = useMemo(() => {
    return ACTIVITY_TYPES.filter(type => type.value !== 'all').map(type => ({
      type: type.value,
      label: type.label,
      count: filteredActivities.filter(activity => activity.activity_type === type.value).length,
    }))
  }, [filteredActivities])

  const stageCounts = useMemo(() => {
    return PIPELINE_STAGES.map(stage => ({
      stage,
      count: filteredApplications.filter(app => app.status === stage).length,
    }))
  }, [filteredApplications])

  const clientPerformance = useMemo(() => {
    return clientOptions
      .map(client => {
        const clientApplications = filteredApplications.filter(app => {
          const vacancy = normaliseRelation(app.vacancies)
          const appClient = getClientFromVacancy(vacancy)
          return appClient?.id === client.id
        })

        const clientPlacements = filteredPlacementsByPlacedDate.filter(placement => {
          const placementClient = getClientFromPlacement(placement)
          return placementClient?.id === client.id
        })

        const fees = clientPlacements.reduce(
          (sum, placement) => sum + Number(placement.fee_amount || 0),
          0,
        )

        return {
          id: client.id,
          name: client.company_name,
          applications: clientApplications.length,
          placements: clientPlacements.length,
          fees,
          conversion: percentage(clientPlacements.length, clientApplications.length),
        }
      })
      .filter(row => row.applications > 0 || row.placements > 0 || row.fees > 0)
      .sort((a, b) => b.fees - a.fees || b.placements - a.placements)
      .slice(0, 12)
  }, [clientOptions, filteredApplications, filteredPlacementsByPlacedDate])

  const vacancyPerformance = useMemo(() => {
    return vacancyOptions
      .map(vacancy => {
        const vacancyApplications = filteredApplications.filter(app => {
          const appVacancy = normaliseRelation(app.vacancies)
          return appVacancy?.id === vacancy.id
        })

        const vacancyPlacements = filteredPlacementsByPlacedDate.filter(placement => {
          const placementVacancy = normaliseRelation(placement.vacancies)
          return placementVacancy?.id === vacancy.id
        })

        const fees = vacancyPlacements.reduce(
          (sum, placement) => sum + Number(placement.fee_amount || 0),
          0,
        )

        const client = getClientFromVacancy(vacancy)

        return {
          id: vacancy.id,
          name: vacancy.title,
          sub: client?.company_name || 'No client',
          applications: vacancyApplications.length,
          placements: vacancyPlacements.length,
          fees,
          conversion: percentage(vacancyPlacements.length, vacancyApplications.length),
        }
      })
      .filter(row => row.applications > 0 || row.placements > 0 || row.fees > 0)
      .sort((a, b) => b.fees - a.fees || b.placements - a.placements)
      .slice(0, 12)
  }, [vacancyOptions, filteredApplications, filteredPlacementsByPlacedDate])

  const periodTrendRows = useMemo(() => {
    const rows = new Map<
      string,
      {
        key: string
        label: string
        applications: number
        eaInterviews: number
        employerInterviews: number
        placements: number
        starts: number
        activity: number
        fees: number
      }
    >()

    function ensureRow(key: string) {
      if (!rows.has(key)) {
        rows.set(key, {
          key,
          label: getPeriodLabel(key, periodGrouping),
          applications: 0,
          eaInterviews: 0,
          employerInterviews: 0,
          placements: 0,
          starts: 0,
          activity: 0,
          fees: 0,
        })
      }

      return rows.get(key)!
    }

    filteredApplications.forEach(app => {
      const key = getPeriodKey(app.created_at, periodGrouping)
      if (!key) return

      const row = ensureRow(key)
      row.applications += 1

      if (app.ea_interview_date || app.status === 'ea_interview') {
        row.eaInterviews += 1
      }

      if (
        app.client_interview_date ||
        ['client_interview', 'offer', 'placed'].includes(String(app.status || ''))
      ) {
        row.employerInterviews += 1
      }
    })

    filteredPlacementsByPlacedDate.forEach(placement => {
      const key = getPeriodKey(
        placement.placed_at || placement.created_at,
        periodGrouping,
      )
      if (!key) return

      const row = ensureRow(key)

      if (placement.status === 'placed') {
        row.placements += 1
        row.fees += Number(placement.fee_amount || 0)
      }
    })

    filteredPlacementsByStartDate.forEach(placement => {
      const key = getPeriodKey(placement.start_date, periodGrouping)
      if (!key) return

      const row = ensureRow(key)

      if (placement.status === 'placed') {
        row.starts += 1
      }
    })

    filteredActivities.forEach(activity => {
      const key = getPeriodKey(activity.created_at, periodGrouping)
      if (!key) return

      const row = ensureRow(key)
      row.activity += 1
    })

    return Array.from(rows.values()).sort((a, b) => a.key.localeCompare(b.key))
  }, [
    filteredApplications,
    filteredPlacementsByPlacedDate,
    filteredPlacementsByStartDate,
    filteredActivities,
    periodGrouping,
  ])

  const recentActivities = filteredActivities.slice(0, 12)
  const recentPlacements = filteredPlacementsByPlacedDate.slice(0, 10)

  const dataQuality = [
    {
      label: 'Candidates missing email',
      value: candidates.filter(candidate => !String(candidate.email || '').trim()).length,
    },
    {
      label: 'Candidates missing role/title',
      value: candidates.filter(candidate => !String(candidate.job_title || '').trim()).length,
    },
    {
      label: 'Active candidates',
      value: candidates.filter(
        candidate => candidate.actively_looking || candidate.status === 'active',
      ).length,
    },
    {
      label: 'Vacancies missing client',
      value: vacancies.filter(vacancy => !getClientFromVacancy(vacancy)).length,
    },
    {
      label: 'Placements missing start date',
      value: placements.filter(
        placement => placement.status === 'placed' && !placement.start_date,
      ).length,
    },
    {
      label: 'Placements missing fee',
      value: placements.filter(
        placement =>
          placement.status === 'placed' && !Number(placement.fee_amount || 0),
      ).length,
    },
  ]

  return (
    <div className="crm-page">
      <div className="crm-page-header">
        <div>
          <div className="crm-breadcrumb">
            <Link href="/crm" className="crm-breadcrumb-link">
              CRM
            </Link>
            <span>/</span>
            <span>Reports</span>
          </div>

          <h1 className="crm-page-title">Reports</h1>
          <p className="crm-page-sub">
            Performance, financials, jobs, applications, interviews and data quality.
          </p>
        </div>
      </div>

      <div className="crm-card" style={{ marginBottom: 16, padding: 18 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              '160px 160px minmax(220px, 1fr) minmax(220px, 1fr) 180px',
            gap: 12,
            alignItems: 'end',
          }}
        >
          <FilterSelect label="Date range" value={datePreset} onChange={setDatePreset}>
            {DATE_PRESETS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Group by"
            value={periodGrouping}
            onChange={setPeriodGrouping}
          >
            {PERIOD_GROUPS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect label="Client" value={clientFilter} onChange={setClientFilter}>
            <option value="all">All clients</option>
            {clientOptions.map(client => (
              <option key={client.id} value={client.id}>
                {client.company_name}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Vacancy"
            value={vacancyFilter}
            onChange={setVacancyFilter}
          >
            <option value="all">All vacancies</option>
            {vacancyOptions.map(vacancy => (
              <option key={vacancy.id} value={vacancy.id}>
                {vacancy.title}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Activity"
            value={activityTypeFilter}
            onChange={setActivityTypeFilter}
          >
            {ACTIVITY_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </FilterSelect>
        </div>

        <div
          className="crm-status-filters"
          style={{
            marginTop: 14,
            overflowX: 'auto',
            flexWrap: 'nowrap',
          }}
        >
          {VIEW_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`crm-status-filter${viewMode === tab.id ? ' active' : ''}`}
              onClick={() => setViewMode(tab.id)}
              style={{ whiteSpace: 'nowrap' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="crm-stats-grid"
        style={{
          marginBottom: 16,
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        }}
      >
        <MetricCard label="Billing made" value={formatMoney(billingMadeValue)} tone="blue" />
        <MetricCard
          label="Invoice/start-date financials"
          value={formatMoney(invoiceStartDateValue)}
          tone="green"
        />
        <MetricCard label="Jobs registered" value={jobsRegistered} />
        <MetricCard label="Jobs lost" value={jobsLost} tone="amber" />
        <MetricCard label="Applications" value={totalApplications} />
        <MetricCard label="EA interviews" value={eaInterviews} tone="blue" />
        <MetricCard label="Employer interviews" value={employerInterviews} tone="blue" />
        <MetricCard
          label="Placements"
          value={confirmedPlacementsByPlacedDate.length}
          tone="green"
        />
        <MetricCard label="Starts due" value={upcomingStarts.length} tone="green" />
      </div>

      {viewMode === 'overview' && (
        <ReportGrid>
          <PeriodTrendTable rows={periodTrendRows} periodGrouping={periodGrouping} />

          <SimpleCard title="Key conversion rates">
            <PriorityRow
              label="Application → presented"
              value={`${applicationsToPresentedRate}%`}
            />
            <PriorityRow
              label="Presented → employer interview"
              value={`${presentedToEmployerInterviewRate}%`}
            />
            <PriorityRow
              label="Employer interview → offer"
              value={`${employerInterviewToOfferRate}%`}
            />
            <PriorityRow
              label="Offer → placement"
              value={`${offerToPlacementRate}%`}
            />
            <PriorityRow
              label="Application → placement"
              value={`${applicationToPlacementRate}%`}
            />
          </SimpleCard>

          <SimpleCard title="Commercial snapshot">
            <PriorityRow
              label="Billing made"
              value={formatMoney(billingMadeValue)}
              tone="blue"
            />
            <PriorityRow
              label="Invoice/start-date financials"
              value={formatMoney(invoiceStartDateValue)}
              tone="green"
            />
            <PriorityRow label="Average fee" value={formatMoney(averageFee)} />
            <PriorityRow label="Average salary" value={formatMoney(averageSalary)} />
            <PriorityRow
              label="Average days to place"
              value={averageDaysToPlace}
              tone="amber"
            />
          </SimpleCard>

          <PipelineStageCard
            stageCounts={stageCounts}
            totalApplications={totalApplications}
          />
        </ReportGrid>
      )}

            {viewMode === 'financials' && (
        <ReportGrid>
          <SimpleCard title="Financial reporting">
            <PriorityRow
              label="Billing made in selected period"
              value={formatMoney(billingMadeValue)}
              tone="blue"
            />
            <PriorityRow
              label="Invoice/start-date financials"
              value={formatMoney(invoiceStartDateValue)}
              tone="green"
            />
            <PriorityRow
              label="Placements made this month"
              value={placementsThisMonth.length}
            />
            <PriorityRow
              label="Starts this month"
              value={startsThisMonth.length}
            />
            <PriorityRow
              label="Ready / not yet invoiced"
              value={readyToInvoice.length}
              tone="amber"
            />
            <PriorityRow
              label="Final documents not released"
              value={documentsNotReleased.length}
              tone="amber"
            />
          </SimpleCard>

          <PerformanceTable
            title="Top clients by revenue"
            rows={clientPerformance}
            firstColumn="Client"
          />

          <PerformanceTable
            title="Top vacancies by revenue"
            rows={vacancyPerformance}
            firstColumn="Vacancy"
          />
        </ReportGrid>
      )}

      {viewMode === 'jobs' && (
        <ReportGrid>
          <SimpleCard title="Job performance">
            <PriorityRow label="Jobs registered" value={jobsRegistered} />
            <PriorityRow label="Live jobs" value={jobsLive} tone="green" />
            <PriorityRow label="Jobs filled" value={jobsFilled} tone="green" />
            <PriorityRow label="Jobs lost" value={jobsLost} tone="amber" />
            <PriorityRow
              label="Fill rate"
              value={`${percentage(jobsFilled, jobsRegistered)}%`}
            />
            <PriorityRow
              label="Lost rate"
              value={`${percentage(jobsLost, jobsRegistered)}%`}
              tone="amber"
            />
          </SimpleCard>

          <PerformanceTable
            title="Vacancy performance"
            rows={vacancyPerformance}
            firstColumn="Vacancy"
          />
        </ReportGrid>
      )}

      {viewMode === 'applications' && (
        <ReportGrid>
          <SimpleCard title="Application funnel">
            <PriorityRow label="Applications created" value={totalApplications} />
            <PriorityRow label="Presented/submitted" value={presented} />
            <PriorityRow label="Offers" value={offers} />
            <PriorityRow
              label="Placed applications"
              value={placedApplications}
              tone="green"
            />
            <PriorityRow
              label="Application → placement"
              value={`${applicationToPlacementRate}%`}
            />
          </SimpleCard>

          <PipelineStageCard
            stageCounts={stageCounts}
            totalApplications={totalApplications}
          />
        </ReportGrid>
      )}

      {viewMode === 'interviews' && (
        <ReportGrid>
          <SimpleCard title="Interview performance">
            <PriorityRow label="EA interviews" value={eaInterviews} tone="blue" />
            <PriorityRow
              label="Employer interviews"
              value={employerInterviews}
              tone="blue"
            />
            <PriorityRow
              label="EA → employer interview"
              value={`${eaToEmployerInterviewRate}%`}
              tone="green"
            />
            <PriorityRow
              label="Employer interview → offer"
              value={`${employerInterviewToOfferRate}%`}
            />
            <PriorityRow
              label="Employer interview → placement"
              value={`${percentage(placedApplications, employerInterviews)}%`}
            />
          </SimpleCard>

          <SimpleCard title="Interview notes">
            <p
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.6,
                color: 'var(--text-muted)',
              }}
            >
              Employer interviews are counted once per application so repeated
              notes or follow-up records do not inflate the number.
            </p>
          </SimpleCard>
        </ReportGrid>
      )}

      {viewMode === 'placements' && (
        <div className="crm-card crm-table-card">
          <TableHeader
            title="Placements and starts"
            sub="Recent placements filtered by selected date range."
          />

          <table className="crm-table">
            <thead>
              <tr>
                <th>Placement</th>
                <th>Candidate</th>
                <th>Client / Vacancy</th>
                <th>Placed</th>
                <th>Start</th>
                <th>Fee</th>
                <th>Invoice</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {recentPlacements.map(placement => {
                const candidate = normaliseRelation(placement.candidates)
                const vacancy = normaliseRelation(placement.vacancies)
                const client = getClientFromPlacement(placement)

                return (
                  <tr key={placement.id}>
                    <td>
                      <p className="crm-table-main">
                        {placement.placement_ref || 'Placement'}
                      </p>
                    </td>

                    <td>{candidateName(candidate)}</td>

                    <td>
                      <p className="crm-table-main">
                        {client?.company_name || '—'}
                      </p>
                      <p className="crm-table-sub">{vacancyTitle(vacancy)}</p>
                    </td>

                    <td>{formatDate(placement.placed_at || placement.created_at)}</td>
                    <td>{formatDate(placement.start_date)}</td>
                    <td>{formatMoney(placement.fee_amount)}</td>

                    <td>
                      <span className="crm-badge crm-badge-blue">
                        {statusLabel(placement.invoice_status || 'not invoiced')}
                      </span>
                    </td>

                    <td>
                      <Link
                        href={`/crm/placements/${placement.id}`}
                        className="crm-card-link"
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {recentPlacements.length === 0 && (
            <p className="crm-empty crm-empty-table">
              No placements for this filter.
            </p>
          )}
        </div>
      )}

      {viewMode === 'activity' && (
        <ReportGrid>
          <SimpleCard title="Activity breakdown">
            {activityCounts.map(item => (
              <PriorityRow
                key={item.type}
                label={item.label}
                value={item.count}
              />
            ))}
          </SimpleCard>

          <div className="crm-card crm-table-card" style={{ gridColumn: 'span 2' }}>
            <TableHeader
              title="Recent activity"
              sub="Candidate activity logged during the selected period."
            />

            <table className="crm-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Candidate</th>
                  <th>Note</th>
                </tr>
              </thead>

              <tbody>
                {recentActivities.map(activity => {
                  const candidate = normaliseRelation(activity.candidates)

                  return (
                    <tr key={activity.id}>
                      <td>{formatDate(activity.created_at)}</td>

                      <td>
                        <span className="crm-badge crm-badge-blue">
                          {statusLabel(activity.activity_type || 'activity')}
                        </span>
                      </td>

                      <td>{candidateName(candidate)}</td>

                      <td>
                        <span
                          style={{
                            fontSize: 12,
                            color: 'var(--text-muted)',
                          }}
                        >
                          {activity.content || '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {recentActivities.length === 0 && (
              <p className="crm-empty crm-empty-table">
                No activity for this filter.
              </p>
            )}
          </div>
        </ReportGrid>
      )}

      {viewMode === 'data_quality' && (
        <ReportGrid>
          <SimpleCard title="Data quality checks">
            {dataQuality.map(item => (
              <PriorityRow
                key={item.label}
                label={item.label}
                value={item.value}
                tone={item.value > 0 ? 'amber' : 'green'}
              />
            ))}
          </SimpleCard>

          <SimpleCard title="Why this matters">
            <p
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.6,
                color: 'var(--text-muted)',
              }}
            >
              Reports are only as good as the data underneath them. Missing fees,
              start dates, emails and role information will make performance
              reporting look wrong even when the recruitment work is right.
            </p>
          </SimpleCard>
        </ReportGrid>
      )}
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <div className="crm-field">
      <label className="crm-label">{label}</label>

      <select
        className="crm-select"
        value={value}
        onChange={event => onChange(event.target.value)}
      >
        {children}
      </select>
    </div>
  )
}

function ReportGrid({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: 16,
      }}
    >
      {children}
    </div>
  )
}

function SimpleCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="crm-card" style={{ padding: 18 }}>
      <h2 className="crm-card-title" style={{ marginBottom: 14 }}>
        {title}
      </h2>

      {children}
    </div>
  )
}

function TableHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div
      style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--border-light)',
      }}
    >
      <h2 className="crm-card-title">{title}</h2>

      {sub && (
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 12,
            color: 'var(--text-muted)',
          }}
        >
          {sub}
        </p>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone?: 'green' | 'blue' | 'amber'
}) {
  const colour =
    tone === 'green'
      ? '#217822'
      : tone === 'blue'
        ? '#0B72B8'
        : tone === 'amber'
          ? '#d97706'
          : 'var(--primary)'

  return (
    <div className="crm-stat-card">
      <p className="crm-stat-label">{label}</p>

      <p className="crm-stat-value" style={{ color: colour }}>
        {value}
      </p>
    </div>
  )
}

function PriorityRow({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone?: 'green' | 'blue' | 'amber'
}) {
  const colour =
    tone === 'green'
      ? '#217822'
      : tone === 'blue'
        ? '#0B72B8'
        : tone === 'amber'
          ? '#d97706'
          : 'var(--text-dark)'

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        alignItems: 'center',
        padding: '10px 0',
        borderBottom: '1px solid var(--border-light)',
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: 'var(--text-muted)',
          fontWeight: 700,
        }}
      >
        {label}
      </span>

      <span
        style={{
          fontSize: 16,
          color: colour,
          fontWeight: 900,
        }}
      >
        {value}
      </span>
    </div>
  )
}

function PipelineStageCard({
  stageCounts,
  totalApplications,
}: {
  stageCounts: Array<{ stage: string; count: number }>
  totalApplications: number
}) {
  return (
    <div className="crm-card" style={{ padding: 18 }}>
      <h2 className="crm-card-title" style={{ marginBottom: 14 }}>
        Pipeline by stage
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {stageCounts.map(item => {
          const width = percentage(item.count, totalApplications)

          return (
            <div key={item.stage}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--text-dark)',
                    fontWeight: 800,
                    textTransform: 'capitalize',
                  }}
                >
                  {statusLabel(item.stage)}
                </span>

                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                  }}
                >
                  {item.count}
                </span>
              </div>

              <div
                style={{
                  height: 8,
                  borderRadius: 999,
                  background: 'var(--light-bg)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${width}%`,
                    background: 'var(--primary)',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PerformanceTable({
  title,
  rows,
  firstColumn,
}: {
  title: string
  rows: Array<{
    id: string
    name: string
    sub?: string
    applications: number
    placements: number
    fees: number
    conversion: number
  }>
  firstColumn: string
}) {
  return (
    <div className="crm-card crm-table-card">
      <TableHeader title={title} />

      <table className="crm-table">
        <thead>
          <tr>
            <th>{firstColumn}</th>
            <th>Applications</th>
            <th>Placements</th>
            <th>Fees</th>
            <th>Conversion</th>
          </tr>
        </thead>

        <tbody>
          {rows.map(row => (
            <tr key={row.id}>
              <td>
                <p className="crm-table-main">{row.name}</p>
                {row.sub && <p className="crm-table-sub">{row.sub}</p>}
              </td>

              <td>{row.applications}</td>
              <td>{row.placements}</td>
              <td>{formatMoney(row.fees)}</td>
              <td>{row.conversion}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 && (
        <p className="crm-empty crm-empty-table">No data for this filter.</p>
      )}
    </div>
  )
}

function PeriodTrendTable({
  rows,
  periodGrouping,
}: {
  rows: Array<{
    key: string
    label: string
    applications: number
    eaInterviews: number
    employerInterviews: number
    placements: number
    starts: number
    activity: number
    fees: number
  }>
  periodGrouping: string
}) {
  return (
    <div className="crm-card crm-table-card" style={{ gridColumn: '1 / -1' }}>
      <TableHeader
        title={`${
          periodGrouping.charAt(0).toUpperCase() + periodGrouping.slice(1)
        } trend`}
        sub="Applications, interviews, placements, starts, activity and billing grouped by selected period."
      />

      <table className="crm-table">
        <thead>
          <tr>
            <th>Period</th>
            <th>Applications</th>
            <th>EA interviews</th>
            <th>Employer interviews</th>
            <th>Placements</th>
            <th>Starts</th>
            <th>Activity</th>
            <th>Billing</th>
          </tr>
        </thead>

        <tbody>
          {rows.map(row => (
            <tr key={row.key}>
              <td>
                <p className="crm-table-main">{row.label}</p>
              </td>

              <td>{row.applications}</td>
              <td>{row.eaInterviews}</td>
              <td>{row.employerInterviews}</td>
              <td>{row.placements}</td>
              <td>{row.starts}</td>
              <td>{row.activity}</td>
              <td>{formatMoney(row.fees)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 && (
        <p className="crm-empty crm-empty-table">No trend data for this filter.</p>
      )}
    </div>
  )
}