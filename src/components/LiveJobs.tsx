import 'server-only'

import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

type Job = {
  id: string
  title: string | null
  sector: string | null
  type: string | null
  location: string | null
  region: string | null
  salary_display: string | null
  slug: string | null
  created_at: string
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function LocationIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

function formatLocation(job: Job) {
  if (job.location && job.region) return `${job.location}, ${job.region}`
  return job.location || job.region || 'Location available on request'
}

function getJobHref(job: Job) {
  if (job.slug) return `/job/${job.slug}`
  return `/job/${job.id}`
}

export default async function LiveJobs() {
  const supabase = getServiceClient()

  const { data: jobs, error } = await supabase
    .from('vacancies')
    .select(
      'id, title, sector, type, location, region, salary_display, slug, created_at',
    )
    .eq('status', 'live')
    .order('created_at', { ascending: false })
    .limit(3)

  const liveJobs = jobs ?? []

  return (
    <section className="jobs-section">
      <div className="jobs-header">
        <div>
          <p className="section-eyebrow">Live Vacancies</p>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Current opportunities
          </h2>
        </div>

        <Link href="/jobs" className="btn-view-all">
          View all jobs →
        </Link>
      </div>

      {error && (
        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-muted)',
            marginBottom: 16,
          }}
        >
          We could not load live vacancies at the moment.
        </p>
      )}

      {!error && liveJobs.length === 0 && (
        <div className="jobs-grid">
          <div className="job-listing reveal">
            <div className="jl-top">
              <span className="jl-sector-badge">Register interest</span>
              <span className="jl-type">New roles added regularly</span>
            </div>

            <h3 className="jl-title">No live vacancies currently advertised</h3>

            <div className="jl-meta-row">
              <LocationIcon />
              UK-wide FE & Skills opportunities
            </div>

            <span className="jl-salary">Send us your CV</span>

            <div className="jl-footer">
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                }}
              >
                Confidential
              </span>

              <Link href="/candidates" className="jl-apply">
                Register interest <ArrowIcon />
              </Link>
            </div>
          </div>
        </div>
      )}

      {liveJobs.length > 0 && (
        <div className="jobs-grid">
          {liveJobs.map((job, i) => (
            <div
              key={job.id}
              className={`job-listing reveal${i > 0 ? ` reveal-delay-${i}` : ''}`}
            >
              <div className="jl-top">
                <span className="jl-sector-badge">
                  {job.sector || 'Opportunity'}
                </span>

                <span className="jl-type">
                  {job.type || 'Permanent · Full Time'}
                </span>
              </div>

              <h3 className="jl-title">{job.title || 'Live vacancy'}</h3>

              <div>
                <div className="jl-meta-row">
                  <LocationIcon />
                  {formatLocation(job)}
                </div>
              </div>

              <span className="jl-salary">
                {job.salary_display || 'Salary available on request'}
              </span>

              <div className="jl-footer">
                <span
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                  }}
                >
                  DOE
                </span>

                <Link href={getJobHref(job)} className="jl-apply">
                  Apply now <ArrowIcon />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}