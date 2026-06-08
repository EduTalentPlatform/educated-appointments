'use client'

import { useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { REGIONS } from '@/lib/jobs-data'
import LiveCandidateCount from '@/components/LiveCandidateCount'

type ApprenticeshipStandard = {
  id: string
  title?: string | null
  standard_name?: string | null
  reference?: string | null
  sector?: string | null
  route?: string | null
  level?: string | number | null
  status?: string | null
  programme_type?: string | null
  is_active?: boolean | null
}

// ── CRM role hierarchy ───────────────────────────────────────────────────────
const ROLE_TYPE_HIERARCHY: Record<string, { subTypes: string[] }> = {
  Delivery: {
    subTypes: [
      'Assessor',
      'IQA',
      'Lead IQA',
      'End-Point Assessor (EPA)',
      'Skills Coach',
      'Tutor / Trainer',
      'Employability Tutor',
      'Distance Learning Tutor',
      'Workshop Facilitator',
      'Vocational Trainer',
      'Functional Skills Tutor (Maths)',
      'Functional Skills Tutor (English)',
      'Learning Support Worker',
    ],
  },
  'Quality & Curriculum': {
    subTypes: [
      'Curriculum Manager',
      'Curriculum Developer',
      'Qualification Developer',
      'E-Learning Developer',
      'Quality Manager',
      'Compliance Manager',
      'Ofsted Nominee',
      'Head of Quality',
      'EPA Centre Coordinator',
      'CEIAG Adviser',
    ],
  },
  Commercial: {
    subTypes: [
      'Business Development Manager',
      'Employment Specialist',
      'Employer Engagement Manager',
      'Apprenticeship Advisor',
      'Recruitment Consultant',
      'Partnerships Manager',
      'Account Manager',
      'Key Account Manager',
      'Bid Writer',
      'Marketing Manager',
      'Apprenticeship Levy Consultant',
    ],
  },
  Operations: {
    subTypes: [
      'Operations Manager',
      'Centre Manager',
      'Programme Manager',
      'Regional Manager',
      'Training Coordinator',
      'Learner Services Manager',
      'Timetabling / Scheduling Manager',
      'Contract Manager',
      'Functional Skills Coordinator',
    ],
  },
  Leadership: {
    subTypes: [
      'Head of Department',
      'Head of Apprenticeships',
      'Head of Commercial',
      'Assistant Principal',
      'Vice Principal',
      'Director of Education',
      'Director of Quality',
      'Director of Business Development',
      'Principal',
      'CEO / MD',
    ],
  },
  'Data & Admin': {
    subTypes: [
      'MIS Officer',
      'MIS Manager',
      'Data Analyst',
      'Apprenticeship Administrator',
      'Learner Records Officer',
      'Funding & Compliance Officer',
      'Exams Officer',
      'Finance Manager',
      'HR Manager',
    ],
  },
}

const MAIN_ROLE_TYPES = Object.keys(ROLE_TYPE_HIERARCHY)

function getStandardName(standard: ApprenticeshipStandard) {
  return standard.title || standard.standard_name || 'Unnamed standard'
}

function getStandardSubjectArea(standard: ApprenticeshipStandard) {
  return standard.sector || standard.route || 'Uncategorised'
}

function shouldShowApprenticeshipStandards(
  mainRoleType: string,
  subRoleType: string,
) {
  if (mainRoleType !== 'Delivery') return false

  return ['Assessor', 'Skills Coach', 'Tutor / Trainer'].includes(subRoleType)
}

// ── Icons ────────────────────────────────────────────────────────────────────
function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

// ── Page data ────────────────────────────────────────────────────────────────
const whyUs = [
  {
    icon: '🎯',
    title: 'We only work in FE & Skills',
    body: "We're not generalists. Every role we place is in Further Education, Skills or Apprenticeships. That means we understand the qualifications, the culture, and what good looks like in your field.",
  },
  {
    icon: '🤝',
    title: 'We represent you properly',
    body: "We won't fire your CV off to every employer on our books. We have a proper conversation, understand what you're looking for, and only put you forward for roles that are genuinely right for you.",
  },
  {
    icon: '🔒',
    title: 'Confidential and discreet',
    body: "If you're currently employed and just exploring, we handle that with complete confidentiality. Your current employer won't hear a thing until you're ready.",
  },
  {
    icon: '📋',
    title: 'Interview prep included',
    body: "When we put you forward for a role, we don't just send your CV and wish you luck. We brief you on the employer, the role, and help you prepare so you go in with confidence.",
  },
]

const processSteps = [
  {
    num: '01',
    title: 'Register with us',
    body: "Complete the short registration form, upload your CV and tell us what type of role you're looking for.",
  },
  {
    num: '02',
    title: 'We have a conversation',
    body: "One of the team will be in touch to learn more about your background, what you're looking for, and what's important to you in your next role.",
  },
  {
    num: '03',
    title: 'We match you to roles',
    body: "We'll match you to live vacancies and alert you as new ones come in. We only put you forward for roles that genuinely fit.",
  },
  {
    num: '04',
    title: 'We support you through',
    body: "Interview prep, feedback, offer negotiation — we're with you at every stage until you're settled into your new role.",
  },
]

const afterRegistering = [
  {
    time: 'Within 1 business day',
    event: 'One of the team will be in touch to introduce themselves',
  },
  {
    time: 'Within the week',
    event: "We'll have a call to learn more about what you're looking for",
  },
  {
    time: 'Ongoing',
    event: "You'll hear from us as soon as a relevant role comes in",
  },
  {
    time: 'Throughout',
    event: 'Regular check-ins so we know if your situation changes',
  },
]

const candidateTestimonials = [
  {
    initials: 'LN',
    name: 'Lyn N.',
    role: 'Placed Candidate',
    body: 'Joe is one of the best Recruiters I have worked with. Extremely professional, reliable and credible, communication was first class! More importantly Joe understands the Skills and Employment Sector and provided me with invaluable advice throughout the process.',
  },
  {
    initials: 'DH',
    name: 'Diane H.',
    role: 'Skills Coach',
    body: 'Joe went above and beyond every step of the way. Regular check-in calls, interview confidence prep, and he made sure I was fully informed at every stage. Would recommend without hesitation.',
  },
  {
    initials: 'MK',
    name: 'Mark K.',
    role: 'IQA',
    body: "I'd been looking for the right move for months. Within two weeks of registering with Educated Appointments I had an interview, and within the month I was in post. Couldn't recommend more highly.",
  },
]

const roleGroups = [
  {
    role: 'Delivery',
    desc: 'Assessors, Tutors, Skills Coaches, IQAs and vocational delivery specialists.',
  },
  {
    role: 'Commercial',
    desc: 'Business Development, Employer Engagement and Apprenticeship Sales roles.',
  },
  {
    role: 'Quality & Curriculum',
    desc: 'Quality Managers, Curriculum Leads, Compliance and Ofsted-focused roles.',
  },
  {
    role: 'Operations',
    desc: 'Operations Managers, Programme Managers and learner services roles.',
  },
  {
    role: 'Leadership',
    desc: 'Head of Department, Director, Principal and senior leadership opportunities.',
  },
  {
    role: 'Data & Admin',
    desc: 'MIS, funding, compliance, exams, learner records and administration roles.',
  },
]

// ── Standards selector ───────────────────────────────────────────────────────
function StandardsSelector({
  standards,
  selectedStandards,
  setSelectedStandards,
}: {
  standards: ApprenticeshipStandard[]
  selectedStandards: string[]
  setSelectedStandards: React.Dispatch<React.SetStateAction<string[]>>
}) {
  const [standardSearch, setStandardSearch] = useState('')
  const [standardSectorFilter, setStandardSectorFilter] = useState('all')

  const standardSectors = useMemo(() => {
    return Array.from(
      new Set(standards.map(standard => getStandardSubjectArea(standard))),
    ).sort()
  }, [standards])

  const filteredStandards = useMemo(() => {
    const term = standardSearch.toLowerCase().trim()

    return standards
      .filter(standard => {
        const standardName = getStandardName(standard)
        const subjectArea = getStandardSubjectArea(standard)
        const reference = standard.reference || ''

        const matchSearch =
          !term ||
          standardName.toLowerCase().includes(term) ||
          subjectArea.toLowerCase().includes(term) ||
          reference.toLowerCase().includes(term)

        const matchSubjectArea =
          standardSectorFilter === 'all' || subjectArea === standardSectorFilter

        return matchSearch && matchSubjectArea
      })
      .slice(0, 150)
  }, [standards, standardSearch, standardSectorFilter])

  function toggleStandard(standardName: string) {
    setSelectedStandards(current => {
      const exists = current.some(
        item => item.toLowerCase() === standardName.toLowerCase(),
      )

      return exists
        ? current.filter(
            item => item.toLowerCase() !== standardName.toLowerCase(),
          )
        : [...current, standardName]
    })
  }

  return (
    <div className="cp-field">
      <label className="cp-label">
        Apprenticeship standards you can deliver{' '}
        <span className="cp-optional">(optional)</span>
      </label>

      <p className="cp-cv-note" style={{ marginTop: 0 }}>
        Search and select the standards you are confident delivering. These will
        save directly into your candidate profile.
      </p>

      {selectedStandards.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: 10,
          }}
        >
          {selectedStandards.map(standard => (
            <button
              key={standard}
              type="button"
              onClick={() => toggleStandard(standard)}
              style={{
                border: 0,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 999,
                padding: '6px 10px',
                background: '#e0f0fb',
                color: '#0B72B8',
                fontSize: 12,
                fontWeight: 900,
              }}
              title="Click to remove"
            >
              {standard}
              <span style={{ fontWeight: 900 }}>×</span>
            </button>
          ))}
        </div>
      )}

      {selectedStandards.map(standard => (
        <input key={standard} type="hidden" name="standards" value={standard} />
      ))}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 190px',
          gap: 8,
          marginBottom: 10,
        }}
      >
        <input
          type="text"
          className="cp-input"
          placeholder="Search standards, subject area or reference..."
          value={standardSearch}
          onChange={event => setStandardSearch(event.target.value)}
        />

        <select
          className="cp-select"
          value={standardSectorFilter}
          onChange={event => setStandardSectorFilter(event.target.value)}
        >
          <option value="all">All areas</option>
          {standardSectors.map(sector => (
            <option key={sector} value={sector}>
              {sector}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: 14,
          maxHeight: 300,
          overflowY: 'auto',
          background: '#fff',
        }}
      >
        {filteredStandards.length > 0 ? (
          filteredStandards.map(standard => {
            const standardName = getStandardName(standard)
            const subjectArea = getStandardSubjectArea(standard)
            const checked = selectedStandards.some(
              item => item.toLowerCase() === standardName.toLowerCase(),
            )

            return (
              <label
                key={standard.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  padding: '10px 12px',
                  borderBottom: '1px solid #f1f5f9',
                  cursor: 'pointer',
                  background: checked ? '#f0f9ff' : '#fff',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleStandard(standardName)}
                  style={{ marginTop: 3 }}
                />

                <span style={{ display: 'grid', gap: 2 }}>
                  <strong
                    style={{
                      fontSize: 13,
                      color: checked ? '#0B72B8' : 'var(--text-dark)',
                    }}
                  >
                    {standardName}
                  </strong>

                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                    }}
                  >
                    {[
                      standard.reference,
                      subjectArea,
                      standard.level ? `Level ${standard.level}` : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
              </label>
            )
          })
        ) : (
          <p
            style={{
              margin: 0,
              padding: 12,
              fontSize: 12,
              color: 'var(--text-muted)',
            }}
          >
            No standards found.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Registration form ────────────────────────────────────────────────────────
function RegisterForm({ standards }: { standards: ApprenticeshipStandard[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [cvFileName, setCvFileName] = useState<string | null>(null)
  const [selectedMainRoleType, setSelectedMainRoleType] = useState('')
  const [selectedSubRoleType, setSelectedSubRoleType] = useState('')
  const [selectedStandards, setSelectedStandards] = useState<string[]>([])

  const fileRef = useRef<HTMLInputElement>(null)

  const showStandardsSelector = shouldShowApprenticeshipStandards(
    selectedMainRoleType,
    selectedSubRoleType,
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const form = event.currentTarget
    const data = new FormData(form)

    try {
      const res = await fetch('/api/candidate-register', {
        method: 'POST',
        body: data,
      })

      const result = await res.json().catch(() => null)

      if (res.ok && result?.success) {
        setIsSuccess(true)
        form.reset()
      } else {
        setError(result?.error ?? 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    }

    setIsSubmitting(false)
  }

  if (isSuccess) {
    return (
      <div className="cp-success">
        <div className="cp-success-icon">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#217822"
            strokeWidth="2.5"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>

        <h3 className="cp-success-title">You&apos;re registered</h3>

        <p className="cp-success-body">
          Thanks for registering. Your details have gone straight into our CRM.
          One of the team will be in touch within one business day to have a
          proper conversation about what you&apos;re looking for.
        </p>

        <Link href="/jobs" className="cp-success-jobs">
          Browse live jobs while you wait →
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="cp-form">
      <div className="cp-form-row">
        <div className="cp-field">
          <label className="cp-label">
            First name <span className="cp-req">*</span>
          </label>
          <input
            name="firstName"
            type="text"
            className="cp-input"
            placeholder="Jane"
            required
          />
        </div>

        <div className="cp-field">
          <label className="cp-label">
            Last name <span className="cp-req">*</span>
          </label>
          <input
            name="lastName"
            type="text"
            className="cp-input"
            placeholder="Smith"
            required
          />
        </div>
      </div>

      <div className="cp-field">
        <label className="cp-label">
          Email address <span className="cp-req">*</span>
        </label>
        <input
          name="email"
          type="email"
          className="cp-input"
          placeholder="jane@example.com"
          required
        />
      </div>

      <div className="cp-field">
        <label className="cp-label">
          Phone number <span className="cp-req">*</span>
        </label>
        <input
          name="phone"
          type="tel"
          className="cp-input"
          placeholder="07700 900000"
          required
        />
      </div>

      <div className="cp-field">
        <label className="cp-label">
          Current job title <span className="cp-optional">(optional)</span>
        </label>
        <input
          name="currentRole"
          type="text"
          className="cp-input"
          placeholder="e.g. Electrical Assessor"
        />
      </div>

      <div className="cp-field">
        <label className="cp-label">
          Where are you based? <span className="cp-optional">(optional)</span>
        </label>
        <select name="location" className="cp-select">
          <option value="">Select region...</option>
          {REGIONS.filter(region => region !== 'All Regions').map(region => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
      </div>

      <div className="cp-field">
        <label className="cp-label">
          Postcode <span className="cp-optional">(optional)</span>
        </label>
        <input
          name="postcode"
          type="text"
          className="cp-input"
          placeholder="e.g. IP1 1AA"
        />
      </div>

      <div className="cp-field">
        <label className="cp-label">
          Main role type <span className="cp-optional">(optional)</span>
        </label>
        <select
          name="mainRoleType"
          className="cp-select"
          value={selectedMainRoleType}
          onChange={event => {
            setSelectedMainRoleType(event.target.value)
            setSelectedSubRoleType('')
            setSelectedStandards([])
          }}
        >
          <option value="">Select main role type...</option>
          {MAIN_ROLE_TYPES.map(roleType => (
            <option key={roleType} value={roleType}>
              {roleType}
            </option>
          ))}
        </select>
      </div>

      <div className="cp-field">
        <label className="cp-label">
          Specific role <span className="cp-optional">(optional)</span>
        </label>
        <select
          name="subRoleType"
          className="cp-select"
          value={selectedSubRoleType}
          onChange={event => {
            const nextRole = event.target.value
            setSelectedSubRoleType(nextRole)

            if (
              !shouldShowApprenticeshipStandards(
                selectedMainRoleType,
                nextRole,
              )
            ) {
              setSelectedStandards([])
            }
          }}
          disabled={!selectedMainRoleType}
        >
          <option value="">
            {selectedMainRoleType
              ? 'Select specific role...'
              : 'Select main role type first'}
          </option>

          {selectedMainRoleType &&
            ROLE_TYPE_HIERARCHY[selectedMainRoleType]?.subTypes.map(role => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
        </select>
      </div>

      {showStandardsSelector && (
        <StandardsSelector
          standards={standards}
          selectedStandards={selectedStandards}
          setSelectedStandards={setSelectedStandards}
        />
      )}

      <div className="cp-field">
        <label className="cp-label">
          Salary expectation <span className="cp-optional">(optional)</span>
        </label>
        <input
          name="salaryExpected"
          type="text"
          className="cp-input"
          placeholder="e.g. £38,000"
        />
      </div>

      <div className="cp-field">
        <label className="cp-label">
          Notice period <span className="cp-optional">(optional)</span>
        </label>
        <input
          name="noticePeriod"
          type="text"
          className="cp-input"
          placeholder="e.g. 4 weeks"
        />
      </div>

      <div className="cp-field">
        <label className="cp-label">
          DBS status <span className="cp-optional">(optional)</span>
        </label>
        <select name="dbsStatus" className="cp-select">
          <option value="">Select...</option>
          <option value="not_completed">Not completed</option>
          <option value="not_completed_happy_to_undertake_no_issues">
            Not completed but happy to undertake — no issues
          </option>
          <option value="completed_clear">Completed — clear</option>
          <option value="completed_disclosures">Completed — disclosures</option>
          <option value="on_update_service">On update service</option>
        </select>
      </div>

      <div className="cp-field">
        <label className="cp-label">
          Right to work in the UK{' '}
          <span className="cp-optional">(optional)</span>
        </label>
        <select name="rightToWork" className="cp-select">
          <option value="">Select...</option>
          <option value="confirmed">Yes, I have the right to work in the UK</option>
          <option value="not_confirmed">No / not confirmed</option>
        </select>
      </div>

      <div className="cp-field">
        <label className="cp-label">
          Upload your CV{' '}
          <span className="cp-optional">(optional but recommended)</span>
        </label>

        <div className="cp-cv-upload" onClick={() => fileRef.current?.click()}>
          <input
            ref={fileRef}
            name="cv"
            type="file"
            accept=".pdf,.doc,.docx"
            className="cp-cv-hidden"
            onChange={event =>
              setCvFileName(event.target.files?.[0]?.name ?? null)
            }
          />

          {cvFileName ? (
            <div className="cp-cv-selected">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#217822"
                strokeWidth="2"
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
              <span>{cvFileName}</span>
            </div>
          ) : (
            <div className="cp-cv-placeholder">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="cp-cv-label">Click to upload your CV</span>
              <span className="cp-cv-hint">PDF or Word</span>
            </div>
          )}
        </div>

        <p className="cp-cv-note">
          Your CV goes straight into our CRM. Certificates and compliance
          documents can be requested later if needed.
        </p>
      </div>

      <label
        className="cp-gdpr"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          name="privacyAccepted"
          value="true"
          required
          style={{ marginTop: 4 }}
        />
        <span>
          I confirm I have read and understood the{' '}
          <Link href="/policies/candidate-privacy-notice">
            Candidate Privacy Notice
          </Link>{' '}
          and understand that Educated Appointments may process my data to
          support recruitment activity.
        </span>
      </label>

      {error && <div className="cp-error">{error}</div>}

      <button type="submit" className="cp-submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <span className="cp-spinner" /> Registering...
          </>
        ) : (
          'Register with us →'
        )}
      </button>
    </form>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function CandidatePage({
  standards = [],
}: {
  standards?: ApprenticeshipStandard[]
}) {
  return (
    <div className="cp-page">
      {/* HERO */}
      <div className="cp-hero">
        <div className="cp-hero-inner">
          <div className="cp-hero-left">
            <p className="cp-eyebrow">For FE &amp; Skills Professionals</p>

            <h1 className="cp-hero-title">
              Find your next role.
              <br />
              <span className="cp-hero-accent">We know the sector.</span>
            </h1>

            <p className="cp-hero-sub">
              We work exclusively in Further Education, Skills and
              Apprenticeships. Whether you&apos;re actively looking or just
              exploring what&apos;s out there — register with us and we&apos;ll
              represent you properly.
            </p>

            <div className="cp-hero-ctas">
              <a href="#register" className="cp-btn-primary">
                Register with us →
              </a>

              <Link href="/jobs" className="cp-btn-ghost">
                Browse live jobs
              </Link>
            </div>

            <div className="cp-hero-checks">
              {[
                'No CV carpet-bombing — we only put you forward for the right roles',
                "Complete confidentiality if you're currently employed",
                'Interview prep and support at every stage',
              ].map(check => (
                <div key={check} className="cp-hero-check">
                  <div className="cp-hero-check-icon">
                    <CheckIcon />
                  </div>
                  {check}
                </div>
              ))}
            </div>
          </div>

          <div className="cp-hero-right">
            <div className="cp-hero-stats">
              <div className="cp-stat">
                <span className="cp-stat-num">
  <LiveCandidateCount />
</span>
                <span className="cp-stat-label">Candidates</span>
              </div>

              <div className="cp-stat">
                <span className="cp-stat-num">UK-wide</span>
                <span className="cp-stat-label">Roles including remote</span>
              </div>

              <div className="cp-stat">
                <span className="cp-stat-num">7+</span>
                <span className="cp-stat-label">Years in FE &amp; Skills</span>
              </div>
            </div>

            <div className="cp-hero-quote">
              <p className="cp-hero-quote-text">
                &ldquo;Within two weeks of registering I had an interview, and
                within the month I was in post.&rdquo;
              </p>

              <div className="cp-hero-quote-author">
                <div className="cp-hero-quote-avatar">MK</div>
                <div>
                  <p className="cp-hero-quote-name">Mark K.</p>
                  <p className="cp-hero-quote-role">IQA, placed by EA</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WHY REGISTER */}
      <div className="cp-why">
        <div className="cp-section-inner">
          <p className="cp-section-eyebrow">Why register with us</p>

          <h2 className="cp-section-title">Not just another recruitment agency.</h2>

          <div className="cp-why-grid">
            {whyUs.map(item => (
              <div key={item.title} className="cp-why-card">
                <span className="cp-why-icon">{item.icon}</span>
                <h3 className="cp-why-title">{item.title}</h3>
                <p className="cp-why-body">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ROLES WE PLACE */}
      <div className="cp-roles">
        <div className="cp-section-inner">
          <p className="cp-section-eyebrow">Roles we recruit</p>

          <h2 className="cp-section-title">
            If it&apos;s in FE &amp; Skills, we recruit it.
          </h2>

          <p className="cp-section-sub">
            From frontline delivery roles to senior leadership — across every
            subject area.
          </p>

          <div className="cp-roles-grid">
            {roleGroups.map(role => (
              <div key={role.role} className="cp-role-card">
                <h3 className="cp-role-title">{role.role}</h3>
                <p className="cp-role-desc">{role.desc}</p>
              </div>
            ))}
          </div>

          <div className="cp-roles-cta">
            <Link href="/jobs" className="cp-btn-outline">
              Browse all live roles <ArrowIcon />
            </Link>
          </div>
        </div>
      </div>

      {/* PROCESS */}
      <div className="cp-process">
        <div className="cp-section-inner">
          <p className="cp-section-eyebrow">How it works</p>

          <h2 className="cp-section-title">What happens after you register.</h2>

          <div className="cp-process-steps">
            {processSteps.map((step, index) => (
              <div key={step.num} className="cp-process-step">
                <div className="cp-process-num">{step.num}</div>

                <div className="cp-process-content">
                  <h3 className="cp-process-title">{step.title}</h3>
                  <p className="cp-process-body">{step.body}</p>
                </div>

                {index < processSteps.length - 1 && (
                  <div className="cp-process-line" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WHAT TO EXPECT */}
      <div className="cp-expect">
        <div className="cp-section-inner">
          <p className="cp-section-eyebrow">What to expect</p>

          <h2 className="cp-section-title">We&apos;ll be in touch quickly.</h2>

          <div className="cp-expect-timeline">
            {afterRegistering.map((item, index) => (
              <div key={`${item.time}-${index}`} className="cp-expect-item">
                <div className="cp-expect-dot" />

                <div className="cp-expect-content">
                  <p className="cp-expect-time">{item.time}</p>
                  <p className="cp-expect-event">{item.event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TESTIMONIALS */}
      <div className="cp-testimonials">
        <div className="cp-section-inner">
          <p className="cp-section-eyebrow">What candidates say</p>

          <h2 className="cp-section-title">
            Hear it from people we&apos;ve placed.
          </h2>

          <div className="cp-testimonials-grid">
            {candidateTestimonials.map((testimonial, index) => (
              <div
                key={testimonial.name}
                className={`cp-testimonial${
                  index === 0 ? ' cp-testimonial-featured' : ''
                }`}
              >
                <p className="cp-testimonial-body">
                  &ldquo;{testimonial.body}&rdquo;
                </p>

                <div className="cp-testimonial-author">
                  <div className="cp-testimonial-avatar">
                    {testimonial.initials}
                  </div>

                  <div>
                    <p className="cp-testimonial-name">{testimonial.name}</p>
                    <p className="cp-testimonial-role">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* REGISTER PORTAL */}
      <div id="register" className="cp-register">
        <div className="cp-register-inner">
          <div className="cp-register-left">
            <p
              className="cp-section-eyebrow"
              style={{ color: 'var(--teal)' }}
            >
              Candidate registration portal
            </p>

            <h2 className="cp-register-title">
              Ready to find
              <br />
              your next role?
            </h2>

            <p className="cp-register-sub">
              Register your details, upload your CV and tell us what you are
              looking for. If you are an Assessor, Tutor/Trainer or Skills
              Coach, you can also select the apprenticeship standards you can
              deliver.
            </p>

            <div className="cp-register-benefits">
              {[
                'Your CV goes straight into our CRM',
                'Role preferences use our live CRM role categories',
                'Assessor, Tutor and Skills Coach standards can be selected at registration',
                'Certificates and compliance documents can be requested later',
              ].map(benefit => (
                <div key={benefit} className="cp-register-benefit">
                  <div className="cp-register-benefit-icon">
                    <CheckIcon />
                  </div>
                  {benefit}
                </div>
              ))}
            </div>

            <div className="cp-register-contact">
              <p className="cp-register-contact-label">Prefer to call?</p>
              <a href="tel:01473809096" className="cp-register-phone">
                01473 809 096
              </a>
              <p className="cp-register-hours">Mon – Fri, 9am – 5:30pm</p>
            </div>
          </div>

          <div className="cp-register-right">
            <RegisterForm standards={standards} />
          </div>
        </div>
      </div>
    </div>
  )
}