'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Client = {
  id: string
  company_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  region: string | null
  sector: string | null
  status: string
  created_at?: string | null
  updated_at?: string | null
  vacancies?: any[]
}

interface Props {
  initialClients: Client[]
}

const SORT_OPTIONS = [
  { value: 'company_az', label: 'Company A–Z' },
  { value: 'company_za', label: 'Company Z–A' },
  { value: 'active_first', label: 'Active first' },
  { value: 'region_az', label: 'Region A–Z' },
  { value: 'sector_az', label: 'Sector A–Z' },
  { value: 'live_vacancies_high', label: 'Most live vacancies' },
  { value: 'live_vacancies_low', label: 'Fewest live vacancies' },
  { value: 'total_vacancies_high', label: 'Most registered vacancies' },
  { value: 'total_vacancies_low', label: 'Fewest registered vacancies' },
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
]

export default function ClientsList({ initialClients }: Props) {
  const router = useRouter()

  const [clients, setClients] = useState(initialClients)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('company_az')

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    company_name: '',
    contact_name: '',
    contact_title: '',
    email: '',
    phone: '',
    website: '',
    region: '',
    sector: '',
    portal_email: '',
  })

  const filtered = useMemo(() => {
    const searchTerm = search.toLowerCase().trim()

    const results = clients.filter(client => {
      const matchSearch =
        !searchTerm ||
        client.company_name.toLowerCase().includes(searchTerm) ||
        (client.contact_name ?? '').toLowerCase().includes(searchTerm) ||
        (client.email ?? '').toLowerCase().includes(searchTerm) ||
        (client.phone ?? '').toLowerCase().includes(searchTerm) ||
        (client.region ?? '').toLowerCase().includes(searchTerm) ||
        (client.sector ?? '').toLowerCase().includes(searchTerm)

      return matchSearch
    })

    return [...results].sort((a, b) => {
      const aCompany = a.company_name ?? ''
      const bCompany = b.company_name ?? ''
      const aRegion = a.region ?? ''
      const bRegion = b.region ?? ''
      const aSector = a.sector ?? ''
      const bSector = b.sector ?? ''

      const aLiveVacancies = (a.vacancies ?? []).filter((v: any) => v.status === 'live').length
      const bLiveVacancies = (b.vacancies ?? []).filter((v: any) => v.status === 'live').length

      const aTotalVacancies = (a.vacancies ?? []).length
      const bTotalVacancies = (b.vacancies ?? []).length

      const aCreated = new Date(a.created_at || a.updated_at || 0).getTime()
      const bCreated = new Date(b.created_at || b.updated_at || 0).getTime()

      const statusOrder: Record<string, number> = {
        active: 1,
        inactive: 2,
        lost: 3,
        do_not_contact: 4,
      }

      const aStatus = statusOrder[a.status ?? 'inactive'] ?? 99
      const bStatus = statusOrder[b.status ?? 'inactive'] ?? 99

      switch (sortBy) {
        case 'company_za':
          return bCompany.localeCompare(aCompany)

        case 'active_first':
          return aStatus - bStatus

        case 'region_az':
          return aRegion.localeCompare(bRegion)

        case 'sector_az':
          return aSector.localeCompare(bSector)

        case 'live_vacancies_high':
          return bLiveVacancies - aLiveVacancies

        case 'live_vacancies_low':
          return aLiveVacancies - bLiveVacancies

        case 'total_vacancies_high':
          return bTotalVacancies - aTotalVacancies

        case 'total_vacancies_low':
          return aTotalVacancies - bTotalVacancies

        case 'newest':
          return bCreated - aCreated

        case 'oldest':
          return aCreated - bCreated

        case 'company_az':
        default:
          return aCompany.localeCompare(bCompany)
      }
    })
  }, [clients, search, sortBy])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()

    setSaving(true)

    const supabase = createClient()

    const { data } = await supabase
      .from('clients')
      .insert(form)
      .select()
      .single()

    if (data) {
      setClients(prev => [data, ...prev])
      setShowForm(false)

      setForm({
        company_name: '',
        contact_name: '',
        contact_title: '',
        email: '',
        phone: '',
        website: '',
        region: '',
        sector: '',
        portal_email: '',
      })
    }

    setSaving(false)
  }

  return (
    <div className="crm-page">
      <div className="crm-page-header">
        <div>
          <h1 className="crm-page-title">Clients</h1>
          <p className="crm-page-sub">
            {clients.filter(c => c.status === 'active').length} active clients · {clients.length} total
          </p>
        </div>

        <button className="crm-btn-primary" onClick={() => setShowForm(true)}>
          + New Client
        </button>
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
            placeholder="Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="crm-select crm-select-sm"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{ minWidth: 220 }}
        >
          {SORT_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              Sort: {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="crm-card crm-table-card">
        <table className="crm-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Contact</th>
              <th>Region</th>
              <th>Live vacancies</th>
              <th>Total Registered Vacancies</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map(client => {
              const liveVacs = (client.vacancies ?? []).filter((v: any) => v.status === 'live').length
              const totalVacs = (client.vacancies ?? []).length

              return (
                <tr
                  key={client.id}
                  onClick={() => router.push(`/crm/clients/${client.id}`)}
                  className="crm-table-row-clickable"
                >
                  <td>
                    <p className="crm-table-main">{client.company_name}</p>
                    {client.sector && (
                      <p className="crm-table-sub">{client.sector}</p>
                    )}
                  </td>

                  <td>
                    <p className="crm-table-main">{client.contact_name || '—'}</p>
                    {client.email && (
                      <p className="crm-table-sub">{client.email}</p>
                    )}
                  </td>

                  <td>{client.region || '—'}</td>

                  <td>
                    <span className={`crm-badge${liveVacs > 0 ? ' crm-badge-green' : ''}`}>
                      {liveVacs} live
                    </span>
                  </td>

                  <td>
                    <span className="crm-badge crm-badge-blue">
                      {totalVacs}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <p className="crm-empty crm-empty-table">No clients yet.</p>
        )}
      </div>

      {showForm && (
        <>
          <div className="crm-modal-backdrop" onClick={() => setShowForm(false)} />

          <div className="crm-modal">
            <div className="crm-modal-header">
              <h2 className="crm-modal-title">New Client</h2>
              <button className="crm-modal-close" onClick={() => setShowForm(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="crm-modal-form">
              <div className="crm-form-row">
                <div className="crm-field">
                  <label className="crm-label">Company name *</label>
                  <input
                    className="crm-input"
                    required
                    value={form.company_name}
                    onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                  />
                </div>

                <div className="crm-field">
                  <label className="crm-label">Sector</label>
                  <input
                    className="crm-input"
                    value={form.sector}
                    onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}
                  />
                </div>
              </div>

              <div className="crm-form-row">
                <div className="crm-field">
                  <label className="crm-label">Contact name</label>
                  <input
                    className="crm-input"
                    value={form.contact_name}
                    onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                  />
                </div>

                <div className="crm-field">
                  <label className="crm-label">Contact title</label>
                  <input
                    className="crm-input"
                    value={form.contact_title}
                    onChange={e => setForm(f => ({ ...f, contact_title: e.target.value }))}
                  />
                </div>
              </div>

              <div className="crm-form-row">
                <div className="crm-field">
                  <label className="crm-label">Email</label>
                  <input
                    className="crm-input"
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>

                <div className="crm-field">
                  <label className="crm-label">Phone</label>
                  <input
                    className="crm-input"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="crm-form-row">
                <div className="crm-field">
                  <label className="crm-label">Region</label>
                  <input
                    className="crm-input"
                    value={form.region}
                    onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                  />
                </div>

                <div className="crm-field">
                  <label className="crm-label">Portal email</label>
                  <input
                    className="crm-input"
                    type="email"
                    placeholder="Their login for employer portal"
                    value={form.portal_email}
                    onChange={e => setForm(f => ({ ...f, portal_email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="crm-modal-footer">
                <button
                  type="button"
                  className="crm-btn-ghost"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>

                <button type="submit" className="crm-btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Create client'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}