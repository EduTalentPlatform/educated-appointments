import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import PageEffects from '@/components/PageEffects'

export const metadata: Metadata = {
  title: 'Complaints Procedure | Educated Appointments',
  description:
    'Educated Appointments Ltd complaints procedure for candidates, clients, employers and other contacts.',
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

export default function ComplaintsProcedurePage() {
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

                <h1>Complaints Procedure</h1>

                <p>
                  How candidates, clients, employers, suppliers and other
                  contacts can raise a concern or complaint about our recruitment
                  services.
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
            <Section number={1} title="Purpose of this procedure">
              <p>
                Educated Appointments Ltd aims to provide a professional,
                reliable and fair recruitment service. We recognise that there
                may be occasions where a candidate, client, employer, supplier
                or other contact is unhappy with the service received.
              </p>

              <p>
                This procedure explains how complaints can be raised, how we
                will review them, and how we aim to resolve concerns fairly and
                promptly.
              </p>
            </Section>

            <Section number={2} title="Who can make a complaint">
              <p>A complaint may be made by:</p>

              <BulletList
                items={[
                  'A candidate or prospective candidate.',
                  'A client, employer or training provider.',
                  'A supplier or business contact.',
                  'A person acting on behalf of someone directly affected, where appropriate authority has been provided.',
                  'Any individual who has interacted with Educated Appointments Ltd and has a genuine concern about our service or conduct.',
                ]}
              />
            </Section>

            <Section number={3} title="What complaints may relate to">
              <p>Complaints may relate to matters such as:</p>

              <BulletList
                items={[
                  'The standard of service provided by Educated Appointments Ltd.',
                  'Communication, response times or professionalism.',
                  'Candidate handling, vacancy handling or recruitment process concerns.',
                  'Accuracy of information shared during a recruitment process.',
                  'Data protection, privacy or document handling concerns.',
                  'Equal opportunities, fairness or discrimination concerns.',
                  'Safeguarding or safer recruitment concerns linked to our recruitment activity.',
                  'Fees, invoices, terms of business or commercial concerns.',
                  'Any other issue where someone believes we have not met expected standards.',
                ]}
              />
            </Section>

            <Section number={4} title="Informal resolution">
              <p>
                Where possible, we encourage concerns to be raised informally at
                first. Many issues can be resolved quickly by speaking with the
                person you have been dealing with or by contacting Educated
                Appointments Ltd directly.
              </p>

              <p>
                If the matter cannot be resolved informally, or if the concern is
                serious, you can make a formal complaint using the process below.
              </p>
            </Section>

            <Section number={5} title="How to make a formal complaint">
              <p>
                Formal complaints should be sent by email to:
              </p>

              <p>
                <strong>info@educatedappointments.co.uk</strong>
              </p>

              <p>Please include as much relevant information as possible, such as:</p>

              <BulletList
                items={[
                  'Your name and contact details.',
                  'Whether you are a candidate, client, employer, supplier or other contact.',
                  'The person at Educated Appointments Ltd you have been dealing with, if known.',
                  'A clear summary of your complaint.',
                  'Key dates, emails, messages, vacancy names, candidate names or other relevant details.',
                  'What outcome or resolution you are seeking.',
                  'Any supporting documents or evidence you would like us to consider.',
                ]}
              />
            </Section>

            <Section number={6} title="Acknowledging your complaint">
              <p>
                We will aim to acknowledge formal complaints within five working
                days of receipt.
              </p>

              <p>
                If we need more information to understand or investigate the
                complaint, we may contact you for clarification.
              </p>
            </Section>

            <Section number={7} title="How we investigate complaints">
              <p>
                We will review the information provided and consider the relevant
                records available to us. This may include:
              </p>

              <BulletList
                items={[
                  'Reviewing emails, notes, CRM records, documents or communication history.',
                  'Speaking with the person or people involved.',
                  'Checking relevant vacancy, candidate, client or placement records.',
                  'Considering any applicable policy, process, agreement or legal requirement.',
                  'Reviewing whether our service, communication or conduct met expected standards.',
                ]}
              />

              <p>
                Complaints will be handled as fairly and objectively as possible.
              </p>
            </Section>

            <Section number={8} title="Response times">
              <p>
                We will aim to provide a written response within 20 working days
                of acknowledging the complaint.
              </p>

              <p>
                If the complaint is complex, involves multiple parties or
                requires additional information, it may take longer. Where this
                happens, we will aim to keep you updated and provide a revised
                timescale.
              </p>
            </Section>

            <Section number={9} title="Possible outcomes">
              <p>Depending on the complaint, outcomes may include:</p>

              <BulletList
                items={[
                  'An explanation of what happened.',
                  'An apology where appropriate.',
                  'Correction of inaccurate information.',
                  'A change to how a matter is being handled.',
                  'A review of internal process or communication.',
                  'Additional guidance to a candidate, client or employer.',
                  'Confirmation that no further action is required.',
                  'Escalation to a director or senior decision-maker where appropriate.',
                ]}
              />
            </Section>

            <Section number={10} title="If you are unhappy with the response">
              <p>
                If you are unhappy with our response, you may ask for the matter
                to be reviewed again. You should explain why you remain
                dissatisfied and provide any additional information you would
                like us to consider.
              </p>

              <p>
                A further review will normally be carried out by someone who was
                not directly involved in the original issue, where possible.
              </p>
            </Section>

            <Section number={11} title="Data protection complaints">
              <p>
                If your complaint relates to how we have handled personal data,
                we will review it in line with our Data Protection &amp; GDPR
                Policy and Candidate Privacy Notice where relevant.
              </p>

              <p>
                You also have the right to complain to the Information
                Commissioner&apos;s Office if you are unhappy with how your
                personal data has been handled.
              </p>
            </Section>

            <Section number={12} title="Safeguarding or serious concerns">
              <p>
                If a complaint involves safeguarding, safer recruitment, serious
                misconduct, risk of harm, discrimination or another serious
                issue, we will treat it with appropriate priority.
              </p>

              <p>
                Where there is an immediate risk of harm, concerns should be
                raised with the appropriate emergency service, statutory
                safeguarding service, local authority safeguarding team,
                designated safeguarding lead or responsible organisation.
              </p>
            </Section>

            <Section number={13} title="Confidentiality">
              <p>
                Complaints will be handled confidentially as far as reasonably
                possible. Information may need to be shared with people involved
                in the complaint, relevant decision-makers, professional advisers
                or authorities where necessary.
              </p>

              <p>
                We will aim to limit information sharing to what is appropriate
                for reviewing and responding to the complaint.
              </p>
            </Section>

            <Section number={14} title="Unreasonable or repeated complaints">
              <p>
                We will take genuine complaints seriously. However, where a
                complaint is abusive, vexatious, repeatedly raised without new
                information, or pursued in a way that is unreasonable, we may
                limit further correspondence after giving a clear response.
              </p>
            </Section>

            <Section number={15} title="Learning from complaints">
              <p>
                Complaints can help us improve. Where appropriate, we may use
                complaint outcomes to review our communication, records,
                recruitment processes, policies or service standards.
              </p>
            </Section>

            <Section number={16} title="How to contact us">
              <p>
                To raise a complaint or ask a question about this procedure,
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
              This procedure may be updated from time to time. The latest
              version will be available on this page.
            </div>
          </article>
        </section>
      </main>

      <Footer />
    </>
  )
}