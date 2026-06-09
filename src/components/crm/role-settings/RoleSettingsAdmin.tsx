'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'

type RoleSetting = {
  id: string
  main_role_type: string
  specific_role: string
  is_active: boolean
  sort_order: number
  is_system?: boolean
}

export default function RoleSettingsAdmin() {
  const [roles, setRoles] = useState<RoleSetting[]>([])
  const [mainRoleTypes, setMainRoleTypes] = useState<string[]>([])
  const [selectedMainRole, setSelectedMainRole] = useState('')
  const [newMainRole, setNewMainRole] = useState('')
  const [newSpecificRole, setNewSpecificRole] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function loadRoles() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/crm/role-settings', {
        cache: 'no-store',
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to load role settings.')
      }

      const nextMainRoleTypes = Array.isArray(payload.mainRoleTypes)
        ? payload.mainRoleTypes
        : []

      setRoles(Array.isArray(payload.roles) ? payload.roles : [])
      setMainRoleTypes(nextMainRoleTypes)

      setSelectedMainRole(current =>
        current || nextMainRoleTypes[0] || '',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load role settings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRoles()
  }, [])

  const visibleRoles = useMemo(() => {
    return roles.filter(role => role.main_role_type === selectedMainRole)
  }, [roles, selectedMainRole])

  const customMainRoleOptions = useMemo(() => {
    return Array.from(new Set([...mainRoleTypes, newMainRole].filter(Boolean))).sort()
  }, [mainRoleTypes, newMainRole])

  async function addRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const mainRoleType = newMainRole.trim()
    const specificRole = newSpecificRole.trim()

    if (!mainRoleType || !specificRole) {
      setError('Please choose a main role type and enter a specific role.')
      return
    }

    setSaving(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/crm/role-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          main_role_type: mainRoleType,
          specific_role: specificRole,
          sort_order: Number(sortOrder) || 0,
          is_active: true,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to add role.')
      }

      setMessage(`Added ${specificRole} under ${mainRoleType}.`)
      setSelectedMainRole(mainRoleType)
      setNewSpecificRole('')
      setSortOrder('0')
      await loadRoles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add role.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleRole(role: RoleSetting) {
    if (role.is_system) return

    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/crm/role-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: role.id,
          is_active: !role.is_active,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to update role.')
      }

      await loadRoles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update role.')
    }
  }

  async function deleteRole(role: RoleSetting) {
    if (role.is_system) return

    const confirmed = window.confirm(`Delete "${role.specific_role}"?`)
    if (!confirmed) return

    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/crm/role-settings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: role.id }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to delete role.')
      }

      setMessage(`Deleted ${role.specific_role}.`)
      await loadRoles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete role.')
    }
  }

  return (
    <main className="crm-page">
      <div className="crm-page-header">
        <div>
          <p className="crm-eyebrow">CRM Admin</p>
          <h1>Role Settings</h1>
          <p className="crm-muted">
            Manage Specific Roles under each Main Role Type. Use this when you want to add roles such as ESOL Trainer, SEND Tutor, Dental Assessor or similar without changing code each time.
          </p>
        </div>
      </div>

      <section className="crm-card">
        <h2>Add Specific Role</h2>

        <form onSubmit={addRole} className="crm-form-grid">
          <label>
            <span>Main Role Type</span>
            <select
              className="crm-input"
              value={newMainRole}
              onChange={event => setNewMainRole(event.target.value)}
            >
              <option value="">Select main role type</option>
              {customMainRoleOptions.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Specific Role</span>
            <input
              className="crm-input"
              value={newSpecificRole}
              onChange={event => setNewSpecificRole(event.target.value)}
              placeholder="e.g. ESOL Trainer"
            />
          </label>

          <label>
            <span>Sort Order</span>
            <input
              className="crm-input"
              type="number"
              value={sortOrder}
              onChange={event => setSortOrder(event.target.value)}
            />
          </label>

          <div className="crm-form-actions">
            <button className="crm-button" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Add role'}
            </button>
          </div>
        </form>

        {message && <p className="crm-success">{message}</p>}
        {error && <p className="crm-error">{error}</p>}
      </section>

      <section className="crm-card">
        <div className="crm-section-header">
          <div>
            <h2>Specific Roles</h2>
            <p className="crm-muted">
              System roles come from the current hardcoded CRM list. New Admin roles are saved in Supabase.
            </p>
          </div>

          <select
            className="crm-input"
            value={selectedMainRole}
            onChange={event => setSelectedMainRole(event.target.value)}
          >
            {mainRoleTypes.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="crm-muted">Loading role settings...</p>
        ) : visibleRoles.length === 0 ? (
          <p className="crm-muted">No roles found for this main role type.</p>
        ) : (
          <div className="crm-table-wrap">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Specific Role</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Sort</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleRoles.map(role => (
                  <tr key={role.id}>
                    <td>{role.specific_role}</td>
                    <td>
                      {role.is_system ? (
                        <span className="crm-badge">System</span>
                      ) : (
                        <span className="crm-badge">Admin</span>
                      )}
                    </td>
                    <td>
                      {role.is_active ? (
                        <span className="crm-badge">Active</span>
                      ) : (
                        <span className="crm-badge">Inactive</span>
                      )}
                    </td>
                    <td>{role.sort_order ?? 0}</td>
                    <td style={{ textAlign: 'right' }}>
                      {!role.is_system && (
                        <div className="crm-inline-actions">
                          <button
                            type="button"
                            className="crm-button secondary"
                            onClick={() => toggleRole(role)}
                          >
                            {role.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            className="crm-button danger"
                            onClick={() => deleteRole(role)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
