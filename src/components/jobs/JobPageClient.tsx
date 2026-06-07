'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Job } from '@/types'
import ApplyModal from './ApplyModal'

interface Props {
  job: Job
  similarJobs: Job[]
}

// ── Description parser ────────────────────────────────────────────────────────
function ParsedDescription({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let bullets: string[] = []
  let key = 0

  const flushBullets = () => {
    if (bullets.length > 0) {
      elements.push(
        <ul key={`ul-${key++}`} className="jd-bullet-list">
          {bullets.map((b, i) => (
            <li key={i} className="jd-bullet-item">{b}</li>
          ))}
        </ul>
      )
      bullets = []
    }
  }

  lines.forEach((line) => {
    const t = line.trim()
    if (!t) { flushBullets(); return }

    if (t.startsWith('**') && t.endsWith('**') && t.length > 4) {
      flushBullets()
      elements.push(
        <h3 key={key++} className="jd-section-heading">
          {t.slice(2, -2)}
        </h3>
      )
      return
    }

    if (t.startsWith('- ')) {
      bullets.push(t.slice(2))
      return
    }

    flushBullets()
    elements.push(<p key={key++} className="jd-paragraph">{t}</p>)
  })

  flushBullets()
  return <>{elements}</>
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function LocationIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function BriefcaseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 00-4 0v2M8 7V5a2 2 0 00-4 0v2" />
    </svg>
  )
}

function SalaryIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v12M9 9h4.5a1.5 1.5 0 010 3H10a1.5 1.5 0 000 3H15" />
    </svg>
  )
}

function SectorIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

function SubjectIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
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

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 .99h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7a2 2 0 011.72 2.02z" />
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function JobPageClient({ job, similarJobs }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [copied, setCopied] = useState(false)

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <>
      <div className="jd-page">

        {/* ── HERO HEADER ──────────────────────────────────────────────── */}
        <div className="jd-hero">
          <div className="jd-hero-inner">

            <Link href="/jobs" className="jd-back">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              Back to all jobs
            </Link>

            <div className="jd-hero-content">
              <div className="jd-hero-left">
                <div className="jd-hero-badges">
                  <span className="jd-badge-role">{job.sector}</span>
                  {job.subject_area && (
                    <span className="jd-badge-subject">{job.subject_area}</span>
                  )}
                  <span className="jd-badge-type">{job.type}</span>
                </div>

                <h1 className="jd-hero-title">{job.title}</h1>

                <div className="jd-hero-meta">
                  <span className="jd-hero-meta-item">
                    <LocationIcon />
                    {job.location}, {job.region}
                  </span>
                  <span className="jd-hero-meta-divider" />
                  <span className="jd-hero-meta-item">
                    <SalaryIcon />
                    {job.salary_display}
                    {job.salary_note && (
                      <span className="jd-hero-salary-note"> {job.salary_note}</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="jd-hero-actions">
                <button
                  className="jd-btn-apply"
                  onClick={() => setShowModal(true)}
                >
                  Apply for this role →
                </button>
                <button
                  className="jd-btn-share"
                  onClick={handleShare}
                >
                  <ShareIcon />
                  {copied ? 'Link copied!' : 'Share role'}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* ── BODY ─────────────────────────────────────────────────────── */}
        <div className="jd-body">
          <div className="jd-body-inner">

            {/* Description */}
            <div className="jd-content">
              <ParsedDescription text={job.description} />
            </div>

            {/* Sidebar */}
            <aside className="jd-sidebar">

              {/* Key details */}
              <div className="jd-details-card">
                <h3 className="jd-details-title">Role details</h3>

                <div className="jd-details-list">
                  <div className="jd-detail-row">
                    <span className="jd-detail-icon"><SalaryIcon /></span>
                    <div>
                      <span className="jd-detail-label">Salary</span>
                      <span className="jd-detail-value">
                        {job.salary_display}
                        {job.salary_note && (
                          <span className="jd-detail-note"> {job.salary_note}</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="jd-detail-row">
                    <span className="jd-detail-icon"><LocationIcon /></span>
                    <div>
                      <span className="jd-detail-label">Location</span>
                      <span className="jd-detail-value">{job.location}, {job.region}</span>
                    </div>
                  </div>

                  <div className="jd-detail-row">
                    <span className="jd-detail-icon"><BriefcaseIcon /></span>
                    <div>
                      <span className="jd-detail-label">Job type</span>
                      <span className="jd-detail-value">{job.type}</span>
                    </div>
                  </div>

                  <div className="jd-detail-row">
                    <span className="jd-detail-icon"><SectorIcon /></span>
                    <div>
                      <span className="jd-detail-label">Role type</span>
                      <span className="jd-detail-value">{job.sector}</span>
                    </div>
                  </div>

                  {job.subject_area && (
                    <div className="jd-detail-row">
                      <span className="jd-detail-icon"><SubjectIcon /></span>
                      <div>
                        <span className="jd-detail-label">Subject area</span>
                        <span className="jd-detail-value">{job.subject_area}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Apply */}
              <button
                className="jd-btn-apply-full"
                onClick={() => setShowModal(true)}
              >
                Apply for this role →
              </button>

              {/* Register */}
              <div className="jd-sidebar-card">
                <p className="jd-sidebar-card-title">Not quite right?</p>
                <p className="jd-sidebar-card-body">
                  Register with us and we&apos;ll match you to roles as they come in — including ones we haven&apos;t advertised yet.
                </p>
                <Link href="/candidate" className="jd-btn-register">
                  Register with us
                </Link>
              </div>

              {/* Call us */}
              <div className="jd-call-card">
                <p className="jd-call-label">Speak to us directly</p>
                <a href="tel:01473809096" className="jd-call-number">
                  <PhoneIcon />
                  01473 809 096
                </a>
                <p className="jd-call-hint">Mon – Fri, 9am – 5:30pm</p>
              </div>

            </aside>
          </div>
        </div>

        {/* ── SIMILAR ROLES ─────────────────────────────────────────────── */}
        {similarJobs.length > 0 && (
          <div className="jd-similar">
            <div className="jd-similar-inner">
              <div className="jd-similar-header">
                <div>
                  <p className="section-eyebrow">More opportunities</p>
                  <h2 className="jd-similar-title">Similar roles</h2>
                </div>
                <Link href="/jobs" className="jd-similar-all">
                  View all jobs →
                </Link>
              </div>

              <div className="jd-similar-grid">
                {similarJobs.map((similar) => (
                  <div
                    key={similar.id}
                    className="jd-similar-card"
                    onClick={() => router.push(`/job/${similar.slug}`)}
                  >
                    <div className="jd-similar-card-top">
                      <span className="jlc-sector">{similar.sector}</span>
                      {similar.subject_area && (
                        <span className="jlc-subject">{similar.subject_area}</span>
                      )}
                    </div>
                    <h3 className="jd-similar-card-title">{similar.title}</h3>
                    <div className="jd-similar-card-meta">
                      <LocationIcon />
                      {similar.location}, {similar.region}
                    </div>
                    <div className="jd-similar-card-footer">
                      <span className="jd-similar-salary">{similar.salary_display}</span>
                      <span className="jd-similar-arrow">
                        View role <ArrowIcon />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {showModal && (
        <ApplyModal job={job} onClose={() => setShowModal(false)} />
      )}
    </>
  )
}