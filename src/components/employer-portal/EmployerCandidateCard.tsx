'use client'

import { useMemo, useState } from 'react'

type CandidateDocument = {
  id: string
  name: string
  doc_type: string | null
  file_url: string | null
  storage_bucket?: string | null
  storage_path?: string | null
  released: boolean | null
  visible_to_employer: boolean | null
  show_in_employer_portal: boolean | null
}

type Candidate = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  job_title: string | null
  seeking_role_type: string | null
  preferred_location?: string | null
  town_city?: string | null
  county?: string | null
  postcode?: string | null
  salary_expected?: string | null
  notice_period?: string | null
}

type Application = {
  id: string
  status: string
  created_at: string
  cv_url: string | null
  employer_profile_notes: string | null
  client_interview_date?: string | null
  client_interview_time?: string | null
  client_interview_format?: string | null
  client_interview_location?: string | null
  client_interview_notes?: string | null
}

const AUTO_COLLECTED_DOC_TYPES = [
  'qualification',
  'certificate',
  'certificates',
  'right_to_work',
  'dbs',
  'reference',
]

function isAutoCollectedDocument(doc: CandidateDocument) {
  return AUTO_COLLECTED_DOC_TYPES.includes(String(doc.doc_type || ''))
}

function statusLabel(value?: string | null) {
  if (!value) return 'Shared'
  return value.replace(/_/g, ' ')
}

function formatDocType(value?: string | null) {
  if (!value) return 'Document'

  const labels: Record<string, string> = {
    cv: 'Original CV',
    formatted_cv: 'Formatted CV',
    qualification: 'Qualification',
    right_to_work: 'Right to work',
    dbs: 'DBS',
    reference: 'Reference',
    interview_prep: 'Interview preparation',
    gdpr_acceptance: 'GDPR acceptance',
    other: 'Other document',
  }

  return labels[value] || value.replace(/_/g, ' ')
}

function getInitials(candidate: Candidate | null) {
  const first = candidate?.first_name?.trim()?.[0] || ''
  const last = candidate?.last_name?.trim()?.[0] || ''

  return `${first}${last}`.toUpperCase() || 'EA'
}

function getCandidateName(candidate: Candidate | null) {
  if (!candidate) return 'Candidate'

  return (
    `${candidate.first_name ?? ''} ${candidate.last_name ?? ''}`.trim() ||
    'Candidate'
  )
}

function getCandidateLocation(candidate: Candidate | null) {
  const parts = [
    candidate?.preferred_location,
    candidate?.town_city,
    candidate?.county,
    candidate?.postcode,
  ]
    .map(part => String(part || '').trim())
    .filter(Boolean)

  return parts.length > 0 ? Array.from(new Set(parts)).join(', ') : 'Not specified'
}

