import Link from 'next/link'

function CheckIcon({ stroke }: { stroke: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="3">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

export default function AudienceSplit() {
  return (
    <section className="audience-section">
      <div className="audience-grid">

        {/* Employers */}
        <div className="audience-card employers reveal">
          <div className="audience-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5DDBDB" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 00-4 0v2M8 7V5a2 2 0 00-4 0v2" />
              <path d="M12 12v4M10 14h4" />
            </svg>
          </div>
          <p className="audience-tag">For Employers</p>
          <h2 className="audience-title">Shortlist-ready candidates. No noise.</h2>
          <p className="audience-body">
            You send us the brief. We source, screen, and interview — you only ever see
            candidates who can genuinely do the job, with all Safer Recruitment checks
            already completed.
          </p>

          <div className="portal-callout">
            <div className="portal-callout-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5DDBDB" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <div className="portal-callout-text">
              <strong>Employer Portal</strong>
              Log in to view your shortlisted candidates, check compliance docs, and
              download everything you need — all in one secure place.
            </div>
          </div>

          <ul className="audience-features">
            {[
              'Full Safer Recruitment focus before you see a CV',
              'Permanent, contract & freelance roles covered',
              "Deep FE sector knowledge — we've worked in it",
            ].map((item) => (
              <li key={item}>
                <div className="feature-check">
                  <CheckIcon stroke="#5DDBDB" />
                </div>
                {item}
              </li>
            ))}
          </ul>
          <Link href="/employer" className="btn-audience">
            Send us your brief
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Candidates */}
        <div className="audience-card candidates reveal reveal-delay-2">
          <div className="audience-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M6 20v-2a6 6 0 0112 0v2" />
            </svg>
          </div>
          <p className="audience-tag">For Candidates</p>
          <h2 className="audience-title">Find your next role in FE &amp; Skills.</h2>
          <p className="audience-body">
            Whether you&apos;re actively looking or just curious, we work exclusively in
            Further Education, Skills and Apprenticeships — across the UK. We&apos;ll
            represent you properly.
          </p>
          <ul className="audience-features">
            {[
              'Assessors, IQAs, Skills Coaches, Curriculum Leads, Leadership & Sales',
              'UK-wide roles including remote & hybrid',
              'Interview prep & ongoing career support',
              'Sales, business development & commercial roles covered',
            ].map((item) => (
              <li key={item}>
                <div className="feature-check">
                  <CheckIcon stroke="white" />
                </div>
                {item}
              </li>
            ))}
          </ul>
          <Link href="/jobs" className="btn-audience">
            Browse live jobs
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

      </div>
    </section>
  )
}
