import { Fragment } from 'react'
import LiveCandidateCount from '@/components/LiveCandidateCount'

const steps = [
  {
    num: 1,
    title: 'Source',
    desc: 'We advertise across multiple job boards and tap into our extensive network of FE professionals built over 7+ years — attracting active and passive candidates alike.',
  },
  {
    num: 2,
    title: 'Screen & Check',
    desc: 'Every candidate is fully screened — right to work confirmed, qualifications sighted, referee details collected, DBS information and certificates gathered, and a thorough interview conducted by our team before you see a single CV.',
  },
  {
    num: 3,
    title: 'Interview & Place',
    desc: 'You interview only the best. On placement, your full compliance pack is ready to download from the Employer Portal — zero admin, zero chasing.',
  },
]

export default function Process() {
  return (
    <section className="process-section">
      <div className="process-grid">

        <div>
          <p className="section-eyebrow reveal">Our Process</p>
          <h2 className="section-title reveal reveal-delay-1">
            Zero time-wasting.<br />Every time.
          </h2>
          <p className="section-sub reveal reveal-delay-2">
            Our three-stage process means every candidate who reaches your inbox has been
            fully sourced, screened, and interviewed — with all Safer Recruitment checks
            already completed.
          </p>

          <div className="process-steps">
            {steps.map((step, i) => (
              <div key={step.num} className={`process-step reveal reveal-delay-${i + 1}`}>
                <div className="step-line-wrap">
                  <div className="step-num">{step.num}</div>
                  <div className="step-connector" />
                </div>
                <div className="step-content">
                  <h3 className="step-title">{step.title}</h3>
                  <p className="step-desc">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="reveal reveal-delay-2">
          <div className="process-card-main">
            <p className="pcm-label">Employer Feedback</p>
            <p className="pcm-quote">
              &ldquo;Every candidate Joe has sent across has been a very high calibre, all
              have been well informed of the job role and prepared for interview.&rdquo;
            </p>
            <div className="pcm-author">
              <div className="pcm-avatar">BG</div>
              <div>
                <p className="pcm-name">Beth Gavin</p>
                <p className="pcm-role">Employer Partner</p>
              </div>
            </div>
          </div>

          <div className="process-stat-card">
            {[
              {
                id: 'candidates',
                num: <LiveCandidateCount />,
                label: 'Candidates',
              },
              {
                id: 'compliance',
                num: '100%',
                label: 'Compliance info gathered pre-shortlist',
              },
              {
                id: 'reviews',
                num: '40+',
                label: 'Five-star reviews',
              },
            ].map((stat, i) => (
              <Fragment key={stat.id}>
                {i > 0 && <div className="psc-divider" />}
                <div className="psc-item">
                  <span className="psc-num">{stat.num}</span>
                  <span className="psc-label">{stat.label}</span>
                </div>
              </Fragment>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
