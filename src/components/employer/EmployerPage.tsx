'use client'

import { useState } from 'react'
import Link from 'next/link'
import LiveCandidateCount from '@/components/LiveCandidateCount'

// ── Icons ─────────────────────────────────────────────────────────────────────
function CheckIcon({ color = '#5DDBDB' }: { color?: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

// ── Data ──────────────────────────────────────────────────────────────────────
const painPoints = [
  {
    icon: '📋',
    heading: 'Drowning in CVs that aren\'t right',
    body: 'You post a role, get 60 applications, and spend a week sifting through candidates who aren\'t qualified, don\'t understand FE, or simply aren\'t available. Time you don\'t have.',
  },
  {
    icon: '🎯',
    heading: 'Agencies who don\'t know the sector',
    body: 'Most recruitment agencies will send you anyone with a pulse. They don\'t know the difference between a TAQA and a D32, or why industry experience matters as much as a teaching qualification.',
  },
  {
    icon: '📁',
    heading: 'Compliance paperwork piling up',
    body: 'Right to work, DBS information, qualification certificates, referee details — collecting it all takes time. And if it\'s missing when an inspector calls, that\'s your problem.',
  },
]

const processSteps = [
  {
    num: '01',
    title: 'Send us your brief',
    body: 'Tell us about the role — the qualification required, the level of experience you need, the salary you\'re offering, and when you need someone in post. That\'s it. We handle the rest.',
  },
  {
    num: '02',
    title: 'We source, screen and interview',
    body: 'We advertise across multiple channels and tap our network of FE professionals. Every candidate is interviewed by us first — qualifications sighted, right to work confirmed, referee details collected, DBS information gathered.',
  },
  {
    num: '03',
    title: 'You interview the best',
    body: 'You only ever see candidates who are genuinely qualified and prepared. We aim for every candidate we send to obtain an interview. When you make a placement, their full compliance information is ready in your Employer Portal.',
  },
]

const sectors = [
  { role: 'Assessing', subjects: ['Electrical', 'Plumbing & Heating', 'Gas & Renewables', 'Adult Care', 'Construction', 'Engineering'] },
  { role: 'Tutoring & Teaching', subjects: ['Electrical', 'Plumbing & Heating', 'Automotive', 'Hospitality', 'Functional Skills'] },
  { role: 'Skills Coaching', subjects: ['Business & Admin', 'Digital & Tech', 'Health & Science', 'Leadership', 'Finance'] },
  { role: 'Curriculum & Leadership', subjects: ['Cross-sector leadership', 'Quality & Compliance', 'Curriculum design'] },
  { role: 'Sales & Business Development', subjects: ['Apprenticeship sales', 'Employer engagement', 'Commercial growth'] },
  { role: 'Operations & Management', subjects: ['MIS & Data', 'Operations', 'Senior Management', 'Director level'] },
]

const saferChecks = [
  'DBS information & certificates collected',
  'Right to Work verified',
  'Qualifications sighted & copies taken',
  'Referee details obtained & shared',
  'FE qualification awards verified (TAQA, D32/33, AET, CET, DET)',
  'All documents available to download on placement',
]

const testimonials = [
  {
    initials: 'BG',
    name: 'Beth Gavin',
    role: 'Training Provider',
    body: 'Every candidate Joe has sent across has been a very high calibre, all have been well informed of the job role and prepared for interview.',
  },
  {
    initials: 'DK',
    name: 'Dan K.',
    role: 'Training Provider',
    body: 'The team at Educated Appointments possess an exceptional ability to understand our organisation\'s unique requirements, swiftly identifying top-tier talent that aligns with our company culture and values.',
  },
  {
    initials: 'ZS',
    name: 'Zoe S.',
    role: 'College Director',
    body: 'After scouring the sector nationally for a Senior MIS Officer for nearly six months with three other agencies, Joe found us the right candidate within weeks. Genuinely impressive sector knowledge.',
  },
]

// ── Brief form ─────────────────────────────────────────────────────────────────
function BriefForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const form = e.currentTarget
    const data = {
      type: 'employer',
      firstName:    (form.querySelector('[name="firstName"]') as HTMLInputElement)?.value,
      lastName:     (form.querySelector('[name="lastName"]') as HTMLInputElement)?.value,
      email:        (form.querySelector('[name="email"]') as HTMLInputElement)?.value,
      phone:        (form.querySelector('[name="phone"]') as HTMLInputElement)?.value ?? '',
      organisation: (form.querySelector('[name="organisation"]') as HTMLInputElement)?.value ?? '',
      message:      (form.querySelector('[name="message"]') as HTMLTextAreaElement)?.value ?? '',
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (result.success) {
        setIsSuccess(true)
      } else {
        setError(result.error ?? 'Something went wrong.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    }

    setIsSubmitting(false)
  }

  if (isSuccess) {
    return (
      <div className="ep-brief-success">
        <div className="ep-brief-success-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#217822" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h3 className="ep-brief-success-title">Brief received</h3>
        <p className="ep-brief-success-body">
          We&apos;ll be in touch within one business day to discuss your requirements.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="ep-brief-form">
      <div className="ep-brief-row">
        <div className="ep-brief-field">
          <label className="ep-brief-label">First name <span className="ep-required">*</span></label>
          <input name="firstName" type="text" className="ep-brief-input" placeholder="Jane" required />
        </div>
        <div className="ep-brief-field">
          <label className="ep-brief-label">Last name <span className="ep-required">*</span></label>
          <input name="lastName" type="text" className="ep-brief-input" placeholder="Smith" required />
        </div>
      </div>

      <div className="ep-brief-field">
        <label className="ep-brief-label">Email <span className="ep-required">*</span></label>
        <input name="email" type="email" className="ep-brief-input" placeholder="jane@provider.co.uk" required />
      </div>

      <div className="ep-brief-field">
        <label className="ep-brief-label">Phone</label>
        <input name="phone" type="tel" className="ep-brief-input" placeholder="07700 900000" />
      </div>

      <div className="ep-brief-field">
        <label className="ep-brief-label">Organisation <span className="ep-required">*</span></label>
        <input name="organisation" type="text" className="ep-brief-input" placeholder="Your training provider or college" required />
      </div>

      <div className="ep-brief-field">
        <label className="ep-brief-label">Tell us about the role</label>
        <textarea
          name="message"
          className="ep-brief-textarea"
          placeholder="Role title, qualifications required, experience needed, salary, location and when you need someone in post..."
          rows={5}
        />
      </div>

      {error && (
        <div className="ep-brief-error">{error}</div>
      )}

      <button type="submit" className="ep-brief-submit" disabled={isSubmitting}>
        {isSubmitting ? 'Sending...' : 'Send your brief →'}
      </button>

      <p className="ep-brief-gdpr">
        By submitting you agree to us processing your data to respond to your enquiry.{' '}
        <Link href="/privacy-policy">Privacy Policy</Link>.
      </p>
    </form>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function EmployerPage() {
  return (
    <div className="ep-page">

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <div className="ep-hero">
        <div className="ep-hero-inner">
          <div className="ep-hero-left">
            <p className="ep-eyebrow">For Training Providers &amp; Colleges</p>
            <h1 className="ep-hero-title">
              You should be interviewing candidates,<br />
              <span className="ep-hero-accent">not sifting through them.</span>
            </h1>
            <p className="ep-hero-sub">
              We recruit exclusively for Further Education, Skills and Apprenticeship providers.
              When we send you a candidate, they&apos;ve already been interviewed, compliance
              information collected and prepared. You make the decision — we handle everything else.
            </p>
            <div className="ep-hero-ctas">
              <a href="https://calendly.com/joseph-edapps/introduction-call" target="_blank" rel="noopener noreferrer" className="ep-btn-primary">
                Book a free intro call →
              </a>
              <a href="#brief" className="ep-btn-ghost">
                Send us a brief
              </a>
            </div>
            <div className="ep-hero-proof">
              <div className="ep-proof-item">
                <span className="ep-proof-num">
  <LiveCandidateCount />
</span>
                <span className="ep-proof-label">Candidates</span>
              </div>
              <div className="ep-proof-divider" />
              <div className="ep-proof-item">
                <span className="ep-proof-num">7+</span>
                <span className="ep-proof-label">Years in FE &amp; Skills</span>
              </div>
              <div className="ep-proof-divider" />
              <div className="ep-proof-item">
                <span className="ep-proof-num">40+</span>
                <span className="ep-proof-label">Five-star reviews</span>
              </div>
            </div>
          </div>

          <div className="ep-hero-right">
            <div className="ep-hero-card">
              <p className="ep-hero-card-label">What employers say</p>
              <p className="ep-hero-card-quote">
                &ldquo;After scouring the sector nationally for a Senior MIS Officer
                for nearly six months with three other agencies, Joe found us the
                right candidate within weeks.&rdquo;
              </p>
              <div className="ep-hero-card-author">
                <div className="ep-hero-card-avatar">ZS</div>
                <div>
                  <p className="ep-hero-card-name">Zoe S.</p>
                  <p className="ep-hero-card-role">College Director</p>
                </div>
              </div>
              <div className="ep-hero-card-badges">
                {['Assessors', 'IQAs', 'Skills Coaches', 'Sales', 'Leadership', 'MIS'].map((b) => (
                  <span key={b} className="ep-hero-card-badge">{b}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PAIN POINTS ───────────────────────────────────────────────── */}
      <div className="ep-pain">
        <div className="ep-section-inner">
          <div className="ep-pain-header">
            <p className="ep-section-eyebrow">Sound familiar?</p>
            <h2 className="ep-section-title">
              The problems we hear every day.
            </h2>
          </div>
          <div className="ep-pain-grid">
            {painPoints.map((p) => (
              <div key={p.heading} className="ep-pain-card">
                <span className="ep-pain-icon">{p.icon}</span>
                <h3 className="ep-pain-heading">{p.heading}</h3>
                <p className="ep-pain-body">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <div className="ep-process">
        <div className="ep-section-inner">
          <div className="ep-process-header">
            <div>
              <p className="ep-section-eyebrow">Our Process</p>
              <h2 className="ep-section-title">Simple. Thorough. Effective.</h2>
              <p className="ep-section-sub">
                Three steps is all it takes. From brief to placement, we manage everything
                — so you can focus on running your provision.
              </p>
            </div>
          </div>

          <div className="ep-process-steps">
            {processSteps.map((step, i) => (
              <div key={step.num} className="ep-process-step">
                <div className="ep-process-step-num">{step.num}</div>
                <div className="ep-process-step-content">
                  <h3 className="ep-process-step-title">{step.title}</h3>
                  <p className="ep-process-step-body">{step.body}</p>
                </div>
                {i < processSteps.length - 1 && (
                  <div className="ep-process-arrow">
                    <ArrowIcon />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTORS ───────────────────────────────────────────────────── */}
      <div className="ep-sectors">
        <div className="ep-section-inner">
          <p className="ep-section-eyebrow">What we recruit</p>
          <h2 className="ep-section-title">Roles across every part of your provision.</h2>
          <p className="ep-section-sub">
            From frontline delivery to senior leadership — if the role is in FE, Skills or
            Apprenticeships, we recruit it.
          </p>
          <div className="ep-sectors-grid">
            {sectors.map((s) => (
              <div key={s.role} className="ep-sector-card">
                <h3 className="ep-sector-role">{s.role}</h3>
                <div className="ep-sector-subjects">
                  {s.subjects.map((sub) => (
                    <span key={sub} className="ep-sector-subject">{sub}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SAFER RECRUITMENT ─────────────────────────────────────────── */}
      <div className="ep-safer">
        <div className="ep-section-inner ep-safer-inner">
          <div className="ep-safer-left">
            <p className="ep-section-eyebrow" style={{ color: 'var(--teal)' }}>Safer Recruitment</p>
            <h2 className="ep-section-title" style={{ color: 'var(--white)' }}>
              Compliance information collected before you see a CV.
            </h2>
            <p className="ep-safer-sub">
              In FE and apprenticeships, Safer Recruitment isn&apos;t optional. We collect
              candidate compliance information before they reach your inbox — and share
              everything on placement. The responsibility for commissioning a new DBS check
              rests with you as the employer, but we make sure you have everything else
              you need from day one.
            </p>
            <div className="ep-safer-checks">
              {saferChecks.map((check) => (
                <div key={check} className="ep-safer-check">
                  <div className="ep-safer-check-icon">
                    <CheckIcon color="#5DDBDB" />
                  </div>
                  {check}
                </div>
              ))}
            </div>
          </div>

          <div className="ep-safer-right">
            <div className="ep-safer-card">
              <div className="ep-safer-card-header">
                <p className="ep-safer-card-title">Candidate Compliance Pack</p>
                <span className="ep-safer-card-badge">Ready on placement</span>
              </div>
              {[
                { type: 'pdf', name: 'DBS Certificate / Update Service', sub: 'Collected from candidate where held' },
                { type: 'img', name: 'Right to Work — Passport Copy', sub: 'Identity verified, original sighted' },
                { type: 'pdf', name: 'TAQA / Assessor Award Certificate', sub: 'Qualification verified, copy held' },
                { type: 'doc', name: 'Referee Details ×2', sub: 'Shared on placement for your follow-up' },
              ].map((doc) => (
                <div key={doc.name} className="ep-safer-doc">
                  <div className={`ep-safer-doc-type ep-doc-${doc.type}`}>{doc.type.toUpperCase()}</div>
                  <div className="ep-safer-doc-info">
                    <p className="ep-safer-doc-name">{doc.name}</p>
                    <p className="ep-safer-doc-sub">{doc.sub}</p>
                  </div>
                  <div className="ep-safer-doc-dl">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5DDBDB" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── EMPLOYER PORTAL ───────────────────────────────────────────── */}
      <div className="ep-portal">
        <div className="ep-section-inner ep-portal-inner">
          <div className="ep-portal-left">
            <p className="ep-section-eyebrow">Employer Portal</p>
            <h2 className="ep-section-title">
              Your candidates. Your compliance pack.<br />One secure login.
            </h2>
            <p className="ep-section-sub">
              When we put candidates forward for your roles, they appear instantly in your
              private portal — complete with their profile, qualifications, and every compliance
              document ready to view and download.
            </p>
            <div className="ep-portal-features">
              {[
                {
                  title: 'View your shortlist privately',
                  body: 'Each candidate appears in your secure dashboard with their CV, background and our notes — no emails, no attachments.',
                },
                {
                  title: 'Compliance documents ready on day one',
                  body: 'DBS information, right to work, qualifications, referee details — all shared on placement confirmation.',
                },
                {
                  title: 'Built for Ofsted inspection-readiness',
                  body: 'Every document is dated, labelled and stored — exactly what an inspector wants to see.',
                },
              ].map((f) => (
                <div key={f.title} className="ep-portal-feature">
                  <div className="ep-portal-feature-icon">
                    <CheckIcon color="var(--primary)" />
                  </div>
                  <div>
                    <p className="ep-portal-feature-title">{f.title}</p>
                    <p className="ep-portal-feature-body">{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/portal" className="ep-portal-btn">
              Access the Employer Portal →
            </Link>
          </div>

          <div className="ep-portal-right">
            <div className="ep-portal-screen">
              <div className="ep-portal-screen-bar">
                <div className="ep-screen-dots">
                  <span className="ep-dot ep-dot-red" />
                  <span className="ep-dot ep-dot-yellow" />
                  <span className="ep-dot ep-dot-green" />
                </div>
                <div className="ep-screen-url">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  portal.educatedappointments.co.uk
                </div>
              </div>
              <div className="ep-portal-screen-body">
                <div className="ep-psb-header">
                  <div>
                    <p className="ep-psb-title">Your Shortlisted Candidates</p>
                    <p className="ep-psb-sub">Senior IQA Role</p>
                  </div>
                  <span className="ep-psb-badge">3 candidates</span>
                </div>
                {[
                  { initials: 'SR', color: '#352DEB', name: 'Sarah R.', role: 'Senior IQA · 12 yrs FE', tags: ['TAQA', 'DBS Disclosed'], status: 'Docs Ready', statusCls: 'ep-status-docs' },
                  { initials: 'ML', color: '#1a9090', name: 'Mark L.', role: 'IQA · 8 yrs assessing', tags: ['V1 Award', 'DBS Disclosed'], status: 'Docs Ready', statusCls: 'ep-status-docs' },
                  { initials: 'AK', color: '#cc4a35', name: 'Angela K.', role: 'Lead IQA · Multi-site', tags: ['TAQA', 'Ofsted ready'], status: 'New', statusCls: 'ep-status-new' },
                ].map((c) => (
                  <div key={c.name} className="ep-pcc">
                    <div className="ep-pcc-avatar" style={{ background: c.color }}>{c.initials}</div>
                    <div className="ep-pcc-info">
                      <p className="ep-pcc-name">{c.name}</p>
                      <p className="ep-pcc-role">{c.role}</p>
                      <div className="ep-pcc-tags">
                        {c.tags.map((t) => <span key={t} className="ep-pcc-tag">{t}</span>)}
                      </div>
                    </div>
                    <span className={`ep-pcc-status ${c.statusCls}`}>{c.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TESTIMONIALS ──────────────────────────────────────────────── */}
      <div className="ep-testimonials">
        <div className="ep-section-inner">
          <p className="ep-section-eyebrow">What employers say</p>
          <h2 className="ep-section-title">Don&apos;t just take our word for it.</h2>
          <div className="ep-testimonials-grid">
            {testimonials.map((t, i) => (
              <div key={t.name} className={`ep-testimonial${i === 0 ? ' ep-testimonial-featured' : ''}`}>
                <p className="ep-testimonial-quote">&ldquo;{t.body}&rdquo;</p>
                <div className="ep-testimonial-author">
                  <div className="ep-testimonial-avatar" style={{ background: i === 0 ? 'rgba(255,255,255,0.2)' : 'var(--primary-light)', color: i === 0 ? 'white' : 'var(--primary)' }}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="ep-testimonial-name">{t.name}</p>
                    <p className="ep-testimonial-role">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── DUAL CTA ──────────────────────────────────────────────────── */}
      <div id="brief" className="ep-cta">
        <div className="ep-section-inner ep-cta-inner">

          {/* Book a call */}
          <div className="ep-cta-call">
            <p className="ep-section-eyebrow" style={{ color: 'var(--teal)' }}>Prefer to talk first?</p>
            <h2 className="ep-cta-title">Book a free<br />15-min intro call.</h2>
            <p className="ep-cta-sub">
              We&apos;ll discuss your requirements, give you an honest picture of the
              candidate market, and tell you exactly what we can do — with no obligation.
            </p>
            <a
              href="https://calendly.com/joseph-edapps/introduction-call"
              target="_blank"
              rel="noopener noreferrer"
              className="ep-btn-calendly"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              Book a call on Calendly
            </a>
            <p className="ep-cta-hint">Mon – Fri · 9am – 5:30pm · No obligation</p>
          </div>

          <div className="ep-cta-divider">
            <span>or</span>
          </div>

          {/* Send a brief */}
          <div className="ep-cta-brief">
            <p className="ep-section-eyebrow">Ready to go?</p>
            <h2 className="ep-cta-title">Send us your brief.</h2>
            <p className="ep-cta-sub">
              Tell us about the role and we&apos;ll come back to you within one business day.
            </p>
            <BriefForm />
          </div>

        </div>
      </div>

    </div>
  )
}