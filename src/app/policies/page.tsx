import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import PageEffects from '@/components/PageEffects'

export const metadata: Metadata = {
  title: 'Policies | Educated Appointments',
  description:
    'Policies, privacy notices and compliance information for Educated Appointments.',
}

const policies = [
  {
    title: 'Candidate Privacy Notice',
    description:
      'How we collect, store and use candidate personal data for recruitment purposes.',
    href: '/policies/candidate-privacy-notice',
    status: 'Live',
    tag: 'Candidates',
  },
  {
    title: 'Data Protection & GDPR Policy',
    description:
      'Our approach to data protection, lawful processing, retention and data subject rights.',
    href: '/policies/data-protection',
    status: 'Live',
    tag: 'Data protection',
  },
  {
    title: 'AI Use in Recruitment Statement',
    description:
      'How we use AI-assisted tools to support recruitment activity, CV formatting and candidate matching.',
    href: '/policies/ai-use',
    status: 'Live',
    tag: 'AI',
  },
  {
    title: 'Equal Opportunities Policy',
    description:
      'Our commitment to fair, inclusive and non-discriminatory recruitment practices.',
    href: '/policies/equal-opportunities',
    status: 'Live',
    tag: 'Fair recruitment',
  },
  {
    title: 'Safeguarding & Safer Recruitment Statement',
    description:
      'How we support safer recruitment when working with training providers, employers and candidates.',
    href: '/policies/safeguarding',
    status: 'Live',
    tag: 'Safer recruitment',
  },
  {
    title: 'Complaints Procedure',
    description:
      'How candidates, employers and clients can raise a concern or complaint.',
    href: '/policies/complaints',
    status: 'Live',
    tag: 'Complaints',
  },
]

export default function PoliciesPage() {
  return (
    <>
      <PageEffects />
      <Nav />

      <main className="ea-policies-page">
        <section className="ea-policies-hero">
          <div className="ea-policies-hero-inner">
            <p className="section-eyebrow">Educated Appointments</p>

            <div className="ea-policies-hero-grid">
              <div>
                <h1>Policies & privacy notices</h1>

                <p>
                  Key policies, privacy notices and compliance statements for
                  candidates, employers and clients.
                </p>
              </div>

              <div className="ea-policies-hero-card">
                <span>Compliance hub</span>
                <strong>Clear policies. Proper records. Safer recruitment.</strong>
                <p>
                  Start with the Candidate Privacy Notice. Additional policies
                  will be added here as they are finalised.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="ea-policies-body">
          <div className="ea-policies-inner">
            <div className="ea-policies-grid">
              {policies.map(policy => {
                const isLive = policy.status === 'Live'

                const card = (
                  <article className="ea-policies-card">
                    <div className="ea-policies-card-top">
                      <span className="ea-policies-tag">{policy.tag}</span>

                      <span
                        className={`ea-policies-status ${
                          isLive ? 'live' : ''
                        }`}
                      >
                        {policy.status}
                      </span>
                    </div>

                    <h2>{policy.title}</h2>

                    <p>{policy.description}</p>

                    <span
                      className={`ea-policies-link ${
                        !isLive ? 'disabled' : ''
                      }`}
                    >
                      {isLive ? 'Read policy →' : 'Being prepared'}
                    </span>
                  </article>
                )

                return isLive ? (
                  <Link
                    key={policy.title}
                    href={policy.href}
                    className="ea-policies-card-link"
                  >
                    {card}
                  </Link>
                ) : (
                  <div key={policy.title} className="ea-policies-card-link">
                    {card}
                  </div>
                )
              })}
            </div>

            <div className="ea-policies-contact">
              <div>
                <p className="section-eyebrow">Questions about your data?</p>

                <h2>Speak to us directly</h2>

                <p>
                  If you have any questions about how Educated Appointments
                  stores or uses your personal data, contact us at{' '}
                  <a href="mailto:info@educatedappointments.co.uk">
                    info@educatedappointments.co.uk
                  </a>
                  .
                </p>
              </div>

              <Link href="/contact" className="ea-policies-contact-btn">
                Contact us →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}