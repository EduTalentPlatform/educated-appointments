'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Job } from '@/types'
import {
  ROLE_TYPES,
  ROLE_TYPES_WITH_SUBJECTS,
  SUBJECT_AREAS,
  JOB_TYPES,
  REGIONS,
  SALARY_RANGES,
} from '@/lib/jobs-data'
import ApplyModal from './ApplyModal'

interface JobsClientProps {
  jobs: Job[]
}

function LocationIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function BriefcaseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 00-4 0v2M8 7V5a2 2 0 00-4 0v2" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function isNew(createdAt: string) {
  const diff = Date.now() - new Date(createdAt).getTime()
  return diff < 7 * 24 * 60 * 60 * 1000
}

export default function JobsClient({ jobs }: JobsClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [roleType, setRoleType] = useState('All Role Types')
  const [subjectArea, setSubjectArea] = useState('All Subjects')
  const [type, setType] = useState('All Types')
  const [region, setRegion] = useState('All Regions')
  const [salaryMin, setSalaryMin] = useState(0)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)

  // Show subject area filter only for relevant role types
  const showSubjectFilter = ROLE_TYPES_WITH_SUBJECTS.includes(roleType)

  // Reset subject area when role type changes to one that doesn't support it
  function handleRoleTypeChange(value: string) {
    setRoleType(value)
    if (!ROLE_TYPES_WITH_SUBJECTS.includes(value)) {
      setSubjectArea('All Subjects')
    }
  }

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      const matchSearch =
        search === '' ||
        job.title.toLowerCase().includes(search.toLowerCase()) ||
        job.sector.toLowerCase().includes(search.toLowerCase()) ||
        (job.subject_area ?? '').toLowerCase().includes(search.toLowerCase()) ||
        job.location.toLowerCase().includes(search.toLowerCase())

      const matchRoleType = roleType === 'All Role Types' || job.sector === roleType
      const matchSubject =
        !showSubjectFilter ||
        subjectArea === 'All Subjects' ||
        job.subject_area === subjectArea
      const matchType = type === 'All Types' || job.type === type
      const matchRegion = region === 'All Regions' || job.region === region
      const matchSalary = job.salary_min >= salaryMin

      return matchSearch && matchRoleType && matchSubject && matchType && matchRegion && matchSalary
    })
  }, [jobs, search, roleType, subjectArea, showSubjectFilter, type, region, salaryMin])

  const activeFilters = [
    roleType !== 'All Role Types' ? roleType : null,
    subjectArea !== 'All Subjects' ? subjectArea : null,
    type !== 'All Types' ? type : null,
    region !== 'All Regions' ? region : null,
    salaryMin > 0 ? `£${salaryMin.toLocaleString()}+` : null,
  ].filter(Boolean)

  function clearFilters() {
    setSearch('')
    setRoleType('All Role Types')
    setSubjectArea('All Subjects')
    setType('All Types')
    setRegion('All Regions')
    setSalaryMin(0)
  }

  return (
    <>
      <div className="jobs-page">

        {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
        <aside className="jobs-sidebar">
          <div className="sidebar-inner">

            <div className="sidebar-header">
              <h2 className="sidebar-title">Filter roles</h2>
              {activeFilters.length > 0 && (
                <button className="btn-clear-filters" onClick={clearFilters}>
                  Clear all
                </button>
              )}
            </div>

            {/* Search */}
            <div className="sidebar-field">
              <label className="sidebar-label">Search</label>
              <div className="search-input-wrap">
                <SearchIcon />
                <input
                  type="text"
                  className="sidebar-input"
                  placeholder="Job title, subject..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Role Type */}
            <div className="sidebar-field">
              <label className="sidebar-label">Role type</label>
              <select
                className="sidebar-select"
                value={roleType}
                onChange={(e) => handleRoleTypeChange(e.target.value)}
              >
                {ROLE_TYPES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>

            {/* Subject Area — only shown for relevant role types */}
            {showSubjectFilter && (
              <div className="sidebar-field subject-area-field">
                <label className="sidebar-label">
                  Subject area
                  <span className="sidebar-label-hint">↳ for {roleType}</span>
                </label>

                {/* All subjects option */}
                <button
                  className={`subject-all-btn${subjectArea === 'All Subjects' ? ' active' : ''}`}
                  onClick={() => setSubjectArea('All Subjects')}
                >
                  All subjects
                </button>

                {/* Grouped subject areas */}
                {Object.entries(SUBJECT_AREAS).map(([group, areas]) => (
                  <div key={group} className="subject-group">
                    <p className="subject-group-label">{group}</p>
                    <div className="subject-pills">
                      {areas.map((area) => (
                        <button
                          key={area}
                          className={`subject-pill${subjectArea === area ? ' active' : ''}`}
                          onClick={() => setSubjectArea(area)}
                        >
                          {area}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Job type */}
            <div className="sidebar-field">
              <label className="sidebar-label">Job type</label>
              <div className="type-pills">
                {JOB_TYPES.map((t) => (
                  <button
                    key={t}
                    className={`type-pill${type === t ? ' active' : ''}`}
                    onClick={() => setType(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Region */}
            <div className="sidebar-field">
              <label className="sidebar-label">Location</label>
              <select
                className="sidebar-select"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                {REGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>

            {/* Salary */}
            <div className="sidebar-field">
              <label className="sidebar-label">Minimum salary</label>
              <div className="salary-pills">
                {SALARY_RANGES.map((s) => (
                  <button
                    key={s.min}
                    className={`salary-pill${salaryMin === s.min ? ' active' : ''}`}
                    onClick={() => setSalaryMin(s.min)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active filter tags */}
            {activeFilters.length > 0 && (
              <div className="active-filters">
                {activeFilters.map((f) => (
                  <span key={f} className="active-filter-tag">{f}</span>
                ))}
              </div>
            )}

          </div>
        </aside>

        {/* ── JOB LIST ─────────────────────────────────────────────────── */}
        <main className="jobs-list">
          <div className="jobs-list-header">
            <div>
              <h1 className="jobs-list-title">
                {filtered.length > 0
                  ? `${filtered.length} role${filtered.length === 1 ? '' : 's'} available`
                  : 'No roles match your filters'}
              </h1>
              {activeFilters.length > 0 && (
                <p className="jobs-list-sub">Showing filtered results</p>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="jobs-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <p>No roles match your current filters.</p>
              <button className="btn-clear-filters-empty" onClick={clearFilters}>Clear filters</button>
            </div>
          ) : (
            <div className="jobs-list-items">
              {filtered.map((job) => (
                <div
                  key={job.id}
                  className="jlc"
                  onClick={() => router.push(`/job/${job.slug}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="jlc-accent" />

                  <div className="jlc-body">
                    <div className="jlc-top">
                      <div className="jlc-badges">
                        <span className="jlc-sector">{job.sector}</span>
                        {job.subject_area && (
                          <span className="jlc-subject">{job.subject_area}</span>
                        )}
                        <span className="jlc-type-badge">
                          <BriefcaseIcon />
                          {job.type}
                        </span>
                      </div>
                      {isNew(job.created_at) && (
                        <span className="jlc-new-badge">New</span>
                      )}
                    </div>

                    <h2 className="jlc-title">{job.title}</h2>

                    <div className="jlc-location">
                      <LocationIcon />
                      {job.location}, {job.region}
                    </div>

                    <p className="jlc-excerpt">
                      {job.description.replace(/\*\*/g, '').split('\n')[0]}
                    </p>

                    <div className="jlc-footer">
                      <div className="jlc-salary-wrap">
                        <span className="jlc-salary">{job.salary_display}</span>
                        {job.salary_note && (
                          <span className="jlc-salary-note">{job.salary_note}</span>
                        )}
                      </div>
                      <button
                        className="jlc-btn-primary"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedJob(job)
                        }}
                      >
                        Apply now <ArrowIcon />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {selectedJob && (
        <ApplyModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </>
  )
}