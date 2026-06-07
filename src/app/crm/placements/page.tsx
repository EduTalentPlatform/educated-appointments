import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
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

function formatMoney(value?: number | string | null) {
  if (value === null || value === undefined || value === '') return '—'

  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(Number(value))
}

function candidateName(candidate: any) {
  return `${candidate?.first_name ?? ''} ${candidate?.last_name ?? ''}`.trim() || 'Unknown candidate'
}

export default async function PlacementsPage() {
  const supabase = getServiceClient()

  const { data: placements } = await supabase
    .from('placements')
    .select(`
      *,
      candidates (
        id,
        first_name,
        last_name,
        email,
        phone
      ),
      vacancies (
        id,
        title,
        location,
        region,
        clients (
          id,
          company_name
        )
      ),
      clients (
        id,
        company_name
      ),
      placement_tasks (
        id,
        completed
      )
    `)
    .order('created_at', { ascending: false })

  const placementRows = placements ?? []

  const placedCount = placementRows.filter(row => row.status === 'placed').length
  const draftCount = placementRows.filter(row => row.status !== 'placed').length
  const documentReleasedCount = placementRows.filter(row => row.final_documents_released).length

  return (
    <div className="crm-page">
      <div className="crm-page-header">
        <div>
          <div className="crm-breadcrumb">
            <Link href="/crm" className="crm-breadcrumb-link">
              CRM
            </Link>
            <span>/</span>
            <span>Placements</span>
          </div>

          <h1 className="crm-page-title">Placements</h1>
          <p className="crm-page-sub">
            Confirmed offers, commercial details, final document release and aftercare.
          </p>
        </div>
      </div>

      <div className="crm-stats-grid" style={{ marginBottom: 16 }}>
        <div className="crm-stat-card">
          <p className="crm-stat-label">Total placements</p>
          <p className="crm-stat-value" style={{ color: 'var(--primary)' }}>
            {placementRows.length}
          </p>
        </div>

        <div className="crm-stat-card">
          <p className="crm-stat-label">Placed</p>
          <p className="crm-stat-value" style={{ color: '#217822' }}>
            {placedCount}
          </p>
        </div>

        <div className="crm-stat-card">
          <p className="crm-stat-label">Draft / pending</p>
          <p className="crm-stat-value" style={{ color: '#d97706' }}>
            {draftCount}
          </p>
        </div>

        <div className="crm-stat-card">
          <p className="crm-stat-label">Docs released</p>
          <p className="crm-stat-value" style={{ color: '#0B72B8' }}>
            {documentReleasedCount}
          </p>
        </div>
      </div>

      <div className="crm-card crm-table-card">
        <table className="crm-table">
          <thead>
  <tr>
    <th>Placement</th>
    <th>Candidate</th>
    <th>Client / Vacancy</th>
    <th>Start date</th>
    <th>Salary</th>
    <th>Fee</th>
    <th>Status</th>
    <th>Aftercare</th>
    <th />
  </tr>
</thead>

          <tbody>
            {placementRows.map((placement: any) => {
              const candidate = normaliseRelation(placement.candidates)
              const vacancy = normaliseRelation(placement.vacancies)
              const client =
                normaliseRelation(placement.clients) ||
                normaliseRelation(vacancy?.clients)

              const tasks = Array.isArray(placement.placement_tasks)
                ? placement.placement_tasks
                : []

              const completedTasks = tasks.filter((task: any) => task.completed).length

              return (
                <tr key={placement.id} className="crm-table-row-clickable">
                  <td>
  <Link
    href={`/crm/placements/${placement.id}`}
    className="crm-table-main"
    style={{
      color: 'var(--primary)',
      textDecoration: 'none',
      fontWeight: 900,
    }}
  >
    {placement.placement_ref || 'Placement'}
  </Link>

  <p className="crm-table-sub">
    Created {formatDate(placement.created_at)}
  </p>
</td>

                  <td>
                    <p className="crm-table-main">{candidateName(candidate)}</p>
                    <p className="crm-table-sub">{candidate?.email || candidate?.phone || '—'}</p>
                  </td>

                  <td>
                    <p className="crm-table-main">{client?.company_name || '—'}</p>
                    <p className="crm-table-sub">{vacancy?.title || '—'}</p>
                  </td>

                  <td>{formatDate(placement.start_date)}</td>

                  <td>{formatMoney(placement.salary)}</td>

                  <td>
                    {placement.fee_amount
                      ? formatMoney(placement.fee_amount)
                      : placement.fee_percentage
                        ? `${placement.fee_percentage}%`
                        : '—'}
                  </td>

                  <td>
                    <span
                      className="crm-badge"
                      style={{
                        background:
                          placement.status === 'placed' ? '#e8f5e8' : '#fffbeb',
                        color:
                          placement.status === 'placed' ? '#217822' : '#d97706',
                      }}
                    >
                      {String(placement.status || 'draft').replace(/_/g, ' ')}
                    </span>
                  </td>

                  <td>
  <span className="crm-badge crm-badge-blue">
    {completedTasks}/{tasks.length}
  </span>
</td>

<td>
  <Link
    href={`/crm/placements/${placement.id}`}
    className="crm-card-link"
    style={{ whiteSpace: 'nowrap' }}
  >
    Open →
  </Link>
</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {placementRows.length === 0 && (
          <p className="crm-empty crm-empty-table">
            No placements yet. Create one from an application at offer stage.
          </p>
        )}
      </div>
    </div>
  )
}