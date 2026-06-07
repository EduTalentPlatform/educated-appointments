'use client'

import { useState } from 'react'
import Link from 'next/link'

const ALL_SYSTEM_ROLES = [
  'Assessor', 'IQA', 'Lead IQA', 'End-Point Assessor (EPA)', 'Skills Coach',
  'Tutor / Trainer', 'Distance Learning Tutor', 'Workshop Facilitator',
  'Vocational Trainer', 'Functional Skills Tutor (Maths)',
  'Functional Skills Tutor (English)', 'Learning Support Worker',
  'Curriculum Manager', 'Curriculum Developer', 'Qualification Developer',
  'E-Learning Developer', 'Quality Manager', 'Compliance Manager',
  'Ofsted Nominee', 'Head of Quality', 'EPA Centre Coordinator', 'CEIAG Adviser',
  'Business Development Manager', 'Employer Engagement Manager',
  'Apprenticeship Advisor', 'Recruitment Consultant', 'Partnerships Manager',
  'Account Manager', 'Key Account Manager', 'Bid Writer', 'Marketing Manager',
  'Apprenticeship Levy Consultant', 'Operations Manager', 'Centre Manager',
  'Programme Manager', 'Regional Manager', 'Training Coordinator',
  'Learner Services Manager', 'Timetabling / Scheduling Manager',
  'Contract Manager', 'Functional Skills Coordinator', 'Head of Department',
  'Head of Apprenticeships', 'Head of Commercial', 'Assistant Principal',
  'Vice Principal', 'Director of Education', 'Director of Quality',
  'Director of Business Development', 'Principal', 'CEO / MD',
  'MIS Officer', 'MIS Manager', 'Data Analyst', 'Apprenticeship Administrator',
  'Learner Records Officer', 'Funding & Compliance Officer', 'Exams Officer',
  'Finance Manager', 'HR Manager',
]

const UK_REGIONS = [
  'London', 'South East England', 'South West England', 'East of England',
  'East Midlands', 'West Midlands', 'Yorkshire and the Humber',
  'North West England', 'North East England', 'Wales', 'Scotland',
  'Northern Ireland', 'Remote / UK-wide',
]

type JobResult = {
  job_title: string
  employer_name: string
  employer_sector: string | null
  location: string
  region: string
  salary: string | null
  job_type: string | null
  posted_days_ago: number | null
  url: string | null
  source: string | null
  notes: string | null
}

