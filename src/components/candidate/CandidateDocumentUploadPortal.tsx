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

const REFERENCE_TYPES = [
  { value: '', label: 'Select reference type...' },
  { value: 'employment', label: 'Employment reference' },
  { value: 'character', label: 'Character reference' },
  { value: 'academic', label: 'Academic reference' },
  { value: 'other', label: 'Other' },
]

type UploadedDocument = {
  id?: string
  name: string
  doc_type: string
}

type ReferenceEntry = {
  referee_name: string
  referee_job_title: string
  organisation: string
  relationship: string
  email: string
  phone: string
  reference_type: string
  notes: string
}

function emptyReference(): ReferenceEntry {
  return {
    referee_name: '',
    referee_job_title: '',
    organisation: '',
    relationship: '',
    email: '',
    phone: '',
    reference_type: '',
    notes: '',
  }
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

  const [certificateName, setCertificateName] = useState('')
  const [rightToWorkDocumentType, setRightToWorkDocumentType] = useState('')
  const [dbsOnUpdateService, setDbsOnUpdateService] = useState(false)
  const [dbsDateOfBirth, setDbsDateOfBirth] = useState('')
  const [dbsCertificateNumber, setDbsCertificateNumber] = useState('')
  const [dbsSurnameOnCertificate, setDbsSurnameOnCertificate] = useState('')
  const [references, setReferences] = useState<ReferenceEntry[]>([
    emptyReference(),
    emptyReference(),
  ])

  const [typedName, setTypedName] = useState(candidateName)
  const [typedEmail, setTypedEmail] = useState(candidateEmail)
  const [readAndUnderstood, setReadAndUnderstood] = useState(false)
  const [futureOpportunitiesConsent, setFutureOpportunitiesConsent] =
    useState(false)
  const [vacancyUpdatesConsent, setVacancyUpdatesConsent] = useState(false)

  const [completing, setCompleting] = useState(false)
  const [completeError, setCompleteError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(Boolean(portalCompleted))

  const isReference = docType === 'reference'

  function updateReference(
    index: number,
    field: keyof ReferenceEntry,
    value: string,
  ) {
    setReferences(current =>
      current.map((reference, referenceIndex) =>
        referenceIndex === index
          ? {
              ...reference,
              [field]: value,
            }
          : reference,
      ),
    )
  }

  function buildMetadata() {
    if (docType === 'qualification') {
      return {
        certificate_name: certificateName.trim(),
      }
    }

    if (docType === 'right_to_work') {
      return {
        right_to_work_document_type: rightToWorkDocumentType.trim(),
      }
    }

    if (docType === 'dbs') {
      return {
        dbs_on_update_service: dbsOnUpdateService,
        dbs_date_of_birth: dbsDateOfBirth,
        dbs_certificate_number: dbsCertificateNumber.trim(),
        dbs_surname_on_certificate: dbsSurnameOnCertificate.trim(),
      }
    }

    if (docType === 'reference') {
      return {
        references,
      }
    }

    return {}
  }

  function validateBeforeUpload() {
    if (docType === 'qualification' && !certificateName.trim()) {
      return 'Please enter what certificate / qualification you are uploading.'
    }

    if (docType === 'right_to_work' && !rightToWorkDocumentType.trim()) {
      return 'Please enter what type of right to work document you are uploading.'
    }

    if (docType === 'dbs' && dbsOnUpdateService) {
      if (!dbsDateOfBirth) {
        return 'Please enter your date of birth for the DBS Update Service check.'
      }

      if (!dbsCertificateNumber.trim()) {
        return 'Please enter your DBS certificate number.'
      }

      if (!dbsSurnameOnCertificate.trim()) {
        return 'Please enter the surname shown on your DBS certificate.'
      }
    }

    if (docType === 'reference') {
      for (let index = 0; index < 2; index += 1) {
        const reference = references[index]
        const label = `Reference ${index + 1}`

        if (!reference.referee_name.trim()) {
          return `${label}: please enter the referee name.`
        }

        if (!reference.relationship.trim()) {
          return `${label}: please enter your relationship to the referee.`
        }

        if (
          !reference.email.trim() &&
          !reference.phone.trim() &&
          !reference.organisation.trim()
        ) {
          return `${label}: please enter at least an email, phone number or organisation.`
        }
      }
    }

    return null
  }

  async function submitUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setUploading(true)
    setError(null)
    setSuccessMessage(null)

    const validationError = validateBeforeUpload()

    if (validationError) {
      setError(validationError)
      setUploading(false)
      return
    }

    const form = e.currentTarget
    const formData = new FormData(form)
    formData.set('token', token)
    formData.set('doc_type', docType)
    formData.set('metadata', JSON.stringify(buildMetadata()))

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
      isReference
        ? 'Your two references have been saved securely.'
        : `${json?.uploaded || 1} file${json?.uploaded === 1 ? '' : 's'} uploaded successfully.`,
    )
    setFileCount(0)
    form.reset()
    setUploading(false)

    if (isReference) {
      setReferences([emptyReference(), emptyReference()])
    }
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

  <div
    style={{
      marginTop: 18,
      padding: 18,
      borderRadius: 18,
      background: '#f8fafc',
      border: '1px solid #e5e7eb',
    }}
  >
    <p
      style={{
        margin: 0,
        marginBottom: 10,
        fontSize: 15,
        fontWeight: 900,
        color: '#17172f',
      }}
    >
      Why we ask for these documents
    </p>

    <ul
      style={{
        margin: 0,
        paddingLeft: 20,
        fontSize: 14,
        lineHeight: 1.8,
        color: '#5f6170',
      }}
    >
      <li>
        <strong>Certificates / qualifications:</strong> these help us confirm
        your occupational competency for relevant roles.
      </li>
      <li>
        <strong>Right to work:</strong> we are legally required to confirm your
        right to work in the UK.
      </li>
      <li>
        <strong>DBS:</strong> only upload this if you already have one.
      </li>
      <li>
        <strong>References:</strong> these are normally needed once you are
        placed. Nobody will be contacted until you have accepted an offer from
        your new employer.
      </li>
    </ul>
  </div>
</div>
            </section>
          )}

          <section className="ea-policy-section">
            <div className="ea-policy-section-title">
              <span>{safeRequestedTypes.length > 0 ? 2 : 1}</span>
              <h2>{isReference ? 'Provide reference details' : 'Upload file'}</h2>
            </div>

            <div className="ea-policy-copy">
              <form onSubmit={submitUpload} className="cp-form">
                <div className="cp-field">
                  <label className="cp-label">Document type</label>
                  <select
                    className="cp-select"
                    value={docType}
                    onChange={e => {
                      setDocType(e.target.value)
                      setError(null)
                      setSuccessMessage(null)
                      setFileCount(0)
                    }}
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

                {docType === 'qualification' && (
                  <div className="cp-field">
                    <label className="cp-label">
                      What certificate / qualification is this?
                    </label>
                    <input
                      type="text"
                      className="cp-input"
                      value={certificateName}
                      onChange={event => setCertificateName(event.target.value)}
                      placeholder="e.g. TAQA, A1, CAVA, V1, IQA, AET, PGCE"
                    />
                    <p className="cp-cv-note">
                      Examples: TAQA, A1, CAVA, D32/D33, V1, IQA, Level 4
                      Quality Assurance, AET, PTLLS, Cert Ed, PGCE,
                      subject-specific certificates.
                    </p>
                  </div>
                )}

                {docType === 'right_to_work' && (
                  <div className="cp-field">
                    <label className="cp-label">
                      What type of right to work document are you uploading?
                    </label>
                    <input
                      type="text"
                      className="cp-input"
                      value={rightToWorkDocumentType}
                      onChange={event =>
                        setRightToWorkDocumentType(event.target.value)
                      }
                      placeholder="e.g. UK passport, share code, settled status"
                    />
                    <p className="cp-cv-note">
                      Examples: UK passport, Irish passport, birth certificate
                      with proof of National Insurance, share code / eVisa,
                      settled status, pre-settled status, biometric residence
                      permit, certificate of naturalisation.
                    </p>
                  </div>
                )}

                {docType === 'dbs' && (
                  <>
                    <div className="cp-field">
                      <label className="candidate-declaration-check">
                        <input
                          type="checkbox"
                          checked={dbsOnUpdateService}
                          onChange={event =>
                            setDbsOnUpdateService(event.target.checked)
                          }
                        />
                        <span>I am on the DBS Update Service</span>
                      </label>
                    </div>

                    {dbsOnUpdateService && (
                      <div
                        className="candidate-declaration-fields"
                        style={{ marginBottom: 12 }}
                      >
                        <label>
                          Date of birth
                          <input
                            type="date"
                            value={dbsDateOfBirth}
                            onChange={event =>
                              setDbsDateOfBirth(event.target.value)
                            }
                          />
                        </label>

                        <label>
                          DBS certificate number
                          <input
                            type="text"
                            value={dbsCertificateNumber}
                            onChange={event =>
                              setDbsCertificateNumber(event.target.value)
                            }
                            placeholder="Certificate number"
                          />
                        </label>

                        <label>
                          Surname on certificate
                          <input
                            type="text"
                            value={dbsSurnameOnCertificate}
                            onChange={event =>
                              setDbsSurnameOnCertificate(event.target.value)
                            }
                            placeholder="Surname as shown on DBS"
                          />
                        </label>
                      </div>
                    )}
                  </>
                )}

                {isReference ? (
                  <div style={{ display: 'grid', gap: 18 }}>
                    {[0, 1].map(index => {
                      const reference = references[index]

                      return (
                        <div
                          key={index}
                          className="ea-policy-note"
                          style={{ display: 'grid', gap: 12 }}
                        >
                          <h3 style={{ margin: 0 }}>
                            Reference {index + 1}
                          </h3>

                          <div className="candidate-declaration-fields">
                            <label>
                              Referee name
                              <input
                                type="text"
                                value={reference.referee_name}
                                onChange={event =>
                                  updateReference(
                                    index,
                                    'referee_name',
                                    event.target.value,
                                  )
                                }
                              />
                            </label>

                            <label>
                              Job title
                              <input
                                type="text"
                                value={reference.referee_job_title}
                                onChange={event =>
                                  updateReference(
                                    index,
                                    'referee_job_title',
                                    event.target.value,
                                  )
                                }
                              />
                            </label>

                            <label>
                              Organisation
                              <input
                                type="text"
                                value={reference.organisation}
                                onChange={event =>
                                  updateReference(
                                    index,
                                    'organisation',
                                    event.target.value,
                                  )
                                }
                              />
                            </label>

                            <label>
                              Relationship to you
                              <input
                                type="text"
                                value={reference.relationship}
                                onChange={event =>
                                  updateReference(
                                    index,
                                    'relationship',
                                    event.target.value,
                                  )
                                }
                                placeholder="e.g. Line manager"
                              />
                            </label>

                            <label>
                              Email
                              <input
                                type="email"
                                value={reference.email}
                                onChange={event =>
                                  updateReference(
                                    index,
                                    'email',
                                    event.target.value,
                                  )
                                }
                              />
                            </label>

                            <label>
                              Phone
                              <input
                                type="tel"
                                value={reference.phone}
                                onChange={event =>
                                  updateReference(
                                    index,
                                    'phone',
                                    event.target.value,
                                  )
                                }
                              />
                            </label>

                            <label>
                              Reference type
                              <select
                                value={reference.reference_type}
                                onChange={event =>
                                  updateReference(
                                    index,
                                    'reference_type',
                                    event.target.value,
                                  )
                                }
                              >
                                {REFERENCE_TYPES.map(type => (
                                  <option key={type.value} value={type.value}>
                                    {type.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>

                          <label>
                            Notes
                            <textarea
                              rows={3}
                              value={reference.notes}
                              onChange={event =>
                                updateReference(
                                  index,
                                  'notes',
                                  event.target.value,
                                )
                              }
                              placeholder="Anything we should know about this reference?"
                            />
                          </label>
                        </div>
                      )
                    })}
                  </div>
                ) : (
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
                )}

                {error && <div className="cp-error">{error}</div>}

                {successMessage && (
                  <div className="cp-success" style={{ padding: 18 }}>
                    <h3 className="cp-success-title">Received</h3>
                    <p className="cp-success-body">{successMessage}</p>
                  </div>
                )}

                <button
                  type="submit"
                  className="cp-submit"
                  disabled={uploading}
                >
                  {uploading
                    ? 'Saving...'
                    : isReference
                      ? 'Save reference details →'
                      : 'Upload document →'}
                </button>
              </form>

              {uploadedDocuments.length > 0 && (
                <div className="ea-policy-note" style={{ marginTop: 18 }}>
                  <strong>Submitted in this session:</strong>
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
                    <Link
                      href="/policies/candidate-privacy-notice"
                      target="_blank"
                    >
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