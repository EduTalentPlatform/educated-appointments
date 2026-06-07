import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import PageEffects from '@/components/PageEffects'

export const metadata: Metadata = {
  title: 'Data Protection & GDPR Policy | Educated Appointments',
  description:
    'How Educated Appointments Ltd manages personal data, data protection, lawful processing, retention and individual rights.',
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

export default function DataProtectionPolicyPage() {
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

                <h1>Data Protection &amp; GDPR Policy</h1>

                <p>
                  How we protect personal data, manage lawful processing, keep
                  records secure and support data protection rights across our
                  recruitment activity.
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
            <Section number={1} title="Purpose of this policy">
              <p>
                This policy explains how Educated Appointments Ltd manages
                personal data in line with UK data protection law, including the
                UK GDPR and Data Protection Act 2018.
              </p>

              <p>
                It applies to personal data we handle as part of our recruitment
                business, including candidate records, client and employer
                contacts, supplier information, website enquiries, recruitment
                activity records and related business administration.
              </p>
            </Section>

            <Section number={2} title="Who we are">
              <p>
                Educated Appointments Ltd is a recruitment business specialising
                in the Further Education, Skills, Training and Apprenticeship
                sectors.
              </p>

              <p>
                For the personal data we decide to collect and use for our own
                recruitment and business purposes, Educated Appointments Ltd
                acts as the data controller.
              </p>

              <p>
                Where we process personal data strictly on behalf of another
                organisation, we will follow the relevant contractual and data
                protection requirements for that arrangement.
              </p>
            </Section>

            <Section number={3} title="Personal data we may process">
              <p>We may collect and use personal data including:</p>

              <BulletList
                items={[
                  'Candidate contact details, CVs, employment history, qualifications, experience and role preferences.',
                  'Recruitment notes, interview notes, application history, suitability assessments and employer feedback.',
                  'Right to work status, DBS status, references, certificates and safer recruitment information where relevant.',
                  'Client, employer and supplier contact details, job titles, business emails, phone numbers and communication history.',
                  'Vacancy details, recruitment briefs, candidate submissions, placement information and commercial records.',
                  'Website enquiry information, email correspondence, call notes, SMS, WhatsApp or LinkedIn communication where relevant.',
                  'Technical information linked to our website, CRM, document storage, email and business systems.',
                ]}
              />
            </Section>

            <Section number={4} title="How we collect personal data">
              <p>We may collect personal data from:</p>

              <BulletList
                items={[
                  'Candidates directly, including CVs, phone calls, emails, forms and conversations.',
                  'Job boards, professional networking platforms and publicly available professional sources.',
                  'Clients, employers, training providers and recruitment contacts.',
                  'Referrals and previous recruitment conversations.',
                  'Website forms, email enquiries and business communication channels.',
                  'Our CRM, recruitment records, document systems and operational tools.',
                ]}
              />
            </Section>

            <Section number={5} title="Why we use personal data">
              <p>We use personal data for purposes including:</p>

              <BulletList
                items={[
                  'Recruiting candidates for suitable vacancies.',
                  'Matching candidates to roles and assessing suitability.',
                  'Creating candidate profiles, formatted CVs and employer introductions.',
                  'Managing applications, interviews, offers, placements and aftercare.',
                  'Maintaining client, employer and supplier relationships.',
                  'Supporting safer recruitment, right to work, compliance and audit requirements.',
                  'Managing our CRM, business records, communications and administration.',
                  'Responding to enquiries, requests, complaints or data protection rights.',
                  'Improving our recruitment systems, website, processes and candidate/client experience.',
                ]}
              />
            </Section>

            <Section number={6} title="Lawful bases for processing">
              <p>
                We only process personal data where we have a lawful basis to do
                so. Depending on the circumstances, this may include:
              </p>

              <BulletList
                items={[
                  'Legitimate interests, where processing is necessary for recruitment activity, candidate management, client service, business administration or maintaining professional recruitment records.',
                  'Consent, where we ask for clear permission for a specific activity, such as optional vacancy updates or keeping candidate details on file where consent is appropriate.',
                  'Contract or pre-contract steps, where processing is needed in relation to a possible role, placement, client arrangement or supplier relationship.',
                  'Legal obligation, where we need to process or retain information to meet legal, tax, employment, right to work, safer recruitment or regulatory requirements.',
                  'Vital interests, in rare cases where processing may be necessary to protect someone’s life or safety.',
                ]}
              />

              <p>
                Where we process special category data or criminal offence data,
                such as certain DBS or safeguarding-related information, we will
                only do so where there is an appropriate lawful basis and an
                additional condition under data protection law.
              </p>
            </Section>

            <Section number={7} title="Candidate, client and employer records">
              <p>
                Recruitment records may contain information about candidates,
                clients, employers, vacancies, applications, interviews,
                feedback, offers and placements.
              </p>

              <p>
                Candidate information is used to support appropriate recruitment
                activity. Client and employer contact information is used to
                manage recruitment relationships, vacancies, candidate
                submissions, safer recruitment processes and related business
                administration.
              </p>

              <p>
                We aim to ensure personal data is relevant, proportionate and
                accurate for the recruitment purpose it is used for.
              </p>
            </Section>

            <Section number={8} title="Use of AI-assisted tools">
              <p>
                We may use secure AI-assisted tools to support recruitment
                administration and workflow activity. This may include formatting
                CVs, drafting candidate profiles, summarising notes, comparing
                experience to vacancy requirements, helping with search activity
                and supporting recruitment communications.
              </p>

              <p>
                AI-assisted tools are used to support our recruiters and improve
                administration. They do not replace human judgement. Recruitment
                decisions, candidate suitability and employer recommendations
                remain subject to human review.
              </p>

              <p>
                We do not knowingly use AI-assisted tools to make solely
                automated decisions with legal or similarly significant effects
                on individuals without appropriate safeguards.
              </p>
            </Section>

            <Section number={9} title="Sharing personal data">
              <p>
                We may share personal data where it is necessary and appropriate
                for recruitment, compliance, business administration or legal
                purposes. This may include sharing relevant information with:
              </p>

              <BulletList
                items={[
                  'Clients, employers and training providers considering candidates for suitable vacancies.',
                  'Technology suppliers that support our CRM, email, website, document storage, analytics, communication or AI-assisted administration.',
                  'Professional advisers, insurers, accountants or legal advisers where required.',
                  'Regulators, public authorities or law enforcement bodies where legally required.',
                ]}
              />

              <p>
                We will not sell personal data. We will only share information
                where there is a legitimate reason, legal basis, contractual
                need or appropriate consent.
              </p>
            </Section>

            <Section number={10} title="International transfers">
              <p>
                Some of the systems and suppliers we use may process or store
                data outside the United Kingdom.
              </p>

              <p>
                Where this happens, we will take reasonable steps to ensure that
                appropriate safeguards are in place, such as using suppliers
                with recognised transfer mechanisms, contractual protections or
                appropriate data protection commitments.
              </p>
            </Section>

            <Section number={11} title="Data security">
              <p>
                We take appropriate steps to protect personal data from
                unauthorised access, loss, misuse, alteration or disclosure.
                These steps may include:
              </p>

              <BulletList
                items={[
                  'Using secure CRM and document storage systems.',
                  'Restricting access to personal data to those who need it for their role.',
                  'Using account security, passwords and access controls.',
                  'Reviewing data access and keeping recruitment records organised.',
                  'Taking care when sharing candidate documents and employer-facing profiles.',
                  'Releasing sensitive supporting documents only where appropriate and necessary.',
                ]}
              />
            </Section>

            <Section number={12} title="Data retention">
              <p>
                We will only keep personal data for as long as reasonably
                necessary for recruitment, compliance, legal, audit, dispute,
                safeguarding, safer recruitment and legitimate business
                purposes.
              </p>

              <p>
                Retention periods may vary depending on the type of record, the
                recruitment activity involved, legal requirements, client
                requirements and whether there has been a placement,
                application, complaint or dispute.
              </p>

              <p>
                Where data is no longer needed, we will delete it, anonymise it
                or restrict it where appropriate.
              </p>
            </Section>

            <Section number={13} title="Data accuracy">
              <p>
                We aim to keep personal data accurate and up to date. Candidates,
                clients and contacts should tell us if information we hold about
                them changes.
              </p>

              <p>
                Where inaccurate information is identified, we will take
                reasonable steps to correct it.
              </p>
            </Section>

            <Section number={14} title="Individual rights">
              <p>
                Individuals have rights under data protection law. Depending on
                the circumstances, these may include the right to:
              </p>

              <BulletList
                items={[
                  'Request access to personal data we hold about them.',
                  'Ask us to correct inaccurate or incomplete data.',
                  'Ask us to delete personal data.',
                  'Object to certain processing.',
                  'Ask us to restrict certain processing.',
                  'Withdraw consent where processing is based on consent.',
                  'Ask for data portability in certain circumstances.',
                  'Complain to the Information Commissioner’s Office.',
                ]}
              />

              <p>
                Some rights are subject to conditions and exemptions. We may need
                to verify identity before responding to a request.
              </p>
            </Section>

            <Section number={15} title="Subject access requests">
              <p>
                Individuals can request a copy of personal data we hold about
                them by contacting us using the details below.
              </p>

              <p>
                We will respond to valid subject access requests in line with
                data protection law. If a request is complex, unclear or involves
                information about other people, we may need to ask for
                clarification or apply relevant exemptions.
              </p>
            </Section>

            <Section number={16} title="Data breaches">
              <p>
                If we become aware of a personal data breach, we will assess the
                nature, scope and risk of the breach and take appropriate action.
              </p>

              <p>
                Where required, we will notify the Information Commissioner’s
                Office and affected individuals in line with applicable data
                protection law.
              </p>
            </Section>

            <Section number={17} title="Responsibilities">
              <p>
                Everyone working for or on behalf of Educated Appointments Ltd
                who handles personal data must take care to protect it and only
                use it for appropriate business purposes.
              </p>

              <p>
                Access to personal data should be limited to what is necessary
                for recruitment, client management, administration, compliance or
                related business activity.
              </p>
            </Section>

            <Section number={18} title="How to contact us">
              <p>
                If you have any questions about this policy, how we use personal
                data, or if you want to exercise your data protection rights,
                contact:
              </p>

              <p>
                <strong>Educated Appointments Ltd</strong>
                <br />
                Email:{' '}
                <a href="mailto:info@educatedappointments.co.uk">
                  info@educatedappointments.co.uk
                </a>
              </p>

              <p>
                You also have the right to complain to the Information
                Commissioner’s Office if you are unhappy with how your personal
                data has been handled.
              </p>
            </Section>

            <div className="ea-policy-note">
              This policy may be updated from time to time. The latest version
              will be available on this page.
            </div>
          </article>
        </section>
      </main>

      <Footer />
    </>
  )
}