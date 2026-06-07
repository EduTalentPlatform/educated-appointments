'use client'

import { useMemo, useState } from 'react'

type Contact = {
  id: string
  name: string
  email: string | null
  title: string | null
}

type PortalUser = {
  id: string
  client_id: string
  client_contact_id: string | null
  auth_user_id: string | null
  name: string
  email: string
  role: string
  active: boolean
  created_at: string
}

type Props = {
  clientId: string
  contacts: Contact[]
  initialPortalUsers: PortalUser[]
}

function getInitialForm(contacts: Contact[]) {
  const firstContactWithEmail = contacts.find(contact => contact.email)

  return {
    client_contact_id: firstContactWithEmail?.id ?? '',
    name: firstContactWithEmail?.name ?? '',
    email: firstContactWithEmail?.email ?? '',
    role: firstContactWithEmail?.title ?? 'Employer',
  }
}

export default function ClientPortalAccessPanel({
  clientId,
  contacts,
  initialPortalUsers,
}: Props) {
  const [portalUsers, setPortalUsers] = useState(initialPortalUsers)
  const [form, setForm] = useState(() => getInitialForm(contacts))
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)

  const contactsWithEmail = useMemo(
    () => contacts.filter(contact => contact.email),
    [contacts],
  )

  function selectContact(contactId: string) {
    const contact = contacts.find(item => item.id === contactId)

    setForm(current => ({
      ...current,
      client_contact_id: contactId,
      name: contact?.name ?? current.name,
      email: contact?.email ?? current.email,
      role: contact?.title ?? current.role,
    }))
  }

  async function createPortalUser() {
    setCreating(true)
    setMessage(null)
    setTemporaryPassword(null)

    const res = await fetch('/api/crm/client-portal-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_contact_id: form.client_contact_id || null,
        name: form.name,
        email: form.email,
        role: form.role,
      }),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      setMessage(data?.error || 'Could not create portal login.')
      setCreating(false)
      return
    }

    if (data?.portalUser) {
      setPortalUsers(current => [data.portalUser, ...current])
      setTemporaryPassword(data.temporaryPassword)
      setMessage('Portal login created.')
    }

    setCreating(false)
  }

  async function toggleActive(user: PortalUser) {
    const res = await fetch('/api/crm/client-portal-users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: user.id,
        active: !user.active,
      }),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      setMessage(data?.error || 'Could not update portal user.')
      return
    }

    if (data?.portalUser) {
      setPortalUsers(current =>
        current.map(item =>
          item.id === user.id ? data.portalUser : item,
        ),
      )
    }
  }

  return (
    <div className="crm-lead-layout">
      <div className="crm-lead-sidebar">
        <div className="crm-card">
          <h3 className="crm-card-title" style={{ marginBottom: 14 }}>
            Create portal login
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {contactsWithEmail.length > 0 && (
              <div className="crm-field">
                <label className="crm-label">Use existing contact</label>
                <select
                  className="crm-input"
                  value={form.client_contact_id}
                  onChange={e => selectContact(e.target.value)}
                >
                  <option value="">Manual entry</option>
                  {contactsWithEmail.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} — {contact.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="crm-field">
              <label className="crm-label">Name</label>
              <input
                className="crm-input"
                value={form.name}
                onChange={e =>
                  setForm(current => ({ ...current, name: e.target.value }))
                }
                placeholder="Employer contact name"
              />
            </div>

            <div className="crm-field">
              <label className="crm-label">Email</label>
              <input
                className="crm-input"
                type="email"
                value={form.email}
                onChange={e =>
                  setForm(current => ({ ...current, email: e.target.value }))
                }
                placeholder="name@company.co.uk"
              />
            </div>

            <div className="crm-field">
              <label className="crm-label">Role</label>
              <input
                className="crm-input"
                value={form.role}
                onChange={e =>
                  setForm(current => ({ ...current, role: e.target.value }))
                }
                placeholder="Hiring Manager"
              />
            </div>

            <button
              className="crm-btn-primary"
              onClick={createPortalUser}
              disabled={creating}
              style={{ justifyContent: 'center' }}
            >
              {creating ? 'Creating...' : 'Create employer login'}
            </button>

            {message && (
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: message.includes('Could') ? '#e53e3e' : '#217822',
                }}
              >
                {message}
              </p>
            )}

            {temporaryPassword && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: '1px solid var(--border-light)',
                  background: '#fffbeb',
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 900,
                    color: '#d97706',
                    marginBottom: 6,
                  }}
                >
                  Temporary password
                </p>

                <p
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 13,
                    wordBreak: 'break-all',
                    color: 'var(--text-dark)',
                  }}
                >
                  {temporaryPassword}
                </p>

                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                    marginTop: 8,
                  }}
                >
                  Copy this now. It will not be shown again.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="crm-lead-content">
        <div className="crm-section-block">
          <div className="crm-section-block-header">
            <div>
              <h2 className="crm-section-heading">Employer portal users</h2>
              <p className="crm-page-sub">
                These users can be given access to selected vacancies.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {portalUsers.map(user => (
              <div key={user.id} className="crm-list-row">
                <div className="crm-list-row-info">
                  <p className="crm-list-row-title">{user.name}</p>
                  <p className="crm-list-row-sub">
                    {user.email} · {user.role || 'Employer'}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    className="crm-badge"
                    style={{
                      background: user.active ? '#e8f5e8' : '#f0f0f2',
                      color: user.active ? '#217822' : '#737373',
                    }}
                  >
                    {user.active ? 'Active' : 'Inactive'}
                  </span>

                  <button
                    className="crm-btn-ghost crm-btn-sm"
                    onClick={() => toggleActive(user)}
                  >
                    {user.active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              </div>
            ))}

            {portalUsers.length === 0 && (
              <p className="crm-empty">
                No employer portal users have been created yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}