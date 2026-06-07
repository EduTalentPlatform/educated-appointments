import Link from 'next/link'

const values = [
  {
    icon: '🎯',
    title: 'Quality over quantity. Always.',
    body: "We'd rather send nobody than send five candidates who don't fit the brief. Every CV that leaves us represents our reputation — and we take that seriously.",
  },
  {
    icon: '📞',
    title: 'Communication is non-negotiable.',
    body: "Candidates and employers are kept up to date throughout the entire process. No radio silence. No chasing us for updates. You'll always know where things stand.",
  },
  {
    icon: '🔍',
    title: 'We only work in FE & Skills.',
    body: "We're not a generalist agency that dabbles in education. Further Education, Skills and Apprenticeships is all we do — which means we understand the sector in a way others simply don't.",
  },
  {
    icon: '🤝',
    title: 'We represent people properly.',
    body: "When we put a candidate forward, they've been spoken to, prepared and matched carefully. When we take on a brief, we give it our full attention. No corners cut.",
  },
]

const timeline = [
  {
    year: 'The early days',
    title: 'Starting out at a training provider',
    body: "Joe began his career working for a training provider, where part of his role was recruiting candidates into apprenticeship programmes — learning the sector from the inside from day one.",
  },
  {
    year: 'Growing up',
    title: 'Working up to Head of Sales',
    body: "He worked his way up through the organisation to Head of Sales, managing both recruitment and business development teams. It gave him a full picture of what providers actually need — and what they're not getting.",
  },
  {
    year: 'The gap',
    title: 'Seeing what was missing',
    body: "Being on the provider side made the problem crystal clear: agencies didn't understand the sector, CVs didn't match briefs, candidates arrived unprepared, and nobody kept you updated. Joe knew he could do it differently — because he'd lived it.",
  },
  {
    year: 'Educated Appointments',
    title: 'Building something better',
    body: "EA was founded on a single principle — deliver a recruitment service that everyone involved can be proud of. Only putting forward candidates who genuinely fit, keeping everyone updated throughout, and never compromising on quality just to fill a role.",
  },
]

