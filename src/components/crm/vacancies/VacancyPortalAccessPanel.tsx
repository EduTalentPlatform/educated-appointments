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

  async function updateAccess(
    portalUserId: string,
    updates: Partial<PortalAccess>,
  ) {
    const current = accessByUserId[portalUserId]

    const next = {
      can_view_vacancy: current?.can_view_vacancy ?? false,
      can_view_submissions: current?.can_view_submissions ?? false,
      can_view_documents: current?.can_view_documents ?? false,
      ...updates,
    }

    if (next.can_view_submissions || next.can_view_documents) {
      next.can_view_vacancy = true
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
    setMessage('Portal access updated.')
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
              Choose which employer users can view this vacancy in their portal.
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

            const canViewVacancy = row?.can_view_vacancy ?? false
            const canViewSubmissions = row?.can_view_submissions ?? false
            const canViewDocuments = row?.can_view_documents ?? false

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

                  <div
                    style={{
                      display: 'flex',
                      gap: 14,
                      flexWrap: 'wrap',
                      marginTop: 10,
                    }}
                  >
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 800,
                        color: 'var(--text-dark)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={canViewVacancy}
                        disabled={saving}
                        onChange={e =>
                          updateAccess(user.id, {
                            can_view_vacancy: e.target.checked,
                            can_view_submissions: e.target.checked
                              ? canViewSubmissions
                              : false,
                            can_view_documents: e.target.checked
                              ? canViewDocuments
                              : false,
                          })
                        }
                      />
                      View vacancy
                    </label>

                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 800,
                        color: 'var(--text-dark)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={canViewSubmissions}
                        disabled={saving}
                        onChange={e =>
                          updateAccess(user.id, {
                            can_view_submissions: e.target.checked,
                          })
                        }
                      />
                      View submitted candidates
                    </label>

                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 800,
                        color: 'var(--text-dark)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={canViewDocuments}
                        disabled={saving}
                        onChange={e =>
                          updateAccess(user.id, {
                            can_view_documents: e.target.checked,
                          })
                        }
                      />
                      View documents
                    </label>
                  </div>
                </div>

                <span
                  className="crm-badge"
                  style={{
                    background: canViewVacancy ? '#e8f5e8' : '#f0f0f2',
                    color: canViewVacancy ? '#217822' : '#737373',
                  }}
                >
                  {saving
                    ? 'Saving...'
                    : canViewVacancy
                      ? 'Visible'
                      : 'Hidden'}
                </span>
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