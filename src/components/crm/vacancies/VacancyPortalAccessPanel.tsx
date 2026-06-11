'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

type PortalUser = {
  id: string
  client_id: string
  name: string
  email: string
  role: string | null
  active: boolean
}

type PortalAccess = {
  id: string
  vacancy_id: string
  portal_user_id: string
  can_view_vacancy: boolean
  can_view_submissions: boolean
  can_view_documents: boolean
}

type Props = {
  vacancyId: string
  clientId: string | null
  portalUsers: PortalUser[]
  initialAccess: PortalAccess[]
}

export default function VacancyPortalAccessPanel({
  vacancyId,
  clientId,
  portalUsers,
  initialAccess,
}: Props) {
  const [accessRows, setAccessRows] = useState(initialAccess)
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const accessByUserId = useMemo(() => {
    return accessRows.reduce<Record<string, PortalAccess>>((acc, row) => {
      acc[row.portal_user_id] = row
      return acc
    }, {})
  }, [accessRows])

  async function updateAccess(portalUserId: string, grantAccess: boolean) {
    const next = {
      can_view_vacancy: grantAccess,
      can_view_submissions: grantAccess,
      can_view_documents: grantAccess,
    }

    setSavingUserId(portalUserId)
    setMessage(null)

    const res = await fetch('/api/crm/portal-vacancy-access', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vacancy_id: vacancyId,
        portal_user_id: portalUserId,
        ...next,
      }),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      setMessage(data?.error || 'Could not update portal access.')
      setSavingUserId(null)
      return
    }

    setAccessRows(currentRows => {
      const withoutUser = currentRows.filter(
        row => row.portal_user_id !== portalUserId,
      )

      if (!data?.access) return withoutUser

      return [...withoutUser, data.access]
    })

    setSavingUserId(null)
    setMessage(
      grantAccess
        ? 'Full portal access granted.'
        : 'Portal access removed.',
    )
  }

  if (!clientId) {
    return (
      <div className="crm-card">
        <h3 className="crm-card-title">Employer portal visibility</h3>
        <p className="crm-empty">
          This vacancy is not linked to a client, so portal access cannot be set.
        </p>
      </div>
    )
  }

  return (
    <div className="vd-tab-content">
      <div className="crm-card">
        <div className="crm-card-header">
          <div>
            <h3 className="crm-card-title">Employer portal visibility</h3>
            <p className="crm-page-sub">
              Select which employer users can access this vacancy. Once selected,
              they will have access to the vacancy, submitted candidates and
              document visibility for this role.
            </p>
          </div>
        </div>

        {message && (
          <p
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: message.includes('Could') ? '#e53e3e' : '#217822',
              marginBottom: 12,
            }}
          >
            {message}
          </p>
        )}

        {portalUsers.length === 0 && (
          <p className="crm-empty">
            No active employer portal users exist for this client yet. Create one
            from the client page first.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {portalUsers.map(user => {
            const row = accessByUserId[user.id]
            const saving = savingUserId === user.id

            const hasAccess =
              row?.can_view_vacancy ||
              row?.can_view_submissions ||
              row?.can_view_documents

            return (
              <div
                key={user.id}
                className="crm-list-row"
                style={{ alignItems: 'flex-start' }}
              >
                <div className="crm-list-row-info">
                  <p className="crm-list-row-title">{user.name}</p>
                  <p className="crm-list-row-sub">
                    {user.email} · {user.role || 'Employer'}
                  </p>

                  <p
                    style={{
                      margin: 0,
                      marginTop: 8,
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      lineHeight: 1.5,
                    }}
                  >
                    {hasAccess
                      ? 'This contact has full access to this vacancy, submitted candidates and document visibility.'
                      : 'This contact does not currently have access to this vacancy.'}
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                  }}
                >
                  <span
                    className="crm-badge"
                    style={{
                      background: hasAccess ? '#e8f5e8' : '#f0f0f2',
                      color: hasAccess ? '#217822' : '#737373',
                    }}
                  >
                    {saving ? 'Saving...' : hasAccess ? 'Full access' : 'No access'}
                  </span>

                  <button
                    type="button"
                    className={hasAccess ? 'crm-btn-ghost crm-btn-sm' : 'crm-btn-primary crm-btn-sm'}
                    onClick={() => updateAccess(user.id, !hasAccess)}
                    disabled={saving}
                  >
                    {saving
                      ? 'Saving...'
                      : hasAccess
                        ? 'Remove access'
                        : 'Grant full access'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {clientId && (
          <div style={{ marginTop: 16 }}>
            <Link href={`/crm/clients/${clientId}`} className="crm-card-link">
              Manage employer portal users →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}