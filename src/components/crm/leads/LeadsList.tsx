'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const LEAD_SECTORS = [
  '',
  'Independent Training Provider',
  'Further Education College',
  'Sixth Form College',
  'University / Higher Education',
  'School / Academy',
  'Local Authority Provider',
  'Third Sector / Charity Provider',
  'Employer Provider (Levy Payer)',
  'Pre-Employment / Employability Provider',
  'End-Point Assessment Organisation (EPAO)',
  'Awarding Organisation',
  'Apprenticeship Aggregator',
  'Other',
]

const LEAD_REGIONS = [
  '',
  'East of England',
  'East Midlands',
  'West Midlands',
  'North West',
  'North East',
  'Yorkshire & Humber',
  'South East',
  'South West',
  'London',
  'Wales',
  'Scotland',
  'Northern Ireland',
  'Remote / Flexible',
  'National (Multi-site)',
]

const LEAD_SOURCES = [
  '',
  'LinkedIn',
  'Referral',
  'Website Enquiry',
  'Cold Outreach',
  'Networking Event',
  'Job Board',
  'Existing Contact',
  'Other',
]

type Lead = {
  id: string
  company_name: string
  contact_name: string | null
  contact_title: string | null
  email: string | null
  phone: string | null
  status: string
  region: string | null
  sector: string | null
  created_at?: string | null
  updated_at: string
}

const STATUSES = [
  'all',
  'new',
  'contacted',
  'meeting_booked',
  'proposal_sent',
  'follow_up',
  'lost',
]

const STATUS_COLOURS: Record<string, { bg: string; text: string }> = {
  new:            { bg: '#f0f0f2', text: '#737373' },
  contacted:      { bg: '#e0f0fb', text: '#0B72B8' },
  meeting_booked: { bg: '#f3f0ff', text: '#7c3aed' },
  proposal_sent:  { bg: '#fffbeb', text: '#d97706' },
  follow_up:      { bg: '#fffbeb', text: '#d97706' },
  lost:           { bg: '#fef2f2', text: '#e53e3e' },
}

const SORT_OPTIONS = [
  { value: 'last_updated', label: 'Last updated' },
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'company_az', label: 'Company A–Z' },
  { value: 'company_za', label: 'Company Z–A' },
  { value: 'status', label: 'Status' },
  { value: 'region_az', label: 'Region A–Z' },
  { value: 'sector_az', label: 'Sector A–Z' },
]

interface Props {
  initialLeads: Lead[]
}

