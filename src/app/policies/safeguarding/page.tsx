import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import PageEffects from '@/components/PageEffects'

export const metadata: Metadata = {
  title: 'Safeguarding & Safer Recruitment Statement | Educated Appointments',
  description:
    'Educated Appointments Ltd safeguarding and safer recruitment statement for recruitment activity across Further Education, Skills, Training and Apprenticeships.',
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

export default function SafeguardingSaferRecruitmentStatementPage() {
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

                <h1>Safeguarding &amp; Safer Recruitment Statement</h1>

                <p>
                  Our approach to supporting safeguarding, safer recruitment and
                  responsible candidate checks across Further Education, Skills,
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
            <Section number={1} title="Purpose of this statement">
              <p>
                Educated Appointments Ltd works with candidates, employers,
                training providers and education organisations across Further
                Education, Skills, Training and Apprenticeships.
              </p>

              <p>
                This statement explains our approach to safeguarding and safer
                recruitment when supporting recruitment activity. It is intended
                to help candidates, clients and employers understand how we
                promote responsible recruitment practice and how safeguarding
                information is handled.
              </p>
            </Section>

            <Section number={2} title="Our safeguarding commitment">
              <p>
                We are committed to supporting safer recruitment and promoting
                the welfare of children, young people and adults at risk where
                recruitment activity relates to education, training,
                apprenticeships, care, support or other regulated environments.
              </p>

              <p>
                We expect candidates, clients, employers, training providers and
                people acting on behalf of Educated Appointments Ltd to act
                professionally and to take safeguarding responsibilities
                seriously.
              </p>
            </Section>

            <Section number={3} title="Scope">
              <p>This statement applies to:</p>

              <BulletList
                items={[
                  'Recruitment activity carried out by Educated Appointments Ltd.',
                  'Candidate screening, registration, interviewing and submission processes.',
                  'Vacancies involving education, training, apprenticeships, vulnerable learners, children, young people or adults at risk.',
                  'Candidate documents, safer recruitment records, DBS status information, right to work information and references where relevant.',
                  'Communication with clients, employers, training providers and candidates about safer recruitment matters.',
                ]}
              />
            </Section>

            <Section number={4} title="Responsibilities">
              <p>
                Educated Appointments Ltd supports safer recruitment by
                collecting relevant information, asking appropriate questions,
                maintaining clear records and sharing relevant candidate
                information with clients where appropriate.
              </p>

              <p>
                Clients, employers and training providers remain responsible for
                their own statutory safeguarding duties, recruitment decisions,
                pre-employment checks, DBS eligibility decisions, suitability
                assessments, onboarding checks and ongoing safeguarding
                arrangements.
              </p>

              <p>
                Where a role is subject to sector-specific statutory guidance,
                such as safeguarding guidance for schools, colleges or regulated
                training environments, the client or employer should ensure that
                their recruitment process follows the requirements that apply to
                them.
              </p>
            </Section>

            <Section number={5} title="Safer recruitment checks">
              <p>
                Depending on the role, sector and client requirements, safer
                recruitment activity may include:
              </p>

              <BulletList
                items={[
                  'Confirming candidate identity and contact details.',
                  'Reviewing employment history, CV details and relevant experience.',
                  'Discussing gaps in employment or unclear career history where relevant.',
                  'Checking qualifications, certificates and professional experience where provided.',
                  'Recording right to work status where relevant.',
                  'Recording DBS status where relevant to the role.',
                  'Requesting or recording references where required by the recruitment process.',
                  'Recording interview notes, suitability comments and candidate declarations where appropriate.',
                  'Sharing relevant safer recruitment information with the client or employer at the appropriate stage.',
                ]}
              />

              <p>
                The exact checks required will depend on the role, setting,
                level of responsibility, client requirements and applicable
                guidance or law.
              </p>
            </Section>

            <Section number={6} title="DBS checks and eligibility">
              <p>
                Some roles may require a DBS check, including Basic, Standard,
                Enhanced or Enhanced with Barred List checks where legally
                eligible.
              </p>

              <p>
                Educated Appointments Ltd may record DBS status information
                provided by a candidate or client, but the client or employer is
                responsible for confirming the correct level of check required
                for the role and for ensuring any DBS application is lawful and
                appropriate.
              </p>

              <p>
                DBS checks must only be requested at the appropriate level where
                the role is eligible. Where there is uncertainty, clients should
                refer to official DBS eligibility guidance or take appropriate
                advice.
              </p>
            </Section>

            <Section number={7} title="Candidate declarations and disclosures">
              <p>
                Candidates may be asked appropriate questions about their
                suitability for roles involving children, young people, adults
                at risk or regulated environments.
              </p>

              <p>
                Where a candidate makes a disclosure that may be relevant to
                safeguarding, safer recruitment, criminal record checks, conduct
                or suitability, Educated Appointments Ltd will handle the
                information carefully and proportionately.
              </p>

              <p>
                Relevant information may be discussed with the client or
                employer where it is necessary, lawful and appropriate for the
                recruitment process.
              </p>
            </Section>

            <Section number={8} title="References and employment history">
              <p>
                For roles where safer recruitment is relevant, references and
                employment history may form part of the recruitment process.
              </p>

              <p>
                Educated Appointments Ltd may support the collection or recording
                of references where appropriate, but clients and employers remain
                responsible for deciding which references are required, whether
                references are satisfactory and whether any further checks are
                needed before appointment.
              </p>

              <p>
                Where employment gaps, unexplained role changes or conflicting
                information arise, these should be explored proportionately and
                recorded where relevant.
              </p>
            </Section>

            <Section number={9} title="Candidate documents">
              <p>
                Candidate documents may include CVs, formatted CVs,
                qualifications, right to work evidence, DBS information,
                references, interview preparation documents or other supporting
                records.
              </p>

              <p>
                We aim to control access to sensitive documents carefully.
                Supporting documents should only be shared where there is a
                genuine recruitment, compliance, safer recruitment or offer-stage
                need.
              </p>

              <p>
                Where an employer portal is used, clients may be able to see
                which selected documents are held on file. Download access to
                sensitive supporting documents should only be released where
                appropriate.
              </p>
            </Section>

            <Section number={10} title="Concerns raised during recruitment">
              <p>
                If a safeguarding, conduct or suitability concern is raised
                during recruitment, Educated Appointments Ltd will consider the
                information available and take appropriate action.
              </p>

              <p>This may include:</p>

              <BulletList
                items={[
                  'Recording the concern clearly and factually.',
                  'Seeking clarification from the candidate where appropriate.',
                  'Discussing relevant information with the client or employer where lawful and necessary.',
                  'Pausing or ending a candidate submission where there is a serious unresolved concern.',
                  'Refusing to progress a candidate where continuing would be inappropriate or unsafe.',
                  'Escalating concerns to an appropriate client contact or safeguarding lead where relevant.',
                ]}
              />

              <p>
                Educated Appointments Ltd is not a statutory safeguarding
                authority, but we will take concerns seriously and act
                responsibly within our role as a recruitment business.
              </p>
            </Section>

            <Section number={11} title="Working with clients and employers">
              <p>
                We expect clients, employers and training providers to maintain
                their own safeguarding policies, safer recruitment procedures
                and pre-employment checking processes.
              </p>

              <p>Clients should ensure that they:</p>

              <BulletList
                items={[
                  'Understand the safeguarding duties that apply to their organisation and sector.',
                  'Confirm the checks required for each role.',
                  'Assess candidate suitability before appointment.',
                  'Carry out any required DBS, barred list, prohibition, reference, identity, right to work or qualification checks.',
                  'Provide candidates with relevant interview, onboarding and safeguarding information.',
                  'Make final recruitment and appointment decisions based on appropriate evidence.',
                ]}
              />
            </Section>

            <Section number={12} title="Fairness and proportionality">
              <p>
                Safer recruitment must be handled fairly and proportionately.
                Candidate information should be considered in context and should
                relate to the role, setting, risk, legal requirements and client
                needs.
              </p>

              <p>
                We aim to avoid unfair assumptions, discriminatory practice or
                disproportionate use of sensitive information.
              </p>
            </Section>

            <Section number={13} title="Data protection and confidentiality">
              <p>
                Safeguarding and safer recruitment records can include sensitive
                personal data. We handle this information in line with our Data
                Protection &amp; GDPR Policy and Candidate Privacy Notice.
              </p>

              <p>
                Access to sensitive information should be limited to those who
                need it for recruitment, compliance, safer recruitment, legal or
                legitimate business reasons.
              </p>
            </Section>

            <Section number={14} title="Use of AI-assisted tools">
              <p>
                We may use AI-assisted tools to support recruitment
                administration, such as formatting CVs, summarising notes,
                drafting candidate profiles or comparing experience against
                vacancy requirements.
              </p>

              <p>
                AI-assisted tools must not be used to make final safeguarding or
                suitability decisions. Any AI-assisted output should be reviewed
                by a human recruiter before it is used, shared or relied upon.
              </p>
            </Section>

            <Section number={15} title="Training and awareness">
              <p>
                People working for or on behalf of Educated Appointments Ltd are
                expected to understand the importance of safeguarding and safer
                recruitment in the sectors we support.
              </p>

              <p>
                We aim to maintain awareness of safeguarding, safer recruitment,
                data protection, equal opportunities and responsible recruitment
                practice.
              </p>
            </Section>

            <Section number={16} title="Reviewing this statement">
              <p>
                We may review and update this statement from time to time to
                reflect changes in our business, recruitment processes, client
                requirements, law or safeguarding guidance.
              </p>
            </Section>

            <Section number={17} title="How to contact us">
              <p>
                If you have any questions about this statement, or if you want
                to raise a safeguarding or safer recruitment concern relating to
                Educated Appointments Ltd recruitment activity, contact:
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
                If there is an immediate risk of harm, concerns should be raised
                with the appropriate emergency service, statutory safeguarding
                service, local authority safeguarding team, designated
                safeguarding lead or responsible organisation.
              </p>
            </Section>

            <div className="ea-policy-note">
              This statement may be updated from time to time. The latest
              version will be available on this page.
            </div>
          </article>
        </section>
      </main>

      <Footer />
    </>
  )
}