function formatInterviewDate(value?: string | null) {
  if (!value) return ''

  return new Date(value).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function labelInterviewFormat(value?: string | null) {
  if (!value) return 'Not specified'

  const labels: Record<string, string> = {
    face_to_face: 'Face to face',
    video: 'Video call',
    telephone: 'Telephone',
    flexible: 'Flexible',
  }

  return labels[value] || value.replace(/_/g, ' ')
}

function getFileKind(url?: string | null) {
  if (!url) return 'unknown'

  const clean = url.split('?')[0].toLowerCase()

  if (/\.(jpg|jpeg|png|webp|gif)$/i.test(clean)) return 'image'
  if (/\.pdf$/i.test(clean)) return 'pdf'
  if (/\.(doc|docx)$/i.test(clean)) return 'word'

  return 'unknown'
}

const PRE_RELEASE_EMPLOYER_DOC_TYPES = new Set([
  'formatted_cv',
  'candidate_profile',
  'profile',
  'interview_prep',
])

const SENSITIVE_EMPLOYER_DOC_TYPES = new Set([
  'cv',
  'qualification',
  'qualifications',
  'certificate',
  'certificates',
  'right_to_work',
  'dbs',
  'reference',
  'gdpr_acceptance',
  'identity',
  'passport',
  'other',
])

function normaliseDocType(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function documentHasStoredFile(document?: {
  file_url?: string | null
  storage_bucket?: string | null
  storage_path?: string | null
}) {
  if (!document) return false

  return Boolean(
    document.file_url ||
      (document.storage_bucket && document.storage_path),
  )
}

function employerCanSeeDocument(doc: {
  doc_type?: string | null
  show_in_employer_portal?: boolean | null
  visible_to_employer?: boolean | null
  released?: boolean | null
}) {
  const docType = normaliseDocType(doc.doc_type)

  const isReleased =
    doc.visible_to_employer === true &&
    doc.released === true

  if (PRE_RELEASE_EMPLOYER_DOC_TYPES.has(docType)) {
    return doc.show_in_employer_portal === true || isReleased
  }

  if (SENSITIVE_EMPLOYER_DOC_TYPES.has(docType)) {
    return isReleased
  }

  return isReleased
}

function MiniFact({
  label,
  value,
}: {
  label: string
  value?: string | null
}) {
  return (
    <div
      style={{
        background: 'var(--light-bg)',
        border: '1px solid var(--border-light)',
        borderRadius: 14,
        padding: '11px 12px',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 10,
          fontWeight: 900,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: 0.7,
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin: 0,
          marginTop: 4,
          fontSize: 13,
          lineHeight: 1.35,
          fontWeight: 900,
          color: 'var(--text-dark)',
        }}
      >
        {value?.trim() || 'Not specified'}
      </p>
    </div>
  )
}

export default function EmployerCandidateCard({
  vacancyId,
  application,
  candidate,
  documents,
  canDownloadDocuments,
}: {
  vacancyId: string
  application: Application
  candidate: Candidate | null
  documents: CandidateDocument[]
  canDownloadDocuments: boolean
}) {
  const [showInterviewForm, setShowInterviewForm] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)

  const [availability, setAvailability] = useState('')
  const [interviewFormat, setInterviewFormat] = useState('')
  const [interviewLocation, setInterviewLocation] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

    const [localStatus, setLocalStatus] = useState(application.status)
  const [resultMessage, setResultMessage] = useState<string | null>(null)
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null)

  const candidateName = getCandidateName(candidate)

  const interviewArranged =
    localStatus === 'client_interview' ||
    Boolean(application.client_interview_date)

  const isRejected = localStatus === 'rejected'

    const formattedCv = useMemo(() => {
    return documents.find(
      doc =>
        doc.doc_type === 'formatted_cv' &&
        documentHasStoredFile(doc) &&
        employerCanSeeDocument(doc),
    )
  }, [documents])

  const documentsOnFile = useMemo(() => {
    return documents.filter(
      doc =>
        doc.doc_type !== 'formatted_cv' &&
        documentHasStoredFile(doc) &&
        employerCanSeeDocument(doc),
    )
  }, [documents])

    async function openEmployerDocument(doc: CandidateDocument) {
    setOpeningDocumentId(doc.id)

    try {
      const res = await fetch('/api/employer-portal/document-signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: doc.id,
          document_kind: 'candidate',
          vacancy_id: vacancyId,
          application_id: application.id,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.url) {
        alert(data?.error || 'Could not open this document securely.')
        return
      }

      window.open(data.url, '_blank', 'noopener,noreferrer')
    } finally {
      setOpeningDocumentId(null)
    }
  }
  
  async function requestInterview() {
    setSending(true)
    setResultMessage(null)

    const res = await fetch('/api/employer-portal/interview-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
      vacancy_id: vacancyId,
      application_id: application.id,
      availability_notes: availability,
      interview_format: interviewFormat,
      interview_location: interviewLocation,
      employer_message: message,
}),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      setResultMessage(data?.error || 'Could not send interview request.')
      setSending(false)
      return
    }

    setAvailability('')
    setInterviewFormat('')
    setInterviewLocation('')
    setMessage('')
    setShowInterviewForm(false)
    setResultMessage('Interview request sent to Educated Appointments.')
    setSending(false)
  }

  async function rejectCandidate() {
    if (!rejectReason.trim()) {
      setResultMessage('Please provide a reason before rejecting this candidate.')
      return
    }

    const confirmed = confirm(
      `Reject ${candidateName}? This will notify Educated Appointments that you do not wish to progress this candidate.`,
    )

    if (!confirmed) return

    setRejecting(true)
    setResultMessage(null)

    const res = await fetch('/api/employer-portal/application-outcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
      vacancy_id: vacancyId,
      application_id: application.id,
      outcome: 'rejected',
      reason: rejectReason,
}),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      setResultMessage(data?.error || 'Could not reject candidate.')
      setRejecting(false)
      return
    }

    setLocalStatus('rejected')
    setShowRejectForm(false)
    setRejectReason('')
    setResultMessage('Candidate marked as rejected. Educated Appointments has been updated.')
    setRejecting(false)
  }

  return (
    <article
      style={{
        background: 'var(--white)',
        border: isRejected
          ? '1.5px solid #fecaca'
          : '1px solid var(--border)',
        borderRadius: 26,
        overflow: 'hidden',
        boxShadow: '0 18px 55px rgba(15,23,42,0.08)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 380px',
          gap: 0,
          alignItems: 'stretch',
        }}
      >
        <div style={{ padding: 26 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 18,
              alignItems: 'flex-start',
              marginBottom: 18,
            }}
          >
            <div style={{ display: 'flex', gap: 15, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 19,
                  background: isRejected
                    ? '#fef2f2'
                    : 'var(--primary-light)',
                  color: isRejected ? '#dc2626' : 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 17,
                  fontWeight: 900,
                  flexShrink: 0,
                }}
              >
                {getInitials(candidate)}
              </div>

              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    fontWeight: 900,
                    color: 'var(--primary)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    marginBottom: 5,
                  }}
                >
                  Candidate submission
                </p>

                <h2
                  style={{
                    margin: 0,
                    fontSize: 30,
                    lineHeight: 1.05,
                    letterSpacing: -1,
                    color: 'var(--text-dark)',
                    fontWeight: 900,
                  }}
                >
                  {candidateName}
                </h2>

                <p
                  style={{
                    margin: 0,
                    marginTop: 7,
                    fontSize: 14,
                    color: 'var(--text-muted)',
                    fontWeight: 700,
                  }}
                >
                  {candidate?.job_title ||
                    candidate?.seeking_role_type ||
                    'Candidate background'}
                </p>
              </div>
            </div>

            <span
              style={{
                background: isRejected
                  ? '#fef2f2'
                  : interviewArranged
                    ? 'var(--success-light)'
                    : 'var(--primary-light)',
                color: isRejected
                  ? '#dc2626'
                  : interviewArranged
                    ? 'var(--success)'
                    : 'var(--primary)',
                borderRadius: 999,
                padding: '7px 11px',
                fontSize: 11,
                fontWeight: 900,
                textTransform: 'capitalize',
                whiteSpace: 'nowrap',
              }}
            >
              {isRejected
                ? 'Rejected'
                : interviewArranged
                  ? 'Interview arranged'
                  : statusLabel(localStatus)}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 10,
              marginBottom: 18,
            }}
          >
            <MiniFact label="Salary expected" value={candidate?.salary_expected} />
            <MiniFact label="Notice period" value={candidate?.notice_period} />
            <MiniFact label="Location" value={getCandidateLocation(candidate)} />
          </div>

          {interviewArranged && (
            <div
              style={{
                background: 'var(--success-light)',
                border: '1px solid rgba(33,120,34,0.18)',
                borderRadius: 16,
                padding: 14,
                marginBottom: 18,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 900,
                  color: 'var(--success)',
                }}
              >
                Interview arranged
              </p>

              <p
                style={{
                  margin: 0,
                  marginTop: 5,
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: 'var(--text-dark)',
                }}
              >
                {application.client_interview_date
                  ? formatInterviewDate(application.client_interview_date)
                  : 'Date TBC'}
                {application.client_interview_time
                  ? ` · ${application.client_interview_time}`
                  : ''}
                {application.client_interview_format
                  ? ` · ${labelInterviewFormat(application.client_interview_format)}`
                  : ''}
                {application.client_interview_location
                  ? ` · ${application.client_interview_location}`
                  : ''}
              </p>
            </div>
          )}

          <section
            style={{
              background: 'var(--light-bg)',
              border: '1px solid var(--border-light)',
              borderRadius: 18,
              padding: 18,
              marginBottom: 18,
            }}
          >
            <p
              style={{
                margin: 0,
                marginBottom: 9,
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: 'var(--primary)',
              }}
            >
              Candidate profile
            </p>

            {application.employer_profile_notes ? (
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: 'var(--text-dark)',
                  lineHeight: 1.8,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {application.employer_profile_notes}
              </p>
            ) : (
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: 'var(--text-muted)',
                  lineHeight: 1.6,
                }}
              >
                Candidate profile notes have not been added yet.
              </p>
            )}
          </section>

          <section
            style={{
              border: '1px solid var(--border)',
              borderRadius: 18,
              padding: 16,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 900,
                    color: 'var(--text-dark)',
                  }}
                >
                  Documents on file
                </p>

                <p
                  style={{
                    margin: 0,
                    marginTop: 3,
                    fontSize: 12,
                    color: 'var(--text-muted)',
                  }}
                >
                  Supporting documents held by Educated Appointments.
                </p>
              </div>

              <span
                style={{
                  background: 'var(--success-light)',
                  color: 'var(--success)',
                  borderRadius: 999,
                  padding: '6px 10px',
                  fontSize: 11,
                  fontWeight: 900,
                  whiteSpace: 'nowrap',
                }}
              >
                {documentsOnFile.length} on file
              </span>
            </div>

            {documentsOnFile.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  color: 'var(--text-muted)',
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                No supporting documents are currently shown as on file.
              </p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 8,
                }}
              >
                                {documentsOnFile.map(doc => {
                  const canOpen =
                    documentHasStoredFile(doc) &&
                    canDownloadDocuments &&
                    employerCanSeeDocument(doc)

                  return (
                    <div
                      key={doc.id}
                      style={{
                        border: '1px solid var(--border-light)',
                        background: 'var(--light-bg)',
                        borderRadius: 12,
                        padding: 11,
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 10,
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
                            fontWeight: 900,
                            color: 'var(--text-dark)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {formatDocType(doc.doc_type)}
                        </p>

                        <p
                          style={{
                            margin: 0,
                            marginTop: 2,
                            fontSize: 11,
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {doc.name || 'Document held on file'}
                        </p>
                      </div>

                                            {canOpen ? (
                        <button
                          type="button"
                          onClick={() => openEmployerDocument(doc)}
                          disabled={openingDocumentId === doc.id}
                          style={{
                            border: 0,
                            background: 'transparent',
                            color: 'var(--primary)',
                            fontFamily: 'inherit',
                            fontSize: 11,
                            fontWeight: 900,
                            textDecoration: 'none',
                            whiteSpace: 'nowrap',
                            cursor:
                              openingDocumentId === doc.id
                                ? 'wait'
                                : 'pointer',
                            padding: 0,
                          }}
                        >
                          {openingDocumentId === doc.id
                            ? 'Opening...'
                            : 'Download'}
                        </button>
                      ) : (
                        <span
                          style={{
                            background: 'var(--white)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-muted)',
                            borderRadius: 999,
                            padding: '4px 8px',
                            fontSize: 10,
                            fontWeight: 900,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          On file
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              paddingTop: 2,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setShowInterviewForm(current => !current)
                setShowRejectForm(false)
              }}
              disabled={isRejected}
              style={{
                border: 0,
                borderRadius: 12,
                padding: '12px 16px',
                background: isRejected ? 'var(--border)' : 'var(--primary)',
                color: 'var(--white)',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 900,
                cursor: isRejected ? 'not-allowed' : 'pointer',
                opacity: isRejected ? 0.65 : 1,
              }}
            >
              Arrange interview
            </button>

                        {formattedCv && canDownloadDocuments && (
              <button
                type="button"
                onClick={() => openEmployerDocument(formattedCv)}
                disabled={openingDocumentId === formattedCv.id}
                style={{
                  border: 0,
                  borderRadius: 12,
                  padding: '12px 16px',
                  background: 'var(--teal)',
                  color: 'var(--text-dark)',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: 900,
                  cursor:
                    openingDocumentId === formattedCv.id
                      ? 'wait'
                      : 'pointer',
                }}
              >
                {openingDocumentId === formattedCv.id
                  ? 'Opening...'
                  : 'Open formatted CV'}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setShowRejectForm(current => !current)
                setShowInterviewForm(false)
              }}
              disabled={isRejected}
              style={{
                border: '1.5px solid #fecaca',
                borderRadius: 12,
                padding: '12px 16px',
                background: isRejected ? '#fef2f2' : 'var(--white)',
                color: '#dc2626',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 900,
                cursor: isRejected ? 'not-allowed' : 'pointer',
              }}
            >
              Reject
            </button>
          </div>

          {resultMessage && (
            <p
              style={{
                margin: 0,
                marginTop: 12,
                fontSize: 12,
                fontWeight: 900,
                color: resultMessage.includes('Could')
                  ? 'var(--coral)'
                  : 'var(--success)',
              }}
            >
              {resultMessage}
            </p>
          )}

          {showInterviewForm && !isRejected && (
            <section
              style={{
                background: 'var(--primary-light)',
                border: '1px solid rgba(53,45,235,0.18)',
                borderRadius: 18,
                padding: 18,
                marginTop: 18,
              }}
            >
              <div style={{ marginBottom: 14 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 900,
                    color: 'var(--text-dark)',
                  }}
                >
                  Arrange interview
                </p>

                <p
                  style={{
                    margin: 0,
                    marginTop: 4,
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                  }}
                >
                  Send preferred interview details to Educated Appointments.
                  We will confirm directly with the candidate.
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '220px 1fr',
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 900,
                      color: 'var(--text-dark)',
                      marginBottom: 5,
                    }}
                  >
                    Interview format
                  </label>

                  <select
                    value={interviewFormat}
                    onChange={e => setInterviewFormat(e.target.value)}
                    style={{
                      width: '100%',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: '10px 11px',
                      fontFamily: 'inherit',
                      fontSize: 13,
                      background: 'var(--white)',
                      color: 'var(--text-dark)',
                    }}
                  >
                    <option value="">Select...</option>
                    <option value="face_to_face">Face to face</option>
                    <option value="video">Video call</option>
                    <option value="telephone">Telephone</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 900,
                      color: 'var(--text-dark)',
                      marginBottom: 5,
                    }}
                  >
                    Location / link / instructions
                  </label>

                  <input
                    value={interviewLocation}
                    onChange={e => setInterviewLocation(e.target.value)}
                    placeholder="Office address, Teams link, phone instructions, or TBC..."
                    style={{
                      width: '100%',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: '10px 11px',
                      fontFamily: 'inherit',
                      fontSize: 13,
                      background: 'var(--white)',
                      color: 'var(--text-dark)',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 900,
                    color: 'var(--text-dark)',
                    marginBottom: 5,
                  }}
                >
                  Suggested availability
                </label>

                <textarea
                  value={availability}
                  onChange={e => setAvailability(e.target.value)}
                  rows={3}
                  placeholder="e.g. Tuesday 10am–12pm, Wednesday afternoon, or Friday after 2pm..."
                  style={{
                    width: '100%',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: 11,
                    fontFamily: 'inherit',
                    fontSize: 13,
                    lineHeight: 1.55,
                    resize: 'vertical',
                    background: 'var(--white)',
                    color: 'var(--text-dark)',
                  }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 900,
                    color: 'var(--text-dark)',
                    marginBottom: 5,
                  }}
                >
                  Optional message
                </label>

                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={2}
                  placeholder="Anything else Educated Appointments should know?"
                  style={{
                    width: '100%',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: 11,
                    fontFamily: 'inherit',
                    fontSize: 13,
                    lineHeight: 1.55,
                    resize: 'vertical',
                    background: 'var(--white)',
                    color: 'var(--text-dark)',
                  }}
                />
              </div>

              <button
                onClick={requestInterview}
                disabled={sending || !availability.trim()}
                style={{
                  border: 0,
                  borderRadius: 10,
                  padding: '12px 16px',
                  background: 'var(--primary)',
                  color: 'var(--white)',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: 900,
                  cursor:
                    sending || !availability.trim() ? 'not-allowed' : 'pointer',
                  opacity: sending || !availability.trim() ? 0.65 : 1,
                  width: '100%',
                }}
              >
                {sending ? 'Sending request...' : 'Send interview request'}
              </button>
            </section>
          )}

          {showRejectForm && !isRejected && (
            <section
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 18,
                padding: 18,
                marginTop: 18,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 900,
                  color: '#991b1b',
                }}
              >
                Reject candidate
              </p>

              <p
                style={{
                  margin: 0,
                  marginTop: 4,
                  marginBottom: 12,
                  fontSize: 12,
                  color: '#7f1d1d',
                  lineHeight: 1.5,
                }}
              >
                Add an optional reason. This will update Educated Appointments
                so we know not to progress this candidate for this vacancy.
              </p>

              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Optional reason for rejection..."
                style={{
                  width: '100%',
                  border: '1px solid #fecaca',
                  borderRadius: 10,
                  padding: 11,
                  fontFamily: 'inherit',
                  fontSize: 13,
                  lineHeight: 1.55,
                  resize: 'vertical',
                  background: 'var(--white)',
                  color: 'var(--text-dark)',
                  marginBottom: 12,
                }}
              />

              <button
                type="button"
                onClick={rejectCandidate}
                disabled={rejecting}
                style={{
                  border: 0,
                  borderRadius: 10,
                  padding: '12px 16px',
                  background: '#dc2626',
                  color: 'var(--white)',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: rejecting ? 'not-allowed' : 'pointer',
                  opacity: rejecting ? 0.65 : 1,
                  width: '100%',
                }}
              >
                {rejecting ? 'Rejecting...' : 'Confirm rejection'}
              </button>
            </section>
          )}
        </div>

        <aside
          style={{
            background: 'var(--text-dark)',
            color: 'var(--white)',
            minHeight: 620,
            padding: 22,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'var(--primary)',
              opacity: 0.38,
              right: -85,
              top: -85,
            }}
          />

          <div
            style={{
              position: 'absolute',
              width: 140,
              height: 140,
              borderRadius: '50%',
              background: 'var(--teal)',
              opacity: 0.13,
              left: -60,
              bottom: -60,
            }}
          />

          <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                alignItems: 'flex-start',
                marginBottom: 14,
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    marginBottom: 5,
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: 1.1,
                    textTransform: 'uppercase',
                    color: 'var(--teal)',
                  }}
                >
                  Formatted CV
                </p>

                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.65)',
                    lineHeight: 1.5,
                  }}
                >
                  Educated Appointments formatted CV.
                </p>
              </div>

                            {formattedCv && canDownloadDocuments && (
                <button
                  type="button"
                  onClick={() => openEmployerDocument(formattedCv)}
                  disabled={openingDocumentId === formattedCv.id}
                  style={{
                    border: 0,
                    background: 'var(--teal)',
                    color: 'var(--text-dark)',
                    borderRadius: 10,
                    padding: '8px 10px',
                    fontFamily: 'inherit',
                    fontSize: 11,
                    fontWeight: 900,
                    whiteSpace: 'nowrap',
                    cursor:
                      openingDocumentId === formattedCv.id
                        ? 'wait'
                        : 'pointer',
                  }}
                >
                  {openingDocumentId === formattedCv.id ? 'Opening...' : 'Open ↗'}
                </button>
              )}
            </div>

                        <div
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 18,
                minHeight: 540,
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: 24,
              }}
            >
              {formattedCv ? (
                <div>
                  <p style={{ fontSize: 42, marginBottom: 10 }}>📄</p>

                  <p
                    style={{
                      margin: 0,
                      fontSize: 15,
                      fontWeight: 900,
                      color: 'var(--white)',
                    }}
                  >
                    Formatted CV available
                  </p>

                  <p
                    style={{
                      margin: 0,
                      marginTop: 7,
                      fontSize: 12,
                      lineHeight: 1.6,
                      color: 'rgba(255,255,255,0.60)',
                    }}
                  >
                    Open the secure document link in a new tab.
                  </p>

                  {canDownloadDocuments && (
                    <button
                      type="button"
                      onClick={() => openEmployerDocument(formattedCv)}
                      disabled={openingDocumentId === formattedCv.id}
                      style={{
                        marginTop: 14,
                        border: 0,
                        display: 'inline-flex',
                        background: 'var(--teal)',
                        color: 'var(--text-dark)',
                        borderRadius: 10,
                        padding: '10px 13px',
                        fontFamily: 'inherit',
                        fontSize: 12,
                        fontWeight: 900,
                        cursor:
                          openingDocumentId === formattedCv.id
                            ? 'wait'
                            : 'pointer',
                      }}
                    >
                      {openingDocumentId === formattedCv.id
                        ? 'Opening...'
                        : 'Open formatted CV'}
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: 38, marginBottom: 10 }}>📄</p>

                  <p
                    style={{
                      margin: 0,
                      fontSize: 15,
                      fontWeight: 900,
                      color: 'var(--white)',
                    }}
                  >
                    Formatted CV pending
                  </p>

                  <p
                    style={{
                      margin: 0,
                      marginTop: 7,
                      fontSize: 12,
                      lineHeight: 1.6,
                      color: 'rgba(255,255,255,0.60)',
                    }}
                  >
                    The Educated Appointments formatted CV has not been added
                    yet.
                  </p>
                </div>
              )}
            </div>
                      </div>
        </aside>
      </div>
    </article>
  )
}