export default function JobSearchTool() {
  const [roleSearch, setRoleSearch] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [maxDays, setMaxDays] = useState(30)
  const [extraKeywords, setExtraKeywords] = useState('')
  const [searchNotes, setSearchNotes] = useState('')

  const [searching, setSearching] = useState(false)
  const [jobs, setJobs] = useState<JobResult[]>([])
  const [summary, setSummary] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lastSearched, setLastSearched] = useState<string | null>(null)

  const [regionFilter, setRegionFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')

  async function runSearch() {
    if (selectedRoles.length === 0) return

    setSearching(true)
    setError(null)
    setJobs([])
    setSummary('')

    try {
      const res = await fetch('/api/crm/leads/job-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roles: selectedRoles,
          regions: selectedRegions,
          max_days_ago: maxDays,
          extra_keywords: extraKeywords.trim(),
          search_notes: searchNotes.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Search failed.')
      } else {
        setJobs(data.jobs || [])
        setSummary(data.summary || '')
        setLastSearched(new Date().toISOString())
      }
    } catch (err: any) {
      setError(err.message || 'Unexpected error.')
    }

    setSearching(false)
  }

  const filteredJobs = jobs.filter(job => {
    if (regionFilter !== 'all' && job.region !== regionFilter) return false
    if (roleFilter !== 'all' && job.job_title !== roleFilter) return false
    return true
  })

  const uniqueRegions = Array.from(new Set(jobs.map(j => j.region).filter(Boolean))).sort()
  const uniqueRoles = Array.from(new Set(jobs.map(j => j.job_title).filter(Boolean))).sort()

  return (
    <div className="crm-page">
      <div className="crm-page-header">
        <div>
          <div className="crm-breadcrumb">
            <Link href="/crm/leads" className="crm-breadcrumb-link">Leads</Link>
            <span>/</span>
            <span>Job Search</span>
          </div>
          <h1 className="crm-page-title">BD Job Search</h1>
          <p className="crm-page-sub">
            Find live vacancies across the FE &amp; Skills sector to identify employers actively hiring — then add them as leads.
          </p>
        </div>
      </div>

      {/* ── Controls card ── */}
      <div className="crm-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <h2 className="crm-card-title">Search controls</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>
              Select the roles you want to find vacancies for. Employers advertising these roles are warm BD prospects.
            </p>
            {lastSearched && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                Last searched: {new Date(lastSearched).toLocaleString('en-GB')}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              className="crm-select crm-select-sm"
              value={maxDays}
              onChange={e => setMaxDays(Number(e.target.value))}
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>

            <button
              type="button"
              className="crm-btn-ai"
              disabled={searching || selectedRoles.length === 0}
              onClick={runSearch}
            >
              {searching ? '✦ Searching...' : '✦ Search Live Jobs'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Role selector */}
          <div>
            <label className="crm-label">Roles to search</label>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
              Employers advertising these roles need candidates — they're your BD targets.
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
  <button
    type="button"
    className="crm-btn-ghost crm-btn-sm"
    onClick={() => setSelectedRoles([...ALL_SYSTEM_ROLES])}
  >
    Select all
  </button>
  {selectedRoles.length > 0 && (
    <button
      type="button"
      className="crm-btn-ghost crm-btn-sm"
      onClick={() => setSelectedRoles([])}
    >
      Clear all
    </button>
  )}
</div>

{selectedRoles.length > 0 && (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
    {selectedRoles.map(role => (
                  <button
                    key={role}
                    type="button"
                    className="crm-badge crm-badge-blue"
                    style={{ border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    onClick={() => setSelectedRoles(c => c.filter(r => r !== role))}
                  >
                    {role} <span style={{ fontWeight: 900 }}>×</span>
                  </button>
                ))}
                
              </div>
            )}

            <input
              className="crm-input"
              placeholder="Search roles..."
              value={roleSearch}
              onChange={e => setRoleSearch(e.target.value)}
              style={{ marginBottom: 8 }}
            />

            <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: 10, background: '#fff' }}>
              {ALL_SYSTEM_ROLES
                .filter(role => !roleSearch || role.toLowerCase().includes(roleSearch.toLowerCase()))
                .map(role => {
                  const selected = selectedRoles.includes(role)
                  return (
                    <label
                      key={role}
                      style={{
                        display: 'flex', gap: 10, padding: '8px 12px',
                        borderBottom: '1px solid var(--border-light)',
                        cursor: 'pointer',
                        background: selected ? 'var(--primary-light)' : '#fff',
                        fontSize: 13,
                        fontWeight: selected ? 800 : 400,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          setSelectedRoles(c =>
                            selected ? c.filter(r => r !== role) : [...c, role]
                          )
                        }
                      />
                      {role}
                    </label>
                  )
                })}
            </div>
          </div>

          {/* Regions + extras */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="crm-label">Regions</label>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
                Leave all unticked to search every UK region.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {UK_REGIONS.map(region => {
                  const selected = selectedRegions.includes(region)
                  return (
                    <button
                      key={region}
                      type="button"
                      className="crm-badge"
                      style={{
                        border: `1.5px solid ${selected ? 'var(--primary)' : 'var(--border-light)'}`,
                        background: selected ? 'var(--primary-light)' : '#fff',
                        color: selected ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontWeight: selected ? 800 : 400,
                      }}
                      onClick={() =>
                        setSelectedRegions(c =>
                          selected ? c.filter(r => r !== region) : [...c, region]
                        )
                      }
                    >
                      {region}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="crm-label">Extra keywords (optional)</label>
              <input
                className="crm-input"
                placeholder="e.g. apprenticeships, FE college, training provider"
                value={extraKeywords}
                onChange={e => setExtraKeywords(e.target.value)}
              />
            </div>

            <div>
              <label className="crm-label">Search notes (optional)</label>
              <textarea
                className="crm-input"
                rows={3}
                placeholder="e.g. Only include independent training providers, not schools or universities"
                value={searchNotes}
                onChange={e => setSearchNotes(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 12, fontSize: 13, color: '#e53e3e', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="crm-card" style={{ marginBottom: 16 }}>
          <h3 className="crm-card-title" style={{ marginBottom: 8 }}>Search summary</h3>
          <p style={{ fontSize: 13, color: 'var(--text-dark)', lineHeight: 1.6 }}>{summary}</p>
        </div>
      )}

      {/* Results */}
      {jobs.length > 0 && (
        <div className="crm-card crm-table-card">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
            <h2 className="crm-card-title" style={{ flex: 1 }}>
              {filteredJobs.length} result{filteredJobs.length !== 1 ? 's' : ''}
              {filteredJobs.length !== jobs.length ? ` (${jobs.length} total)` : ''}
            </h2>

            {uniqueRoles.length > 1 && (
              <select className="crm-select crm-select-sm" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                <option value="all">All roles</option>
                {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}

            {uniqueRegions.length > 1 && (
              <select className="crm-select crm-select-sm" value={regionFilter} onChange={e => setRegionFilter(e.target.value)}>
                <option value="all">All regions</option>
                {uniqueRegions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
          </div>

          <table className="crm-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Employer</th>
                <th>Sector</th>
                <th>Location</th>
                <th>Posted</th>
                <th>Salary</th>
                <th>Source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job, i) => {
                const isRecent = job.posted_days_ago !== null && job.posted_days_ago <= 7
                const postedLabel =
                  job.posted_days_ago === 0 ? 'Today'
                  : job.posted_days_ago === 1 ? 'Yesterday'
                  : job.posted_days_ago !== null ? `${job.posted_days_ago}d ago`
                  : '—'

                return (
                  <tr key={i}>
                    <td>
                      <p className="crm-table-main">{job.job_title}</p>
                      {job.notes && <p className="crm-table-sub">{job.notes}</p>}
                    </td>
                    <td><p className="crm-table-main">{job.employer_name}</p></td>
                    <td><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{job.employer_sector || '—'}</span></td>
                    <td>
                      <p className="crm-table-main">{job.location || '—'}</p>
                      <p className="crm-table-sub">{job.region || ''}</p>
                    </td>
                    <td>
                      <span className="crm-badge" style={{ background: isRecent ? '#e8f5e8' : '#fffbeb', color: isRecent ? '#217822' : '#d97706', whiteSpace: 'nowrap' }}>
                        {postedLabel}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{job.salary || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{job.source || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {job.url && (
                          <a href={job.url} target="_blank" rel="noopener noreferrer" className="crm-card-link" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                            View job ↗
                          </a>
                        )}
                        <Link
                          href={`/crm/leads?prefill=${encodeURIComponent(JSON.stringify({ company_name: job.employer_name, region: job.region, sector: job.employer_sector, source: 'Job Board' }))}`}
                          className="crm-btn-ghost crm-btn-sm"
                          style={{ whiteSpace: 'nowrap', fontSize: 11 }}
                        >
                          + Add as lead
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!searching && jobs.length === 0 && !error && (
        <p className="crm-empty">
          Select roles above and click <strong>Search Live Jobs</strong> to find employers actively hiring in the FE &amp; Skills sector.
        </p>
      )}
    </div>
  )
}