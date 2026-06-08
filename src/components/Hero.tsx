import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LiveCandidateCount from '@/components/LiveCandidateCount'

type HeroJob = {
  id: string
  title: string | null
  slug: string | null
  location: string | null
  region: string | null
  salary_display: string | null
}

function LocationIcon() {
  return (
    <svg
      width="12"
      height="12"
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

function formatLocation(job: HeroJob) {
  if (job.location && job.region) return `${job.location} · ${job.region}`
  return job.location || job.region || 'Location available on request'
}

export default async function Hero() {
  const supabase = await createClient()

  const { data: jobs } = await supabase
    .from('vacancies')
    .select('id, title, slug, location, region, salary_display')
    .eq('status', 'live')
    .not('slug', 'is', null)
    .neq('slug', '')
    .order('created_at', { ascending: false })
    .limit(3)

  const liveJobs = jobs ?? []

  return (
    <section className="hero">
      <div className="hero-bg-dot-grid" />
      <div className="hero-bg-shape" />

      <div className="hero-inner">
        <div>
          <div className="hero-eyebrow">
            <div className="eyebrow-dot" />
            <span className="eyebrow-text">
              FE &amp; Skills Recruitment Specialists
            </span>
          </div>

          <h1 className="hero-headline">
            Stop sifting.
            <br />
            <span className="kinetic-wrap">
              <span className="kinetic-words">
                <span>Start interviewing.</span>
                <span>Start placing.</span>
                <span>Start growing.</span>
              </span>
            </span>
          </h1>

          <p className="hero-sub">
            We help <strong>training providers and colleges</strong> hire
            assessors, IQAs, skills coaches, curriculum leads, sales and
            leadership — quickly, compliantly, and with zero time-wasting.
          </p>

          <div className="hero-safer">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#217822"
              strokeWidth="2.5"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Safer Recruitment focused — candidate compliance information
            collected and ready to download
          </div>

          <div className="hero-ctas">
            <Link href="/employer" className="btn-hero-primary">
              I Want to Hire
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>

            <Link href="/jobs" className="btn-hero-secondary">
              Browse Live Jobs
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </Link>
          </div>

          <div className="hero-trust">
            <div className="trust-stat">
              <span className="num">
                <span className="count-up" data-target="500" data-suffix="+">
                  <LiveCandidateCount />
                </span>
              </span>
              <span className="label">Candidates</span>
            </div>

            <div className="trust-divider" />

            <div className="trust-stat">
              <span className="num">
                <span className="count-up" data-target="40" data-suffix="+">
                  40+
                </span>
              </span>
              <span className="label">Five-star reviews</span>
            </div>

            <div className="trust-divider" />

            <div className="trust-stat">
              <span className="num">
                <span className="count-up" data-target="7" data-suffix="+">
                  7+
                </span>
              </span>
              <span className="label">Years specialist</span>
            </div>
          </div>
        </div>

        <div className="hero-panel">
          <p className="panel-label">Live Vacancies</p>

          {liveJobs.length > 0 ? (
            liveJobs.map((job, index) => (
              <Link
                key={job.id}
                href={`/job/${job.slug}`}
                className="job-card"
                style={{ textDecoration: 'none' }}
              >
                <div className="job-card-top">
                  <span className="job-title">
                    {job.title || 'Live vacancy'}
                  </span>

                  <span
                    className={`job-badge ${
                      index === 1 ? 'badge-hot' : 'badge-new'
                    }`}
                  >
                    {index === 1 ? 'Hot' : 'New'}
                  </span>
                </div>

                <div className="job-meta">
                  <LocationIcon />
                  {formatLocation(job)}
                </div>

                <span className="job-salary">
                  {job.salary_display || 'Salary available on request'}
                </span>
              </Link>
            ))
          ) : (
            <div className="job-card">
              <div className="job-card-top">
                <span className="job-title">
                  No live vacancies currently advertised
                </span>
                <span className="job-badge badge-new">Soon</span>
              </div>

              <div className="job-meta">
                <LocationIcon />
                UK-wide FE &amp; Skills opportunities
              </div>

              <span className="job-salary">Register your interest</span>
            </div>
          )}

          <Link href="/jobs" className="panel-cta">
            View all live jobs →
          </Link>
        </div>
      </div>
    </section>
  )
}