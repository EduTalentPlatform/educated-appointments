import { createClient } from '@supabase/supabase-js'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import PageEffects from '@/components/PageEffects'
import CandidateDocumentUploadPortal from '@/components/candidate/CandidateDocumentUploadPortal'

export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

interface Props {
  params: Promise<{ token: string }>
}

function ExpiredLinkPage({ message }: { message: string }) {
  return (
    <>
      <PageEffects />
      <Nav />

      <main className="ea-policy-page">
        <section className="ea-policy-hero">
          <div className="ea-policy-hero-inner">
            <div className="ea-policy-hero-grid">
              <div>
                <p className="section-eyebrow">Candidate portal</p>
                <h1>Portal link unavailable</h1>
                <p>{message}</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}

export default async function CandidateUploadPage({ params }: Props) {
  const { token } = await params
  const supabase = getServiceClient()

  const { data: uploadLink } = await supabase
    .from('candidate_upload_links')
    .select(
      `
      id,
      candidate_id,
      requested_document_types,
      message,
      expires_at,
      revoked_at,
      first_accessed_at,
      completed_at,
      candidates (
        id,
        first_name,
        last_name,
        email,
        gdpr_status,
        gdpr_accepted_at,
        gdpr_policy_version,
        gdpr_policy_url
      )
    `,
    )
    .eq('token', token)
    .maybeSingle()

  if (!uploadLink) {
    return <ExpiredLinkPage message="This portal link could not be found." />
  }

  if (uploadLink.revoked_at) {
    return <ExpiredLinkPage message="This portal link has been revoked." />
  }

  if (new Date(uploadLink.expires_at).getTime() < Date.now()) {
    return <ExpiredLinkPage message="This portal link has expired." />
  }

  if (!uploadLink.first_accessed_at) {
    await supabase
      .from('candidate_upload_links')
      .update({ first_accessed_at: new Date().toISOString() })
      .eq('id', uploadLink.id)
  }

  const candidate = Array.isArray(uploadLink.candidates)
    ? uploadLink.candidates[0]
    : uploadLink.candidates

  const candidateName = `${candidate?.first_name || 'Candidate'} ${
    candidate?.last_name || ''
  }`.trim()

  const gdprAlreadyAccepted = Boolean(
    candidate?.gdpr_accepted_at || candidate?.gdpr_status === 'accepted',
  )

  return (
    <>
      <PageEffects />
      <Nav />

      <CandidateDocumentUploadPortal
        token={token}
        candidateName={candidateName}
        candidateEmail={candidate?.email || ''}
        message={uploadLink.message}
        requestedDocumentTypes={uploadLink.requested_document_types || []}
        gdprAlreadyAccepted={gdprAlreadyAccepted}
        gdprAcceptedAt={candidate?.gdpr_accepted_at || null}
        portalCompleted={Boolean(uploadLink.completed_at)}
      />

      <Footer />
    </>
  )
}