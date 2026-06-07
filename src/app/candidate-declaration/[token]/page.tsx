import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import PageEffects from '@/components/PageEffects'
import CandidateDeclarationForm from '@/components/candidate-declaration/CandidateDeclarationForm'

export const metadata: Metadata = {
  title: 'Candidate Declaration | Educated Appointments',
  description:
    'Candidate privacy notice acknowledgement and data declaration for Educated Appointments.',
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function candidateName(candidate: any) {
  return `${candidate?.first_name ?? ''} ${candidate?.last_name ?? ''}`.trim()
}

function InvalidDeclarationPage({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <>
      <PageEffects />
      <Nav />

      <main className="candidate-declaration-page">
        <section className="candidate-declaration-hero">
          <div className="candidate-declaration-hero-inner">
            <p className="section-eyebrow">Educated Appointments</p>
            <h1>{title}</h1>
            <p>{message}</p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}

type Props = {
  params: Promise<{ token: string }>
}

export default async function CandidateDeclarationPage({ params }: Props) {
  const { token } = await params
  const supabase = getServiceClient()
  const tokenHash = hashToken(token)

    const { data: linkRecord } = await supabase
    .from('candidate_gdpr_declaration_links')
    .select('id, candidate_id, status, used_at, expires_at, policy_version, policy_url')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (!linkRecord) {
    return (
      <InvalidDeclarationPage
        title="Declaration link not found"
        message="This declaration link is invalid. Please contact Educated Appointments if you need a new link."
      />
    )
  }

  if (linkRecord.used_at || linkRecord.status === 'accepted') {
    return (
      <InvalidDeclarationPage
        title="Declaration already completed"
        message="This declaration has already been submitted. Thank you."
      />
    )
  }

  if (new Date(linkRecord.expires_at).getTime() < Date.now()) {
    return (
      <InvalidDeclarationPage
        title="Declaration link expired"
        message="This declaration link has expired. Please contact Educated Appointments if you need a new link."
      />
    )
  }

  const { data: candidate } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, email')
    .eq('id', linkRecord.candidate_id)
    .single()

  if (!candidate) {
    return (
      <InvalidDeclarationPage
        title="Candidate not found"
        message="We could not find the candidate record for this declaration. Please contact Educated Appointments."
      />
    )
  }

  return (
    <>
      <PageEffects />
      <Nav />

      <main className="candidate-declaration-page">
        <section className="candidate-declaration-hero">
          <div className="candidate-declaration-hero-inner">
            <p className="section-eyebrow">Educated Appointments</p>

            <h1>Candidate Data Declaration</h1>

            <p>
              Please review the Candidate Privacy Notice and confirm that you
              understand how Educated Appointments Ltd will process your data
              for recruitment purposes.
            </p>
          </div>
        </section>

        <section className="candidate-declaration-body">
          <CandidateDeclarationForm
            token={token}
            candidateName={candidateName(candidate)}
            candidateEmail={candidate.email || ''}
            policyVersion={linkRecord.policy_version}
            policyUrl={linkRecord.policy_url}
          />
        </section>
      </main>

      <Footer />
    </>
  )
}