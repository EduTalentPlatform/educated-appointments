const checks = [
  {
    iconClass: 'green',
    iconStroke: '#217822',
    title: 'DBS Information Collected',
    desc: 'We ask all candidates about their DBS status. Where a certificate or Update Service registration is held, we collect and share this with you. Commissioning a new DBS check is your responsibility as the employer.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#217822" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
  },
  {
    iconClass: 'green',
    title: 'Right to Work',
    desc: 'Identity and right to work in the UK verified and documented in line with Home Office requirements.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#217822" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    iconClass: 'blue',
    title: 'Qualifications Obtained',
    desc: 'Original certificates sighted and copies taken. FE qualifications (AET, CET, DET), assessor awards (TAQA, D32/33, A1) and industry-specific licences verified.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#352DEB" strokeWidth="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
    ),
  },
  {
    iconClass: 'blue',
    title: 'Referee Details Collected',
    desc: 'We obtain referee information from every candidate — minimum two professional contacts — and share full details with you on placement for you to follow up directly.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#352DEB" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    iconClass: 'blue',
    highlighted: true,
    title: 'All Docs Ready to Download',
    desc: 'Every document is uploaded to the employer portal. One click to download your complete compliance pack on placement day.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#352DEB" strokeWidth="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
]

const docs = [
  { type: 'pdf', name: 'DBS Certificate / Update Service', sub: 'Collected from candidate where held' },
  { type: 'img', name: 'Right to Work — Passport Copy', sub: 'Identity verified · Original sighted' },
  { type: 'pdf', name: 'TAQA / D32 Assessor Award', sub: 'Qualification verified · Copy held' },
  { type: 'doc', name: 'Referee Details × 2', sub: 'Shared on placement for your follow-up' },
]

function TickIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#217822" strokeWidth="3">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5DDBDB" strokeWidth="2.5">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

export default function SaferRecruitment() {
  return (
    <section className="safer-section">
      <div className="safer-inner">

        <div className="safer-left">
          <p className="section-eyebrow reveal">Compliance &amp; Safety</p>
          <h2 className="section-title reveal reveal-delay-1">
            Safer Recruitment.<br />Built in — not bolted on.
          </h2>
          <p className="safer-intro reveal reveal-delay-2">
            In FE and apprenticeships, Safer Recruitment isn&apos;t optional — it&apos;s a
            regulatory requirement. We collect candidate compliance information{' '}
            <strong>before</strong> they reach your inbox, including qualifications,
            referee details, right to work, and DBS information. All documents are loaded
            and ready to share the moment a placement is confirmed. The responsibility for
            commissioning a new DBS check always rests with you as the hiring organisation.
          </p>

          <div className="safer-stat-row reveal reveal-delay-2">
            <div className="safer-stat">
              <span className="num">100%</span>
              <span className="label">Of candidates asked for compliance info before shortlisting</span>
            </div>
            <div className="safer-stat">
              <span className="num">0</span>
              <span className="label">Compliance surprises on placement day</span>
            </div>
          </div>

          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', lineHeight: 1.65 }} className="reveal reveal-delay-3">
            Our approach is aligned with the DfE&apos;s Keeping Children Safe in Education
            guidance and Ofsted inspection requirements for training providers and colleges.
          </p>
        </div>

        <div className="safer-right reveal reveal-delay-1">
          <div className="safer-grid">
            {checks.map((check) => (
              <div key={check.title} className={`safer-check-card${check.highlighted ? ' highlighted' : ''}`}>
                <div className="scc-tick"><TickIcon /></div>
                <div className={`scc-icon ${check.iconClass}`}>{check.icon}</div>
                <p className="scc-title">{check.title}</p>
                <p className="scc-desc">{check.desc}</p>
              </div>
            ))}
          </div>

          {/* Documents panel */}
          <div className="docs-panel">
            <div className="docs-panel-header">
              <div>
                <p className="docs-panel-title">Candidate Compliance Pack</p>
                <p style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                  Available on placement confirmation
                </p>
              </div>
              <span className="docs-panel-badge">Ready to download</span>
            </div>

            {docs.map((doc) => (
              <div key={doc.name} className="doc-row">
                <div className={`doc-file-icon ${doc.type}`}>{doc.type.toUpperCase()}</div>
                <div className="doc-info">
                  <p className="doc-name">{doc.name}</p>
                  <p className="doc-sub">{doc.sub}</p>
                </div>
                <div className="doc-dl"><DownloadIcon /></div>
              </div>
            ))}

            <p className="docs-note">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              Accessed securely via the Employer Portal after placement confirmation
            </p>
          </div>
        </div>

      </div>
    </section>
  )
}
