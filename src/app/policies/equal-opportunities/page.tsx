import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import PageEffects from '@/components/PageEffects'

export const metadata: Metadata = {
  title: 'Equal Opportunities Policy | Educated Appointments',
  description:
    'Educated Appointments Ltd equal opportunities policy for fair, inclusive and non-discriminatory recruitment practice.',
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

export default function EqualOpportunitiesPolicyPage() {
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

                <h1>Equal Opportunities Policy</h1>

                <p>
                  Our commitment to fair, inclusive and non-discriminatory
                  recruitment practice across Further Education, Skills,
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
            <Section number={1} title="Purpose of this policy">
              <p>
                Educated Appointments Ltd is committed to promoting equality,
                fairness and respect in recruitment. This policy explains our
                approach to equal opportunities and how we aim to support fair
                recruitment practice for candidates, clients, employers and
                training providers.
              </p>

              <p>
                We aim to ensure that individuals are treated fairly and that
                recruitment activity is based on relevant skills, experience,
                qualifications, suitability, conduct, role requirements and
                evidence.
              </p>
            </Section>

            <Section number={2} title="Scope">
              <p>This policy applies to our work with:</p>

              <BulletList
                items={[
                  'Candidates seeking work or career opportunities.',
                  'Clients, employers and training providers using our recruitment services.',
                  'Vacancies, candidate searches, candidate submissions, interviews and placement activity.',
                  'Recruitment advertising, screening, shortlisting, matching and communication.',
                  'Employees, workers, contractors, suppliers and representatives acting on behalf of Educated Appointments Ltd.',
                ]}
              />
            </Section>

            <Section number={3} title="Our commitment">
              <p>We are committed to:</p>

              <BulletList
                items={[
                  'Treating candidates, clients and contacts with dignity and respect.',
                  'Supporting fair access to recruitment opportunities.',
                  'Avoiding unlawful discrimination, harassment or victimisation.',
                  'Considering candidates against role requirements and relevant evidence.',
                  'Using recruitment processes that are fair, consistent and proportionate.',
                  'Encouraging inclusive communication and professional conduct.',
                  'Supporting reasonable adjustments where appropriate.',
                  'Challenging discriminatory behaviour, language or decision-making where identified.',
                ]}
              />
            </Section>

            <Section number={4} title="Protected characteristics">
              <p>
                We will not unlawfully discriminate against individuals because
                of protected characteristics under the Equality Act 2010. These
                include:
              </p>

              <BulletList
                items={[
                  'Age.',
                  'Disability.',
                  'Gender reassignment.',
                  'Marriage and civil partnership.',
                  'Pregnancy and maternity.',
                  'Race.',
                  'Religion or belief.',
                  'Sex.',
                  'Sexual orientation.',
                ]}
              />

              <p>
                We also aim to treat people fairly regardless of background,
                working pattern, caring responsibilities, socio-economic
                background, education route, career break, employment history or
                other circumstances that may be relevant to fair recruitment
                practice.
              </p>
            </Section>

            <Section number={5} title="Recruitment advertising">
              <p>
                We aim to ensure vacancy adverts and candidate attraction
                activity are clear, fair and based on genuine role requirements.
              </p>

              <p>When preparing or sharing vacancy information, we aim to:</p>

              <BulletList
                items={[
                  'Use inclusive and professional language.',
                  'Avoid unnecessary requirements that could unfairly exclude suitable candidates.',
                  'Represent salary, location, working pattern and role expectations clearly where available.',
                  'Avoid wording that suggests unlawful preference or exclusion.',
                  'Focus on skills, experience, qualifications and suitability relevant to the role.',
                  'Encourage clients to consider reasonable adjustments and inclusive recruitment practice.',
                ]}
              />
            </Section>

            <Section number={6} title="Candidate screening and matching">
              <p>
                Candidate screening and matching should be based on relevant
                evidence, including skills, experience, qualifications, role
                preferences, location, salary expectations, notice period,
                right to work, safer recruitment requirements and the needs of
                the vacancy.
              </p>

              <p>
                We do not knowingly shortlist, reject or recommend candidates
                based on protected characteristics or irrelevant assumptions.
              </p>

              <p>
                Where AI-assisted tools are used to support matching,
                summarising or profile drafting, the output should be reviewed
                by a human recruiter before it is used, shared or relied upon.
              </p>
            </Section>

            <Section number={7} title="Interviews and selection">
              <p>
                We encourage clients and employers to use fair and consistent
                selection processes. Interview questions and selection criteria
                should be relevant to the vacancy and applied fairly.
              </p>

              <p>We aim to support this by:</p>

              <BulletList
                items={[
                  'Providing accurate candidate information relevant to the role.',
                  'Encouraging structured interview preparation where appropriate.',
                  'Highlighting candidate strengths and relevant experience clearly.',
                  'Supporting candidates with interview information and preparation.',
                  'Encouraging feedback based on role-related criteria.',
                  'Discouraging discriminatory comments, assumptions or decision-making.',
                ]}
              />
            </Section>

            <Section number={8} title="Reasonable adjustments">
              <p>
                Where a candidate tells us they may need a reasonable adjustment
                for a recruitment process, we will take reasonable steps to
                support this and, where appropriate, communicate relevant
                adjustment requests to the client or employer.
              </p>

              <p>
                Adjustment information will be handled carefully and only shared
                where relevant and appropriate for the recruitment process.
              </p>
            </Section>

            <Section number={9} title="Working with clients and employers">
              <p>
                We expect clients, employers and training providers working with
                us to support fair recruitment practice.
              </p>

              <p>
                Where we become aware of discriminatory requirements,
                inappropriate comments or unfair recruitment practices, we may
                challenge this, offer guidance, refuse to act on discriminatory
                instructions, or end our involvement with the vacancy or client
                where appropriate.
              </p>
            </Section>

            <Section number={10} title="Positive action">
              <p>
                In some circumstances, employers may be able to take lawful
                positive action to address disadvantage or underrepresentation.
                Positive action must be handled carefully and must not become
                unlawful discrimination.
              </p>

              <p>
                Where a client wishes to discuss positive action or targeted
                recruitment activity, they should ensure that they have taken
                appropriate advice and that any approach is lawful, proportionate
                and evidence-based.
              </p>
            </Section>

            <Section number={11} title="Harassment, bullying and victimisation">
              <p>
                We do not tolerate harassment, bullying, intimidation or
                victimisation in recruitment activity.
              </p>

              <p>
                This includes inappropriate behaviour or communication towards
                candidates, clients, employers, suppliers, colleagues or
                representatives of Educated Appointments Ltd.
              </p>
            </Section>

            <Section number={12} title="Data and equality monitoring">
              <p>
                Where equality or diversity information is collected, it should
                be used carefully, lawfully and only for appropriate monitoring,
                reporting or improvement purposes.
              </p>

              <p>
                Equality monitoring information should not be used to unfairly
                influence individual recruitment decisions.
              </p>
            </Section>

            <Section number={13} title="Training and awareness">
              <p>
                We aim to maintain awareness of fair recruitment, equal
                opportunities, data protection, safer recruitment and
                professional recruitment practice.
              </p>

              <p>
                People working on behalf of Educated Appointments Ltd are
                expected to act professionally, apply this policy in recruitment
                activity and raise concerns where unfair or discriminatory
                practice is identified.
              </p>
            </Section>

            <Section number={14} title="Concerns and complaints">
              <p>
                Candidates, clients or other individuals who have concerns about
                equality, fairness or discrimination in relation to our
                recruitment activity can contact us.
              </p>

              <p>
                We will review concerns reasonably and take appropriate action
                where required. This may include correcting information,
                reviewing communication, speaking with a client or employer, or
                changing how a recruitment process is handled.
              </p>
            </Section>

            <Section number={15} title="Reviewing this policy">
              <p>
                We may review and update this policy from time to time to
                reflect changes in our business, recruitment practice, legal
                requirements or guidance.
              </p>
            </Section>

            <Section number={16} title="How to contact us">
              <p>
                If you have any questions about this policy, or if you want to
                raise a concern about equal opportunities or fair recruitment,
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