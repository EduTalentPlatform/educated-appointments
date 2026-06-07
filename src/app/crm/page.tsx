import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import DashboardClient from '@/components/crm/DashboardClient'
import SpecOutCandidateButton from '@/components/crm/speculations/SpecOutCandidateButton'
import type { ReactNode } from 'react'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const ACTIVE_APPLICATION_STATUSES = [
  'screening',
  'ea_interview',
  'docs_received',
  'ready_to_present',
  'presented',
  'client_interview',
  'offer',
]

const STAGE_LABELS: Record<string, string> = {
  screening: 'Screening',
  ea_interview: 'EA interview',
  docs_received: 'Docs received',
  ready_to_present: 'Ready to present',
  presented: 'Presented',
  client_interview: 'Client interview',
  offer: 'Offer',
  placed: 'Placed',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  not_interested: 'Not interested',
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

const LEAD_STATUS_COLOURS: Record<string, string> = {
  new: '#737373',
  contacted: '#0B72B8',
  meeting_booked: '#7c3aed',
  proposal_sent: '#d97706',
  follow_up: '#d97706',
  converted: '#217822',
  lost: '#e53e3e',
}

function formatDate(value?: string | null) {
  if (!value) return 'No date'

  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(value?: string | null) {
  if (!value) return 'No date'

  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getInterviewDate(interview: any) {
  if (interview.scheduled_at) return interview.scheduled_at
  if (interview.interview_at) return interview.interview_at
  if (interview.start_time) return interview.start_time

  if (interview.interview_date) {
    const time = interview.interview_time || '00:00'
    return `${interview.interview_date}T${time}`
  }

  if (interview.date) {
    const time = interview.time || interview.interview_time || '00:00'
    return `${interview.date}T${time}`
  }

  return interview.created_at || null
}

function isInterviewPast(value?: string | null) {
  if (!value) return false

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return false

  return date.getTime() < Date.now()
}

function getInterviewType(interview: any) {
  return (
    interview.interview_type ||
    interview.type ||
    interview.stage ||
    interview.round ||
    'Interview'
  )
}

function getInterviewLocation(interview: any) {
  return (
    interview.location ||
    interview.meeting_link ||
    interview.teams_link ||
    interview.zoom_link ||
    interview.notes ||
    ''
  )
}

function normaliseClient(clientField: any) {
  if (Array.isArray(clientField)) return clientField[0] ?? null
  return clientField ?? null
}

function normaliseName(candidate: any) {
  const name = `${candidate?.first_name ?? ''} ${candidate?.last_name ?? ''}`.trim()
  return name || 'Unnamed candidate'
}

function candidateRole(candidate: any) {
  return (
    candidate?.job_title ||
    candidate?.sub_role_type ||
    candidate?.seeking_role_type ||
    'Role not recorded'
  )
}

function candidateLocation(candidate: any) {
  const parts = [
    candidate?.preferred_location,
    candidate?.town_city,
    candidate?.county,
    candidate?.postcode,
  ]
    .map(part => String(part || '').trim())
    .filter(Boolean)

  return parts.length > 0
    ? Array.from(new Set(parts)).join(', ')
    : 'Location not recorded'
}

function shortText(value?: string | null, maxLength = 90) {
  const text = String(value || '').trim()
  if (!text) return ''
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text
}

function statusLabel(status?: string | null) {
  if (!status) return 'Unknown'
  return STAGE_LABELS[status] || status.replace(/_/g, ' ')
}

function taskTitle(task: any) {
  return task.title || task.task_title || 'Task'
}

function taskLink(task: any) {
  if (task.source === 'client') return `/crm/clients/${task.linkId}`
  if (task.source === 'candidate') return `/crm/candidates/${task.linkId}`
  if (task.source === 'placement') return `/crm/placements/${task.linkId}`
  if (task.source === 'speculation') return `/crm/speculations/${task.linkId}`
  return `/crm/leads/${task.linkId}`
}

export default async function CrmDashboard({
  searchParams,
}: {
  searchParams?: Promise<{ board?: string }>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const requestedBoard = String(resolvedSearchParams?.board || 'vacancies')

  const activeBoard = [
    'vacancies',
    'applications',
    'candidates',
    'leads',
    'recent',
  ].includes(requestedBoard)
    ? requestedBoard
    : 'vacancies'
  const supabase = getServiceClient()

  const now = new Date()
  const today = now.toISOString().split('T')[0]

  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(now.getDate() - 7)

  const ninetyDaysAgo = new Date(now)
  ninetyDaysAgo.setDate(now.getDate() - 90)

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    { count: activeLeadsCount },
    { count: activeClientsCount },
    { count: liveVacanciesCount },
    { count: totalCandidatesCount },
    { count: activeCandidatesCount },
    { count: applicationsThisWeekCount },
    { count: offersCount },
    { count: placementsThisMonthCount },

    { data: liveVacancies },
    { data: applicationRows },
    { data: applicationInterviews },
    { data: recentApplications },
    { data: recentCandidates },
    { data: activeCandidatesToSpec },
    { data: recentLeads },

    { data: leadTasks },
    { data: clientTasks },
    { data: candidateTasks },
    { data: placementTasks },
    { data: speculationTasks },

    { data: inactiveClients },
    { data: upcomingPlacements },

  ] = await Promise.all([
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '("converted","lost")'),

    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),

    supabase
      .from('vacancies')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'live'),

    supabase
      .from('candidates')
      .select('*', { count: 'exact', head: true }),

    supabase
      .from('candidates')
      .select('*', { count: 'exact', head: true })
      .or('status.eq.active,actively_looking.eq.true'),

    supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString()),

    supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'offer'),

    supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'placed')
      .gte('updated_at', startOfMonth.toISOString()),

    supabase
      .from('vacancies')
      .select(`
        id,
        title,
        status,
        location,
        region,
        salary_display,
        created_at,
        updated_at,
        clients (
          id,
          company_name
        )
      `)
      .eq('status', 'live')
      .order('created_at', { ascending: false })
      .limit(12),

    supabase
      .from('applications')
      .select(`
        id,
        status,
        created_at,
        updated_at,
        vacancy_id,
        candidate_id,
        candidates (
          id,
          first_name,
          last_name,
          job_title,
          phone,
          email,
          postcode
        ),
        vacancies (
          id,
          title,
          status,
          clients (
            id,
            company_name
          )
        )
      `)
      .in('status', ACTIVE_APPLICATION_STATUSES)
      .order('updated_at', { ascending: false })
      .limit(2000),

    supabase
      .from('application_interviews')
      .select(`
        *,
        applications (
          id,
          status,
          candidates (
            id,
            first_name,
            last_name,
            job_title,
            phone,
            email
          ),
          vacancies (
            id,
            title,
            clients (
              id,
              company_name
            )
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50),

    supabase
      .from('applications')
      .select(`
        id,
        status,
        created_at,
        updated_at,
        candidates (
          id,
          first_name,
          last_name,
          job_title
        ),
        vacancies (
          id,
          title,
          clients (
            id,
            company_name
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(8),

    supabase
      .from('candidates')
      .select(`
        id,
        first_name,
        last_name,
        job_title,
        seeking_role_type,
        sub_role_type,
        postcode,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(8),

    supabase
      .from('candidates')
      .select(`
        id,
        first_name,
        last_name,
        job_title,
        seeking_role_type,
        sub_role_type,
        preferred_location,
        town_city,
        county,
        postcode,
        salary_expected,
        notice_period,
        can_deliver,
        status,
        actively_looking,
        created_at
      `)
      .or('status.eq.active,actively_looking.eq.true')
      .order('created_at', { ascending: false })
      .limit(8),

    supabase
      .from('leads')
      .select('*')
      .not('status', 'in', '("converted","lost")')
      .order('updated_at', { ascending: false })
      .limit(6),

    supabase
      .from('lead_tasks')
      .select(`
        *,
        leads (
          id,
          company_name
        )
      `)
      .eq('completed', false)
      .order('due_date', { ascending: true })
      .limit(20),

    supabase
      .from('client_tasks')
      .select(`
        *,
        clients (
          id,
          company_name
        )
      `)
      .eq('completed', false)
      .order('due_date', { ascending: true })
      .limit(20),

    supabase
      .from('candidate_tasks')
      .select(`
        *,
        candidates (
          id,
          first_name,
          last_name
        )
      `)
      .eq('completed', false)
      .order('due_date', { ascending: true })
      .limit(20),

    supabase
      .from('placement_tasks')
      .select(`
        *,
        placements (
          id,
          placement_ref,
          candidates (
            id,
            first_name,
            last_name
          ),
          vacancies (
            id,
            title,
            clients (
              id,
              company_name
            )
          )
        )
      `)
      .eq('completed', false)
      .order('due_date', { ascending: true })
      .limit(20),

      supabase
  .from('speculation_tasks')
  .select(`
    *,
    candidate_speculations (
      id,
      speculation_ref,
      candidate_id,
      candidates (
        id,
        first_name,
        last_name,
        job_title
      )
    )
  `)
  .eq('completed', false)
  .order('due_date', { ascending: true })
  .limit(20),

    supabase
      .from('clients')
      .select('id, company_name, updated_at, sector, region')
      .eq('status', 'active')
      .lt('updated_at', ninetyDaysAgo.toISOString())
      .order('updated_at', { ascending: true })
      .limit(6),

    supabase
  .from('placements')
  .select(`
    *,
    candidates (
      id,
      first_name,
      last_name,
      job_title
    ),
    vacancies (
      id,
      title,
      clients (
        id,
        company_name
      )
    ),
    clients (
      id,
      company_name
    )
  `)
  .gte('start_date', today)
  .order('start_date', { ascending: true })
  .limit(8),
  ])

  const allApplications = applicationRows ?? []

  const stageCounts = ACTIVE_APPLICATION_STATUSES.reduce<Record<string, number>>(
    (acc, stage) => {
      acc[stage] = allApplications.filter(app => app.status === stage).length
      return acc
    },
    {},
  )

  const interviewCount =
    (stageCounts.ea_interview ?? 0) + (stageCounts.client_interview ?? 0)

  const activePipelineCount = allApplications.length

  const appsByVacancy = allApplications.reduce<Record<string, any[]>>((acc, app) => {
    const vacancyId = app.vacancy_id || (app.vacancies as any)?.id

    if (!vacancyId) return acc

    if (!acc[vacancyId]) acc[vacancyId] = []
    acc[vacancyId].push(app)

    return acc
  }, {})

  const vacancyFocus = (liveVacancies ?? [])
    .map((vacancy: any) => {
      const applicationsForVacancy = appsByVacancy[vacancy.id] ?? []
      const client = normaliseClient(vacancy.clients)

      return {
        ...vacancy,
        client,
        applicationsForVacancy,
        applicationCount: applicationsForVacancy.length,
        readyCount: applicationsForVacancy.filter(
          app => app.status === 'ready_to_present',
        ).length,
        interviewCount: applicationsForVacancy.filter(app =>
          ['ea_interview', 'client_interview'].includes(app.status),
        ).length,
        offerCount: applicationsForVacancy.filter(app => app.status === 'offer').length,
      }
    })
    .sort((a, b) => {
      if (a.applicationCount === 0 && b.applicationCount > 0) return -1
      if (b.applicationCount === 0 && a.applicationCount > 0) return 1
      return b.readyCount - a.readyCount
    })
    .slice(0, 8)

  const needActionApplications = allApplications
    .filter(app =>
      ['screening', 'docs_received', 'ready_to_present', 'offer'].includes(app.status),
    )
    .slice(0, 8)

  const interviewsFromInterviewTable = (applicationInterviews ?? [])
    .map((interview: any) => {
      const interviewDate = getInterviewDate(interview)

      const application = Array.isArray(interview.applications)
        ? interview.applications[0] ?? null
        : interview.applications ?? null

      const candidate = Array.isArray(application?.candidates)
        ? application.candidates[0] ?? null
        : application?.candidates ?? null

      const vacancy = Array.isArray(application?.vacancies)
        ? application.vacancies[0] ?? null
        : application?.vacancies ?? null

      const client = normaliseClient(vacancy?.clients)

      return {
        id: `interview-${interview.id}`,
        source: 'interview_table',
        interviewDate,
        interviewType: getInterviewType(interview),
        interviewLocation: getInterviewLocation(interview),
        application,
        candidate,
        vacancy,
        client,
      }
    })
    .filter((interview: any) => interview.application?.id)

  const interviewsFromApplicationStatus = allApplications
    .filter((app: any) => app.status === 'client_interview')
    .map((app: any) => {
      const candidate = Array.isArray(app.candidates)
        ? app.candidates[0] ?? null
        : app.candidates ?? null

      const vacancy = Array.isArray(app.vacancies)
        ? app.vacancies[0] ?? null
        : app.vacancies ?? null

      const client = normaliseClient(vacancy?.clients)

      return {
        id: `application-${app.id}`,
        source: 'application_status',
        interviewDate: app.updated_at || app.created_at,
        interviewType: 'Employer interview',
        interviewLocation: '',
        application: app,
        candidate,
        vacancy,
        client,
      }
    })

  const upcomingInterviews = [
    ...interviewsFromInterviewTable,
    ...interviewsFromApplicationStatus,
  ]
    .filter((interview: any, index, self) => {
      const applicationId = interview.application?.id
      if (!applicationId) return false

      return (
        index ===
        self.findIndex((item: any) => item.application?.id === applicationId)
      )
    })
    .sort((a: any, b: any) => {
      const aDate = a.interviewDate
      const bDate = b.interviewDate

      if (!aDate) return 1
      if (!bDate) return -1

      return new Date(aDate).getTime() - new Date(bDate).getTime()
    })
    .slice(0, 8)

  const allTasks = [
  ...(leadTasks ?? []).map((task: any) => ({
    ...task,
    source: 'lead',
    linkId: task.lead_id || task.leads?.id,
    linkLabel: task.leads?.company_name || 'Lead',
  })),

  ...(clientTasks ?? []).map((task: any) => ({
    ...task,
    source: 'client',
    linkId: task.client_id || task.clients?.id,
    linkLabel: task.clients?.company_name || 'Client',
  })),

  ...(candidateTasks ?? []).map((task: any) => ({
    ...task,
    source: 'candidate',
    linkId: task.candidate_id || task.candidates?.id,
    linkLabel: normaliseName(task.candidates),
  })),

  ...(placementTasks ?? []).map((task: any) => {
    const placement = Array.isArray(task.placements)
      ? task.placements[0] ?? null
      : task.placements ?? null

    const candidate = Array.isArray(placement?.candidates)
      ? placement.candidates[0] ?? null
      : placement?.candidates ?? null

    const vacancy = Array.isArray(placement?.vacancies)
      ? placement.vacancies[0] ?? null
      : placement?.vacancies ?? null

    const client = Array.isArray(vacancy?.clients)
      ? vacancy.clients[0] ?? null
      : vacancy?.clients ?? null

    const candidateNameText =
      `${candidate?.first_name ?? ''} ${candidate?.last_name ?? ''}`.trim()

    return {
      ...task,
      source: 'placement',
      linkId: placement?.id,
      linkLabel:
        candidateNameText ||
        placement?.placement_ref ||
        client?.company_name ||
        'Placement',
      contextLabel: vacancy?.title || client?.company_name || '',
    }
  }),

  ...(speculationTasks ?? []).map((task: any) => {
    const speculation = Array.isArray(task.candidate_speculations)
      ? task.candidate_speculations[0] ?? null
      : task.candidate_speculations ?? null

    const candidate = Array.isArray(speculation?.candidates)
      ? speculation.candidates[0] ?? null
      : speculation?.candidates ?? null

    const candidateNameText =
      `${candidate?.first_name ?? ''} ${candidate?.last_name ?? ''}`.trim()

    return {
      ...task,
      source: 'speculation',
      linkId: task.speculation_id || speculation?.id,
      linkLabel:
        candidateNameText ||
        speculation?.speculation_ref ||
        'Speculation',
      contextLabel: speculation?.speculation_ref || 'Candidate speculation',
    }
  }),
].sort((a, b) => {
  if (!a.due_date) return 1
  if (!b.due_date) return -1
  return String(a.due_date).localeCompare(String(b.due_date))
})

  const overdueTasks = allTasks.filter(task => task.due_date && task.due_date < today)
  const todayTasks = allTasks.filter(task => task.due_date === today)
  const upcomingTasks = allTasks.filter(task => !task.due_date || task.due_date > today)

  const upcomingPlacementStarts = (upcomingPlacements ?? [])
  .map((placement: any) => {
    const candidate = Array.isArray(placement.candidates)
      ? placement.candidates[0] ?? null
      : placement.candidates ?? null

    const vacancy = Array.isArray(placement.vacancies)
      ? placement.vacancies[0] ?? null
      : placement.vacancies ?? null

    const vacancyClient = normaliseClient(vacancy?.clients)
    const placementClient = normaliseClient(placement.clients)
    const client = placementClient || vacancyClient

    return {
      ...placement,
      candidate,
      vacancy,
      client,
      startDate:
        placement.start_date ||
        placement.apprentice_start_date ||
        placement.confirmed_start_date ||
        null,
    }
  })
  .filter((placement: any) => placement.startDate)
  .slice(0, 8)

const boardTabs = [
  {
    id: 'vacancies',
    label: 'Vacancies',
    count: vacancyFocus.length,
    href: '/crm?board=vacancies',
  },
  {
    id: 'applications',
    label: 'Applications',
    count: needActionApplications.length,
    href: '/crm?board=applications',
  },
  {
    id: 'candidates',
    label: 'Candidates',
    count: activeCandidatesToSpec?.length ?? 0,
    href: '/crm?board=candidates',
  },
  {
    id: 'leads',
    label: 'Leads',
    count: recentLeads?.length ?? 0,
    href: '/crm?board=leads',
  },
  {
    id: 'recent',
    label: 'Recent activity',
    count: (recentApplications?.length ?? 0) + (recentCandidates?.length ?? 0),
    href: '/crm?board=recent',
  },
]

  const stats = [
    {
      label: 'Live jobs',
      value: liveVacanciesCount ?? 0,
      href: '/crm/vacancies',
      color: '#217822',
      sub: 'Jobs currently being worked',
    },
    {
      label: 'Active pipeline',
      value: activePipelineCount,
      href: '/crm/vacancies',
      color: 'var(--primary)',
      sub: 'Candidates in live process',
    },
    {
      label: 'Interviews',
      value: interviewCount,
      href: '/crm/vacancies',
      color: '#7c3aed',
      sub: 'EA + client interview stages',
    },
    {
      label: 'Offers',
      value: offersCount ?? 0,
      href: '/crm/vacancies',
      color: '#1a6e1a',
      sub: 'Candidates at offer stage',
    },
    {
      label: 'Placements this month',
      value: placementsThisMonthCount ?? 0,
      href: '/crm/vacancies',
      color: '#0B72B8',
      sub: 'Placed since month start',
    },
    {
      label: 'Active candidates',
      value: activeCandidatesCount ?? totalCandidatesCount ?? 0,
      href: '/crm/candidates',
      color: '#d97706',
      sub: 'Available candidate pool',
    },
  ]

return (
  <div className="crm-page">
    <DashboardClient />

    <div
      style={{
        display: 'grid',
        gap: 22,
      }}
    >
      {/* HERO / COMMAND HEADER */}
      <section
        className="crm-card"
        style={{
          padding: 24,
          border: '1px solid rgba(53,45,235,0.12)',
          background:
            'linear-gradient(135deg, rgba(53,45,235,0.08), rgba(11,114,184,0.05) 45%, #fff)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 18,
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            marginBottom: 22,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                fontWeight: 900,
                color: 'var(--primary)',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
              }}
            >
              Educated Appointments CRM
            </p>

            <h1
              className="crm-page-title"
              style={{
                marginTop: 6,
                marginBottom: 6,
                fontSize: 34,
                letterSpacing: -1.2,
              }}
            >
              Recruitment Dashboard
            </h1>

            <p
              className="crm-page-sub"
              style={{
                maxWidth: 720,
                lineHeight: 1.55,
              }}
            >
              {new Date().toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}{' '}
              · Your key recruitment activity, tasks, interviews and live jobs in
              one place.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            <Link href="/crm/vacancies" className="crm-btn-ghost">
              Vacancies
            </Link>

            <Link href="/crm/candidates" className="crm-btn-ghost">
              Candidates
            </Link>

            <Link href="/crm/leads" className="crm-btn-primary">
              + New lead
            </Link>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))',
            gap: 12,
          }}
        >
          {stats.map(stat => (
            <Link
              key={stat.label}
              href={stat.href}
              style={{
                display: 'block',
                textDecoration: 'none',
                color: 'inherit',
                background: '#fff',
                border: '1px solid rgba(15,23,42,0.08)',
                borderRadius: 16,
                padding: 16,
                boxShadow: '0 10px 30px rgba(15,23,42,0.05)',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  fontWeight: 900,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.4,
                }}
              >
                {stat.label}
              </p>

              <p
                style={{
                  margin: '8px 0 2px',
                  fontSize: 34,
                  fontWeight: 950,
                  letterSpacing: -1.4,
                  color: stat.color,
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </p>

              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  lineHeight: 1.35,
                }}
              >
                {stat.sub}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* DAILY CONTROL BOARD */}
<section>
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: 16,
      alignItems: 'start',
    }}
  >
    <div className="crm-card" style={{ padding: 18, minHeight: 420 }}>
      <div className="crm-card-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2 className="crm-card-title">Tasks board</h2>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 12,
              color: 'var(--text-muted)',
              lineHeight: 1.45,
            }}
          >
            Due, overdue and upcoming actions.
          </p>
        </div>

        <span className="crm-card-count">{allTasks.length} open</span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          marginBottom: 14,
        }}
      >
        <MiniMetric label="Overdue" value={overdueTasks.length} />
        <MiniMetric label="Today" value={todayTasks.length} />
        <MiniMetric label="Upcoming" value={upcomingTasks.length} />
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {overdueTasks.length > 0 && (
          <TaskGroup title="Overdue" tone="overdue" tasks={overdueTasks.slice(0, 4)} />
        )}

        {todayTasks.length > 0 && (
          <TaskGroup title="Due today" tone="today" tasks={todayTasks.slice(0, 4)} />
        )}

        {upcomingTasks.length > 0 && (
          <TaskGroup title="Upcoming" tone="upcoming" tasks={upcomingTasks.slice(0, 4)} />
        )}

        {allTasks.length === 0 && (
          <p className="crm-empty">No open tasks.</p>
        )}
      </div>
    </div>

    <div className="crm-card" style={{ padding: 18, minHeight: 420 }}>
      <div className="crm-card-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2 className="crm-card-title">Upcoming interviews</h2>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 12,
              color: 'var(--text-muted)',
              lineHeight: 1.45,
            }}
          >
            Interviews booked or needing feedback.
          </p>
        </div>

        <Link href="/crm/vacancies" className="crm-card-link">
          View pipeline
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {upcomingInterviews.slice(0, 5).map((interview: any) => {
          const application = interview.application
          const candidate = interview.candidate
          const vacancy = interview.vacancy
          const client = interview.client
          const interviewDate = interview.interviewDate
          const interviewPast = isInterviewPast(interviewDate)

          return (
            <Link
              key={interview.id}
              href={`/crm/applications/${application.id}`}
              className="crm-list-row"
            >
              <div className="crm-list-row-info">
                <p className="crm-list-row-title">{normaliseName(candidate)}</p>

                <p className="crm-list-row-sub">
                  {vacancy?.title || 'Unknown vacancy'}
                  {client?.company_name ? ` · ${client.company_name}` : ''}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 7 }}>
                  <span
                    className="crm-badge"
                    style={{ background: '#f3f0ff', color: '#7c3aed' }}
                  >
                    {String(interview.interviewType).replace(/_/g, ' ')}
                  </span>

                  <span
                    className="crm-badge"
                    style={{ background: '#e0f0fb', color: '#0B72B8' }}
                  >
                    {formatDateTime(interviewDate)}
                  </span>

                  <span
                    className="crm-badge"
                    style={{
                      background: interviewPast ? '#fffbeb' : '#e8f5e8',
                      color: interviewPast ? '#d97706' : '#217822',
                    }}
                  >
                    {interviewPast ? 'Feedback due' : 'Upcoming'}
                  </span>
                </div>
              </div>
            </Link>
          )
        })}

        {upcomingInterviews.length === 0 && (
          <p className="crm-empty">No interviews currently in the pipeline.</p>
        )}
      </div>
    </div>

    <div className="crm-card" style={{ padding: 18, minHeight: 420 }}>
      <div className="crm-card-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2 className="crm-card-title">Upcoming starts</h2>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 12,
              color: 'var(--text-muted)',
              lineHeight: 1.45,
            }}
          >
            Placements due to start soon.
          </p>
        </div>

        <Link href="/crm/placements" className="crm-card-link">
          View all
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {upcomingPlacementStarts.map((placement: any) => (
          <Link
            key={placement.id}
            href={`/crm/placements/${placement.id}`}
            className="crm-list-row"
          >
            <div className="crm-list-row-info">
              <p className="crm-list-row-title">
                {normaliseName(placement.candidate)}
              </p>

              <p className="crm-list-row-sub">
                {placement.vacancy?.title || placement.placement_ref || 'Placement'}
                {placement.client?.company_name
                  ? ` · ${placement.client.company_name}`
                  : ''}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 7 }}>
                <span
                  className="crm-badge"
                  style={{ background: '#e8f5e8', color: '#217822' }}
                >
                  Starts {formatDate(placement.startDate)}
                </span>
              </div>
            </div>

            <span className="crm-card-link">Open →</span>
          </Link>
        ))}

        {upcomingPlacementStarts.length === 0 && (
          <p className="crm-empty">No upcoming placement starts recorded.</p>
        )}
      </div>
    </div>
  </div>
</section>

      {/* INACTIVE CLIENTS */}
      {inactiveClients && inactiveClients.length > 0 && (
        <section
          className="crm-card"
          style={{
            padding: 18,
            border: '1px solid #fde68a',
            background: '#fffbeb',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 900,
                  color: '#92400e',
                }}
              >
                ⚠ {inactiveClients.length} active client
                {inactiveClients.length !== 1 ? 's' : ''} with no activity in
                over 90 days
              </p>

              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: 12,
                  color: '#92400e',
                  lineHeight: 1.45,
                }}
              >
                Good clients go cold quietly. Worth a touchpoint.
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
              }}
            >
              {inactiveClients.map((client: any) => (
                <Link
                  key={client.id}
                  href={`/crm/clients/${client.id}`}
                  className="crm-btn-ghost crm-btn-sm"
                  style={{
                    background: '#fff',
                    borderColor: '#fde68a',
                    textDecoration: 'none',
                  }}
                >
                  {client.company_name} · {formatDate(client.updated_at)}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

     {/* FILTERED DASHBOARD BOARD */}
<section>
  <div
    className="crm-card"
    style={{
      padding: 20,
    }}
  >
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 14,
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        marginBottom: 16,
      }}
    >
      <div>
        <h2 className="crm-card-title">Focus board</h2>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 12,
            color: 'var(--text-muted)',
            lineHeight: 1.45,
          }}
        >
          Filter the dashboard without turning the page into a car boot sale.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          justifyContent: 'flex-end',
        }}
      >
        {boardTabs.map(tab => {
          const isActive = activeBoard === tab.id

          return (
            <Link
  key={tab.id}
  href={tab.href}
  scroll={false}
  className={isActive ? 'crm-btn-primary crm-btn-sm' : 'crm-btn-ghost crm-btn-sm'}
  style={{
    textDecoration: 'none',
    display: 'inline-flex',
    gap: 6,
    alignItems: 'center',
  }}
>
              {tab.label}
              <span
                style={{
                  opacity: 0.8,
                  fontSize: 11,
                  fontWeight: 900,
                }}
              >
                {tab.count}
              </span>
            </Link>
          )
        })}
      </div>
    </div>

    {activeBoard === 'vacancies' && (
      <DashboardBoard title="Live vacancies needing attention">
        {vacancyFocus.map((vacancy: any) => (
          <Link
            key={vacancy.id}
            href={`/crm/vacancies/${vacancy.id}`}
            className="crm-list-row"
          >
            <div className="crm-list-row-info">
              <p className="crm-list-row-title">{vacancy.title}</p>
              <p className="crm-list-row-sub">
                {vacancy.client?.company_name || 'No client'} ·{' '}
                {vacancy.location || vacancy.region || 'Location not set'}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
                <span className="crm-badge crm-badge-blue">
                  {vacancy.applicationCount} active
                </span>

                {vacancy.applicationCount === 0 && (
                  <span
                    className="crm-badge"
                    style={{ background: '#fef2f2', color: '#e53e3e' }}
                  >
                    Needs candidates
                  </span>
                )}

                {vacancy.readyCount > 0 && (
                  <span
                    className="crm-badge"
                    style={{ background: '#fffbeb', color: '#d97706' }}
                  >
                    {vacancy.readyCount} ready
                  </span>
                )}

                {vacancy.interviewCount > 0 && (
                  <span
                    className="crm-badge"
                    style={{ background: '#f3f0ff', color: '#7c3aed' }}
                  >
                    {vacancy.interviewCount} interview
                  </span>
                )}

                {vacancy.offerCount > 0 && (
                  <span
                    className="crm-badge"
                    style={{ background: '#e8f5e8', color: '#217822' }}
                  >
                    {vacancy.offerCount} offer
                  </span>
                )}
              </div>
            </div>

            <span className="crm-card-link">Open →</span>
          </Link>
        ))}

        {vacancyFocus.length === 0 && (
          <p className="crm-empty">No live vacancies yet.</p>
        )}
      </DashboardBoard>
    )}

    {activeBoard === 'applications' && (
      <DashboardBoard title="Applications needing action">
        {needActionApplications.map((app: any) => {
          const candidate = app.candidates
          const vacancy = app.vacancies
          const client = normaliseClient(vacancy?.clients)

          return (
            <Link
              key={app.id}
              href={`/crm/applications/${app.id}`}
              className="crm-list-row"
            >
              <div className="crm-list-row-info">
                <p className="crm-list-row-title">{normaliseName(candidate)}</p>
                <p className="crm-list-row-sub">
                  {vacancy?.title || 'Unknown vacancy'}
                  {client?.company_name ? ` · ${client.company_name}` : ''}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Updated {formatDateTime(app.updated_at || app.created_at)}
                </p>
              </div>

              <span
                className="crm-badge"
                style={{
                  background: STAGE_COLOURS[app.status]?.bg ?? '#f0f0f2',
                  color: STAGE_COLOURS[app.status]?.text ?? '#737373',
                }}
              >
                {statusLabel(app.status)}
              </span>
            </Link>
          )
        })}

        {needActionApplications.length === 0 && (
          <p className="crm-empty">No applications currently need action.</p>
        )}
      </DashboardBoard>
    )}

    {activeBoard === 'candidates' && (
      <DashboardBoard title="Active candidates to spec out">
        {(activeCandidatesToSpec ?? []).map((candidate: any) => (
          <div
            key={candidate.id}
            className="crm-list-row"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div className="crm-list-row-info">
              <p className="crm-list-row-title">{normaliseName(candidate)}</p>
              <p className="crm-list-row-sub">
                {candidateRole(candidate)} · {candidateLocation(candidate)}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
                {candidate.salary_expected && (
                  <span
                    className="crm-badge"
                    style={{ background: '#e8f5e8', color: '#217822' }}
                  >
                    Salary: {candidate.salary_expected}
                  </span>
                )}

                {candidate.notice_period && (
                  <span
                    className="crm-badge"
                    style={{ background: '#e0f0fb', color: '#0B72B8' }}
                  >
                    Notice: {candidate.notice_period}
                  </span>
                )}

                {candidate.can_deliver && (
                  <span
                    className="crm-badge"
                    style={{ background: '#f3f0ff', color: '#7c3aed' }}
                  >
                    {shortText(candidate.can_deliver, 90)}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
              <Link
                href={`/crm/candidates/${candidate.id}`}
                className="crm-card-link"
                style={{ color: 'var(--text-muted)' }}
              >
                View
              </Link>

              <SpecOutCandidateButton candidateId={candidate.id} />
            </div>
          </div>
        ))}

        {(!activeCandidatesToSpec || activeCandidatesToSpec.length === 0) && (
          <p className="crm-empty">No active candidates currently marked as looking.</p>
        )}
      </DashboardBoard>
    )}

    {activeBoard === 'leads' && (
      <DashboardBoard title="Recent leads">
        {(recentLeads ?? []).map((lead: any) => (
          <Link
            key={lead.id}
            href={`/crm/leads/${lead.id}`}
            className="crm-list-row"
          >
            <div className="crm-list-row-info">
              <p className="crm-list-row-title">{lead.company_name}</p>
              <p className="crm-list-row-sub">
                {lead.contact_name || lead.email || 'No contact recorded'}
              </p>
            </div>

            <span
              className="crm-badge"
              style={{
                background: `${LEAD_STATUS_COLOURS[lead.status] ?? '#737373'}18`,
                color: LEAD_STATUS_COLOURS[lead.status] ?? '#737373',
              }}
            >
              {String(lead.status || 'new').replace(/_/g, ' ')}
            </span>
          </Link>
        ))}

        {(!recentLeads || recentLeads.length === 0) && (
          <p className="crm-empty">
            No active leads yet. <Link href="/crm/leads">Add one →</Link>
          </p>
        )}
      </DashboardBoard>
    )}

    {activeBoard === 'recent' && (
      <DashboardBoard title="Recent activity">
        {(recentApplications ?? []).map((app: any) => {
          const vacancy = app.vacancies
          const client = normaliseClient(vacancy?.clients)

          return (
            <Link
              key={app.id}
              href={`/crm/applications/${app.id}`}
              className="crm-list-row"
            >
              <div className="crm-list-row-info">
                <p className="crm-list-row-title">
                  Application: {normaliseName(app.candidates)}
                </p>
                <p className="crm-list-row-sub">
                  {vacancy?.title || 'Unknown vacancy'}
                  {client?.company_name ? ` · ${client.company_name}` : ''}
                </p>
              </div>

              <span
                className="crm-badge"
                style={{
                  background: STAGE_COLOURS[app.status]?.bg ?? '#e0f0fb',
                  color: STAGE_COLOURS[app.status]?.text ?? '#0B72B8',
                }}
              >
                {statusLabel(app.status)}
              </span>
            </Link>
          )
        })}

        {(recentCandidates ?? []).map((candidate: any) => (
          <Link
            key={candidate.id}
            href={`/crm/candidates/${candidate.id}`}
            className="crm-list-row"
          >
            <div className="crm-list-row-info">
              <p className="crm-list-row-title">
                Candidate: {normaliseName(candidate)}
              </p>
              <p className="crm-list-row-sub">
                {candidate.job_title ||
                  candidate.sub_role_type ||
                  candidate.seeking_role_type ||
                  'Role not recorded'}
                {candidate.postcode ? ` · ${candidate.postcode}` : ''}
              </p>
            </div>

            <span className="crm-card-link">Open →</span>
          </Link>
        ))}

        {(!recentApplications || recentApplications.length === 0) &&
          (!recentCandidates || recentCandidates.length === 0) && (
            <p className="crm-empty">No recent activity yet.</p>
          )}
      </DashboardBoard>
    )}
  </div>
</section>
    </div>
  </div>
)
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        border: '1px solid var(--border-light)',
        borderRadius: 12,
        padding: 12,
        background: 'var(--light-bg)',
      }}
    >
      <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 800 }}>
        {label}
      </p>

      <p
        style={{
          fontSize: 26,
          fontWeight: 900,
          color: 'var(--text-dark)',
          letterSpacing: -1,
          marginTop: 2,
        }}
      >
        {value}
      </p>
    </div>
  )
}

function DashboardBoard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 950,
            color: 'var(--text-dark)',
            letterSpacing: -0.2,
          }}
        >
          {title}
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children}
      </div>
    </div>
  )
}

function TaskGroup({
  title,
  tone,
  tasks,
}: {
  title: string
  tone: 'overdue' | 'today' | 'upcoming'
  tasks: any[]
}) {
  const titleColour =
    tone === 'overdue' ? '#e53e3e' : tone === 'today' ? '#0B72B8' : '#737373'

  return (
    <div className="crm-task-group">
      <p
        className={`crm-task-group-label${
          tone === 'overdue' ? ' crm-task-group-overdue' : ''
        }`}
        style={{ color: titleColour }}
      >
        {title}
      </p>

      {tasks.map(task => (
        <div
          key={`${task.source}-${task.id}`}
          className={`crm-task-row${
            tone === 'overdue' ? ' crm-task-overdue' : ''
          }`}
        >
          <div
            className={`crm-task-dot${
              tone === 'overdue'
                ? ' crm-task-dot-overdue'
                : tone === 'today'
                  ? ' crm-task-dot-today'
                  : task.auto_generated
                    ? ' crm-task-dot-auto'
                    : ''
            }`}
          />

          <div className="crm-task-content">
            <p className="crm-task-title">{taskTitle(task)}</p>

            <p className="crm-task-meta">
              {task.linkLabel || 'Unknown'}
              {task.contextLabel ? ` · ${task.contextLabel}` : ''}
              {task.due_date ? ` · Due ${formatDate(task.due_date)}` : ''}
              {task.source ? ` · ${task.source}` : ''}

              {task.auto_generated && (
                <span className="crm-task-auto-badge">auto</span>
              )}
            </p>
          </div>

          {task.linkId && (
            <Link href={taskLink(task)} className="crm-task-link">
              View
            </Link>
          )}
        </div>
      ))}
    </div>
  )
}