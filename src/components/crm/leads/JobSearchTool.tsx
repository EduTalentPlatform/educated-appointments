'use client'

import { useState, type FormEvent } from 'react'
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

const SECTORS = [
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

type CrmMatch = {
  type: 'lead' | 'client'
  id: string
  company_name: string
  status?: string | null
  sector?: string | null
  region?: string | null
  website?: string | null
  contact_name?: string | null
  contact_title?: string | null
  email?: string | null
  phone?: string | null
  confidence?: number
}

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
  crm_match?: CrmMatch | null
}

type LeadForm = {
  company_name: string
  contact_name: string
  contact_title: string
  email: string
  phone: string
  website: string
  sector: string
  region: string
  status: string
  source: string
  notes: string
}

type ContactSuggestion = {
  name: string
  title: string | null
  email: string | null
  phone: string | null
  linkedin: string | null
  source_url: string | null
  reason: string | null
  confidence: string | null
  saved?: boolean
}

function cleanText(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normaliseCompanyName(value: unknown) {
  return cleanText(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(ltd|limited|llp|plc|cic|uk|group|holdings|the)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function getEmployerJobs(jobs: JobResult[], employerName: string) {
  const key = normaliseCompanyName(employerName)
  return jobs.filter(job => normaliseCompanyName(job.employer_name) === key)
}

function jobSummaryLines(jobs: JobResult[]) {
  return jobs
    .map((job, index) => {
      const bits = [
        `${index + 1}. ${job.job_title || 'Role unknown'}`,
        job.location,
        job.salary,
        job.url,
      ].filter(Boolean)

      return bits.join(' | ')
    })
    .join('\n')
}

function recordUrl(match?: CrmMatch | null) {
  if (!match) return '#'
  return match.type === 'client'
    ? `/crm/clients/${match.id}`
    : `/crm/leads/${match.id}`
}

function recordLabel(match?: CrmMatch | null) {
  if (!match) return 'Not in CRM'
  return match.type === 'client' ? 'Client found' : 'Lead found'
}

export default function JobSearchTool() {
  const [roleSearch, setRoleSearch] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [maxDays, setMaxDays] = useState(30)
  const [extraKeywords, setExtraKeywords] = useState('')
  const [searchNotes, setSearchNotes] = useState('')

  const [searching, setSearching] = useState(false)
  const [matching, setMatching] = useState(false)
  const [jobs, setJobs] = useState<JobResult[]>([])
  const [summary, setSummary] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lastSearched, setLastSearched] = useState<string | null>(null)

  const [regionFilter, setRegionFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [crmFilter, setCrmFilter] = useState('all')

  const [createLeadOpen, setCreateLeadOpen] = useState(false)
  const [creatingLead, setCreatingLead] = useState(false)
  const [leadModalEmployerJobs, setLeadModalEmployerJobs] = useState<JobResult[]>([])
  const [leadForm, setLeadForm] = useState<LeadForm>({
    company_name: '',
    contact_name: '',
    contact_title: '',
    email: '',
    phone: '',
    website: '',
    sector: '',
    region: '',
    status: 'new',
    source: 'BD Job Search',
    notes: '',
  })

  const [emailOpen, setEmailOpen] = useState(false)
  const [emailRecord, setEmailRecord] = useState<CrmMatch | null>(null)
  const [emailJobs, setEmailJobs] = useState<JobResult[]>([])
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailContext, setEmailContext] = useState('')
  const [emailGenerating, setEmailGenerating] = useState(false)
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailSaved, setEmailSaved] = useState(false)

  const [contactsOpen, setContactsOpen] = useState(false)
  const [contactsRecord, setContactsRecord] = useState<CrmMatch | null>(null)
  const [contactsCompany, setContactsCompany] = useState('')
  const [contactsJobs, setContactsJobs] = useState<JobResult[]>([])
  const [contactSuggestions, setContactSuggestions] = useState<ContactSuggestion[]>([])
  const [contactsSearching, setContactsSearching] = useState(false)
  const [savingContactKey, setSavingContactKey] = useState<string | null>(null)

  async function runSearch() {
    if (selectedRoles.length === 0) return

    setSearching(true)
    setMatching(false)
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
        setSearching(false)
        return
      }

      const returnedJobs: JobResult[] = data.jobs || []
      setJobs(returnedJobs)
      setSummary(data.summary || '')
      setLastSearched(new Date().toISOString())

      if (returnedJobs.length > 0) {
        await matchCompanies(returnedJobs)
      }
    } catch (err: any) {
      setError(err.message || 'Unexpected error.')
    }

    setSearching(false)
  }

  async function matchCompanies(jobsToMatch: JobResult[]) {
    setMatching(true)

    try {
      const res = await fetch('/api/crm/leads/job-search/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'match_companies',
          jobs: jobsToMatch,
        }),
      })

      const data = await res.json()

      if (res.ok && Array.isArray(data.jobs)) {
        setJobs(data.jobs)
      } else if (data.error) {
        setError(`Search worked, but CRM matching failed: ${data.error}`)
      }
    } catch (err: any) {
      setError(`Search worked, but CRM matching failed: ${err.message}`)
    }

    setMatching(false)
  }

  function applyMatchToEmployer(employerName: string, match: CrmMatch) {
    const employerKey = normaliseCompanyName(employerName)

    setJobs(current =>
      current.map(job =>
        normaliseCompanyName(job.employer_name) === employerKey
          ? { ...job, crm_match: match }
          : job,
      ),
    )
  }

  function openCreateLead(job: JobResult) {
    const employerJobs = getEmployerJobs(jobs, job.employer_name)

    setLeadModalEmployerJobs(employerJobs)
    setLeadForm({
      company_name: job.employer_name || '',
      contact_name: '',
      contact_title: '',
      email: '',
      phone: '',
      website: '',
      sector: job.employer_sector || '',
      region: job.region || '',
      status: 'new',
      source: 'BD Job Search',
      notes: [
        'Created from BD Job Search.',
        '',
        'Roles found:',
        jobSummaryLines(employerJobs),
      ].join('\n'),
    })
    setCreateLeadOpen(true)
  }

  async function createLead(e: FormEvent) {
    e.preventDefault()

    if (!leadForm.company_name.trim()) {
      alert('Company name is required.')
      return
    }

    setCreatingLead(true)

    try {
      const res = await fetch('/api/crm/leads/job-search/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_lead',
          employer_name: leadForm.company_name,
          lead: leadForm,
          jobs: leadModalEmployerJobs,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Could not create lead.')
        setCreatingLead(false)
        return
      }

      if (data.match) {
        applyMatchToEmployer(leadForm.company_name, data.match)
      }

      setCreateLeadOpen(false)
    } catch (err: any) {
      alert(err.message || 'Could not create lead.')
    }

    setCreatingLead(false)
  }

  async function openEmail(job: JobResult) {
    if (!job.crm_match) {
      alert('Create or match the CRM record first.')
      return
    }

    const employerJobs = getEmployerJobs(jobs, job.employer_name)

    setEmailRecord(job.crm_match)
    setEmailJobs(employerJobs)
    setEmailSubject('')
    setEmailBody('')
    setEmailContext('')
    setEmailSaved(false)
    setEmailOpen(true)

    await generateEmail(job.crm_match, employerJobs, '')
  }

  async function generateEmail(recordOverride?: CrmMatch | null, jobsOverride?: JobResult[], contextOverride?: string) {
    const record = recordOverride || emailRecord
    const roleJobs = jobsOverride || emailJobs

    if (!record) return

    setEmailGenerating(true)
    setEmailSaved(false)

    try {
      const res = await fetch('/api/crm/leads/job-search/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_email',
          record,
          jobs: roleJobs,
          extra_context: contextOverride ?? emailContext,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Could not generate email.')
      } else {
        setEmailSubject(data.subject || '')
        setEmailBody(data.body || '')
      }
    } catch (err: any) {
      alert(err.message || 'Could not generate email.')
    }

    setEmailGenerating(false)
  }

  async function saveEmailActivity() {
    if (!emailRecord) return
    if (!emailBody.trim()) {
      alert('Email body is required.')
      return
    }

    setEmailSaving(true)

    try {
      const res = await fetch('/api/crm/leads/job-search/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_email_activity',
          record: emailRecord,
          jobs: emailJobs,
          subject: emailSubject,
          body: emailBody,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Could not save activity.')
      } else {
        setEmailSaved(true)
      }
    } catch (err: any) {
      alert(err.message || 'Could not save activity.')
    }

    setEmailSaving(false)
  }

  async function openContacts(job: JobResult) {
    const employerJobs = getEmployerJobs(jobs, job.employer_name)

    setContactsRecord(job.crm_match || null)
    setContactsCompany(job.employer_name)
    setContactsJobs(employerJobs)
    setContactSuggestions([])
    setContactsOpen(true)

    await findContacts(job.employer_name, job.crm_match || null, employerJobs)
  }

  async function findContacts(companyNameOverride?: string, recordOverride?: CrmMatch | null, jobsOverride?: JobResult[]) {
    const companyName = companyNameOverride || contactsCompany
    const record = recordOverride ?? contactsRecord
    const roleJobs = jobsOverride || contactsJobs

    if (!companyName.trim()) return

    setContactsSearching(true)

    try {
      const res = await fetch('/api/crm/leads/job-search/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'find_contacts',
          company_name: companyName,
          website: record?.website || '',
          sector: record?.sector || roleJobs[0]?.employer_sector || '',
          jobs: roleJobs,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Could not find contacts.')
      } else {
        setContactSuggestions(data.contacts || [])
      }
    } catch (err: any) {
      alert(err.message || 'Could not find contacts.')
    }

    setContactsSearching(false)
  }

  async function saveContact(contact: ContactSuggestion, index: number) {
    if (!contactsRecord) {
      alert('Create the lead first, then save the contact to the CRM record.')
      return
    }

    setSavingContactKey(`${contact.name}-${index}`)

    try {
      const res = await fetch('/api/crm/leads/job-search/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_contact',
          record: contactsRecord,
          contact,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Could not save contact.')
      } else {
        setContactSuggestions(current =>
          current.map((item, itemIndex) =>
            itemIndex === index ? { ...item, saved: true } : item,
          ),
        )
      }
    } catch (err: any) {
      alert(err.message || 'Could not save contact.')
    }

    setSavingContactKey(null)
  }

  const filteredJobs = jobs.filter(job => {
    if (regionFilter !== 'all' && job.region !== regionFilter) return false
    if (roleFilter !== 'all' && job.job_title !== roleFilter) return false

    if (crmFilter === 'matched' && !job.crm_match) return false
    if (crmFilter === 'unmatched' && job.crm_match) return false
    if (crmFilter === 'leads' && job.crm_match?.type !== 'lead') return false
    if (crmFilter === 'clients' && job.crm_match?.type !== 'client') return false

    return true
  })

  const uniqueRegions = Array.from(new Set(jobs.map(j => j.region).filter(Boolean))).sort()
  const uniqueRoles = Array.from(new Set(jobs.map(j => j.job_title).filter(Boolean))).sort()

  const matchedCount = jobs.filter(job => job.crm_match).length
  const unmatchedCount = jobs.filter(job => !job.crm_match).length

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
            Find live vacancies across the FE &amp; Skills sector, check whether the employer is already in your CRM, then create leads, find decision makers and draft outreach emails.
          </p>
        </div>
      </div>

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
          <div>
            <label className="crm-label">Roles to search</label>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
              Employers advertising these roles need candidates — they are your BD targets.
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
                    onClick={() => setSelectedRoles(current => current.filter(r => r !== role))}
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
                        display: 'flex',
                        gap: 10,
                        padding: '8px 12px',
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
                          setSelectedRoles(current =>
                            selected ? current.filter(r => r !== role) : [...current, role],
                          )
                        }
                      />
                      {role}
                    </label>
                  )
                })}
            </div>
          </div>

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
                        setSelectedRegions(current =>
                          selected ? current.filter(r => r !== region) : [...current, region],
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
              <label className="crm-label">Extra keywords optional</label>
              <input
                className="crm-input"
                placeholder="e.g. apprenticeships, FE college, training provider"
                value={extraKeywords}
                onChange={e => setExtraKeywords(e.target.value)}
              />
            </div>

            <div>
              <label className="crm-label">Search notes optional</label>
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

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 12, fontSize: 13, color: '#e53e3e', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {summary && (
        <div className="crm-card" style={{ marginBottom: 16 }}>
          <h3 className="crm-card-title" style={{ marginBottom: 8 }}>Search summary</h3>
          <p style={{ fontSize: 13, color: 'var(--text-dark)', lineHeight: 1.6 }}>{summary}</p>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <span className="crm-badge crm-badge-blue">{matchedCount} matched in CRM</span>
            <span className="crm-badge">{unmatchedCount} not in CRM</span>
            {matching && <span className="crm-badge">Checking CRM matches...</span>}
          </div>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="crm-card crm-table-card" style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
            <h2 className="crm-card-title" style={{ flex: 1 }}>
              {filteredJobs.length} result{filteredJobs.length !== 1 ? 's' : ''}
              {filteredJobs.length !== jobs.length ? ` (${jobs.length} total)` : ''}
            </h2>

            <select className="crm-select crm-select-sm" value={crmFilter} onChange={e => setCrmFilter(e.target.value)}>
              <option value="all">All CRM statuses</option>
              <option value="matched">Matched in CRM</option>
              <option value="unmatched">Not in CRM</option>
              <option value="leads">Leads only</option>
              <option value="clients">Clients only</option>
            </select>

            {uniqueRoles.length > 1 && (
              <select className="crm-select crm-select-sm" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                <option value="all">All roles</option>
                {uniqueRoles.map(role => <option key={role} value={role}>{role}</option>)}
              </select>
            )}

            {uniqueRegions.length > 1 && (
              <select className="crm-select crm-select-sm" value={regionFilter} onChange={e => setRegionFilter(e.target.value)}>
                <option value="all">All regions</option>
                {uniqueRegions.map(region => <option key={region} value={region}>{region}</option>)}
              </select>
            )}
          </div>

          <table className="crm-table" style={{ minWidth: 1280 }}>
            <thead>
              <tr>
                <th>Role</th>
                <th>Employer</th>
                <th>CRM match</th>
                <th>Sector</th>
                <th>Location</th>
                <th>Posted</th>
                <th>Salary</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredJobs.map((job, index) => {
                const employerJobs = getEmployerJobs(jobs, job.employer_name)
                const isMatched = Boolean(job.crm_match)

                return (
                  <tr key={`${job.employer_name}-${job.job_title}-${job.location}-${index}`}>
                    <td style={{ minWidth: 230 }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-dark)', marginBottom: 4 }}>
                        {job.job_title || 'Untitled role'}
                      </div>

                      {job.notes && (
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                          {job.notes}
                        </p>
                      )}

                      {employerJobs.length > 1 && (
                        <span className="crm-badge crm-badge-blue" style={{ marginTop: 6 }}>
                          {employerJobs.length} roles found for employer
                        </span>
                      )}
                    </td>

                    <td style={{ minWidth: 170, fontWeight: 800 }}>
                      {job.employer_name}
                      {job.source && (
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginTop: 4 }}>
                          Source: {job.source}
                        </p>
                      )}
                    </td>

                    <td style={{ minWidth: 190 }}>
                      {isMatched ? (
                        <div>
                          <span
                            className="crm-badge"
                            style={{
                              background: job.crm_match?.type === 'client' ? '#e8f5e8' : '#f3f0ff',
                              color: job.crm_match?.type === 'client' ? '#217822' : '#7c3aed',
                              marginBottom: 6,
                            }}
                          >
                            {recordLabel(job.crm_match)}
                          </span>

                          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
                            {job.crm_match?.company_name}
                          </p>

                          {job.crm_match?.confidence && (
                            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                              Match confidence: {job.crm_match.confidence}%
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="crm-badge" style={{ background: '#fef2f2', color: '#dc2626' }}>
                          Not in CRM
                        </span>
                      )}
                    </td>

                    <td>{job.employer_sector || '—'}</td>
                    <td>{job.location || job.region || '—'}</td>

                    <td>
                      {typeof job.posted_days_ago === 'number' ? (
                        <span
                          className="crm-badge"
                          style={{
                            background: job.posted_days_ago <= 7 ? '#e8f5e8' : '#fffbeb',
                            color: job.posted_days_ago <= 7 ? '#217822' : '#d97706',
                          }}
                        >
                          {job.posted_days_ago === 0 ? 'Today' : `${job.posted_days_ago}d ago`}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td>{job.salary || '—'}</td>

                    <td style={{ minWidth: 230 }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {job.url && (
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="crm-btn-ghost crm-btn-sm"
                          >
                            View job ↗
                          </a>
                        )}

                        {isMatched ? (
                          <>
                            <Link href={recordUrl(job.crm_match)} className="crm-btn-ghost crm-btn-sm">
                              Open {job.crm_match?.type}
                            </Link>

                            <button
                              type="button"
                              className="crm-btn-primary crm-btn-sm"
                              onClick={() => openEmail(job)}
                            >
                              Send Email
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="crm-btn-primary crm-btn-sm"
                            onClick={() => openCreateLead(job)}
                          >
                            Create Lead
                          </button>
                        )}

                        <button
                          type="button"
                          className="crm-btn-ghost crm-btn-sm"
                          onClick={() => openContacts(job)}
                        >
                          Find Decision Makers
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {createLeadOpen && (
        <div className="crm-modal-backdrop">
          <div className="crm-modal" style={{ maxWidth: 760 }}>
            <div className="crm-modal-header">
              <div>
                <h2 className="crm-modal-title">Create lead</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Create a CRM lead from this BD Job Search result.
                </p>
              </div>

              <button type="button" className="crm-btn-ghost crm-btn-sm" onClick={() => setCreateLeadOpen(false)}>
                Close
              </button>
            </div>

            <form onSubmit={createLead} style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="crm-label">Company name</label>
                  <input
                    className="crm-input"
                    value={leadForm.company_name}
                    onChange={e => setLeadForm(current => ({ ...current, company_name: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="crm-label">Website</label>
                  <input
                    className="crm-input"
                    value={leadForm.website}
                    onChange={e => setLeadForm(current => ({ ...current, website: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="crm-label">Sector</label>
                  <select
                    className="crm-select"
                    value={leadForm.sector}
                    onChange={e => setLeadForm(current => ({ ...current, sector: e.target.value }))}
                  >
                    <option value="">Select sector</option>
                    {SECTORS.map(sector => <option key={sector} value={sector}>{sector}</option>)}
                  </select>
                </div>

                <div>
                  <label className="crm-label">Region</label>
                  <select
                    className="crm-select"
                    value={leadForm.region}
                    onChange={e => setLeadForm(current => ({ ...current, region: e.target.value }))}
                  >
                    <option value="">Select region</option>
                    {UK_REGIONS.map(region => <option key={region} value={region}>{region}</option>)}
                  </select>
                </div>

                <div>
                  <label className="crm-label">Contact name</label>
                  <input
                    className="crm-input"
                    value={leadForm.contact_name}
                    onChange={e => setLeadForm(current => ({ ...current, contact_name: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="crm-label">Contact title</label>
                  <input
                    className="crm-input"
                    value={leadForm.contact_title}
                    onChange={e => setLeadForm(current => ({ ...current, contact_title: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="crm-label">Email</label>
                  <input
                    className="crm-input"
                    value={leadForm.email}
                    onChange={e => setLeadForm(current => ({ ...current, email: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="crm-label">Phone</label>
                  <input
                    className="crm-input"
                    value={leadForm.phone}
                    onChange={e => setLeadForm(current => ({ ...current, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="crm-label">Notes</label>
                <textarea
                  className="crm-input"
                  rows={8}
                  value={leadForm.notes}
                  onChange={e => setLeadForm(current => ({ ...current, notes: e.target.value }))}
                />
              </div>

              {leadModalEmployerJobs.length > 0 && (
                <div style={{ background: '#f8fafc', border: '1px solid var(--border-light)', borderRadius: 10, padding: 12 }}>
                  <p style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
                    Roles found for this company
                  </p>

                  <div style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {jobSummaryLines(leadModalEmployerJobs)}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="crm-btn-ghost" onClick={() => setCreateLeadOpen(false)}>
                  Cancel
                </button>

                <button type="submit" className="crm-btn-primary" disabled={creatingLead}>
                  {creatingLead ? 'Creating...' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {emailOpen && emailRecord && (
        <div className="crm-modal-backdrop">
          <div className="crm-modal" style={{ maxWidth: 860 }}>
            <div className="crm-modal-header">
              <div>
                <h2 className="crm-modal-title">Prospecting email</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {emailRecord.type === 'client' ? 'Existing client' : 'Existing lead'}: {emailRecord.company_name}
                </p>
              </div>

              <button type="button" className="crm-btn-ghost crm-btn-sm" onClick={() => setEmailOpen(false)}>
                Close
              </button>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ background: '#f8fafc', border: '1px solid var(--border-light)', borderRadius: 10, padding: 12 }}>
                <p style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
                  Roles found for this company
                </p>

                <div style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {jobSummaryLines(emailJobs)}
                </div>
              </div>

              <div>
                <label className="crm-label">Extra context optional</label>
                <textarea
                  className="crm-input"
                  rows={3}
                  value={emailContext}
                  onChange={e => setEmailContext(e.target.value)}
                  placeholder="e.g. Mention we have supported similar providers recently, or keep it very soft..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="crm-btn-ai"
                  disabled={emailGenerating}
                  onClick={() => generateEmail()}
                >
                  {emailGenerating ? '✦ Generating...' : '✦ Regenerate Email'}
                </button>
              </div>

              <div>
                <label className="crm-label">Subject</label>
                <input
                  className="crm-input"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  placeholder="Email subject"
                />
              </div>

              <div>
                <label className="crm-label">Email body</label>
                <textarea
                  className="crm-input"
                  rows={12}
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                  placeholder={emailGenerating ? 'Generating...' : 'Email body'}
                />
              </div>

              {emailSaved && (
                <div style={{ background: '#e8f5e8', border: '1px solid #bbf7d0', color: '#217822', borderRadius: 10, padding: 10, fontSize: 13 }}>
                  Email saved as an outbound activity against {emailRecord.company_name}.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <Link href={recordUrl(emailRecord)} className="crm-btn-ghost">
                  Open {emailRecord.type}
                </Link>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="crm-btn-ghost"
                    onClick={() => navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailBody}`)}
                  >
                    Copy Email
                  </button>

                  <button
                    type="button"
                    className="crm-btn-primary"
                    disabled={emailSaving || !emailBody.trim()}
                    onClick={saveEmailActivity}
                  >
                    {emailSaving ? 'Saving...' : 'Save as Activity'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {contactsOpen && (
        <div className="crm-modal-backdrop">
          <div className="crm-modal" style={{ maxWidth: 920 }}>
            <div className="crm-modal-header">
              <div>
                <h2 className="crm-modal-title">Find decision makers</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {contactsCompany}
                  {contactsRecord ? ` · Saving to ${contactsRecord.type}: ${contactsRecord.company_name}` : ' · Not currently matched in CRM'}
                </p>
              </div>

              <button type="button" className="crm-btn-ghost crm-btn-sm" onClick={() => setContactsOpen(false)}>
                Close
              </button>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              {!contactsRecord && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: 10, padding: 12, fontSize: 13, lineHeight: 1.5 }}>
                  This company is not in the CRM yet. You can still research contacts, but create the lead before saving a contact.
                </div>
              )}

              <div style={{ background: '#f8fafc', border: '1px solid var(--border-light)', borderRadius: 10, padding: 12 }}>
                <p style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
                  Roles found for this company
                </p>

                <div style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {jobSummaryLines(contactsJobs)}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="crm-btn-ai"
                  disabled={contactsSearching}
                  onClick={() => findContacts()}
                >
                  {contactsSearching ? '✦ Searching...' : '✦ Search Again'}
                </button>
              </div>

              {contactsSearching && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Searching for likely decision makers. Tiny digital bloodhound now deployed.
                </p>
              )}

              {!contactsSearching && contactSuggestions.length === 0 && (
                <p className="crm-empty">
                  No contact suggestions found yet.
                </p>
              )}

              {contactSuggestions.length > 0 && (
                <div style={{ display: 'grid', gap: 10 }}>
                  {contactSuggestions.map((contact, index) => {
                    const saveKey = `${contact.name}-${index}`

                    return (
                      <div
                        key={saveKey}
                        style={{
                          border: '1px solid var(--border-light)',
                          borderRadius: 12,
                          padding: 12,
                          background: '#fff',
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) auto',
                          gap: 12,
                          alignItems: 'start',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                            <p style={{ fontWeight: 900, fontSize: 14 }}>
                              {contact.name}
                            </p>

                            {contact.confidence && (
                              <span className="crm-badge crm-badge-blue">
                                {contact.confidence} confidence
                              </span>
                            )}

                            {contact.saved && (
                              <span className="crm-badge" style={{ background: '#e8f5e8', color: '#217822' }}>
                                Saved
                              </span>
                            )}
                          </div>

                          {contact.title && (
                            <p style={{ fontSize: 13, color: 'var(--text-dark)', marginBottom: 6 }}>
                              {contact.title}
                            </p>
                          )}

                          {contact.reason && (
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 8 }}>
                              {contact.reason}
                            </p>
                          )}

                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12 }}>
                            {contact.email && <span>{contact.email}</span>}
                            {contact.phone && <span>{contact.phone}</span>}

                            {contact.linkedin && (
                              <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="crm-detail-link">
                                LinkedIn ↗
                              </a>
                            )}

                            {contact.source_url && (
                              <a href={contact.source_url} target="_blank" rel="noopener noreferrer" className="crm-detail-link">
                                Source ↗
                              </a>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="crm-btn-primary crm-btn-sm"
                          disabled={!contactsRecord || contact.saved || savingContactKey === saveKey}
                          onClick={() => saveContact(contact, index)}
                        >
                          {contact.saved ? 'Saved' : savingContactKey === saveKey ? 'Saving...' : '+ Add Contact'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                {!contactsRecord && (
                  <button
                    type="button"
                    className="crm-btn-primary"
                    onClick={() => {
                      const firstJob = contactsJobs[0]
                      if (firstJob) {
                        setContactsOpen(false)
                        openCreateLead(firstJob)
                      }
                    }}
                  >
                    Create Lead
                  </button>
                )}

                {contactsRecord && (
                  <Link href={recordUrl(contactsRecord)} className="crm-btn-ghost">
                    Open {contactsRecord.type}
                  </Link>
                )}

                <button type="button" className="crm-btn-ghost" onClick={() => setContactsOpen(false)}>
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