export default function LeadsList({ initialLeads }: Props) {
  const router = useRouter()

  const [leads, setLeads] = useState(initialLeads)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('last_updated')

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  const [form, setForm] = useState({
    company_name: '',
    contact_name: '',
    contact_title: '',
    email: '',
    phone: '',
    website: '',
    region: '',
    sector: '',
    status: 'new',
    source: '',
    notes: '',
  })

  // Converted leads are now clients, so they should not appear on this page.
  const visibleLeads = leads.filter(lead => lead.status !== 'converted')

  const activeLeadsCount = visibleLeads.filter(lead => lead.status !== 'lost').length

  const filtered = useMemo(() => {
    const searchTerm = search.toLowerCase().trim()

    const results = visibleLeads.filter(lead => {
      const matchStatus = statusFilter === 'all' || lead.status === statusFilter

      const matchSearch =
        !searchTerm ||
        lead.company_name.toLowerCase().includes(searchTerm) ||
        (lead.contact_name ?? '').toLowerCase().includes(searchTerm) ||
        (lead.contact_title ?? '').toLowerCase().includes(searchTerm) ||
        (lead.region ?? '').toLowerCase().includes(searchTerm) ||
        (lead.sector ?? '').toLowerCase().includes(searchTerm) ||
        (lead.email ?? '').toLowerCase().includes(searchTerm) ||
        (lead.phone ?? '').toLowerCase().includes(searchTerm)

      return matchStatus && matchSearch
    })

    return [...results].sort((a, b) => {
      const aCompany = a.company_name ?? ''
      const bCompany = b.company_name ?? ''
      const aStatus = a.status ?? ''
      const bStatus = b.status ?? ''
      const aRegion = a.region ?? ''
      const bRegion = b.region ?? ''
      const aSector = a.sector ?? ''
      const bSector = b.sector ?? ''

      const aCreated = new Date(a.created_at || a.updated_at || 0).getTime()
      const bCreated = new Date(b.created_at || b.updated_at || 0).getTime()
      const aUpdated = new Date(a.updated_at || a.created_at || 0).getTime()
      const bUpdated = new Date(b.updated_at || b.created_at || 0).getTime()

      switch (sortBy) {
        case 'newest':
          return bCreated - aCreated

        case 'oldest':
          return aCreated - bCreated

        case 'company_az':
          return aCompany.localeCompare(bCompany)

        case 'company_za':
          return bCompany.localeCompare(aCompany)

        case 'status':
          return aStatus.localeCompare(bStatus)

        case 'region_az':
          return aRegion.localeCompare(bRegion)

        case 'sector_az':
          return aSector.localeCompare(bSector)

        case 'last_updated':
        default:
          return bUpdated - aUpdated
      }
    })
  }, [visibleLeads, search, statusFilter, sortBy])

  async function parseWebsite() {
    if (!form.website) return

    setParsing(true)
    setParseError(null)

    const res = await fetch('/api/crm/parse-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ website: form.website }),
    })

    const data = await res.json()

    if (data.result) {
      setForm(f => ({
        ...f,
        company_name: data.result.company_name ?? f.company_name,
        contact_name: data.result.contact_name ?? f.contact_name,
        contact_title: data.result.contact_title ?? f.contact_title,
        email: data.result.email ?? f.email,
        phone: data.result.phone ?? f.phone,
        sector: data.result.sector ?? f.sector,
        region: data.result.region ?? f.region,
        notes: data.result.notes ?? f.notes,
      }))
    } else {
      setParseError(data.error ?? 'Could not parse that URL.')
    }

    setParsing(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()

    setSaving(true)
    setParseError(null)

    const supabase = createClient()
    const { notes, ...insertData } = form as any

    const { data, error } = await supabase
      .from('leads')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      setParseError('Failed to create lead: ' + error.message)
      setSaving(false)
      return
    }

    if (data) {
      setLeads(prev => [data, ...prev])
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
        status: 'new',
        source: '',
        notes: '',
      })
    }

    setSaving(false)
  }

  return (
    <div className="crm-page">
      <div className="crm-page-header">
        <div>
          <h1 className="crm-page-title">Leads</h1>
          <p className="crm-page-sub">{activeLeadsCount} active leads</p>
        </div>

        <button className="crm-btn-primary" onClick={() => setShowForm(true)}>
          + New Lead
        </button>
      </div>

      {/* Filters */}
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
            placeholder="Search leads..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <div className="crm-status-filters">
            {STATUSES.map(status => (
              <button
                key={status}
                className={`crm-status-filter${statusFilter === status ? ' active' : ''}`}
                onClick={() => setStatusFilter(status)}
              >
                {status === 'all' ? 'All' : status.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <select
            className="crm-select crm-select-sm"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ minWidth: 170 }}
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                Sort: {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="crm-card crm-table-card">
        <table className="crm-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Contact</th>
              <th>Region</th>
              <th>Status</th>
              <th>Last updated</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map(lead => {
              const status = lead.status || 'new'

              return (
                <tr
                  key={lead.id}
                  onClick={() => router.push(`/crm/leads/${lead.id}`)}
                  className="crm-table-row-clickable"
                >
                  <td>
                    <p className="crm-table-main">{lead.company_name}</p>
                    {lead.sector && <p className="crm-table-sub">{lead.sector}</p>}
                  </td>

                  <td>
                    <p className="crm-table-main">{lead.contact_name || '—'}</p>
                    {lead.contact_title && (
                      <p className="crm-table-sub">{lead.contact_title}</p>
                    )}
                  </td>

                  <td>{lead.region || '—'}</td>

                  <td>
                    <span
                      className="crm-badge"
                      style={{
                        background: STATUS_COLOURS[status]?.bg ?? '#f0f0f2',
                        color: STATUS_COLOURS[status]?.text ?? '#737373',
                      }}
                    >
                      {status.replace(/_/g, ' ')}
                    </span>
                  </td>

                  <td>{new Date(lead.updated_at).toLocaleDateString('en-GB')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <p className="crm-empty crm-empty-table">No leads match your filters.</p>
        )}
      </div>

      {/* New lead modal */}
      {showForm && (
        <>
          <div className="crm-modal-backdrop" onClick={() => setShowForm(false)} />

          <div className="crm-modal">
            <div className="crm-modal-header">
              <h2 className="crm-modal-title">New Lead</h2>
              <button className="crm-modal-close" onClick={() => setShowForm(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="crm-modal-form">
              {/* Website parser */}
              <div className="crm-field">
                <label className="crm-label">Website — paste to auto-fill ✦</label>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="crm-input"
                    placeholder="e.g. www.trainingprovider.co.uk"
                    value={form.website}
                    onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                    style={{ flex: 1 }}
                  />

                  <button
                    type="button"
                    className="crm-btn-primary"
                    onClick={parseWebsite}
                    disabled={!form.website || parsing}
                    style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    {parsing ? '✦ Parsing...' : '✦ Auto-fill'}
                  </button>
                </div>

                {parseError && (
                  <p style={{ fontSize: '12px', color: '#e53e3e', marginTop: '4px' }}>
                    {parseError}
                  </p>
                )}

                {!parsing && form.company_name && (
                  <p style={{ fontSize: '12px', color: '#217822', marginTop: '4px' }}>
                    ✓ Details populated — review and edit below
                  </p>
                )}
              </div>

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
                  <select
                    className="crm-select"
                    value={form.sector}
                    onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}
                  >
                    {LEAD_SECTORS.map(sector => (
                      <option key={sector} value={sector}>
                        {sector || 'Select sector...'}
                      </option>
                    ))}
                  </select>
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
                    placeholder="e.g. Head of Operations"
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
                  <select
                    className="crm-select"
                    value={form.region}
                    onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                  >
                    {LEAD_REGIONS.map(region => (
                      <option key={region} value={region}>
                        {region || 'Select region...'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="crm-field">
                  <label className="crm-label">Source</label>
                  <select
                    className="crm-select"
                    value={form.source}
                    onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                  >
                    {LEAD_SOURCES.map(source => (
                      <option key={source} value={source}>
                        {source || 'Select source...'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="crm-field">
                <label className="crm-label">Status</label>
                <select
                  className="crm-select"
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="meeting_booked">Meeting booked</option>
                  <option value="proposal_sent">Proposal sent</option>
                  <option value="follow_up">Follow up</option>
                </select>
              </div>

              {parseError && !parsing && (
                <p style={{ fontSize: '12px', color: '#e53e3e', padding: '0 0 4px' }}>
                  {parseError}
                </p>
              )}

              <div className="crm-modal-footer">
                <button
                  type="button"
                  className="crm-btn-ghost"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>

                <button type="submit" className="crm-btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Create lead'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}