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
                <p className="section-eyebrow">Candidate document upload</p>
                <h1>Upload link unavailable</h1>
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
      candidates (
        id,
        first_name,
        last_name
      )
    `,
    )
    .eq('token', token)
    .maybeSingle()

  if (!uploadLink) {
    return <ExpiredLinkPage message="This upload link could not be found." />
  }

  if (uploadLink.revoked_at) {
    return <ExpiredLinkPage message="This upload link has been revoked." />
  }

  if (new Date(uploadLink.expires_at).getTime() < Date.now()) {
    return <ExpiredLinkPage message="This upload link has expired." />
  }

  const candidate = Array.isArray(uploadLink.candidates)
    ? uploadLink.candidates[0]
    : uploadLink.candidates

  const candidateName = `${candidate?.first_name || 'Candidate'} ${
    candidate?.last_name || ''
  }`.trim()

  return (
    <>
      <PageEffects />
      <Nav />

      <CandidateDocumentUploadPortal
        token={token}
        candidateName={candidateName}
        message={uploadLink.message}
        requestedDocumentTypes={uploadLink.requested_document_types || []}
      />

      <Footer />
    </>
  )
}