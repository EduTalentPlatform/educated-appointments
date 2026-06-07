'use client'

import { useState } from 'react'
import Link from 'next/link'

const DOCUMENT_TYPES = [
  { value: 'cv', label: 'CV' },
  { value: 'qualification', label: 'Certificate / qualification' },
  { value: 'right_to_work', label: 'Right to work document' },
  { value: 'dbs', label: 'DBS document' },
  { value: 'reference', label: 'Reference' },
  { value: 'interview_prep', label: 'Interview preparation document' },
  { value: 'gdpr_acceptance', label: 'GDPR / declaration document' },
  { value: 'other', label: 'Other document' },
]

export default function CandidateDocumentUploadPortal({
  token,
  candidateName,
  message,
  requestedDocumentTypes,
}: {
  token: string
  candidateName: string
  message?: string | null
  requestedDocumentTypes: string[]
}) {
  const [docType, setDocType] = useState(
    requestedDocumentTypes[0] || 'qualification',
  )
  const [fileCount, setFileCount] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

    setSuccessMessage(
      `${json?.uploaded || 1} file${json?.uploaded === 1 ? '' : 's'} uploaded successfully.`,
    )
    setFileCount(0)
    form.reset()
    setUploading(false)
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
              <p className="section-eyebrow">Candidate document upload</p>

              <h1>Upload your documents</h1>

              <p>
                Hi {candidateName}. Upload your CV, certificates, right to work,
                DBS, references or any other requested documents securely.
              </p>
            </div>

            <aside className="ea-policy-meta">
              <p>Upload details</p>

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

          {requestedDocumentTypes.length > 0 && (
            <section className="ea-policy-section">
              <div className="ea-policy-section-title">
                <span>1</span>
                <h2>Documents requested</h2>
              </div>

              <div className="ea-policy-copy">
                <ul className="ea-policy-list">
                  {requestedDocumentTypes.map(type => {
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
              <span>{requestedDocumentTypes.length > 0 ? 2 : 1}</span>
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
                    {DOCUMENT_TYPES.map(type => (
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
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={e => setFileCount(e.target.files?.length ?? 0)}
                  />
                  <p className="cp-cv-note">
                    {fileCount > 0
                      ? `${fileCount} file${fileCount === 1 ? '' : 's'} selected`
                      : 'Accepted files: PDF, Word, JPG or PNG.'}
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
            </div>
          </section>

          <div className="ea-policy-note">
            Uploaded documents go directly into the Educated Appointments CRM.
            They are not automatically released to employers.
          </div>
        </article>
      </section>
    </main>
  )
}