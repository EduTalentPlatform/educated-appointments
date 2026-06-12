'use client'

import { useEffect, useMemo, useState } from 'react'

type CandidateDocument = {
  id: string
  name: string
  doc_type: string | null
  summary?: string | null
  details?: any
  file_url: string | null
  storage_bucket?: string | null
  storage_path?: string | null
  has_file?: boolean | null
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
    formatted_cv: 'CV',
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

  

  if ((document as any).has_file === true) return true

  return Boolean(
    document.file_url ||
      (document.storage_bucket && document.storage_path),
  )
}

function formatPortalFactValue(value: unknown) {
  const raw = String(value ?? '').trim()

  if (!raw) return ''

  const normalised = raw.toLowerCase().replace(/\s+/g, '_')

  if (normalised === 'not_completed') {
    return 'Not completed'
  }

  if (
    normalised === 'not_completed_happy_to_complete' ||
    normalised === 'not_completed_happy_to_complete_if_required' ||
    normalised.startsWith('not_completed_happy_to')
  ) {
    return 'Not completed - happy to complete'
  }

  if (
    normalised === 'not_completed_happy_to_apply' ||
    normalised === 'not_completed_happy_to_apply_if_required'
  ) {
    return 'Not completed - happy to apply'
  }

  if (
    normalised === 'on_update_service' ||
    normalised === 'update_service'
  ) {
    return 'On update service'
  }

  return raw.replace(/_/g, ' ')
}

function cleanPortalDisplayValue(value: unknown) {
  const cleaned = String(value ?? '').trim()
  return cleaned.length > 0 ? cleaned : ''
}

function getDocumentDetailsValue(document: CandidateDocument | undefined, keys: string[]) {
  const details = (document as any)?.details

  if (!details || typeof details !== 'object') return ''

  for (const key of keys) {
    const value = cleanPortalDisplayValue(details[key])
    if (value) return value
  }

  return ''
}

