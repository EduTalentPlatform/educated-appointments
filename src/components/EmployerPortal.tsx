import Link from 'next/link'

const candidates = [
  {
    initials: 'SR',
    color: '#352DEB',
    name: 'Sarah R.',
    role: 'Senior IQA · 12 years FE experience',
    tags: [
      { label: 'TAQA', cls: 'tag-qual' },
      { label: 'DBS Disclosed', cls: 'tag-dbs' },
      { label: 'Leadership exp', cls: 'tag-exp' },
    ],
    status: { label: 'Docs Ready', cls: 'status-docs' },
    docs: 5,
  },
  {
    initials: 'ML',
    color: '#1a9090',
    name: 'Mark L.',
    role: 'IQA · 8 years assessor background',
    tags: [
      { label: 'V1 Award', cls: 'tag-qual' },
      { label: 'DBS Disclosed', cls: 'tag-dbs' },
    ],
    status: { label: 'Docs Ready', cls: 'status-docs' },
    docs: 5,
  },
  {
    initials: 'AK',
    color: '#cc4a35',
    name: 'Angela K.',
    role: 'Lead IQA · Multi-site experience',
    tags: [
      { label: 'TAQA', cls: 'tag-qual' },
      { label: 'DBS Disclosed', cls: 'tag-dbs' },
      { label: 'Ofsted ready', cls: 'tag-exp' },
    ],
    status: { label: 'New', cls: 'status-new' },
    docs: 5,
  },
]

const features = [
  {
    title: 'View your shortlist privately',
    desc: "Each candidate we put forward appears in your secure dashboard. View their CV, background, and our notes — no emails, no attachments.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#352DEB" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    title: 'Compliance documents ready on day one',
    desc: 'DBS information, right to work, qualifications, referee details — all shared on placement confirmation. Download your full compliance pack instantly.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#352DEB" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    title: 'Built for Ofsted & inspection-readiness',
    desc: 'Your single source of truth for recruited staff. Every document is dated, labelled, and stored — exactly what an inspector wants to see.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#352DEB" strokeWidth="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
]

function DownloadIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

export default function EmployerPortal() {
  return (
    <section className="portal-section">
      <div className="portal-inner">

        {/* Browser mockup */}
        <div className="portal-screen reveal">
          <div className="portal-screen-bar">
            <div className="screen-dots">
              <div className="screen-dot sd-red" />
              <div className="screen-dot sd-yellow" />
              <div className="screen-dot sd-green" />
            </div>
            <div className="screen-url">
              <svg className="screen-url-lock" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              portal.educatedappointments.co.uk
            </div>
          </div>

          <div className="portal-screen-body">
            <div className="psb-header">
              <div>
                <p className="psb-title">Your Shortlisted Candidates</p>
                <p className="psb-subtitle">Senior IQA Role</p>
              </div>
              <span className="psb-badge">3 candidates</span>
            </div>

            {candidates.map((c) => (
              <div key={c.name} className="portal-candidate-card">
                <div className="pcc-avatar" style={{ background: c.color }}>{c.initials}</div>
                <div className="pcc-info">
                  <p className="pcc-name">{c.name}</p>
                  <p className="pcc-role">{c.role}</p>
                  <div className="pcc-tags">
                    {c.tags.map((t) => (
                      <span key={t.label} className={`pcc-tag ${t.cls}`}>{t.label}</span>
                    ))}
                  </div>
                </div>
                <div className="pcc-right">
                  <span className={`pcc-status ${c.status.cls}`}>{c.status.label}</span>
                  <span className="pcc-docs-ready">
                    <DownloadIcon /> {c.docs} docs
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right copy */}
        <div className="portal-right">
          <p className="section-eyebrow reveal">Employer Portal</p>
          <h2 className="section-title reveal reveal-delay-1">
            Your candidates.<br />Your compliance pack.<br />One secure login.
          </h2>
          <p className="section-sub reveal reveal-delay-2">
            When we put candidates forward for your roles, they appear instantly in your
            private portal — complete with their profile, qualifications, and every Safer
            Recruitment document ready to view and download.
          </p>

          <div className="portal-features">
            {features.map((f, i) => (
              <div key={f.title} className={`portal-feature reveal reveal-delay-${i + 1}`}>
                <div className="pf-icon">{f.icon}</div>
                <div>
                  <p className="pf-title">{f.title}</p>
                  <p className="pf-desc">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Link href="/employer-portal/login" className="btn-portal-access reveal reveal-delay-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            Access the Employer Portal
          </Link>
        </div>

      </div>
    </section>
  )
}
