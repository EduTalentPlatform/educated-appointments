'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

const DOCUMENT_TYPES = [
  { value: 'cv', label: 'CV' },
  { value: 'qualification', label: 'Certificate / qualification' },
  { value: 'right_to_work', label: 'Right to work document' },
  { value: 'dbs', label: 'DBS document' },
  { value: 'reference', label: 'Reference' },
  { value: 'interview_prep', label: 'Interview preparation document' },
  { value: 'other', label: 'Other document' },
]

type UploadedDocument = {
  name: string
  doc_type: string
}

export default function CandidateDocumentUploadPortal({
  token,
  candidateName,
  candidateEmail,
  message,
  requestedDocumentTypes,
  gdprAlreadyAccepted,
  gdprAcceptedAt,
  portalCompleted,
}: {
  token: string
  candidateName: string
  candidateEmail: string
  message?: string | null
  requestedDocumentTypes: string[]
  gdprAlreadyAccepted: boolean
  gdprAcceptedAt?: string | null
  portalCompleted?: boolean
}) {
  const safeRequestedTypes = useMemo(() => {
    return requestedDocumentTypes.filter(type =>
      DOCUMENT_TYPES.some(item => item.value === type),
    )
  }, [requestedDocumentTypes])

  const [docType, setDocType] = useState(
    safeRequestedTypes[0] || 'qualification',
  )
  const [fileCount, setFileCount] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadedDocuments, setUploadedDocuments] = useState<
    UploadedDocument[]
  >([])
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [typedName, setTypedName] = useState(candidateName)
  const [typedEmail, setTypedEmail] = useState(candidateEmail)
  const [readAndUnderstood, setReadAndUnderstood] = useState(false)
  const [futureOpportunitiesConsent, setFutureOpportunitiesConsent] =
    useState(false)
  const [vacancyUpdatesConsent, setVacancyUpdatesConsent] = useState(false)

  const [completing, setCompleting] = useState(false)
  const [completeError, setCompleteError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(Boolean(portalCompleted))

  async function submitUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setUploading(true)
    setError(null)
    setSuccessMessage(null)

    const form = e.currentTarget
    const formData = new FormData(form)
    formData.set('token', token)
    formData.set('doc_type', docType)

    const res = await fetch('/api/candidate-portal/upload-documents', {
      method: 'POST',
      body: formData,
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setError(json?.error || 'Could not upload document.')
      setUploading(false)
      return
    }

    const newDocuments = Array.isArray(json?.documents) ? json.documents : []

    setUploadedDocuments(current => [...current, ...newDocuments])
    setSuccessMessage(
      `${json?.uploaded || 1} file${json?.uploaded === 1 ? '' : 's'} uploaded successfully.`,
    )
    setFileCount(0)
    form.reset()
    setUploading(false)
  }

  async function completePortal() {
    setCompleting(true)
    setCompleteError(null)

    const res = await fetch('/api/candidate-portal/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        typed_name: typedName,
        typed_email: typedEmail,
        read_and_understood: gdprAlreadyAccepted ? true : readAndUnderstood,
        future_opportunities_consent: futureOpportunitiesConsent,
        vacancy_updates_consent: vacancyUpdatesConsent,
      }),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setCompleteError(json?.error || 'Could not complete your submission.')
      setCompleting(false)
      return
    }

    setCompleted(true)
    setCompleting(false)
  }

  if (completed) {
    return (
      <main className="ea-policy-page">
        <section className="ea-policy-hero">
          <div className="ea-policy-hero-inner">
            <Link href="/" className="ea-policy-back">
              ← Back to Educated Appointments
            </Link>

            <div className="ea-policy-hero-grid">
              <div>
                <p className="section-eyebrow">Candidate portal</p>
                <h1>Thank you, your submission has been received</h1>
                <p>
                  Your documents and privacy confirmation have been sent securely
                  to Educated Appointments.
                </p>
              </div>

              <aside className="ea-policy-meta">
                <p>Submission complete</p>

                <div>
                  <span>Candidate</span>
                  <strong>{candidateName}</strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>Received</strong>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="ea-policy-page">
      <section className="ea-policy-hero">
        <div className="ea-policy-hero-inner">
          <Link href="/" className="ea-policy-back">
            ← Back to Educated Appointments
          </Link>

          <div className="ea-policy-hero-grid">
            <div>
              <p className="section-eyebrow">Candidate portal</p>

              <h1>Upload your documents</h1>

              <p>
                Hi {candidateName}. Please upload the requested documents and
                complete the privacy confirmation below.
              </p>
            </div>

            <aside className="ea-policy-meta">
              <p>Portal details</p>

              <div>
                <span>Candidate</span>
                <strong>{candidateName}</strong>
              </div>

              <div>
                <span>Access</span>
                <strong>Secure link</strong>
              </div>

              <div>
                <span>Visibility</span>
                <strong>EA CRM only</strong>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="ea-policy-body">
        <article className="ea-policy-document">
          {message && (
            <div className="ea-policy-note" style={{ marginBottom: 22 }}>
              {message}
            </div>
          )}

          {safeRequestedTypes.length > 0 && (
            <section className="ea-policy-section">
              <div className="ea-policy-section-title">
                <span>1</span>
                <h2>Documents requested</h2>
              </div>

              <div className="ea-policy-copy">
                <ul className="ea-policy-list">
                  {safeRequestedTypes.map(type => {
                    const label =
                      DOCUMENT_TYPES.find(item => item.value === type)?.label ||
                      type

                    return <li key={type}>{label}</li>
                  })}
                </ul>
              </div>
            </section>
          )}

          <section className="ea-policy-section">
            <div className="ea-policy-section-title">
              <span>{safeRequestedTypes.length > 0 ? 2 : 1}</span>
              <h2>Upload file</h2>
            </div>

            <div className="ea-policy-copy">
              <form onSubmit={submitUpload} className="cp-form">
                <div className="cp-field">
                  <label className="cp-label">Document type</label>
                  <select
                    className="cp-select"
                    value={docType}
                    onChange={e => setDocType(e.target.value)}
                  >
                    {(safeRequestedTypes.length > 0
                      ? DOCUMENT_TYPES.filter(type =>
                          safeRequestedTypes.includes(type.value),
                        )
                      : DOCUMENT_TYPES
                    ).map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cp-field">
                  <label className="cp-label">Select file(s)</label>
                  <input
                    name="files"
                    type="file"
                    className="cp-input"
                    multiple
                    required
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                    onChange={e => setFileCount(e.target.files?.length ?? 0)}
                  />
                  <p className="cp-cv-note">
                    {fileCount > 0
                      ? `${fileCount} file${fileCount === 1 ? '' : 's'} selected`
                      : 'Accepted files: PDF, Word, JPG, PNG or WEBP.'}
                  </p>
                </div>

                {error && <div className="cp-error">{error}</div>}

                {successMessage && (
                  <div className="cp-success" style={{ padding: 18 }}>
                    <h3 className="cp-success-title">Upload received</h3>
                    <p className="cp-success-body">{successMessage}</p>
                  </div>
                )}

                <button
                  type="submit"
                  className="cp-submit"
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload document →'}
                </button>
              </form>

              {uploadedDocuments.length > 0 && (
                <div className="ea-policy-note" style={{ marginTop: 18 }}>
                  <strong>Uploaded in this session:</strong>
                  <ul className="ea-policy-list" style={{ marginTop: 10 }}>
                    {uploadedDocuments.map((doc, index) => (
                      <li key={`${doc.name}-${index}`}>{doc.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          <section className="ea-policy-section">
            <div className="ea-policy-section-title">
              <span>{safeRequestedTypes.length > 0 ? 3 : 2}</span>
              <h2>Candidate Privacy Notice</h2>
            </div>

            <div className="ea-policy-copy">
              {gdprAlreadyAccepted ? (
                <div className="ea-policy-note">
                  <strong>Privacy notice already accepted.</strong>
                  <br />
                  {gdprAcceptedAt
                    ? `Our records show this was accepted on ${new Date(
                        gdprAcceptedAt,
                      ).toLocaleString('en-GB')}. You do not need to sign it again.`
                    : 'Our records show this has already been accepted. You do not need to sign it again.'}
                </div>
              ) : (
                <>
                  <p>
                    Please review the Candidate Privacy Notice before completing
                    your submission.
                  </p>

                  <p>
                    <Link href="/policies/candidate-privacy-notice" target="_blank">
                      Open Candidate Privacy Notice
                    </Link>
                  </p>

                  <div className="candidate-declaration-fields">
                    <label>
                      Your name
                      <input
                        type="text"
                        value={typedName}
                        onChange={event => setTypedName(event.target.value)}
                        placeholder="Your full name"
                      />
                    </label>

                    <label>
                      Your email
                      <input
                        type="email"
                        value={typedEmail}
                        onChange={event => setTypedEmail(event.target.value)}
                        placeholder="Your email address"
                      />
                    </label>
                  </div>

                  <div className="candidate-declaration-checks">
                    <label className="candidate-declaration-check required">
                      <input
                        type="checkbox"
                        checked={readAndUnderstood}
                        onChange={event =>
                          setReadAndUnderstood(event.target.checked)
                        }
                      />
                      <span>
                        I confirm that I have read and understood the Candidate
                        Privacy Notice.
                      </span>
                    </label>

                    <label className="candidate-declaration-check">
                      <input
                        type="checkbox"
                        checked={futureOpportunitiesConsent}
                        onChange={event =>
                          setFutureOpportunitiesConsent(event.target.checked)
                        }
                      />
                      <span>
                        I am happy for Educated Appointments to keep my details
                        on file and contact me about suitable future
                        opportunities.
                      </span>
                    </label>

                    <label className="candidate-declaration-check">
                      <input
                        type="checkbox"
                        checked={vacancyUpdatesConsent}
                        onChange={event =>
                          setVacancyUpdatesConsent(event.target.checked)
                        }
                      />
                      <span>
                        I am happy to receive relevant vacancy updates from
                        Educated Appointments.
                      </span>
                    </label>
                  </div>
                </>
              )}
            </div>
          </section>

          {completeError && (
            <div className="cp-error" style={{ marginBottom: 18 }}>
              {completeError}
            </div>
          )}

          <button
            type="button"
            className="cp-submit"
            onClick={completePortal}
            disabled={completing}
          >
            {completing ? 'Completing...' : 'Complete submission →'}
          </button>

          <div className="ea-policy-note" style={{ marginTop: 18 }}>
            Uploaded documents go directly into the Educated Appointments CRM.
            They are not automatically released to employers.
          </div>
        </article>
      </section>
    </main>
  )
}