export default function AboutPage() {
  return (
    <div className="ab-page">

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <div className="ab-hero">
        <div className="ab-hero-inner">
          <div className="ab-hero-left">
            <p className="ab-eyebrow">About Educated Appointments</p>
            <h1 className="ab-hero-title">
              Built by someone who&apos;s<br />
              <span className="ab-hero-accent">been on both sides.</span>
            </h1>
            <p className="ab-hero-sub">
              Educated Appointments was founded by Joe Sutton — a former training provider
              professional who got tired of watching agencies send the wrong candidates,
              leave people in the dark, and treat FE & Skills as an afterthought.
              So he built something better.
            </p>
          </div>
          <div className="ab-hero-right">
            <div className="ab-hero-card">
              <div className="ab-hero-card-avatar">JS</div>
              <div className="ab-hero-card-info">
                <p className="ab-hero-card-name">Joe Sutton</p>
                <p className="ab-hero-card-role">Founder, Educated Appointments</p>
              </div>
              <div className="ab-hero-card-stats">
                <div className="ab-hero-stat">
                  <span className="ab-hero-stat-num">500+</span>
                  <span className="ab-hero-stat-label">Placements</span>
                </div>
                <div className="ab-hero-stat-divider" />
                <div className="ab-hero-stat">
                  <span className="ab-hero-stat-num">7+</span>
                  <span className="ab-hero-stat-label">Years in FE</span>
                </div>
                <div className="ab-hero-stat-divider" />
                <div className="ab-hero-stat">
                  <span className="ab-hero-stat-num">40+</span>
                  <span className="ab-hero-stat-label">Five-star reviews</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── STORY ─────────────────────────────────────────────────────── */}
      <div className="ab-story">
        <div className="ab-section-inner">
          <div className="ab-story-inner">
            <div className="ab-story-left">
              <p className="ab-section-eyebrow">The story</p>
              <h2 className="ab-section-title">Why Educated Appointments exists.</h2>
              <p className="ab-story-body">
                Joe spent his career working inside Further Education — starting at a
                training provider where part of his role was recruiting candidates into
                apprenticeship programmes, and working his way up to Head of Sales,
                managing both recruitment and business development teams.
              </p>
              <p className="ab-story-body">
                That experience gave him something most recruitment consultants don&apos;t
                have: a real understanding of what it&apos;s like to be on the employer side.
                The frustration of receiving CVs that don&apos;t match the brief. The
                time wasted interviewing candidates who weren&apos;t right. The silence
                from agencies who&apos;d gone quiet after the placement was made.
              </p>
              <p className="ab-story-body">
                Educated Appointments was built to fix all of that. Not by reinventing
                recruitment — but by doing it properly. Talking to candidates properly.
                Understanding briefs properly. Keeping everyone updated properly.
                And never, ever sending a candidate just for the sake of sending someone.
              </p>
              <p className="ab-story-body ab-story-body-highlight">
                &ldquo;I&apos;d rather send nobody than send five candidates who don&apos;t
                fit the mould. Quality is the one thing I&apos;ll never compromise on.&rdquo;
              </p>
              <p className="ab-story-attribution">— Joe Sutton, Founder</p>
            </div>

            <div className="ab-story-right">
              <div className="ab-timeline">
                {timeline.map((item, i) => (
                  <div key={i} className="ab-timeline-item">
                    <div className="ab-timeline-marker">
                      <div className="ab-timeline-dot" />
                      {i < timeline.length - 1 && <div className="ab-timeline-line" />}
                    </div>
                    <div className="ab-timeline-content">
                      <span className="ab-timeline-year">{item.year}</span>
                      <h3 className="ab-timeline-title">{item.title}</h3>
                      <p className="ab-timeline-body">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── VALUES ────────────────────────────────────────────────────── */}
      <div className="ab-values">
        <div className="ab-section-inner">
          <p className="ab-section-eyebrow">What we stand for</p>
          <h2 className="ab-section-title">The principles we won&apos;t bend on.</h2>
          <div className="ab-values-grid">
            {values.map((v) => (
              <div key={v.title} className="ab-value-card">
                <span className="ab-value-icon">{v.icon}</span>
                <h3 className="ab-value-title">{v.title}</h3>
                <p className="ab-value-body">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── DIFFERENCE ────────────────────────────────────────────────── */}
      <div className="ab-difference">
        <div className="ab-section-inner ab-difference-inner">
          <div className="ab-difference-left">
            <p className="ab-section-eyebrow" style={{ color: 'var(--teal)' }}>The difference</p>
            <h2 className="ab-section-title" style={{ color: 'var(--white)' }}>
              We&apos;re not a generalist agency<br />that dabbles in education.
            </h2>
            <p className="ab-difference-body">
              Further Education, Skills and Apprenticeships is all we do. That means
              we know what a TAQA is, why industry experience matters as much as a
              teaching qualification, and what an Ofsted inspector expects to see on
              a candidate&apos;s file.
            </p>
            <p className="ab-difference-body">
              We know the sector because we&apos;ve worked in it. And that changes
              everything about the service we&apos;re able to provide.
            </p>
            <div className="ab-difference-stats">
              {[
                { num: '500+', label: 'Successful placements across FE & Skills' },
                { num: '7+', label: 'Years working exclusively in FE & Skills' },
                { num: '40+', label: 'Five-star reviews from candidates and employers' },
              ].map((s) => (
                <div key={s.label} className="ab-difference-stat">
                  <span className="ab-difference-stat-num">{s.num}</span>
                  <span className="ab-difference-stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="ab-difference-right">
            {[
              { label: 'Most agencies', items: ['Generalist — FE is one of many sectors', 'Send CVs and hope for the best', 'Go quiet after placement', 'Don\'t understand FE qualifications', 'Volume over quality'] },
              { label: 'Educated Appointments', items: ['FE & Skills only — it\'s all we do', 'Every candidate interviewed before you see them', 'Updates throughout the process', 'Deep sector knowledge from the inside', 'Quality over quantity, always'], highlight: true },
            ].map((col) => (
              <div key={col.label} className={`ab-compare-col${col.highlight ? ' ab-compare-col-highlight' : ''}`}>
                <p className="ab-compare-label">{col.label}</p>
                {col.items.map((item) => (
                  <div key={item} className="ab-compare-item">
                    <span className={`ab-compare-icon${col.highlight ? ' ab-compare-icon-tick' : ' ab-compare-icon-cross'}`}>
                      {col.highlight ? '✓' : '✗'}
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <div className="ab-cta">
        <div className="ab-section-inner ab-cta-inner">
          <div>
            <h2 className="ab-cta-title">
              Want to find out if we&apos;re<br />
              <span className="ab-cta-accent">the right fit for you?</span>
            </h2>
            <p className="ab-cta-sub">
              Whether you&apos;re an employer looking to recruit or a candidate looking
              for your next role — book a call and let&apos;s have a proper conversation.
            </p>
          </div>
          <div className="ab-cta-buttons">
            <a
              href="https://calendly.com/joseph-edapps/introduction-call"
              target="_blank"
              rel="noopener noreferrer"
              className="ab-btn-primary"
            >
              Book a free intro call →
            </a>
            <Link href="/jobs" className="ab-btn-ghost">
              Browse live jobs
            </Link>
          </div>
        </div>
      </div>

    </div>
  )
}