function getDbsDisplayValue(
  candidate: Candidate | null,
  dbsDocument: CandidateDocument | undefined,
) {
  const candidateValues = [
    (candidate as any)?.dbs,
    (candidate as any)?.dbs_status,
    (candidate as any)?.dbs_check,
    (candidate as any)?.dbs_check_status,
    (candidate as any)?.dbs_certificate,
    (candidate as any)?.dbs_notes,
  ]

  for (const value of candidateValues) {
    const cleaned = cleanPortalDisplayValue(value)
    if (cleaned) return cleaned
  }

  const detailsValue = getDocumentDetailsValue(dbsDocument, [
    'dbs',
    'dbs_status',
    'status',
    'result',
    'note',
    'notes',
  ])

  if (detailsValue) return detailsValue

  const summary = cleanPortalDisplayValue(dbsDocument?.summary)
  if (summary) return summary

  const name = cleanPortalDisplayValue(dbsDocument?.name)
  if (name && !/^dbs$/i.test(name)) return name

  return ''
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
        minWidth: 0,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 10,
          fontWeight: 900,
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                    lineHeight: 1.25,
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
  const [cvPreviewUrl, setCvPreviewUrl] = useState<string | null>(null)
  const [loadingCvPreview, setLoadingCvPreview] = useState(false)
  const [cvPreviewError, setCvPreviewError] = useState<string | null>(null)

  const candidateName = getCandidateName(candidate)

  const interviewArranged =
    localStatus === 'client_interview' ||
    Boolean(application.client_interview_date)

  const isRejected = localStatus === 'rejected'
  const isFilled = localStatus === 'placed'

    const formattedCv = useMemo(() => {
    return (
      documents.find(
        doc =>
          String(doc.doc_type || '').toLowerCase() === 'formatted_cv' &&
          documentHasStoredFile(doc),
      ) || null
    )
  }, [documents])


  useEffect(() => {
    let cancelled = false

    async function loadCvPreview() {
      if (!formattedCv || !documentHasStoredFile(formattedCv)) {
        setCvPreviewUrl(null)
        setCvPreviewError(null)
        return
      }

      setLoadingCvPreview(true)
      setCvPreviewError(null)

      try {
        const res = await fetch('/api/employer-portal/document-signed-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document_id: formattedCv.id,
            document_kind: 'candidate',
            vacancy_id: vacancyId,
            application_id: application.id,
          }),
        })

        const data = await res.json().catch(() => null)

        if (!res.ok || !data?.url) {
          throw new Error(data?.error || 'Could not load CV preview.')
        }

        if (!cancelled) {
          setCvPreviewUrl(data.url)
        }
      } catch (error: any) {
        if (!cancelled) {
          setCvPreviewUrl(null)
          setCvPreviewError(error?.message || 'Could not load CV preview.')
        }
      } finally {
        if (!cancelled) {
          setLoadingCvPreview(false)
        }
      }
    }

    loadCvPreview()

    return () => {
      cancelled = true
    }
  }, [formattedCv?.id, vacancyId, application.id])


  const documentsOnFile = useMemo(() => {
    const portalDocumentTypes = new Set([
      'qualification',
      'qualifications',
      'certificate',
      'certificates',
      'right_to_work',
      'dbs',
      'reference',
      'references',
      'other',
    ])

    return documents.filter(doc => {
      const type = String(doc.doc_type || '').toLowerCase()

      return portalDocumentTypes.has(type)
    })
  }, [documents])

  const dbsDocument = useMemo(() => {
    return documents.find(doc => {
      const type = String(doc.doc_type || '').toLowerCase()
      return type === 'dbs'
    })
  }, [documents])

  const dbsStatusForPortal = formatPortalFactValue(getDbsDisplayValue(candidate, dbsDocument))

  function getDocumentDisplayLabel(docType?: string | null) {
    const labels: Record<string, string> = {
      qualification: 'Qualification certificate',
      certificate: 'Qualification certificate',
      certificates: 'Qualification certificate',
      right_to_work: 'Right to work',
      dbs: 'DBS',
      reference: 'Reference details',
      interview_prep: 'Interview preparation',
      gdpr_acceptance: 'GDPR / privacy acceptance',
      other: 'Supporting document',
    }

    return labels[String(docType || '').toLowerCase()] || 'Supporting document'
  }

  function formatReferenceDetailValue(value: unknown) {
    const raw = String(value ?? '').trim()

    if (!raw) return ''

    return raw
      .replace(/_/g, ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase())
  }

  function isReferenceDocument(doc: CandidateDocument) {
    const type = String(doc.doc_type || '').toLowerCase()
    return type === 'reference' || type === 'references'
  }

  function getReferenceDetailRows(doc: CandidateDocument) {
    const details = (doc as any).details

    if (!details || typeof details !== 'object') return []

    const usedKeys = new Set<string>()

    function addRow(
      rows: Array<{ label: string; value: string }>,
      label: string,
      keys: string[],
    ) {
      for (const key of keys) {
        const value = String(details[key] ?? '').trim()

        if (value) {
          usedKeys.add(key)
          rows.push({ label, value })
          return
        }
      }
    }

    const rows: Array<{ label: string; value: string }> = []

    addRow(rows, 'Name', [
      'referee_name',
      'reference_name',
      'name',
      'contact_name',
      'full_name',
    ])

    addRow(rows, 'Job title', [
      'referee_job_title',
      'job_title',
      'position',
      'title',
      'role',
    ])

    addRow(rows, 'Company', [
      'referee_company',
      'company',
      'organisation',
      'organization',
      'employer',
      'business_name',
    ])

    addRow(rows, 'Relationship', [
      'relationship',
      'relationship_to_candidate',
      'capacity',
      'known_as',
      'how_known',
    ])

    addRow(rows, 'Email', [
      'referee_email',
      'email',
      'contact_email',
      'email_address',
    ])

    addRow(rows, 'Phone', [
      'referee_phone',
      'phone',
      'telephone',
      'mobile',
      'contact_number',
    ])

    addRow(rows, 'Status', ['status'])

    const ignoredKeys = new Set([
      'source',
      'upload_link_id',
      'reference_number',
      'submitted_at',
      'created_at',
      'updated_at',
    ])

    Object.entries(details).forEach(([key, rawValue]) => {
      if (usedKeys.has(key) || ignoredKeys.has(key)) return

      const value = String(rawValue ?? '').trim()
      if (!value) return

      const label = key
        .replace(/^referee_/i, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, letter => letter.toUpperCase())

      rows.push({ label, value })
    })

    return rows
  }


  function canDownloadSupportingDocument(doc: CandidateDocument) {
    if (isReferenceDocument(doc)) return false

    return Boolean(
      canDownloadDocuments &&
        (doc.file_url || (doc.storage_bucket && doc.storage_path)),
    )
  }

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
                : isFilled
                  ? 'Filled'
                  : interviewArranged
                    ? 'Interview arranged'
                    : statusLabel(localStatus)}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 10,
              marginBottom: 18,
            }}
          >
            <MiniFact label="Salary expected" value={candidate?.salary_expected} />
            <MiniFact label="Notice period" value={candidate?.notice_period} />
            <MiniFact label="Location" value={getCandidateLocation(candidate)} />
            {dbsStatusForPortal ? (
              <MiniFact label="DBS" value={dbsStatusForPortal} />
            ) : null}
          </div>

          {interviewArranged && (
            <div
              style={{
                background: 'var(--success-light)',
                border: '1px solid rgba(33,120,34,0.18)',
                borderRadius: 16,
                padding: 16,
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
                {isFilled ? 'Filled' : 'Interview arranged'}
              </p>

              <div
                style={{
                  marginTop: 10,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: 8,
                }}
              >
                <MiniFact
                  label="Date"
                  value={
                    application.client_interview_date
                      ? formatInterviewDate(application.client_interview_date)
                      : 'TBC'
                  }
                />

                <MiniFact
                  label="Time"
                  value={application.client_interview_time || 'TBC'}
                />

                <MiniFact
                  label="Format"
                  value={
                    application.client_interview_format
                      ? labelInterviewFormat(application.client_interview_format)
                      : 'TBC'
                  }
                />

                <MiniFact
                  label="Location / venue"
                  value={application.client_interview_location || 'TBC'}
                />
              </div>

              {application.client_interview_notes && (
                <div
                  style={{
                    marginTop: 10,
                    borderRadius: 12,
                    padding: 12,
                    background: '#ffffff',
                    border: '1px solid rgba(33,120,34,0.12)',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      fontWeight: 900,
                      color: 'var(--success)',
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                    }}
                  >
                    Interview notes / instructions
                  </p>

                  <p
                    style={{
                      margin: 0,
                      marginTop: 5,
                      fontSize: 12,
                      lineHeight: 1.6,
                      color: 'var(--text-dark)',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {application.client_interview_notes}
                  </p>
                </div>
              )}
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
                    lineHeight: 1.5,
                  }}
                >
                  Supporting documents held by Educated Appointments. Documents
                  are listed here for visibility and become downloadable
                  once the candidate is placed.
                </p>
              </div>

              <span
                style={{
                  borderRadius: 999,
                  padding: '6px 10px',
                  background: 'var(--light-bg)',
                  color: 'var(--text-muted)',
                  fontSize: 11,
                  fontWeight: 900,
                  whiteSpace: 'nowrap',
                }}
              >
                {documentsOnFile.length} on file
              </span>
            </div>

            {documentsOnFile.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {documentsOnFile.map(doc => {
                  const isReference = isReferenceDocument(doc)
                  const referenceRows = isReference

                    ? getReferenceDetailRows(doc)

                    : []

                  const referenceSummary = referenceRows

                    .map(row => `${row.label}: ${formatReferenceDetailValue(row.value)}`)

                    .join(' · ')

                  const canDownload = canDownloadSupportingDocument(doc)
                  const isOpening = openingDocumentId === doc.id

                  // Compact reference row
                  if (isReference) {
                    return (
                      <div
                        key={doc.id}
                        style={{
                          border: '1px solid var(--border-light)',
                          borderRadius: 12,
                          padding: '10px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 5,
                          background: '#ffffff',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 12,
                            alignItems: 'flex-start',
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <p
                              style={{
                                margin: 0,
                                fontSize: 13,
                                fontWeight: 900,
                                color: 'var(--text-dark)',
                              }}
                            >
                              Reference details
                            </p>

                            <p
                              style={{
                                margin: 0,
                                marginTop: 2,
                                fontSize: 12,
                                color: 'var(--text-muted)',
                                overflowWrap: 'anywhere',
                              }}
                            >
                              {doc.name || 'Reference on file'}
                            </p>
                          </div>

                          <span
                            style={{
                              flexShrink: 0,
                              borderRadius: 999,
                              padding: '4px 8px',
                              background: '#e8f5e8',
                              color: '#217822',
                              fontSize: 10,
                              fontWeight: 900,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Details shown
                          </span>
                        </div>

                        {referenceRows.length > 0 && (
                          <div
                            style={{
                              marginTop: 4,
                              paddingTop: 7,
                              borderTop: '1px solid var(--border-light)',
                              display: 'flex',
                              flexWrap: 'wrap',
                              columnGap: 16,
                              rowGap: 4,
                            }}
                          >
                            {referenceRows.map(row => (
                              <span
                                key={`${doc.id}-${row.label}`}
                                style={{
                                  fontSize: 12,
                                  lineHeight: 1.45,
                                  color: 'var(--text-muted)',
                                  overflowWrap: 'anywhere',
                                }}
                              >
                                <strong
                                  style={{
                                    color: 'var(--text-dark)',
                                    fontWeight: 900,
                                  }}
                                >
                                  {row.label}:
                                </strong>{' '}
                                {formatPortalFactValue(row.value)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  }

                  return (
                    <div
                      key={doc.id}
                      style={{
                        border: '1px solid var(--border-light)',
                        borderRadius: 14,
                        padding: 12,
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        alignItems: isReference ? 'stretch' : 'center',
                        flexDirection: isReference ? 'column' : 'row',
                      }}
                    >
                      <div style={{ minWidth: 0, width: '100%', flex: 1 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 13,
                            fontWeight: 900,
                            color: 'var(--text-dark)',
                          }}
                        >
                          {getDocumentDisplayLabel(doc.doc_type)}
                        </p>

                        <p
                          style={{
                            margin: 0,
                            marginTop: 3,
                            fontSize: 12,
                            color: 'var(--text-muted)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {doc.name || 'Document on file'}
                        </p>

                                                {referenceSummary && (
                          <p
                            style={{
                              margin: '8px 0 0',
                              paddingTop: 8,
                              borderTop: '1px solid var(--border-light)',
                              fontSize: 12,
                              lineHeight: 1.6,
                              color: 'var(--text-muted)',
                              overflowWrap: 'anywhere',
                              wordBreak: 'break-word',
                            }}
                          >
                            {referenceSummary}
                          </p>
                        )}
                      </div>

                      {isReference && referenceRows.length > 0 ? (
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <span
                            style={{
                              flexShrink: 0,
                              borderRadius: 999,
                              padding: '4px 8px',
                              background: '#e8f5e8',
                              color: '#217822',
                              fontSize: 10,
                              fontWeight: 900,
                            }}
                          >
                            Details shown
                          </span>
                        </div>
                      ) : canDownload ? (
                        <button
                          type="button"
                          className="crm-btn-ghost crm-btn-sm"
                          onClick={() => openEmployerDocument(doc)}
                          disabled={isOpening}
                          style={{ flexShrink: 0 }}
                        >
                          {isOpening ? 'Opening...' : 'Open'}
                        </button>
                      ) : (
                        <span
                          style={{
                            flexShrink: 0,
                            borderRadius: 999,
                            padding: '6px 10px',
                            background: '#f0f0f2',
                            color: '#737373',
                            fontSize: 11,
                            fontWeight: 900,
                          }}
                        >
                          On file
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: 'var(--text-muted)',
                  lineHeight: 1.6,
                }}
              >
                No supporting documents are currently recorded on file.
              </p>
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

                        {formattedCv && documentHasStoredFile(formattedCv) && (
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
                  : 'Open CV'}
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
                  CV
                </p>

                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.65)',
                    lineHeight: 1.5,
                  }}
                >
                  Educated Appointments CV.
                </p>
              </div>

                            {formattedCv && documentHasStoredFile(formattedCv) && (
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
              {formattedCv && documentHasStoredFile(formattedCv) ? (
                <div>
                  {loadingCvPreview ? (
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        color: 'rgba(255,255,255,0.72)',
                        lineHeight: 1.6,
                      }}
                    >
                      Loading CV preview...
                    </p>
                  ) : cvPreviewUrl ? (
                    <iframe
                      src={cvPreviewUrl}
                      title="CV preview"
                      style={{
                        width: '100%',
                        height: 720,
                        border: '1px solid rgba(255,255,255,0.14)',
                        borderRadius: 18,
                        background: '#ffffff',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        border: '1px solid rgba(255,255,255,0.14)',
                        borderRadius: 18,
                        padding: 18,
                        background: 'rgba(255,255,255,0.08)',
                        textAlign: 'center',
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: 15,
                          color: '#ffffff',
                          fontWeight: 900,
                        }}
                      >
                        CV available
                      </p>

                      <p
                        style={{
                          margin: 0,
                          marginTop: 6,
                          fontSize: 12,
                          color: 'rgba(255,255,255,0.68)',
                          lineHeight: 1.6,
                        }}
                      >
                        {cvPreviewError ||
                          'The CV could not be previewed inline. Please open it in a new tab.'}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    border: '1px solid rgba(255,255,255,0.14)',
                    borderRadius: 18,
                    padding: 18,
                    background: 'rgba(255,255,255,0.08)',
                    textAlign: 'center',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 15,
                      color: '#ffffff',
                      fontWeight: 900,
                    }}
                  >
                    CV pending
                  </p>

                  <p
                    style={{
                      margin: 0,
                      marginTop: 6,
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.68)',
                      lineHeight: 1.6,
                    }}
                  >
                    The Educated Appointments CV has not been added yet.
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