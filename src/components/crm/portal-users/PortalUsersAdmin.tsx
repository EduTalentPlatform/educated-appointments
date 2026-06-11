'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

type Client = {
  id: string
  company_name: string | null
}

type ClientContact = {
  id: string
  client_id: string
  name: string
  title: string | null
  email: string | null
  phone: string | null
  linkedin: string | null
  role_type: string | null
  is_primary: boolean | null
  created_at: string | null
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
  updated_at: string
  clients?: {
    id: string
    company_name: string | null
  } | null
  vacancy_access?: Array<{
    id: string
    vacancy_id: string
    can_view_vacancy: boolean
    can_view_submissions: boolean
    can_view_documents: boolean
    vacancies?: {
      id: string
      title: string | null
      status: string | null
    } | null
  }>
}

type EmailPreview = {
  to: string
  subject: string
  text: string
}

function normalise(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function displayClientName(client?: Client | null) {
  return client?.company_name || 'Unnamed client'
}

function getFirstName(name?: string | null) {
  return String(name || '').trim().split(/\s+/)[0] || 'there'
}

function getPortalLink() {
  if (typeof window === 'undefined') return '/employer-portal/login'
  return `${window.location.origin}/employer-portal/login`
}

function buildEmployerPortalIntroductionEmail({
  name,
  email,
  temporaryPassword,
}: {
  name: string
  email: string
  temporaryPassword: string
}): EmailPreview {
  const portalLink = getPortalLink()

  return {
    to: email,
    subject: 'Your Educated Appointments Employer Portal login',
    text: `Hi ${getFirstName(name)},

I hope you’re well.

We’ve created access for you to the Educated Appointments Employer Portal.

The portal gives you a secure place to review candidates we have submitted for your vacancies. Rather than sending everything back and forth by email, you’ll be able to log in and view the relevant role, candidate summaries, CVs and supporting information in one place.

You can use the portal to:

- Review candidates submitted for your vacancies
- View candidate profiles, CVs and relevant supporting information
- Provide feedback on candidates
- Request interviews
- Confirm whether a candidate should be progressed or rejected

If a candidate is offered a role and accepts, any relevant documents we hold on file and are able to release will then be made available for you to download through the portal. This may include items such as qualification evidence, compliance documents and reference details, where these have been supplied and are appropriate to share at that stage.

Your login details are below:

Portal link: ${portalLink}
Username: ${email}
Temporary password: ${temporaryPassword}

For security, you’ll be asked to change this temporary password the first time you log in. Once changed, you’ll use your new password for future access.

The portal is only linked to the vacancies and candidates that Educated Appointments has shared with you, so you’ll only see information relevant to your organisation and the roles we are supporting.

If you have any issues logging in, just reply to this email and I’ll be happy to help.

Kind regards,

Joe
Educated Appointments`,
  }
}

function getContactRole(contact: ClientContact) {
  return contact.role_type || contact.title || 'Employer contact'
}

function getPortalUsersForContact(contact: ClientContact, users: PortalUser[]) {
  const contactEmail = normalise(contact.email)

  return users.filter(user => {
    if (user.client_contact_id === contact.id) return true

    return (
      !user.client_contact_id &&
      contactEmail &&
      normalise(user.email) === contactEmail
    )
  })
}

function userHasContactMatch(user: PortalUser, contacts: ClientContact[]) {
  return contacts.some(contact => {
    if (user.client_contact_id === contact.id) return true

    return (
      !user.client_contact_id &&
      normalise(contact.email) &&
      normalise(contact.email) === normalise(user.email)
    )
  })
}

export default function PortalUsersAdmin({
  initialClients,
  initialContacts,
  initialUsers,
}: {
  initialClients: Client[]
  initialContacts: ClientContact[]
  initialUsers: PortalUser[]
}) {
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [contacts, setContacts] = useState<ClientContact[]>(initialContacts)
  const [users, setUsers] = useState<PortalUser[]>(initialUsers)
  const [selectedClientId, setSelectedClientId] = useState(
    initialClients[0]?.id || initialUsers[0]?.client_id || '',
  )
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [emailPreview, setEmailPreview] = useState<EmailPreview | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)

  const filteredClients = useMemo(() => {
    const q = normalise(search)

    if (!q) return clients

    return clients.filter(client => {
      const clientContacts = contacts.filter(
        contact => contact.client_id === client.id,
      )
      const clientUsers = users.filter(user => user.client_id === client.id)

      const haystack = [
        client.company_name,
        ...clientContacts.flatMap(contact => [
          contact.name,
          contact.email,
          contact.title,
          contact.role_type,
        ]),
        ...clientUsers.flatMap(user => [user.name, user.email, user.role]),
      ]
        .map(normalise)
        .join(' ')

      return haystack.includes(q)
    })
  }, [clients, contacts, users, search])

  const selectedClient = clients.find(client => client.id === selectedClientId)

  const selectedContacts = contacts.filter(
    contact => contact.client_id === selectedClientId,
  )

  const selectedUsers = users.filter(user => user.client_id === selectedClientId)

  const unmatchedPortalUsers = selectedUsers.filter(
    user => !userHasContactMatch(user, selectedContacts),
  )

  async function refreshPortalData() {
    const res = await fetch('/api/crm/client-portal-users')
    const json = await res.json().catch(() => null)

    if (!res.ok) return

    if (Array.isArray(json?.clients)) setClients(json.clients)
    if (Array.isArray(json?.contacts)) setContacts(json.contacts)
    if (Array.isArray(json?.users)) setUsers(json.users)
  }

  async function sendPasswordReset(user: PortalUser) {
    setBusyId(`reset-${user.id}`)
    setMessage(null)
    setEmailPreview(null)

    const res = await fetch('/api/crm/client-portal-users/password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portal_user_id: user.id }),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setMessage(json?.error || 'Could not send password email.')
      setBusyId(null)
      return
    }

    setMessage(`Password setup/reset email sent to ${user.email}.`)
    setBusyId(null)
    await refreshPortalData()
  }

  async function createLoginForContact(contact: ClientContact) {
    if (!contact.email) {
      setMessage('This contact needs an email address before a login can be created.')
      return
    }

    setBusyId(`create-${contact.id}`)
    setMessage(null)

    const res = await fetch('/api/crm/client-portal-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: contact.client_id,
        client_contact_id: contact.id,
        name: contact.name,
        email: contact.email,
        role: getContactRole(contact),
      }),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setMessage(json?.error || 'Could not create portal login.')
      setBusyId(null)
      return
    }

    const portalUser = json?.portalUser as PortalUser | undefined
    const temporaryPassword = String(json?.temporaryPassword || '')

    if (!portalUser?.id || !temporaryPassword) {
      setMessage('Portal login created, but the introduction email preview could not be prepared.')
      setBusyId(null)
      await refreshPortalData()
      return
    }

    setEmailPreview(
      buildEmployerPortalIntroductionEmail({
        name: portalUser.name || contact.name,
        email: portalUser.email || contact.email,
        temporaryPassword,
      }),
    )

    setMessage(`Portal login created for ${contact.email}. Review the introduction email before sending.`)
    setBusyId(null)
    await refreshPortalData()
  }

  async function sendIntroductionEmail() {
    if (!emailPreview) return

    setSendingEmail(true)
    setMessage(null)

    const res = await fetch('/api/crm/client-portal-users/introduction-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailPreview),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setMessage(json?.error || 'Could not send introduction email.')
      setSendingEmail(false)
      return
    }

    setMessage(`Introduction email sent to ${emailPreview.to}.`)
    setEmailPreview(null)
    setSendingEmail(false)
  }

  async function toggleActive(user: PortalUser) {
    setBusyId(`toggle-${user.id}`)
    setMessage(null)

    const res = await fetch('/api/crm/client-portal-users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: user.id,
        active: !user.active,
      }),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setMessage(json?.error || 'Could not update portal user.')
      setBusyId(null)
      return
    }

    setMessage(
      !user.active
        ? `${user.name} has been enabled.`
        : `${user.name} has been disabled.`,
    )

    setUsers(current =>
      current.map(item =>
        item.id === user.id ? { ...item, active: !user.active } : item,
      ),
    )

    setBusyId(null)
  }

  function renderPortalUser(user: PortalUser) {
    return (
      <div
        key={user.id}
        style={{
          border: '1px solid var(--border-light)',
          borderRadius: 14,
          padding: 12,
          background: 'var(--light-bg)',
          display: 'grid',
          gap: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 900,
                color: 'var(--text-dark)',
              }}
            >
              {user.name}
            </p>
            <p
              style={{
                margin: 0,
                marginTop: 3,
                fontSize: 12,
                color: 'var(--text-muted)',
              }}
            >
              {user.email} · {user.role || 'Employer'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span
              style={{
                borderRadius: 999,
                padding: '4px 8px',
                fontSize: 10,
                fontWeight: 900,
                background: user.active ? 'var(--success-light)' : '#fef2f2',
                color: user.active ? 'var(--success)' : '#dc2626',
              }}
            >
              {user.active ? 'Active' : 'Inactive'}
            </span>

            <span
              style={{
                borderRadius: 999,
                padding: '4px 8px',
                fontSize: 10,
                fontWeight: 900,
                background: user.auth_user_id ? 'var(--primary-light)' : '#fff7ed',
                color: user.auth_user_id ? 'var(--primary)' : '#c2410c',
              }}
            >
              {user.auth_user_id ? 'Login ready' : 'Login not created'}
            </span>
          </div>
        </div>

        {user.vacancy_access && user.vacancy_access.length > 0 ? (
          <div style={{ display: 'grid', gap: 7 }}>
            {user.vacancy_access.map(access => (
              <div
                key={access.id}
                style={{
                  border: '1px solid var(--border)',
                  background: 'var(--white)',
                  borderRadius: 12,
                  padding: 10,
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  alignItems: 'center',
                }}
              >
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      fontWeight: 900,
                      color: 'var(--text-dark)',
                    }}
                  >
                    {access.vacancies?.title || 'Vacancy'}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      marginTop: 2,
                      fontSize: 11,
                      color: 'var(--text-muted)',
                    }}
                  >
                    Status: {access.vacancies?.status || 'Unknown'}
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 5,
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                  }}
                >
                  {access.can_view_vacancy && <span className="crm-pill">Vacancy</span>}
                  {access.can_view_submissions && (
                    <span className="crm-pill">Submissions</span>
                  )}
                  {access.can_view_documents && (
                    <span className="crm-pill">Documents</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: 'var(--text-muted)',
            }}
          >
            No vacancy access assigned.
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => sendPasswordReset(user)}
            disabled={busyId === `reset-${user.id}`}
            style={{
              border: 0,
              borderRadius: 10,
              padding: '9px 11px',
              background: 'var(--primary)',
              color: 'var(--white)',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 900,
              cursor: busyId === `reset-${user.id}` ? 'wait' : 'pointer',
            }}
          >
            {busyId === `reset-${user.id}` ? 'Sending...' : 'Send password link'}
          </button>

          <button
            type="button"
            onClick={() => toggleActive(user)}
            disabled={busyId === `toggle-${user.id}`}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '9px 11px',
              background: user.active ? '#fef2f2' : 'var(--success-light)',
              color: user.active ? '#dc2626' : 'var(--success)',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 900,
              cursor: busyId === `toggle-${user.id}` ? 'wait' : 'pointer',
            }}
          >
            {user.active ? 'Disable access' : 'Enable access'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '310px minmax(0, 1fr)',
        gap: 18,
        alignItems: 'start',
      }}
    >
      <aside
        style={{
          background: 'var(--white)',
          border: '1px solid var(--border)',
          borderRadius: 22,
          padding: 16,
          boxShadow: '0 18px 55px rgba(15,23,42,0.08)',
          position: 'sticky',
          top: 18,
        }}
      >
        <p className="section-eyebrow">Employer Portal</p>

        <h1
          style={{
            margin: 0,
            marginBottom: 12,
            color: 'var(--text-dark)',
            fontSize: 24,
            letterSpacing: -0.8,
          }}
        >
          Portal access
        </h1>

        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search clients or contacts..."
          style={{
            width: '100%',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '10px 12px',
            fontFamily: 'inherit',
            fontSize: 13,
            marginBottom: 12,
          }}
        />

        <div style={{ display: 'grid', gap: 7, maxHeight: '70vh', overflowY: 'auto' }}>
          {filteredClients.map(client => {
            const clientContacts = contacts.filter(
              contact => contact.client_id === client.id,
            )
            const clientUsers = users.filter(user => user.client_id === client.id)
            const activeUsers = clientUsers.filter(user => user.active)

            const selected = client.id === selectedClientId

            return (
              <button
                key={client.id}
                type="button"
                onClick={() => setSelectedClientId(client.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  border: selected
                    ? '1.5px solid var(--primary)'
                    : '1px solid var(--border-light)',
                  background: selected ? 'var(--primary-light)' : 'var(--white)',
                  borderRadius: 14,
                  padding: 12,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 900,
                    color: 'var(--text-dark)',
                  }}
                >
                  {displayClientName(client)}
                </p>

                <p
                  style={{
                    margin: 0,
                    marginTop: 4,
                    fontSize: 11,
                    color: 'var(--text-muted)',
                  }}
                >
                  {clientContacts.length} contact
                  {clientContacts.length === 1 ? '' : 's'} · {activeUsers.length}{' '}
                  active login{activeUsers.length === 1 ? '' : 's'}
                </p>
              </button>
            )
          })}
        </div>
      </aside>

      <section style={{ display: 'grid', gap: 16 }}>
        <div
          style={{
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 22,
            padding: 22,
            boxShadow: '0 18px 55px rgba(15,23,42,0.08)',
          }}
        >
          <p className="section-eyebrow">Client access</p>

          <h2
            style={{
              margin: 0,
              color: 'var(--text-dark)',
              fontSize: 32,
              letterSpacing: -1,
            }}
          >
            {displayClientName(selectedClient)}
          </h2>

          <p
            style={{
              margin: 0,
              marginTop: 8,
              color: 'var(--text-muted)',
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            Review contacts, login status and vacancy-level portal permissions.
          </p>

          {selectedClient?.id && (
            <p style={{ margin: 0, marginTop: 10 }}>
              <Link
                href={`/crm/clients/${selectedClient.id}`}
                style={{
                  color: 'var(--primary)',
                  fontSize: 12,
                  fontWeight: 900,
                  textDecoration: 'none',
                }}
              >
                Open client record →
              </Link>
            </p>
          )}

          {message && (
            <p
              style={{
                margin: 0,
                marginTop: 14,
                fontSize: 13,
                fontWeight: 800,
                color: message.includes('Could') || message.includes('needs')
                  ? 'var(--coral)'
                  : 'var(--success)',
              }}
            >
              {message}
            </p>
          )}

          {emailPreview && (
            <div
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 16,
                border: '1px solid var(--border-light)',
                background: 'var(--light-bg)',
                display: 'grid',
                gap: 10,
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 900,
                    color: 'var(--primary)',
                  }}
                >
                  Preview introduction email
                </p>

                <p
                  style={{
                    margin: 0,
                    marginTop: 5,
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                  }}
                >
                  To: {emailPreview.to}
                </p>

                <p
                  style={{
                    margin: 0,
                    marginTop: 2,
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                  }}
                >
                  Subject: {emailPreview.subject}
                </p>
              </div>

              <textarea
                value={emailPreview.text}
                onChange={event =>
                  setEmailPreview(current =>
                    current
                      ? {
                          ...current,
                          text: event.target.value,
                        }
                      : current,
                  )
                }
                rows={18}
                style={{
                  width: '100%',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 12,
                  fontFamily: 'inherit',
                  fontSize: 12,
                  lineHeight: 1.55,
                  resize: 'vertical',
                  background: 'var(--white)',
                }}
              />

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEmailPreview(null)}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '9px 11px',
                    background: 'var(--white)',
                    color: 'var(--text-dark)',
                    fontFamily: 'inherit',
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={sendIntroductionEmail}
                  disabled={sendingEmail}
                  style={{
                    border: 0,
                    borderRadius: 10,
                    padding: '9px 11px',
                    background: 'var(--primary)',
                    color: 'var(--white)',
                    fontFamily: 'inherit',
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: sendingEmail ? 'wait' : 'pointer',
                    opacity: sendingEmail ? 0.7 : 1,
                  }}
                >
                  {sendingEmail ? 'Sending...' : 'Send introduction email'}
                </button>
              </div>
            </div>
          )}

        </div>

        {selectedContacts.length === 0 && unmatchedPortalUsers.length === 0 ? (
          <div
            style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: 18,
              padding: 22,
            }}
          >
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
              This client has no contacts or portal users yet.
            </p>
          </div>
        ) : (
          <>
            {selectedContacts.map(contact => {
              const contactPortalUsers = getPortalUsersForContact(
                contact,
                selectedUsers,
              )

              return (
                <section
                  key={contact.id}
                  style={{
                    background: 'var(--white)',
                    border: '1px solid var(--border)',
                    borderRadius: 20,
                    padding: 20,
                    boxShadow: '0 12px 35px rgba(15,23,42,0.06)',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                      gap: 16,
                      alignItems: 'start',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          marginBottom: 5,
                        }}
                      >
                        <h3
                          style={{
                            margin: 0,
                            color: 'var(--text-dark)',
                            fontSize: 20,
                          }}
                        >
                          {contact.name}
                        </h3>

                        {contact.is_primary && (
                          <span className="crm-pill">Primary</span>
                        )}

                        {contactPortalUsers.length === 0 && (
                          <span
                            style={{
                              borderRadius: 999,
                              padding: '4px 8px',
                              fontSize: 10,
                              fontWeight: 900,
                              background: '#fff7ed',
                              color: '#c2410c',
                            }}
                          >
                            No portal login
                          </span>
                        )}
                      </div>

                      <p
                        style={{
                          margin: 0,
                          color: 'var(--text-muted)',
                          fontSize: 13,
                          lineHeight: 1.6,
                        }}
                      >
                        {getContactRole(contact)}
                        {contact.email ? ` · ${contact.email}` : ' · No email'}
                        {contact.phone ? ` · ${contact.phone}` : ''}
                      </p>
                    </div>

                    {contactPortalUsers.length === 0 && (
                      <button
                        type="button"
                        onClick={() => createLoginForContact(contact)}
                        disabled={
                          busyId === `create-${contact.id}` || !contact.email
                        }
                        style={{
                          border: 0,
                          borderRadius: 10,
                          padding: '10px 12px',
                          background: contact.email
                            ? 'var(--primary)'
                            : 'var(--border)',
                          color: contact.email ? 'var(--white)' : 'var(--text-muted)',
                          fontFamily: 'inherit',
                          fontSize: 12,
                          fontWeight: 900,
                          cursor:
                            busyId === `create-${contact.id}` || !contact.email
                              ? 'not-allowed'
                              : 'pointer',
                        }}
                      >
                        {busyId === `create-${contact.id}`
                          ? 'Creating...'
                          : 'Create login + preview email'}
                      </button>
                    )}
                  </div>

                  {contactPortalUsers.length > 0 && (
                    <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                      {contactPortalUsers.map(renderPortalUser)}
                    </div>
                  )}
                </section>
              )
            })}

            {unmatchedPortalUsers.length > 0 && (
              <section
                style={{
                  background: 'var(--white)',
                  border: '1px solid var(--border)',
                  borderRadius: 20,
                  padding: 20,
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    marginBottom: 10,
                    color: 'var(--text-dark)',
                    fontSize: 18,
                  }}
                >
                  Other portal users for this client
                </h3>

                <div style={{ display: 'grid', gap: 10 }}>
                  {unmatchedPortalUsers.map(renderPortalUser)}
                </div>
              </section>
            )}
          </>
        )}
      </section>
    </div>
  )
}