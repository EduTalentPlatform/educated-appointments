import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import PageEffects from '@/components/PageEffects'

export const metadata: Metadata = {
  title: 'AI Use in Recruitment Statement | Educated Appointments',
  description:
    'How Educated Appointments Ltd uses AI-assisted tools responsibly to support recruitment activity, candidate matching, CV formatting and recruitment administration.',
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

export default function AiUseInRecruitmentStatementPage() {
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

                <h1>AI Use in Recruitment Statement</h1>

                <p>
                  How we use AI-assisted tools to support recruitment activity,
                  candidate management, CV formatting, candidate matching and
                  administration.
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
                Educated Appointments Ltd uses technology to support recruitment
                activity across the Further Education, Skills, Training and
                Apprenticeship sectors.
              </p>

              <p>
                This statement explains how we may use AI-assisted tools, what
                they are used for, what they are not used for, and the safeguards
                we apply when using them.
              </p>

              <p>
                AI-assisted tools are used to support our recruiters and improve
                administration. They do not replace human judgement.
              </p>
            </Section>

            <Section number={2} title="What we mean by AI-assisted tools">
              <p>
                In this statement, AI-assisted tools means software that can
                help with tasks such as summarising information, drafting text,
                comparing information, extracting key details, formatting
                documents or supporting candidate and vacancy matching.
              </p>

              <p>
                These tools may use technologies sometimes described as
                artificial intelligence, machine learning, natural language
                processing or automation.
              </p>
            </Section>

            <Section number={3} title="How we may use AI in recruitment">
              <p>We may use AI-assisted tools to help with:</p>

              <BulletList
                items={[
                  'Formatting CVs into an Educated Appointments candidate profile format.',
                  'Creating candidate summaries and employer-facing profile notes.',
                  'Summarising interview notes, call notes, meeting notes or recruitment conversations.',
                  'Comparing candidate experience against vacancy requirements.',
                  'Helping recruiters identify potentially suitable candidates for vacancies.',
                  'Drafting outreach messages, interview preparation notes or vacancy-related content.',
                  'Supporting vacancy adverts, anonymous candidate packs and recruitment administration.',
                  'Organising candidate documents, notes, compliance records and workflow information.',
                ]}
              />

              <p>
                AI-assisted output is treated as a draft or support tool. A
                recruiter should review the output before it is used, shared or
                relied upon.
              </p>
            </Section>

            <Section number={4} title="What we do not use AI for">
              <p>We do not knowingly use AI-assisted tools to:</p>

              <BulletList
                items={[
                  'Make final recruitment decisions without human involvement.',
                  'Automatically reject candidates without recruiter review.',
                  'Automatically shortlist candidates without recruiter review.',
                  'Make solely automated decisions that have a legal or similarly significant effect on candidates.',
                  'Replace interviews, professional judgement, safer recruitment checks or client decision-making.',
                  'Create facts about candidates, employers or vacancies that have not been provided or checked.',
                ]}
              />

              <p>
                Recruitment decisions, candidate suitability assessments,
                employer recommendations and candidate submissions remain
                subject to human review.
              </p>
            </Section>

            <Section number={5} title="Human review and recruiter oversight">
              <p>
                AI-assisted tools may help us work more efficiently, but
                recruiters remain responsible for checking outputs and applying
                professional judgement.
              </p>

              <p>
                Where AI-assisted tools are used to support candidate matching,
                vacancy comparison or profile drafting, a recruiter should
                consider the wider context, including candidate experience,
                qualifications, preferences, availability, location, salary
                expectations and suitability for the specific role.
              </p>

              <p>
                Employers and clients also make their own recruitment decisions
                after reviewing candidate information and completing their own
                recruitment process.
              </p>
            </Section>

            <Section number={6} title="Data used with AI-assisted tools">
              <p>
                Depending on the recruitment task, information used with
                AI-assisted tools may include:
              </p>

              <BulletList
                items={[
                  'Candidate CVs, employment history, qualifications and role preferences.',
                  'Vacancy details, job descriptions, briefing notes and employer requirements.',
                  'Interview notes, call notes, recruitment summaries and application records.',
                  'Candidate profile text, anonymised summaries and formatted CV content.',
                  'Recruitment activity notes and workflow information held in our CRM.',
                ]}
              />

              <p>
                We aim to use only the information needed for the relevant
                recruitment task.
              </p>
            </Section>

            <Section number={7} title="Special category and sensitive information">
              <p>
                We take care when handling sensitive information, including
                right to work status, DBS information, safeguarding information,
                health information, disability-related adjustments or other
                sensitive details that may arise during recruitment.
              </p>

              <p>
                We do not use AI-assisted tools to make final decisions about
                candidates based on sensitive information. Where sensitive
                information is relevant to recruitment, compliance, safer
                recruitment or reasonable adjustment discussions, it should be
                reviewed carefully by a human recruiter and handled in line with
                our data protection responsibilities.
              </p>
            </Section>

            <Section number={8} title="Accuracy and checking">
              <p>
                AI-assisted tools can make mistakes, miss context or produce
                wording that needs correction. Recruiters should check outputs
                before using them.
              </p>

              <p>
                Where an AI-assisted summary, profile or comparison is used, it
                should be based on information available to Educated
                Appointments and should not invent facts, qualifications,
                experience, salary details, availability or employer
                requirements.
              </p>

              <p>
                Candidates, clients and employers can contact us if they believe
                information we hold or share is inaccurate.
              </p>
            </Section>

            <Section number={9} title="Fairness and bias">
              <p>
                We recognise that AI-assisted tools can reflect bias, incomplete
                information or incorrect assumptions if they are used without
                care.
              </p>

              <p>
                Recruiters should use AI-assisted outputs as support, not as a
                substitute for fair recruitment practice. Candidate suitability
                should be considered against the vacancy requirements and
                relevant evidence, not assumptions or protected characteristics.
              </p>

              <p>
                Where an output appears inaccurate, unfair, irrelevant or
                inappropriate, it should not be used.
              </p>
            </Section>

            <Section number={10} title="Transparency with candidates and clients">
              <p>
                We aim to be open about our use of AI-assisted tools. Our
                Candidate Privacy Notice explains that we may use secure
                AI-assisted tools to support recruitment administration,
                including CV formatting, note summarisation, suitability
                comparison and recruitment workflow activity.
              </p>

              <p>
                This statement provides additional information about how those
                tools may be used in practice.
              </p>
            </Section>

            <Section number={11} title="Candidate rights and requests">
              <p>
                Candidates have rights under data protection law, including the
                right to access personal data, request correction of inaccurate
                information, object to certain processing and ask for deletion
                in certain circumstances.
              </p>

              <p>
                If a candidate has questions about how AI-assisted tools have
                been used in relation to their information, they can contact us
                using the details below.
              </p>
            </Section>

            <Section number={12} title="Suppliers and systems">
              <p>
                We may use trusted technology suppliers to support recruitment
                administration, document handling, CRM activity, communication,
                profile drafting and AI-assisted workflow tasks.
              </p>

              <p>
                We aim to use suppliers and systems that provide appropriate
                security and data protection protections for the type of
                information being processed.
              </p>
            </Section>

            <Section number={13} title="Reviewing this statement">
              <p>
                Our use of AI-assisted tools may change over time as our systems
                improve and as recruitment technology develops.
              </p>

              <p>
                We will review this statement when we make material changes to
                how AI-assisted tools are used in recruitment activity.
              </p>
            </Section>

            <Section number={14} title="How to contact us">
              <p>
                If you have any questions about this statement, how we use
                AI-assisted tools, or how we process personal data, contact:
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