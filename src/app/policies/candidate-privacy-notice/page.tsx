import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import PageEffects from '@/components/PageEffects'

export const metadata: Metadata = {
  title: 'Candidate Privacy Notice | Educated Appointments',
  description:
    'How Educated Appointments Ltd collects, stores and uses candidate personal data for recruitment purposes.',
}

const POLICY_VERSION = '1.0'
const EFFECTIVE_DATE = '1 June 2026'

function Section({
  number,
  title,
  children,
}: {
  number: number
  title: string
  children: ReactNode
}) {
  return (
    <section className="ea-policy-section">
      <div className="ea-policy-section-title">
        <span>{number}</span>
        <h2>{title}</h2>
      </div>

      <div className="ea-policy-copy">{children}</div>
    </section>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="ea-policy-list">
      {items.map(item => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

export default function CandidatePrivacyNoticePage() {
  return (
    <>
      <PageEffects />
      <Nav />

      <main className="ea-policy-page">
        <section className="ea-policy-hero">
          <div className="ea-policy-hero-inner">
            <Link href="/policies" className="ea-policy-back">
              ← Back to policies
            </Link>

            <div className="ea-policy-hero-grid">
              <div>
                <p className="section-eyebrow">Educated Appointments Ltd</p>

                <h1>Candidate Privacy Notice</h1>

                <p>
                  How we collect, store and use candidate personal data for
                  recruitment purposes across Further Education, Skills,
                  Training and Apprenticeships.
                </p>
              </div>

              <aside className="ea-policy-meta">
                <p>Policy details</p>

                <div>
                  <span>Version</span>
                  <strong>{POLICY_VERSION}</strong>
                </div>

                <div>
                  <span>Effective from</span>
                  <strong>{EFFECTIVE_DATE}</strong>
                </div>

                <div>
                  <span>Contact</span>
                  <strong>info@educatedappointments.co.uk</strong>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="ea-policy-body">
          <article className="ea-policy-document">
            <Section number={1} title="Who we are">
              <p>
                Educated Appointments Ltd is a recruitment business specialising
                in the Further Education, Skills, Training and Apprenticeship
                sectors.
              </p>

              <p>
                We collect and use candidate personal data so that we can assess
                suitability for vacancies, contact candidates about suitable
                opportunities, introduce candidates to relevant employers or
                training providers, and manage recruitment activity.
              </p>
            </Section>

            <Section number={2} title="What information we collect">
              <p>We may collect and store information including:</p>

              <BulletList
                items={[
                  'Name, email address, phone number and location.',
                  'CV, employment history, qualifications, professional experience and role preferences.',
                  'Salary expectations, current salary where provided, notice period and availability.',
                  'Interview notes, recruitment activity notes and application history.',
                  'Right to work status, DBS status and safer recruitment information where relevant.',
                  'References, certificates and supporting documents where provided.',
                  'Communications with you, including email, SMS, WhatsApp, LinkedIn messages and call notes.',
                  'Interview feedback, offers, placement information and related recruitment records.',
                ]}
              />

              <p>
                We only collect information that is relevant to recruitment,
                candidate management, employer introductions, compliance, safer
                recruitment, or our legitimate business administration.
              </p>
            </Section>

            <Section number={3} title="Where we collect information from">
              <p>
                We may collect information directly from you, from your CV, from
                job boards, from professional networking platforms such as
                LinkedIn, from referrals, from previous recruitment
                conversations, from publicly available professional sources, or
                from employers and training providers involved in a recruitment
                process.
              </p>
            </Section>

            <Section number={4} title="Why we use your information">
              <p>We use candidate information to:</p>

              <BulletList
                items={[
                  'Contact you about suitable roles and recruitment opportunities.',
                  'Assess your suitability for vacancies.',
                  'Create candidate summaries, profiles and introductions for relevant employers or training providers.',
                  'Arrange interviews and manage applications.',
                  'Support safer recruitment and compliance checks where required.',
                  'Keep records of recruitment activity, communication and decisions.',
                  'Manage offers, placements and aftercare where applicable.',
                  'Contact you about future suitable opportunities where appropriate.',
                ]}
              />
            </Section>

            <Section number={5} title="Lawful basis for processing">
              <p>
                We process candidate personal data where we have a lawful basis
                under UK data protection law. Depending on the circumstances,
                this may include:
              </p>

              <BulletList
                items={[
                  'Legitimate interests, where we use your information for recruitment activity that you would reasonably expect.',
                  'Consent, where we ask for specific permission, such as keeping you on file for future opportunities or sending optional vacancy updates.',
                  'Legal obligation, where we need to keep or check information to meet legal or regulatory requirements.',
                  'Contract or pre-contract steps, where processing is needed in relation to a potential placement or employment opportunity.',
                ]}
              />

              <p>
                You can object to processing or ask us to delete your data,
                subject to any legal, contractual, compliance, dispute or audit
                reasons that require us to retain limited information.
              </p>
            </Section>

            <Section number={6} title="Use of AI-assisted tools">
              <p>
                We may use secure AI-assisted tools to support recruitment
                administration and candidate management. This may include:
              </p>

              <BulletList
                items={[
                  'Formatting CVs and candidate profiles.',
                  'Summarising interview notes or recruitment conversations.',
                  'Comparing candidate experience against vacancy requirements.',
                  'Drafting candidate summaries, outreach messages or vacancy-related content.',
                  'Supporting vacancy matching, search activity and recruitment workflow administration.',
                ]}
              />

              <p>
                AI-assisted tools are used to support our recruiters, not to
                make final recruitment decisions. A human recruiter reviews
                AI-assisted outputs before they are used, shared or relied upon.
              </p>

              <p>
                We do not knowingly use AI tools to make solely automated
                decisions that have a legal or similarly significant effect on
                candidates without appropriate safeguards.
              </p>
            </Section>

            <Section number={7} title="Sharing your information">
              <p>
                We may share relevant candidate information with employers,
                training providers or clients where this is necessary for a
                suitable recruitment opportunity.
              </p>

              <p>
                We will not share your full supporting documentation, such as
                right to work evidence, DBS evidence, certificates or
                references, unless it is relevant, appropriate and normally only
                where there is a genuine recruitment need, safer recruitment
                requirement or offer process.
              </p>

              <p>
                We may also use trusted technology suppliers who help us store
                data, manage our CRM, process documents, send communications,
                support recruitment administration or provide secure AI-assisted
                services.
              </p>
            </Section>

            <Section number={8} title="How long we keep your information">
              <p>
                We will only keep your personal data for as long as reasonably
                necessary for recruitment, compliance, audit and legitimate
                business purposes.
              </p>

              <p>
                Where you ask us to delete your information, we will do so
                unless we need to retain limited information for legal,
                compliance, dispute, safeguarding, safer recruitment or audit
                reasons.
              </p>
            </Section>

            <Section number={9} title="Your rights">
              <p>
                You have rights under data protection law. These may include the
                right to:
              </p>

              <BulletList
                items={[
                  'Access your personal data.',
                  'Correct inaccurate or incomplete information.',
                  'Ask for deletion of your data.',
                  'Object to certain processing.',
                  'Restrict how your data is used.',
                  'Withdraw consent where processing is based on consent.',
                  'Complain to the Information Commissioner’s Office.',
                ]}
              />
            </Section>

            <Section number={10} title="Candidate declaration">
              <p>
                Candidates may be asked to complete a separate declaration
                confirming that they have read and understood this Candidate
                Privacy Notice.
              </p>

              <p>
                Optional consent may also be requested for keeping candidate
                details on file for future suitable opportunities or sending
                suitable vacancy updates.
              </p>
            </Section>

            <Section number={11} title="How to contact us">
              <p>
                If you have any questions about how your data is used, or if you
                want to exercise your rights, contact:
              </p>

              <p>
                <strong>Educated Appointments Ltd</strong>
                <br />
                Email:{' '}
                <a href="mailto:info@educatedappointments.co.uk">
                  info@educatedappointments.co.uk
                </a>
              </p>
            </Section>

            <div className="ea-policy-note">
              This notice may be updated from time to time. The latest version
              will be available on this page.
            </div>
          </article>
        </section>
      </main>

      <Footer />
    </>
  )
}