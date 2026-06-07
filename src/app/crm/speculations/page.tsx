import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function formatDate(value?: string | null) {
  if (!value) return '—'

  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function candidateName(candidate: any) {
  return `${candidate?.first_name ?? ''} ${candidate?.last_name ?? ''}`.trim() ||
    'Unknown candidate'
}

function normaliseRelation<T = any>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

const STATUS_COLOURS: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#f0f0f2', text: '#737373' },
  profile_generated: { bg: '#e0f0fb', text: '#0B72B8' },
  ready_to_approach: { bg: '#fffbeb', text: '#d97706' },
  approaching_employers: { bg: '#f3f0ff', text: '#7c3aed' },
  interested_employer: { bg: '#e8f5e8', text: '#217822' },
  interview_arranged: { bg: '#e8f5e8', text: '#217822' },
  converted_to_application: { bg: '#e8f5e8', text: '#1a6e1a' },
  on_hold: { bg: '#fffbeb', text: '#d97706' },
  closed: { bg: '#fef2f2', text: '#e53e3e' },
}

export default async function SpeculationsPage() {
  const supabase = getServiceClient()

  const { data: speculations } = await supabase
  .from('candidate_speculations')
  .select(`
      *,
      candidates (
        id,
        first_name,
        last_name,
        email,
        phone,
        job_title,
        postcode
      ),
      speculation_tasks (
        id,
        completed
      ),
      speculation_target_employers (
        id,
        approach_status
      )
    `)
    .eq('lifecycle_status', 'open')
    .order('updated_at', { ascending: false })

  const rows = speculations ?? []

  const activeCount = rows.filter(row =>
    !['closed', 'converted_to_application'].includes(row.status),
  ).length

  const convertedCount = rows.filter(row =>
    row.status === 'converted_to_application',
  ).length

  const employerTargetCount = rows.reduce((sum, row: any) => {
    const targets = Array.isArray(row.speculation_target_employers)
      ? row.speculation_target_employers
      : []
    return sum + targets.length
  }, 0)

  const tasksOpenCount = rows.reduce((sum, row: any) => {
    const tasks = Array.isArray(row.speculation_tasks)
      ? row.speculation_tasks
      : []
    return sum + tasks.filter((task: any) => !task.completed).length
  }, 0)

  return (
    <div className="crm-page">
      <div className="crm-page-header">
        <div>
          <div className="crm-breadcrumb">
            <Link href="/crm" className="crm-breadcrumb-link">
              CRM
            </Link>
            <span>/</span>
            <span>Speculation</span>
          </div>

          <h1 className="crm-page-title">Speculation</h1>
          <p className="crm-page-sub">
            Candidate-led business development. Build a candidate profile, target employers and create opportunities.
          </p>
        </div>

        <Link href="/crm/candidates" className="crm-btn-primary">
          + Start from candidate
        </Link>
      </div>

      <div className="crm-stats-grid" style={{ marginBottom: 16 }}>
        <div className="crm-stat-card">
          <p className="crm-stat-label">Open speculations</p>
          <p className="crm-stat-value" style={{ color: 'var(--primary)' }}>
            {rows.length}
          </p>
        </div>

        <div className="crm-stat-card">
          <p className="crm-stat-label">Active</p>
          <p className="crm-stat-value" style={{ color: '#0B72B8' }}>
            {activeCount}
          </p>
        </div>

        <div className="crm-stat-card">
          <p className="crm-stat-label">Target employers</p>
          <p className="crm-stat-value" style={{ color: '#7c3aed' }}>
            {employerTargetCount}
          </p>
        </div>

        <div className="crm-stat-card">
          <p className="crm-stat-label">Open tasks</p>
          <p className="crm-stat-value" style={{ color: '#d97706' }}>
            {tasksOpenCount}
          </p>
        </div>

        <div className="crm-stat-card">
          <p className="crm-stat-label">Converted</p>
          <p className="crm-stat-value" style={{ color: '#217822' }}>
            {convertedCount}
          </p>
        </div>
      </div>

      <div className="crm-card crm-table-card">
        <table className="crm-table">
          <thead>
            <tr>
              <th>Speculation</th>
              <th>Candidate</th>
              <th>Target role</th>
              <th>Status</th>
              <th>Targets</th>
              <th>Tasks</th>
              <th>Updated</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {rows.map((speculation: any) => {
              const candidate = normaliseRelation(speculation.candidates)

              const tasks = Array.isArray(speculation.speculation_tasks)
                ? speculation.speculation_tasks
                : []

              const targets = Array.isArray(speculation.speculation_target_employers)
                ? speculation.speculation_target_employers
                : []

              const openTasks = tasks.filter((task: any) => !task.completed).length

              const colours =
                STATUS_COLOURS[speculation.status] || STATUS_COLOURS.draft

              return (
                <tr key={speculation.id}>
                  <td>
                    <Link
                      href={`/crm/speculations/${speculation.id}`}
                      className="crm-table-main"
                      style={{
                        color: 'var(--primary)',
                        fontWeight: 900,
                        textDecoration: 'none',
                      }}
                    >
                      {speculation.speculation_ref || 'Speculation'}
                    </Link>
                    <p className="crm-table-sub">
                      Created {formatDate(speculation.created_at)}
                    </p>
                  </td>

                  <td>
                    <p className="crm-table-main">{candidateName(candidate)}</p>
                    <p className="crm-table-sub">
                      {candidate?.job_title || candidate?.email || candidate?.phone || '—'}
                    </p>
                  </td>

                  <td>
                    {speculation.target_role || speculation.target_roles?.join(', ') || '—'}
                  </td>

                  <td>
                    <span
                      className="crm-badge"
                      style={{
                        background: colours.bg,
                        color: colours.text,
                      }}
                    >
                      {String(speculation.status || 'draft').replace(/_/g, ' ')}
                    </span>
                  </td>

                  <td>
                    <span className="crm-badge crm-badge-blue">
                      {targets.length}
                    </span>
                  </td>

                  <td>
                    <span
                      className="crm-badge"
                      style={{
                        background: openTasks > 0 ? '#fffbeb' : '#e8f5e8',
                        color: openTasks > 0 ? '#d97706' : '#217822',
                      }}
                    >
                      {openTasks} open
                    </span>
                  </td>

                  <td>{formatDate(speculation.updated_at)}</td>

                  <td>
                    <Link
                      href={`/crm/speculations/${speculation.id}`}
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

        {rows.length === 0 && (
          <p className="crm-empty crm-empty-table">
            No speculation records yet. Open a candidate and create one from their profile.
          </p>
        )}
      </div>
    </div>
  )
}