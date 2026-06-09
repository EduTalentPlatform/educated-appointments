'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import CandidateVacancyPackPanel from './CandidateVacancyPackPanel'
import VacancyPortalAccessPanel from './VacancyPortalAccessPanel'

type Vacancy = {
  id: string
  title: string
  status: string
  sector: string | null
  role_type: string | null
  type: string
  location: string | null
  region: string | null
  postcode: string | null
  lat: number | null
  lng: number | null
  work_type: string | null
  salary_display: string | null
  salary_min: number | null
  salary_max: number | null
  description: string | null
  anonymous_description: string | null
  employer_job_description: string | null
  slug: string
  client_id: string | null
  briefing_notes: string | null
  reason_for_vacancy: string | null
  advertising_notes: string | null
  fee_info: string | null
  target_fill_date: string | null
  subject_area: string | null
  candidate_pack_text?: string | null
  candidate_pack_json?: any | null
  candidate_pack_generated_at?: string | null
  clients?: any
}

type Application = {
  id: string
  status: string
  created_at: string
  cv_url: string | null
  candidates?: any
}

type Candidate = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  postcode?: string | null
  job_title: string | null
  main_role_type?: string | null
  sub_role_type?: string | null
  seeking_role_type?: string | null
}

type VacancyDocument = {
  id: string
  vacancy_id: string
  name: string
  doc_type: string | null
  file_url: string | null
  storage_bucket?: string | null
  storage_path?: string | null
  extracted_text: string | null
  ai_summary?: string | null
  created_at: string
}

type PortalUser = {
  id: string
  client_id: string
  name: string
  email: string
  role: string | null
  active: boolean
}

type PortalAccess = {
  id: string
  vacancy_id: string
  portal_user_id: string
  can_view_vacancy: boolean
  can_view_submissions: boolean
  can_view_documents: boolean
}

const APP_STAGES = [
  'screening',
  'ea_interview',
  'docs_received',
  'ready_to_present',
  'presented',
  'client_interview',
  'offer',
  'placed',
  'rejected',
  'not_interested',
]

const STAGE_COLOURS: Record<string, { bg: string; text: string }> = {
  screening: { bg: '#f0f0f2', text: '#737373' },
  ea_interview: { bg: '#e0f0fb', text: '#0B72B8' },
  docs_received: { bg: '#f3f0ff', text: '#7c3aed' },
  ready_to_present: { bg: '#fffbeb', text: '#d97706' },
  presented: { bg: '#e8f5e8', text: '#217822' },
  client_interview: { bg: '#f3f0ff', text: '#7c3aed' },
  offer: { bg: '#e8f5e8', text: '#217822' },
  placed: { bg: '#e8f5e8', text: '#1a6e1a' },
  rejected: { bg: '#fef2f2', text: '#e53e3e' },
  not_interested:   { bg: '#f0f0f2', text: '#737373' },
}

const CLIENT_STAGES = ['presented', 'client_interview', 'offer', 'placed', 'rejected']

const VACANCY_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', dot: '⚪' },
  { value: 'live', label: 'Live', dot: '🟢' },
  { value: 'on_hold', label: 'On hold', dot: '🟠' },
  { value: 'closed', label: 'Closed', dot: '🔴' },
  { value: 'filled', label: 'Filled', dot: '✅' },
]

const VACANCY_STATUS_STYLES: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  draft: {
    bg: '#f8fafc',
    text: '#64748b',
    border: '#e2e8f0',
  },
  live: {
    bg: '#e8f5e8',
    text: '#217822',
    border: '#bbf7d0',
  },
  on_hold: {
    bg: '#fffbeb',
    text: '#d97706',
    border: '#fde68a',
  },
  closed: {
    bg: '#fef2f2',
    text: '#e53e3e',
    border: '#fecaca',
  },
  filled: {
    bg: '#e0f0fb',
    text: '#0B72B8',
    border: '#bae6fd',
  },
}

const ROLE_TYPE_HIERARCHY: Record<string, { subTypes: string[] }> = {
  Delivery: {
    subTypes: [
      'Assessor',
      'IQA',
      'Lead IQA',
      'End-Point Assessor (EPA)',
      'Skills Coach',
      'Tutor / Trainer',
      'ESOL Trainer',
      'Employability Tutor',
      'Distance Learning Tutor',
      'Workshop Facilitator',
      'Vocational Trainer',
      'Functional Skills Tutor (Maths)',
      'Functional Skills Tutor (English)',
      'Learning Support Worker',
    ],
  },
  'Quality & Curriculum': {
    subTypes: [
      'Curriculum Manager',
      'Curriculum Developer',
      'Qualification Developer',
      'E-Learning Developer',
      'Quality Manager',
      'Compliance Manager',
      'Ofsted Nominee',
      'Head of Quality',
      'EPA Centre Coordinator',
      'CEIAG Adviser',
    ],
  },
  Commercial: {
  subTypes: [
    'Business Development Manager',
    'Employment Specialist',
    'Employer Engagement Manager',
    'Apprenticeship Advisor',
    'Recruitment Consultant',
    'Partnerships Manager',
    'Account Manager',
    'Key Account Manager',
    'Bid Writer',
    'Marketing Manager',
    'Apprenticeship Levy Consultant',
  ],
},
  Operations: {
    subTypes: [
      'Operations Manager',
      'Centre Manager',
      'Programme Manager',
      'Regional Manager',
      'Training Coordinator',
      'Learner Services Manager',
      'Timetabling / Scheduling Manager',
      'Contract Manager',
      'Functional Skills Coordinator',
    ],
  },
  Leadership: {
    subTypes: [
      'Head of Department',
      'Head of Apprenticeships',
      'Head of Commercial',
      'Assistant Principal',
      'Vice Principal',
      'Director of Education',
      'Director of Quality',
      'Director of Business Development',
      'Principal',
      'CEO / MD',
    ],
  },
  'Data & Admin': {
    subTypes: [
      'MIS Officer',
      'MIS Manager',
      'Data Analyst',
      'Apprenticeship Administrator',
      'Learner Records Officer',
      'Funding & Compliance Officer',
      'Exams Officer',
      'Finance Manager',
      'HR Manager',
    ],
  },
}

const MAIN_ROLE_TYPES = Object.keys(ROLE_TYPE_HIERARCHY)

function getInitialMatchMainRole(vacancy: Vacancy) {
  if (vacancy.role_type && MAIN_ROLE_TYPES.includes(vacancy.role_type)) {
    return vacancy.role_type
  }

  if (vacancy.sector) {
    const matchedMain = MAIN_ROLE_TYPES.find(mainRole =>
      ROLE_TYPE_HIERARCHY[mainRole].subTypes.includes(vacancy.sector || ''),
    )

    if (matchedMain) return matchedMain
  }

  return ''
}

function getInitialMatchSubRole(vacancy: Vacancy) {
  if (vacancy.sector && !MAIN_ROLE_TYPES.includes(vacancy.sector)) {
    return vacancy.sector
  }

  if (vacancy.role_type && !MAIN_ROLE_TYPES.includes(vacancy.role_type)) {
    return vacancy.role_type
  }

  return ''
}

type SecureDocument = {
  id: string
  name: string
  doc_type: string | null
  file_url: string | null
  storage_bucket?: string | null
  storage_path?: string | null
}

function documentHasStoredFile(document?: SecureDocument | null) {
  if (!document) return false

  return Boolean(
    document.file_url ||
      (document.storage_bucket && document.storage_path),
  )
}

async function getSecureDocumentUrl(
  document: SecureDocument,
  documentKind: 'candidate' | 'vacancy',
) {
  const res = await fetch('/api/crm/document-signed-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      document_id: document.id,
      document_kind: documentKind,
    }),
  })

  const json = await res.json().catch(() => null)

  if (!res.ok || !json?.url) {
    throw new Error(json?.error || 'Could not create secure document link.')
  }

  return String(json.url)
}

async function openSecureDocument(
  document: SecureDocument,
  documentKind: 'candidate' | 'vacancy',
) {
  const url = await getSecureDocumentUrl(document, documentKind)
  window.open(url, '_blank', 'noopener,noreferrer')
}

interface Props {
  vacancy: Vacancy
  applications: Application[]
  allCandidates: Candidate[]
  vacancyDocuments?: VacancyDocument[]
  portalUsers?: PortalUser[]
  portalAccess?: PortalAccess[]
}

function CandidateMatchingCard({
  candidate,
  onAdd,
  addingCandidateId,
}: {
  candidate: any
  onAdd: (candidate: any) => void
  addingCandidateId?: string | null
}) {
  const candidateName =
    candidate.candidate_name ||
    candidate.name ||
    `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() ||
    'Unnamed candidate'

  const recentNotes = Array.isArray(candidate.recent_notes)
    ? candidate.recent_notes
    : []

  return (
    <div className="candidate-match-card">
      <div className="candidate-match-main">
        <div className="candidate-match-header">
          <div>
            <h3>{candidateName}</h3>

            <div className="candidate-match-subtitle">
              {candidate.job_title || 'No job title added'}
              {candidate.postcode ? ` · ${candidate.postcode}` : ''}
              {candidate.distance_miles !== null &&
              candidate.distance_miles !== undefined
                ? ` · ${candidate.distance_miles} miles`
                : ''}
            </div>
          </div>

          {candidate.alreadyAdded ? (
            <span className="candidate-match-pill candidate-match-pill-added">
              Already added
            </span>
          ) : candidate.actively_looking ? (
            <span className="candidate-match-pill candidate-match-pill-active">
              Active
            </span>
          ) : (
            <span className="candidate-match-pill candidate-match-pill-passive">
              Passive
            </span>
          )}
        </div>

        <div className="candidate-match-details">
          <div>
            <strong>Main role:</strong>{' '}
            {candidate.main_role_type || 'Not added'}
          </div>

          <div>
            <strong>Specific role:</strong>{' '}
            {candidate.sub_role_type ||
              candidate.seeking_role_type ||
              'Not added'}
          </div>

          <div>
            <strong>Can deliver:</strong>{' '}
            {candidate.can_deliver || 'Not added'}
          </div>
        </div>

        {Array.isArray(candidate.match_reasons) &&
          candidate.match_reasons.length > 0 && (
            <div className="candidate-match-reasons">
              {candidate.match_reasons.map((reason: string) => (
                <span key={reason}>{reason}</span>
              ))}
            </div>
          )}

        <div className="candidate-match-actions">
  <Link
    href={`/crm/candidates/${candidate.id}`}
    target="_blank"
    rel="noopener noreferrer"
    className="candidate-match-view-btn"
  >
    View Candidate ↗
  </Link>

  <button
    type="button"
    disabled={
      candidate.alreadyAdded || addingCandidateId === candidate.id
    }
    onClick={() => onAdd(candidate)}
  >
    {candidate.alreadyAdded
      ? `Already added${
          candidate.application_status
            ? ` · ${candidate.application_status}`
            : ''
        }`
      : addingCandidateId === candidate.id
        ? 'Adding...'
        : 'Add to Vacancy'}
  </button>
</div>
      </div>

      <aside className="candidate-match-notes">
        <div className="candidate-match-notes-title">Latest notes</div>

        {recentNotes.length > 0 ? (
          <div className="candidate-match-notes-list">
            {recentNotes.slice(0, 3).map((note: any) => (
              <div key={note.id} className="candidate-match-note">
                <div className="candidate-match-note-meta">
                  {note.created_at
                    ? new Date(note.created_at).toLocaleDateString('en-GB')
                    : 'No date'}{' '}
                  · {note.type || 'Note'}
                </div>

                <div className="candidate-match-note-preview">
                  {note.preview || note.content || note.note || note.notes}
                </div>
              </div>
            ))}
          </div>
        ) : candidate.notes ? (
          <div className="candidate-match-note">
            <div className="candidate-match-note-meta">Candidate notes</div>
            <div className="candidate-match-note-preview">
              {String(candidate.notes).length > 220
                ? `${String(candidate.notes).slice(0, 220)}…`
                : candidate.notes}
            </div>
          </div>
        ) : (
          <div className="candidate-match-note-empty">
            No recent notes added yet.
          </div>
        )}
      </aside>
    </div>
  )
}

export default function VacancyDetail({
  vacancy: initialVacancy,
  applications: initialApps,
  allCandidates,
  vacancyDocuments = [],
  portalUsers = [],
  portalAccess = [],
}: Props) {
  const [vacancy, setVacancy] = useState(initialVacancy)
  const [apps, setApps] = useState(initialApps)

  const [activeTab, setActiveTab] = useState<
  'description' | 'briefing' | 'applications' | 'match' | 'portal'
>('description')

  // Description tab
  const [descMode, setDescMode] = useState<'ai' | 'manual'>('ai')
  const [jdText, setJdText] = useState(
    initialVacancy.employer_job_description ?? '',
  )
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState<any>(null)
  const [genError, setGenError] = useState<string | null>(null)
  const [editedAdvert, setEditedAdvert] = useState('')
  const [editedAnon, setEditedAnon] = useState('')
  const [manualAdvert, setManualAdvert] = useState(
    initialVacancy.description ?? '',
  )
  const [manualAnon, setManualAnon] = useState(
    initialVacancy.anonymous_description ?? '',
  )
  const [savingDesc, setSavingDesc] = useState(false)
  const [descSaved, setDescSaved] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [storedVacancyDocs, setStoredVacancyDocs] =
    useState<VacancyDocument[]>(vacancyDocuments)
  const [storingDoc, setStoringDoc] = useState(false)
  const [storedDocError, setStoredDocError] = useState<string | null>(null)
  const [openingStoredDocId, setOpeningStoredDocId] = useState<string | null>(null)

  // Edit vacancy details
const [showEditVacancy, setShowEditVacancy] = useState(false)
const [savingVacancyDetails, setSavingVacancyDetails] = useState(false)
const [editVacancyForm, setEditVacancyForm] = useState({
  title: initialVacancy.title ?? '',
  sector: initialVacancy.sector ?? '',
  role_type: initialVacancy.role_type ?? '',
  type: initialVacancy.type ?? '',
  location: initialVacancy.location ?? '',
  region: initialVacancy.region ?? '',
  postcode: initialVacancy.postcode ?? '',
  work_type: initialVacancy.work_type ?? '',
  salary_display: initialVacancy.salary_display ?? '',
  salary_min: initialVacancy.salary_min?.toString() ?? '',
  salary_max: initialVacancy.salary_max?.toString() ?? '',
  subject_area: initialVacancy.subject_area ?? '',
})
  
  // Briefing tab
  const [briefing, setBriefing] = useState({
    reason_for_vacancy: initialVacancy.reason_for_vacancy ?? '',
    briefing_notes: initialVacancy.briefing_notes ?? '',
    advertising_notes: initialVacancy.advertising_notes ?? '',
    fee_info: initialVacancy.fee_info ?? '',
    target_fill_date: initialVacancy.target_fill_date ?? '',
    work_type: initialVacancy.work_type ?? 'office',
    postcode: initialVacancy.postcode ?? '',
  })
  const [savingBriefing, setSavingBriefing] = useState(false)
  const [briefingSaved, setBriefingSaved] = useState(false)
  const [postcodeError, setPostcodeError] = useState<string | null>(null)

  // ATS
const [stageFilter, setStageFilter] = useState('all')
const [showAddCandidate, setShowAddCandidate] = useState(false)
const [selectedCandidate, setSelectedCandidate] = useState('')
const [candidateSearch, setCandidateSearch] = useState('')
const [candidateDocs, setCandidateDocs] = useState<any[]>([])
const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
const [loadingDocs, setLoadingDocs] = useState(false)
const [adding, setAdding] = useState(false)
const [sharingAppId, setSharingAppId] = useState<string | null>(null)

  // Match tab
const [radius, setRadius] = useState(20)
const [matching, setMatching] = useState(false)
const [matchResults, setMatchResults] = useState<any[] | null>(null)
const [matchError, setMatchError] = useState<string | null>(null)
const [addingMatchId, setAddingMatchId] = useState<string | null>(null)

const [matchMode, setMatchMode] = useState<
  'role' | 'standard' | 'role_standard' | 'keyword'
>('role_standard')

const [matchMainRoleType, setMatchMainRoleType] = useState(() =>
  getInitialMatchMainRole(initialVacancy),
)

const [matchSubRoleType, setMatchSubRoleType] = useState(() =>
  getInitialMatchSubRole(initialVacancy),
)

const matchRoleQuery = useMemo(() => {
  return matchSubRoleType || matchMainRoleType || ''
}, [matchMainRoleType, matchSubRoleType])

const [matchStandardQuery, setMatchStandardQuery] = useState(
  initialVacancy.subject_area || '',
)

const [standardSubjectFilter, setStandardSubjectFilter] = useState('all')
const [standardSearch, setStandardSearch] = useState('')

const [standardOptions, setStandardOptions] = useState<
  Array<{
    id: string
    label: string
    level?: string | number | null
    route?: string | null
  }>
>([])
const [loadingStandards, setLoadingStandards] = useState(false)
const [standardsError, setStandardsError] = useState<string | null>(null)

useEffect(() => {
  let cancelled = false

  async function loadStandards() {
    if (matchMode !== 'standard' && matchMode !== 'role_standard') return

    setLoadingStandards(true)
    setStandardsError(null)

    const res = await fetch('/api/crm/apprenticeship-standards')
    const data = await res.json()

    if (cancelled) return

    if (!res.ok) {
      setStandardsError(data.error || 'Could not load apprenticeship standards.')
      setLoadingStandards(false)
      return
    }

    setStandardOptions(data.standards || [])
    setLoadingStandards(false)
  }

  loadStandards()

  return () => {
    cancelled = true
  }
}, [matchMode])

const [matchKeywordQuery, setMatchKeywordQuery] = useState('')
const [linkedinKeywords, setLinkedinKeywords] = useState('')
const [linkedinLocation, setLinkedinLocation] = useState('')
const [linkedinRadius, setLinkedinRadius] = useState(30)
const [nearbyAreas, setNearbyAreas] = useState<string[]>([])
const [loadingAreas, setLoadingAreas] = useState(false)

const [linkedinOutreachType, setLinkedinOutreachType] = useState<
  'connection_request' | 'existing_connection' | 'inmail'
>('connection_request')
const [linkedinOutreachContext, setLinkedinOutreachContext] = useState('')
const [linkedinOutreachMessage, setLinkedinOutreachMessage] = useState('')
const [generatingLinkedinOutreach, setGeneratingLinkedinOutreach] =
  useState(false)
const [linkedinOutreachCopied, setLinkedinOutreachCopied] = useState(false)

  const presentedIds = new Set(
    apps.map(app => app.candidates?.id).filter(Boolean),
  )

  async function patchVacancy(updates: Record<string, any>) {
    return fetch('/api/crm/vacancies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: vacancy.id, ...updates }),
    })
  }

  async function saveVacancyDetails() {
  setSavingVacancyDetails(true)

  const updates = {
    title: editVacancyForm.title.trim(),
    sector: editVacancyForm.sector || null,
    role_type: editVacancyForm.role_type || null,
    type: editVacancyForm.type || '',
    location: editVacancyForm.location || null,
    region: editVacancyForm.region || null,
    postcode: editVacancyForm.postcode || null,
    work_type: editVacancyForm.work_type || null,
    salary_display: editVacancyForm.salary_display || null,
    salary_min: editVacancyForm.salary_min
      ? Number(editVacancyForm.salary_min)
      : null,
    salary_max: editVacancyForm.salary_max
      ? Number(editVacancyForm.salary_max)
      : null,
    subject_area: editVacancyForm.subject_area || null,
  }

  if (!updates.title) {
    alert('Vacancy title is required.')
    setSavingVacancyDetails(false)
    return
  }

  const res = await patchVacancy(updates)
  const json = await res.json().catch(() => null)

  if (!res.ok) {
    alert(json?.error || 'Could not save vacancy details.')
    setSavingVacancyDetails(false)
    return
  }

  setVacancy(current => ({
    ...current,
    ...updates,
  }))

  setBriefing(current => ({
    ...current,
    work_type: updates.work_type ?? '',
    postcode: updates.postcode ?? '',
  }))

  setShowEditVacancy(false)
  setSavingVacancyDetails(false)
}

  async function updateVacancyStatus(nextStatus: string) {
  if (nextStatus === vacancy.status) return

  const confirmed =
    nextStatus === 'closed'
      ? window.confirm(
          'Close this vacancy? It will no longer appear as a live vacancy on the website.',
        )
      : nextStatus === 'filled'
        ? window.confirm(
            'Mark this vacancy as filled? It will no longer appear as a live vacancy on the website.',
          )
        : true

  if (!confirmed) return

  const res = await patchVacancy({ status: nextStatus })
  const json = await res.json().catch(() => null)

  if (!res.ok) {
    alert(json?.error || 'Could not update vacancy status.')
    return
  }

  setVacancy(v => ({ ...v, status: nextStatus }))
}

  async function processFile(file: File) {
    setUploading(true)
    setStoringDoc(true)
    setUploadedFileName(file.name)
    setStoredDocError(null)

    const extractFormData = new FormData()
    extractFormData.append('file', file)

    const extractRes = await fetch('/api/crm/extract-text', {
      method: 'POST',
      body: extractFormData,
    })

    const extractData = await extractRes.json()

    if (extractData.text) {
      setJdText(extractData.text)

      const storeFormData = new FormData()
      storeFormData.append('vacancy_id', vacancy.id)
      storeFormData.append('file', file)
      storeFormData.append('name', file.name)
      storeFormData.append('doc_type', 'job_description')
      storeFormData.append('extracted_text', extractData.text)

      const storeRes = await fetch('/api/crm/vacancy-documents', {
        method: 'POST',
        body: storeFormData,
      })

      const storeData = await storeRes.json()

      if (storeRes.ok && storeData.data) {
        setStoredVacancyDocs(current => [storeData.data, ...current])
      } else {
        setStoredDocError(
          storeData.error ||
            'The text was extracted, but the document was not stored.',
        )
      }
    } else if (extractData.error) {
      setGenError(extractData.error)
      setUploadedFileName(null)
    }

    setUploading(false)
    setStoringDoc(false)
  }

  async function openStoredVacancyDocument(document: VacancyDocument) {
  setOpeningStoredDocId(document.id)

  try {
    await openSecureDocument(document, 'vacancy')
  } catch (error: any) {
    alert(error?.message || 'Could not open this document securely.')
  } finally {
    setOpeningStoredDocId(null)
  }
}

  async function generateAdvert() {
    if (!jdText.trim()) {
      setGenError('Please paste or upload the job description first.')
      return
    }

    setGenerating(true)
    setGenError(null)
    setGenerated(null)

    const res = await fetch('/api/crm/generate-advert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jdText,
        vacancy: {
          title: vacancy.title,
          sector: vacancy.sector,
          location: vacancy.location,
          region: vacancy.region,
          salary_display: vacancy.salary_display,
          type: vacancy.type,
        },
        employerWebsite: vacancy.clients?.website ?? null,
      }),
    })

    const data = await res.json()

    if (data.result) {
      setGenerated(data.result)
      setEditedAdvert(data.result.advert ?? '')
      setEditedAnon(data.result.anonymous_pack ?? '')
    } else {
      setGenError(data.error ?? 'Generation failed.')
    }

    setGenerating(false)
  }

  async function generateCandidatePackAfterSave() {
  const res = await fetch(`/api/crm/vacancies/${vacancy.id}/candidate-pack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })

  const data = await res.json().catch(() => null)

  if (res.ok && data?.vacancy) {
    setVacancy(current => ({
      ...current,
      ...data.vacancy,
    }))
  }

  return data
}
  
  async function saveDesc(advert: string, anon: string, goLive = false) {
    setSavingDesc(true)

    const updates = {
      employer_job_description:
        jdText.trim() || vacancy.employer_job_description || advert,
      description: advert,
      anonymous_description: anon,
      ...(goLive ? { status: 'live' } : {}),
    }

    const res = await patchVacancy(updates)
    const json = await res.json().catch(() => null)

    if (!res.ok) {
      alert(json?.error || 'Could not save vacancy description.')
      setSavingDesc(false)
      return
    }

        setVacancy(v => ({
      ...v,
      ...updates,
    }))

    // After the website advert / anonymous pack is saved, also generate
    // the confidential candidate vacancy pack. If this fails, the advert
    // still remains saved.
    try {
      await generateCandidatePackAfterSave()
    } catch (error) {
      console.error('Candidate vacancy pack auto-generation failed:', error)
    }

    setDescSaved(true)
    setTimeout(() => setDescSaved(false), 3000)
    setSavingDesc(false)
  }

  async function saveEmployerJobDescription() {
    if (!jdText.trim()) return

    setSavingDesc(true)

    const res = await patchVacancy({
      employer_job_description: jdText.trim(),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      alert(json?.error || 'Could not save employer job description.')
      setSavingDesc(false)
      return
    }

    setVacancy(v => ({
      ...v,
      employer_job_description: jdText.trim(),
    }))

    setDescSaved(true)
    setTimeout(() => setDescSaved(false), 3000)
    setSavingDesc(false)
  }

  async function lookupPostcode() {
    setPostcodeError(null)

    const res = await fetch('/api/crm/postcode-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postcode: briefing.postcode }),
    })

    const data = await res.json()

    if (data.error) {
      setPostcodeError(data.error)
      return
    }

    await patchVacancy({
      postcode: briefing.postcode,
      lat: data.lat,
      lng: data.lng,
    })

    setVacancy(v => ({
      ...v,
      postcode: briefing.postcode,
      lat: data.lat,
      lng: data.lng,
    }))
  }

  async function saveBriefing() {
    setSavingBriefing(true)
    await patchVacancy(briefing)
    setVacancy(v => ({ ...v, ...briefing }))
    setBriefingSaved(true)
    setTimeout(() => setBriefingSaved(false), 3000)
    setSavingBriefing(false)
  }

  async function updateAppStatus(appId: string, status: string) {
    await fetch('/api/crm/vacancies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: appId, appStatus: status }),
    })

    setApps(a => a.map(app => (app.id === appId ? { ...app, status } : app)))
  }

  async function loadCandidateDocs(candidateId: string) {
    if (!candidateId) {
      setCandidateDocs([])
      setSelectedDocIds([])
      return
    }

    setLoadingDocs(true)

    const res = await fetch(`/api/crm/candidates/${candidateId}/documents`)

    if (res.ok) {
      const data = await res.json()
      setCandidateDocs(data.documents ?? [])

      const cvDoc =
  (data.documents ?? []).find(
    (doc: any) => doc.doc_type === 'formatted_cv',
  ) ??
  (data.documents ?? []).find(
    (doc: any) => doc.doc_type === 'cv',
  )

      setSelectedDocIds(cvDoc ? [cvDoc.id] : [])
    }

    setLoadingDocs(false)
  }

  async function addCandidate() {
    if (!selectedCandidate) return

    setAdding(true)

    const res = await fetch('/api/crm/vacancies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        addCandidate: true,
        vacancyId: vacancy.id,
        candidateId: selectedCandidate,
        presentedDocIds: selectedDocIds,
        initialStatus: 'screening',
      }),
    })

    const data = await res.json()

    if (data.application) {
      setApps(a => [data.application, ...a])
    }

    setShowAddCandidate(false)
setSelectedCandidate('')
setCandidateSearch('')
setCandidateDocs([])
setSelectedDocIds([])
setAdding(false)
  }

  async function shareWithEmployerPortal(appId: string, candidateId?: string | null) {
  const confirmed = window.confirm(
    'Share this candidate with the employer portal? This will move the application to Presented.',
  )

  if (!confirmed) return

  if (!candidateId) {
    alert('This application is not linked to a candidate.')
    return
  }

  setSharingAppId(appId)

  const statusRes = await fetch('/api/crm/vacancies', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      applicationId: appId,
      appStatus: 'presented',
    }),
  })

  const statusJson = await statusRes.json().catch(() => null)

  if (!statusRes.ok) {
    alert(statusJson?.error || 'Could not share candidate with employer portal.')
    setSharingAppId(null)
    return
  }

  setApps(current =>
    current.map(app =>
      app.id === appId ? { ...app, status: 'presented' } : app,
    ),
  )

  setSharingAppId(null)
}

  async function findMatches() {
  setMatching(true)
  setMatchError(null)
  setMatchResults(null)

  const res = await fetch('/api/crm/candidate-match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
  vacancyId: vacancy.id,
  workType: 'office',
  lat: vacancy.lat,
  lng: vacancy.lng,
  radius,

  searchMode: matchMode,
  roleQuery: matchRoleQuery,
  standardQuery: matchStandardQuery,
  keywordQuery: matchKeywordQuery,
}),
  })

  const data = await res.json()

  if (data.error) {
    setMatchError(data.error)
  } else {
    setMatchResults(data.candidates ?? [])
  }

  setMatching(false)
}

  async function addMatchToJob(candidateId: string) {
    setAddingMatchId(candidateId)

    const res = await fetch('/api/crm/vacancies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        addCandidate: true,
        vacancyId: vacancy.id,
        candidateId,
        initialStatus: 'screening',
        internal_notes: 'Found with CRM Match',
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.error || 'Could not add candidate to job.')
      setAddingMatchId(null)
      return
    }

    if (data.application) {
      setApps(current => [data.application, ...current])

      setMatchResults(current =>
        current?.map(candidate =>
          candidate.id === candidateId
            ? {
                ...candidate,
                alreadyPresented: true,
                alreadyAdded: true,
              }
            : candidate,
        ) ?? null,
      )
    }

    setAddingMatchId(null)
  }

  function buildLinkedinSearchQuery() {
  const role = vacancy.sector || vacancy.title || ''

  const skills = vacancy.subject_area
    ? vacancy.subject_area
        .split(',')
        .slice(0, 3)
        .map((s: string) => s.trim())
        .filter(Boolean)
        .join(' OR ')
    : ''

  const loc = linkedinLocation || vacancy.location || vacancy.region || ''
  const areas =
    nearbyAreas.length > 0
      ? nearbyAreas.slice(0, 5).filter(Boolean)
      : [loc].filter(Boolean)

  const roleTerms = linkedinKeywords || role

  const locationTerms = areas.map(area => `"${area}"`).join(' OR ')
  const skillTerms = skills ? ` "${skills.replace(/ OR /g, '" OR "')}"` : ''

  return `site:linkedin.com/in ${
    roleTerms ? `"${roleTerms}"` : ''
  }${skillTerms}${locationTerms ? ` (${locationTerms})` : ''}`.trim()
}

function buildLinkedinUrl() {
  return `https://www.google.com/search?q=${encodeURIComponent(
    buildLinkedinSearchQuery(),
  )}`
}

  async function loadNearbyAreas() {
    if (!vacancy.postcode && !vacancy.lat) return

    setLoadingAreas(true)

    try {
      const postcode = vacancy.postcode || ''
      const clean = postcode.replace(/\s/g, '').toUpperCase()

      if (clean) {
        const res = await fetch(
          `https://api.postcodes.io/postcodes/${clean}/nearest?limit=10&radius=${
            linkedinRadius * 1609
          }`,
        )

        if (res.ok) {
          const data = await res.json()
          const areas = [
            ...new Set(
              (data.result ?? [])
                .map((postcodeResult: any) => postcodeResult.admin_district)
                .filter(Boolean),
            ),
          ] as string[]

          setNearbyAreas(areas.slice(0, 6))
        }
      }
    } catch {}

    setLoadingAreas(false)
  }

  const standardSubjects = Array.from(
  new Set(
    standardOptions
      .map(standard => standard.route)
      .filter((route): route is string => Boolean(route)),
  ),
).sort((a, b) => a.localeCompare(b))

async function generateLinkedinOutreachMessage() {
  setGeneratingLinkedinOutreach(true)

  const client = Array.isArray(vacancy.clients)
    ? vacancy.clients[0] ?? null
    : vacancy.clients ?? null

  const res = await fetch('/api/crm/vacancy-linkedin-outreach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message_type: linkedinOutreachType,
      extra_context: linkedinOutreachContext.trim(),
      linkedin_search_query: buildLinkedinSearchQuery(),
      vacancy: {
        id: vacancy.id,
        title: vacancy.title,
        sector: vacancy.sector,
        role_type: vacancy.role_type,
        subject_area: vacancy.subject_area,
        type: vacancy.type,
        location: vacancy.location,
        region: vacancy.region,
        work_type: vacancy.work_type,
        salary_display: vacancy.salary_display,
        description: vacancy.description,
        anonymous_description: vacancy.anonymous_description,
        employer_job_description: vacancy.employer_job_description,
        briefing_notes: vacancy.briefing_notes,
        advertising_notes: vacancy.advertising_notes,
      },
      client: {
        id: client?.id,
        company_name: client?.company_name,
        website: client?.website,
      },
    }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    alert(data?.error || 'Could not generate LinkedIn outreach message.')
    setGeneratingLinkedinOutreach(false)
    return
  }

  setLinkedinOutreachMessage(data?.message || '')
  setGeneratingLinkedinOutreach(false)
}

async function copyLinkedinOutreachMessage() {
  if (!linkedinOutreachMessage) return

  await navigator.clipboard.writeText(linkedinOutreachMessage)

  setLinkedinOutreachCopied(true)
  setTimeout(() => setLinkedinOutreachCopied(false), 2000)
}

const filteredStandardOptions = standardOptions.filter(standard => {
  const subjectMatches =
    standardSubjectFilter === 'all' || standard.route === standardSubjectFilter

  const search = standardSearch.trim().toLowerCase()

  const searchMatches =
    !search ||
    [
      standard.label,
      standard.route,
      standard.level ? `level ${standard.level}` : '',
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(search)

  return subjectMatches && searchMatches
})

  const filteredApps = apps.filter(
    app => stageFilter === 'all' || app.status === stageFilter,
  )

  const availableCandidates = allCandidates.filter(
    candidate => !presentedIds.has(candidate.id),
  )

  const selectedCandidateRecord = availableCandidates.find(
  candidate => candidate.id === selectedCandidate,
)

const filteredCandidateOptions = useMemo(() => {
  const term = candidateSearch.toLowerCase().trim()

  const orderedCandidates = [...availableCandidates].sort((a, b) => {
    const aName = `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim()
    const bName = `${b.first_name ?? ''} ${b.last_name ?? ''}`.trim()
    return aName.localeCompare(bName)
  })

  if (!term) return orderedCandidates.slice(0, 30)

  return orderedCandidates
    .filter(candidate => {
      const fullName = `${candidate.first_name ?? ''} ${candidate.last_name ?? ''}`.toLowerCase()
      const email = String(candidate.email ?? '').toLowerCase()
      const phone = String(candidate.phone ?? '').toLowerCase()
      const postcode = String(candidate.postcode ?? '').toLowerCase()
      const jobTitle = String(candidate.job_title ?? '').toLowerCase()
      const role = String(
        candidate.sub_role_type ||
          candidate.seeking_role_type ||
          candidate.main_role_type ||
          '',
      ).toLowerCase()

      return (
        fullName.includes(term) ||
        email.includes(term) ||
        phone.includes(term) ||
        postcode.includes(term) ||
        jobTitle.includes(term) ||
        role.includes(term)
      )
    })
    .slice(0, 50)
}, [availableCandidates, candidateSearch])

  return (
    <div className="crm-page">
      <div className="crm-page-header">
        <div>
          <div className="crm-breadcrumb">
            <Link href="/crm/vacancies" className="crm-breadcrumb-link">
              Vacancies
            </Link>
            <span>/</span>
            <span>{vacancy.title}</span>
          </div>

          <div className="crm-lead-header-title">
            <h1 className="crm-page-title">{vacancy.title}</h1>

            {vacancy.clients && (
              <span className="crm-badge crm-badge-blue">
                {vacancy.clients.company_name}
              </span>
            )}

            {vacancy.sector && (
              <span
                className="crm-badge"
                style={{
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                }}
              >
                {vacancy.sector}
              </span>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 6,
              flexWrap: 'wrap',
            }}
          >
            {vacancy.location && (
              <span
                style={{
                  fontSize: 13,
                  color: 'var(--text-muted)',
                  fontWeight: 500,
                }}
              >
                📍 {vacancy.location}
                {vacancy.region ? `, ${vacancy.region}` : ''}
              </span>
            )}

            {vacancy.salary_display && (
              <span
                style={{
                  fontSize: 13,
                  color: 'var(--text-muted)',
                  fontWeight: 500,
                }}
              >
                💷 {vacancy.salary_display}
              </span>
            )}

            {vacancy.type && (
              <span
                style={{
                  fontSize: 13,
                  color: 'var(--text-muted)',
                  fontWeight: 500,
                }}
              >
                📋 {vacancy.type}
              </span>
            )}
          </div>
        </div>

<button
  type="button"
  className="crm-btn-ghost"
  onClick={() => {
    setEditVacancyForm({
      title: vacancy.title ?? '',
      sector: vacancy.sector ?? '',
      role_type: vacancy.role_type ?? '',
      type: vacancy.type ?? '',
      location: vacancy.location ?? '',
      region: vacancy.region ?? '',
      postcode: vacancy.postcode ?? '',
      work_type: vacancy.work_type ?? '',
      salary_display: vacancy.salary_display ?? '',
      salary_min: vacancy.salary_min?.toString() ?? '',
      salary_max: vacancy.salary_max?.toString() ?? '',
      subject_area: vacancy.subject_area ?? '',
    })
    setShowEditVacancy(true)
  }}
>
  Edit Vacancy
</button>

        <div
  style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
  }}
>
  <p
    style={{
      margin: 0,
      fontSize: 11,
      fontWeight: 900,
      color: 'var(--text-muted)',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    }}
  >
    Vacancy status
  </p>

  <div
    style={{
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
    }}
  >
    {VACANCY_STATUS_OPTIONS.map(option => {
      const active = vacancy.status === option.value
      const style =
        VACANCY_STATUS_STYLES[option.value] || VACANCY_STATUS_STYLES.draft

      return (
        <button
          key={option.value}
          type="button"
          onClick={() => updateVacancyStatus(option.value)}
          style={{
            border: `1.5px solid ${active ? style.border : 'var(--border)'}`,
            background: active ? style.bg : '#fff',
            color: active ? style.text : 'var(--text-muted)',
            borderRadius: 999,
            padding: '8px 11px',
            fontSize: 12,
            fontWeight: 900,
            fontFamily: 'inherit',
            cursor: 'pointer',
            textTransform: 'capitalize',
            boxShadow: active ? '0 8px 18px rgba(15,23,42,0.08)' : 'none',
          }}
        >
          {option.dot} {option.label}
        </button>
      )
    })}
  </div>

  <p
    style={{
      margin: 0,
      fontSize: 11,
      color: 'var(--text-muted)',
      textAlign: 'right',
      maxWidth: 320,
      lineHeight: 1.4,
    }}
  >
    Only vacancies marked Live appear on the public website.
  </p>
</div>
      </div>

      <div className="crm-tabs">
        {[
          { id: 'description', label: '📄 Description' },
          { id: 'briefing', label: '📋 Briefing' },
          { id: 'applications', label: `📌 Applications (${apps.length})` },
          { id: 'match', label: '✦ Match' },
          { id: 'portal', label: '🔐 Portal' },
        ].map(tab => (
          <button
            key={tab.id}
            className={`crm-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id as any)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'portal' && (
  <VacancyPortalAccessPanel
    vacancyId={vacancy.id}
    clientId={vacancy.client_id}
    portalUsers={portalUsers}
    initialAccess={portalAccess}
  />
)}
      
      {activeTab === 'description' && (
        <div className="vd-tab-content">
          <div className="vd-desc-layout">
            <div className="vd-desc-left">
              <div className="crm-card">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                  }}
                >
                  <h3 className="crm-card-title">Job Description</h3>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="crm-btn-ghost crm-btn-sm"
                      style={
                        descMode === 'ai'
                          ? {
                              background: 'var(--primary)',
                              color: 'var(--white)',
                              borderColor: 'var(--primary)',
                            }
                          : {}
                      }
                      onClick={() => setDescMode('ai')}
                    >
                      ✦ AI Generate
                    </button>

                    <button
                      className="crm-btn-ghost crm-btn-sm"
                      style={
                        descMode === 'manual'
                          ? {
                              background: 'var(--primary)',
                              color: 'var(--white)',
                              borderColor: 'var(--primary)',
                            }
                          : {}
                      }
                      onClick={() => setDescMode('manual')}
                    >
                      ✏ Manual
                    </button>
                  </div>
                </div>

                {descMode === 'ai' && (
                  <>
                    <p
                      style={{
                        fontSize: 13,
                        color: 'var(--text-muted)',
                        marginBottom: 12,
                        lineHeight: 1.6,
                      }}
                    >
                      Upload the client&apos;s brief or paste it below. Claude
                      will generate a polished advert and anonymous job pack.
                    </p>

                    <div
                      className={`vd-dropzone${
                        dragOver ? ' vd-dropzone-over' : ''
                      }${uploadedFileName ? ' vd-dropzone-done' : ''}`}
                      onClick={() => fileRef.current?.click()}
                      onDragOver={e => {
                        e.preventDefault()
                        setDragOver(true)
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={e => {
                        e.preventDefault()
                        setDragOver(false)
                        const file = e.dataTransfer.files?.[0]
                        if (file) processFile(file)
                      }}
                    >
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (file) processFile(file)
                        }}
                      />

                      {uploading ? (
                        <>
                          <span style={{ fontSize: 18 }}>⏳</span>
                          <span style={{ fontWeight: 600 }}>
                            Reading file...
                          </span>
                        </>
                      ) : uploadedFileName ? (
                        <>
                          <span style={{ fontSize: 18 }}>📄</span>
                          <span
                            style={{
                              fontWeight: 700,
                              color: 'var(--primary)',
                            }}
                          >
                            {uploadedFileName}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: 'var(--text-muted)',
                            }}
                          >
                            Click to replace
                          </span>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: 24 }}>📎</span>
                          <span style={{ fontWeight: 700 }}>
                            Drop file here or click to upload
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: 'var(--text-muted)',
                            }}
                          >
                            PDF, Word or TXT
                          </span>
                        </>
                      )}
                    </div>

                    <textarea
                      className="crm-input"
                      rows={10}
                      placeholder="Or paste the job description / brief here..."
                      value={jdText}
                      onChange={e => setJdText(e.target.value)}
                      style={{ lineHeight: 1.7 }}
                    />

                    {genError && (
                      <p
                        style={{
                          fontSize: 12,
                          color: '#e53e3e',
                          marginTop: 8,
                          fontWeight: 600,
                        }}
                      >
                        {genError}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                      <button
                        className="crm-btn-ghost"
                        style={{ flex: 1, justifyContent: 'center' }}
                        onClick={saveEmployerJobDescription}
                        disabled={savingDesc || !jdText.trim()}
                      >
                        {savingDesc ? 'Saving...' : 'Save employer JD'}
                      </button>

                      <button
                        className="crm-btn-ai"
                        style={{ flex: 1, justifyContent: 'center' }}
                        onClick={generateAdvert}
                        disabled={generating || !jdText.trim()}
                      >
                        {generating
                          ? '✦ Generating...'
                          : '✦ Generate Advert + Anonymous Pack'}
                      </button>
                    </div>

                    {descSaved && (
                      <p
                        style={{
                          fontSize: 12,
                          color: '#217822',
                          fontWeight: 700,
                          textAlign: 'center',
                          marginTop: 8,
                        }}
                      >
                        ✓ Saved
                      </p>
                    )}
                  </>
                )}

                {storedVacancyDocs.length > 0 && (
                  <div
                    style={{
                      marginTop: 14,
                      marginBottom: 12,
                      padding: 12,
                      borderRadius: 10,
                      background: 'var(--light-bg)',
                      border: '1px solid var(--border-light)',
                    }}
                  >
                    <p className="crm-card-title" style={{ marginBottom: 8 }}>
                      Stored client job descriptions
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      {storedVacancyDocs.map(doc => (
                        <div
                          key={doc.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 10,
                            alignItems: 'center',
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <p
                              style={{
                                fontSize: 13,
                                fontWeight: 800,
                                color: 'var(--text-dark)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {doc.name}
                            </p>

                            <p
                              style={{
                                fontSize: 11,
                                color: 'var(--text-muted)',
                              }}
                            >
                              {doc.doc_type?.replace(/_/g, ' ') ||
                                'job description'}
                            </p>
                          </div>

                          {documentHasStoredFile(doc) ? (
  <button
    type="button"
    onClick={() => openStoredVacancyDocument(doc)}
    disabled={openingStoredDocId === doc.id}
    className="crm-btn-ghost crm-btn-sm"
    style={{ flexShrink: 0 }}
  >
    {openingStoredDocId === doc.id ? 'Opening...' : 'Open ↗'}
  </button>
) : (
  <span
    style={{
      fontSize: 11,
      color: 'var(--text-muted)',
      fontWeight: 700,
      flexShrink: 0,
    }}
  >
    No file
  </span>
)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {storingDoc && (
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      marginBottom: 8,
                    }}
                  >
                    Saving job description to vacancy...
                  </p>
                )}

                {storedDocError && (
                  <p
                    style={{
                      fontSize: 12,
                      color: '#e53e3e',
                      marginBottom: 8,
                      fontWeight: 700,
                    }}
                  >
                    {storedDocError}
                  </p>
                )}

                {descMode === 'manual' && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 13,
                        color: 'var(--text-muted)',
                        lineHeight: 1.6,
                      }}
                    >
                      Paste or type the job advert directly. Use{' '}
                      <strong>**Heading**</strong> for bold headings and{' '}
                      <strong>- item</strong> for bullet points.
                    </p>

                    <div className="crm-field">
                      <label className="crm-label">
                        Job advert{' '}
                        <span
                          style={{
                            fontWeight: 400,
                            color: 'var(--text-muted)',
                          }}
                        >
                          (shown on website — no employer name)
                        </span>
                      </label>

                      <textarea
                        className="crm-input"
                        rows={12}
                        placeholder="Paste or type the job advert here..."
                        value={manualAdvert}
                        onChange={e => setManualAdvert(e.target.value)}
                        style={{ lineHeight: 1.7, fontFamily: 'inherit' }}
                      />
                    </div>

                    <div className="crm-field">
                      <label className="crm-label">
                        Anonymous job pack{' '}
                        <span
                          style={{
                            fontWeight: 400,
                            color: 'var(--text-muted)',
                          }}
                        >
                          (sent to candidates)
                        </span>
                      </label>

                      <textarea
                        className="crm-input"
                        rows={8}
                        placeholder="Paste the anonymous version here. Replace employer name with 'A leading training provider in [region]'..."
                        value={manualAnon}
                        onChange={e => setManualAnon(e.target.value)}
                        style={{ lineHeight: 1.7, fontFamily: 'inherit' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        className="crm-btn-ghost"
                        style={{ flex: 1 }}
                        disabled={savingDesc || !manualAdvert.trim()}
                        onClick={() => saveDesc(manualAdvert, manualAnon, false)}
                      >
                        {savingDesc ? 'Saving...' : 'Save as draft'}
                      </button>

                      <button
                        className="crm-btn-primary"
                        style={{ flex: 1, background: '#217822' }}
                        disabled={savingDesc || !manualAdvert.trim()}
                        onClick={() => saveDesc(manualAdvert, manualAnon, true)}
                      >
                        {savingDesc ? 'Saving...' : '🟢 Save & go live'}
                      </button>
                    </div>

                    {descSaved && (
                      <p
                        style={{
                          fontSize: 12,
                          color: '#217822',
                          fontWeight: 700,
                          textAlign: 'center',
                        }}
                      >
                        ✓ Saved
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="vd-desc-right">
              {generated ? (
                <>
                  {generated.key_requirements?.length > 0 && (
                    <div className="crm-card" style={{ marginBottom: 14 }}>
                      <p className="crm-card-title" style={{ marginBottom: 10 }}>
                        Key requirements
                      </p>

                      <ul
                        style={{
                          listStyle: 'none',
                          padding: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        {generated.key_requirements.map((requirement: string) => (
                          <li
                            key={requirement}
                            style={{
                              fontSize: 13,
                              color: 'var(--text-dark)',
                              paddingLeft: 16,
                              position: 'relative',
                            }}
                          >
                            <span
                              style={{
                                position: 'absolute',
                                left: 0,
                                color: 'var(--primary)',
                                fontWeight: 700,
                              }}
                            >
                              →
                            </span>
                            {requirement}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="crm-card" style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 12,
                      }}
                    >
                      <p className="crm-card-title">Job Advert (website)</p>
                      <span
                        className="crm-badge"
                        style={{
                          background: '#e8f5e8',
                          color: '#217822',
                          fontSize: 10,
                        }}
                      >
                        Employer anonymous
                      </span>
                    </div>

                    <textarea
                      className="crm-input"
                      rows={14}
                      value={editedAdvert}
                      onChange={e => setEditedAdvert(e.target.value)}
                      style={{ lineHeight: 1.7, fontFamily: 'inherit' }}
                    />
                  </div>

                  <div className="crm-card" style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 12,
                      }}
                    >
                      <p className="crm-card-title">Anonymous Job Pack</p>
                      <span
                        className="crm-badge"
                        style={{
                          background: '#f3f0ff',
                          color: '#7c3aed',
                          fontSize: 10,
                        }}
                      >
                        For candidates
                      </span>
                    </div>

                    <textarea
                      className="crm-input"
                      rows={12}
                      value={editedAnon}
                      onChange={e => setEditedAnon(e.target.value)}
                      style={{ lineHeight: 1.7, fontFamily: 'inherit' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      className="crm-btn-ghost"
                      style={{ flex: 1 }}
                      disabled={savingDesc}
                      onClick={() => saveDesc(editedAdvert, editedAnon, false)}
                    >
                      {savingDesc ? 'Saving...' : 'Save as draft'}
                    </button>

                    <button
                      className="crm-btn-primary"
                      style={{ flex: 1, background: '#217822' }}
                      disabled={savingDesc}
                      onClick={() => saveDesc(editedAdvert, editedAnon, true)}
                    >
                      {savingDesc ? 'Saving...' : '🟢 Save & go live'}
                    </button>
                  </div>

                  {descSaved && (
                    <p
                      style={{
                        fontSize: 12,
                        color: '#217822',
                        fontWeight: 700,
                        textAlign: 'center',
                        marginTop: 8,
                      }}
                    >
                      ✓ Saved
                    </p>
                  )}
                </>
              ) : vacancy.description ? (
                <div className="crm-card">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                    }}
                  >
                    <p className="crm-card-title">Current job advert</p>
                    <span
                      className="crm-badge"
                      style={{
                        background:
                          vacancy.status === 'live' ? '#e8f5e8' : '#f0f0f2',
                        color:
                          vacancy.status === 'live' ? '#217822' : '#737373',
                      }}
                    >
                      {vacancy.status}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--text-dark)',
                      lineHeight: 1.75,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {vacancy.description}
                  </div>
                </div>
              ) : (
                <div
                  className="crm-card"
                  style={{ textAlign: 'center', padding: '48px 24px' }}
                >
                  <p style={{ fontSize: 32, marginBottom: 12 }}>📄</p>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text-dark)',
                      marginBottom: 6,
                    }}
                  >
                    No advert yet
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Use AI Generate or Manual to create one
                  </p>
                </div>
              )}

              <CandidateVacancyPackPanel
                vacancyId={vacancy.id}
                initialPackText={vacancy.candidate_pack_text}
                initialGeneratedAt={vacancy.candidate_pack_generated_at}
                onGenerated={updatedVacancy =>
                  setVacancy(current => ({
                    ...current,
                    ...updatedVacancy,
                  }))
                }
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'briefing' && (
        <div className="crm-card vd-tab-content">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
            }}
          >
            <div className="crm-field">
              <label className="crm-label">Reason for vacancy</label>
              <select
                className="crm-select"
                value={briefing.reason_for_vacancy}
                onChange={e =>
                  setBriefing(form => ({
                    ...form,
                    reason_for_vacancy: e.target.value,
                  }))
                }
              >
                <option value="">Select...</option>
                <option value="new_hire">New hire / growth</option>
                <option value="replacement">Replacement</option>
                <option value="restructure">Restructure</option>
                <option value="maternity">Maternity / paternity cover</option>
                <option value="contract">Contract / project work</option>
              </select>
            </div>

            <div className="crm-field">
              <label className="crm-label">Target fill date</label>
              <input
                className="crm-input"
                type="date"
                value={briefing.target_fill_date}
                onChange={e =>
                  setBriefing(form => ({
                    ...form,
                    target_fill_date: e.target.value,
                  }))
                }
              />
            </div>

            <div className="crm-field">
              <label className="crm-label">Fee / billing info</label>
              <input
                className="crm-input"
                placeholder="e.g. 15% of salary, invoiced on start"
                value={briefing.fee_info}
                onChange={e =>
                  setBriefing(form => ({
                    ...form,
                    fee_info: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="crm-field" style={{ marginTop: 16 }}>
              <label className="crm-label">
                Office postcode{' '}
                <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
                  (for candidate radius matching)
                </span>
              </label>

              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="crm-input"
                  placeholder="e.g. B1 1BB"
                  value={briefing.postcode}
                  onChange={e =>
                    setBriefing(form => ({
                      ...form,
                      postcode: e.target.value,
                    }))
                  }
                  style={{ maxWidth: 200 }}
                />

                <button
                  className="crm-btn-ghost"
                  onClick={lookupPostcode}
                  disabled={!briefing.postcode}
                >
                  Look up →
                </button>
              </div>

              {postcodeError && (
                <p
                  style={{
                    fontSize: 12,
                    color: '#e53e3e',
                    marginTop: 4,
                    fontWeight: 600,
                  }}
                >
                  {postcodeError}
                </p>
              )}

              {vacancy.lat && vacancy.lng && (
                <p
                  style={{
                    fontSize: 12,
                    color: '#217822',
                    marginTop: 4,
                    fontWeight: 600,
                  }}
                >
                  ✓ Coordinates saved — radius matching enabled
                </p>
              )}
            </div>

          <div className="crm-field" style={{ marginTop: 16 }}>
            <label className="crm-label">
              Briefing notes{' '}
              <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
                (internal only)
              </span>
            </label>
            <textarea
              className="crm-input"
              rows={4}
              placeholder="What did the client say? Personality fit, red flags, urgency..."
              value={briefing.briefing_notes}
              onChange={e =>
                setBriefing(form => ({
                  ...form,
                  briefing_notes: e.target.value,
                }))
              }
            />
          </div>

          <div className="crm-field" style={{ marginTop: 12 }}>
            <label className="crm-label">Advertising strategy</label>
            <textarea
              className="crm-input"
              rows={3}
              placeholder="Where are we advertising? Exclusivity? Timelines..."
              value={briefing.advertising_notes}
              onChange={e =>
                setBriefing(form => ({
                  ...form,
                  advertising_notes: e.target.value,
                }))
              }
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: 16,
            }}
          >
            <button
              className="crm-btn-primary"
              onClick={saveBriefing}
              disabled={savingBriefing}
            >
              {savingBriefing ? 'Saving...' : 'Save briefing'}
            </button>
          </div>

          {briefingSaved && (
            <p
              style={{
                fontSize: 12,
                color: '#217822',
                fontWeight: 700,
                textAlign: 'right',
                marginTop: 6,
              }}
            >
              ✓ Saved
            </p>
          )}
        </div>
      )}

      {activeTab === 'applications' && (
        <div className="vd-tab-content">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div
              className="crm-status-filters"
              style={{ overflowX: 'auto', flexWrap: 'nowrap' }}
            >
              {['all', ...APP_STAGES].map(stage => (
                <button
                  key={stage}
                  className={`crm-status-filter${
                    stageFilter === stage ? ' active' : ''
                  }`}
                  onClick={() => setStageFilter(stage)}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {stage === 'all' ? 'All' : stage.replace(/_/g, ' ')}

                  {stage !== 'all' &&
                    apps.filter(app => app.status === stage).length > 0 && (
                      <span className="crm-filter-count">
                        {apps.filter(app => app.status === stage).length}
                      </span>
                    )}
                </button>
              ))}
            </div>

            <button
  className="crm-btn-primary"
  onClick={() => setShowAddCandidate(true)}
>
  + Add Application
</button>
          </div>

          <div className="crm-pipeline">
            {filteredApps.map(app => {
              const isClientFacing = CLIENT_STAGES.includes(app.status)
              const isReadyToPresent = app.status === 'ready_to_present'

              return (
                <div
                  key={app.id}
                  className={`crm-pipeline-card${
                    isClientFacing ? ' crm-pipeline-card-client' : ''
                  }`}
                >
                  <div className="crm-pipeline-card-top">
                    <div>
                      {app.candidates?.id ? (
  <Link
    href={`/crm/candidates/${app.candidates.id}`}
    className="crm-pipeline-name"
    style={{
      textDecoration: 'none',
      color: 'var(--primary)',
      fontWeight: 800,
    }}
  >
    {app.candidates?.first_name} {app.candidates?.last_name}
  </Link>
) : (
  <Link
  href={`/crm/applications/${app.id}`}
  className="crm-pipeline-name"
  style={{
    textDecoration: 'none',
    color: 'var(--primary)',
    fontWeight: 900,
  }}
>
  {app.candidates?.first_name} {app.candidates?.last_name}
</Link>
)}
                      <p className="crm-pipeline-role">
                        {app.candidates?.job_title || app.candidates?.email}
                      </p>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: 6,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        justifyContent: 'flex-end',
                      }}
                    >
                      {!isClientFacing && (
  <button
    className="crm-btn-primary crm-btn-sm"
    style={{ background: '#217822' }}
    disabled={sharingAppId === app.id}
    onClick={() =>
      shareWithEmployerPortal(app.id, app.candidates?.id)
    }
  >
    {sharingAppId === app.id
      ? 'Sharing...'
      : isReadyToPresent
        ? 'Share with employer portal →'
        : 'Move to presented + share →'}
  </button>
)}

                      <select
                        className="crm-select crm-select-sm"
                        value={app.status}
                        onChange={e => updateAppStatus(app.id, e.target.value)}
                      >
                        {APP_STAGES.map(stage => (
                          <option key={stage} value={stage}>
                            {stage.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="crm-pipeline-card-footer">
                    <span
                      className="crm-badge"
                      style={{
                        background: STAGE_COLOURS[app.status]?.bg,
                        color: STAGE_COLOURS[app.status]?.text,
                      }}
                    >
                      {app.status.replace(/_/g, ' ')}
                    </span>

                    {isClientFacing && (
                      <span
                        className="crm-badge"
                        style={{
                          background: '#e8f5e8',
                          color: '#217822',
                          fontSize: 10,
                        }}
                      >
                        Visible to client
                      </span>
                    )}

                    <div className="crm-pipeline-links">
  <Link
    href={`/crm/applications/${app.id}`}
    className="crm-pipeline-link"
    style={{ fontWeight: 900 }}
  >
    Open application
  </Link>

  {app.candidates?.id && (
    <Link
      href={`/crm/candidates/${app.candidates.id}`}
      className="crm-pipeline-link"
    >
      Candidate profile
    </Link>
  )}

  {app.cv_url && (
    <a
      href={app.cv_url}
      target="_blank"
      rel="noopener noreferrer"
      className="crm-pipeline-link"
    >
      CV ↓
    </a>
  )}
</div>
                  </div>
                </div>
              )
            })}

            {filteredApps.length === 0 && (
              <div className="crm-pipeline-empty">
                <p>
  No applications{' '}
  {stageFilter !== 'all' ? `in "${stageFilter}"` : 'added yet'}.
</p>
                <button
                  className="crm-btn-primary crm-btn-sm"
                  onClick={() => setShowAddCandidate(true)}
                >
                  Add application
                </button>
              </div>
            )}
          </div>

          {showAddCandidate && (
  <>
    <div
      className="crm-modal-backdrop"
      onClick={() => {
        setShowAddCandidate(false)
        setSelectedCandidate('')
        setCandidateSearch('')
        setCandidateDocs([])
        setSelectedDocIds([])
      }}
    />

    <div className="crm-modal">
      <div className="crm-modal-header">
        <h2 className="crm-modal-title">Add Application</h2>

        <button
          className="crm-modal-close"
          onClick={() => {
            setShowAddCandidate(false)
            setSelectedCandidate('')
            setCandidateSearch('')
            setCandidateDocs([])
            setSelectedDocIds([])
          }}
        >
          ✕
        </button>
      </div>

      <div className="crm-modal-form">
        <div className="crm-field">
          <label className="crm-label">Candidate *</label>

          <input
            className="crm-input"
            placeholder="Search by name, email, phone, postcode or role..."
            value={candidateSearch}
            onChange={e => setCandidateSearch(e.target.value)}
          />

          {selectedCandidateRecord && (
            <div
              style={{
                marginTop: 8,
                padding: 10,
                borderRadius: 10,
                background: '#e8f5e8',
                border: '1px solid #bbf7d0',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    color: 'var(--text-dark)',
                  }}
                >
                  Selected: {selectedCandidateRecord.first_name}{' '}
                  {selectedCandidateRecord.last_name}
                </p>

                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    marginTop: 2,
                  }}
                >
                  {[
                    selectedCandidateRecord.job_title ||
                      selectedCandidateRecord.sub_role_type ||
                      selectedCandidateRecord.seeking_role_type ||
                      selectedCandidateRecord.main_role_type,
                    selectedCandidateRecord.postcode,
                    selectedCandidateRecord.email,
                    selectedCandidateRecord.phone,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Candidate selected'}
                </p>
              </div>

              <button
                type="button"
                className="crm-btn-ghost crm-btn-sm"
                onClick={() => {
                  setSelectedCandidate('')
                  setCandidateSearch('')
                  setCandidateDocs([])
                  setSelectedDocIds([])
                }}
              >
                Clear
              </button>
            </div>
          )}

          <div
            style={{
              marginTop: 8,
              border: '1px solid var(--border-light)',
              borderRadius: 10,
              overflow: 'hidden',
              maxHeight: 280,
              overflowY: 'auto',
              background: '#fff',
            }}
          >
            {filteredCandidateOptions.map(candidate => {
              const fullName = `${candidate.first_name ?? ''} ${
                candidate.last_name ?? ''
              }`.trim()

              const isSelected = candidate.id === selectedCandidate

              return (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => {
                    setSelectedCandidate(candidate.id)
                    setCandidateSearch(fullName)
                    loadCandidateDocs(candidate.id)
                  }}
                  style={{
                    width: '100%',
                    border: 0,
                    borderBottom: '1px solid var(--border-light)',
                    background: isSelected ? 'var(--primary-light)' : '#fff',
                    padding: 10,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 900,
                      color: 'var(--text-dark)',
                    }}
                  >
                    {fullName || 'Unnamed candidate'}
                  </p>

                  <p
                    style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      marginTop: 2,
                    }}
                  >
                    {[
                      candidate.job_title ||
                        candidate.sub_role_type ||
                        candidate.seeking_role_type ||
                        candidate.main_role_type,
                      candidate.postcode,
                      candidate.email,
                      candidate.phone,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'No details recorded'}
                  </p>
                </button>
              )
            })}

            {filteredCandidateOptions.length === 0 && (
              <p
                style={{
                  padding: 12,
                  fontSize: 12,
                  color: 'var(--text-muted)',
                }}
              >
                No candidates found.
              </p>
            )}
          </div>

          {!selectedCandidate && (
            <p
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                marginTop: 6,
              }}
            >
              Start typing to search candidates, then click one to select.
            </p>
          )}
        </div>

        {loadingDocs && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Loading documents...
          </p>
        )}

        {candidateDocs.length > 0 && (
          <div className="crm-field">
            <label className="crm-label">
              Documents to prepare{' '}
              <span
                style={{
                  fontWeight: 400,
                  color: 'var(--text-muted)',
                }}
              >
                (select which to share later)
              </span>
            </label>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                marginTop: 4,
              }}
            >
              {candidateDocs.map(doc => (
                <label
                  key={doc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    padding: '8px 12px',
                    background: selectedDocIds.includes(doc.id)
                      ? 'var(--primary-light)'
                      : 'var(--light-bg)',
                    borderRadius: 8,
                    border: `1.5px solid ${
                      selectedDocIds.includes(doc.id)
                        ? 'var(--primary)'
                        : 'var(--border)'
                    }`,
                    transition: 'all 0.15s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedDocIds.includes(doc.id)}
                    onChange={e =>
                      setSelectedDocIds(prev =>
                        e.target.checked
                          ? [...prev, doc.id]
                          : prev.filter(id => id !== doc.id),
                      )
                    }
                    style={{
                      width: 16,
                      height: 16,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  />

                  <div>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--text-dark)',
                      }}
                    >
                      {doc.name}
                    </p>

                    <p
                      style={{
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        textTransform: 'capitalize',
                      }}
                    >
                      {String(doc.doc_type || 'document').replace(/_/g, ' ')}
                    </p>
                  </div>

                  {doc.file_url && (
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        marginLeft: 'auto',
                        fontSize: 11,
                        color: 'var(--primary)',
                        fontWeight: 700,
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      Preview ↗
                    </a>
                  )}
                </label>
              ))}

              {selectedDocIds.length > 0 && (
                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--primary)',
                    fontWeight: 700,
                  }}
                >
                  {selectedDocIds.length} document
                  {selectedDocIds.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          </div>
        )}

        {selectedCandidate && !loadingDocs && candidateDocs.length === 0 && (
          <p
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              fontStyle: 'italic',
            }}
          >
            No documents on file — you can still add them to the job and upload
            later.
          </p>
        )}

        <div className="crm-modal-footer">
          <button
            className="crm-btn-ghost"
            onClick={() => {
              setShowAddCandidate(false)
              setSelectedCandidate('')
              setCandidateSearch('')
              setCandidateDocs([])
              setSelectedDocIds([])
            }}
          >
            Cancel
          </button>

          <button
            className="crm-btn-primary"
            disabled={!selectedCandidate || adding}
            onClick={addCandidate}
          >
            {adding ? 'Adding...' : 'Create Application'}
          </button>
        </div>
      </div>
    </div>
  </>
)}
        </div>
      )}

      {activeTab === 'match' && (
        <div className="vd-tab-content">
          <div className="crm-card" style={{ marginBottom: 16 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  background: '#0077b5',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </div>

              <div>
                <h3 className="crm-card-title">LinkedIn Candidate Search</h3>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    marginTop: 2,
                  }}
                >
                  Searches Google for LinkedIn profiles matching this role
                  within a radius of the location
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div className="crm-field">
                <label className="crm-label">Role keywords</label>
                <input
                  className="crm-input"
                  placeholder={vacancy.sector || vacancy.title || 'e.g. assessor, IQA'}
                  value={linkedinKeywords}
                  onChange={e => setLinkedinKeywords(e.target.value)}
                />
              </div>

              <div className="crm-field">
                <label className="crm-label">Primary location</label>
                <input
                  className="crm-input"
                  placeholder={vacancy.location || vacancy.region || 'e.g. Manchester'}
                  value={linkedinLocation}
                  onChange={e => setLinkedinLocation(e.target.value)}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 12,
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flex: 1,
                }}
              >
                <label className="crm-label" style={{ whiteSpace: 'nowrap' }}>
                  Radius
                </label>
                <input
                  type="range"
                  min={10}
                  max={60}
                  step={5}
                  value={linkedinRadius}
                  onChange={e => setLinkedinRadius(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--primary)',
                    minWidth: 50,
                  }}
                >
                  {linkedinRadius} mi
                </span>
              </div>

              <button
                className="crm-btn-ghost crm-btn-sm"
                onClick={loadNearbyAreas}
                disabled={loadingAreas || (!vacancy.postcode && !vacancy.lat)}
              >
                {loadingAreas ? 'Loading...' : '📍 Load nearby areas'}
              </button>
            </div>

            {nearbyAreas.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p className="crm-label" style={{ marginBottom: 6 }}>
                  Nearby areas included in search
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {nearbyAreas.map(area => (
                    <span
                      key={area}
                      className="crm-badge crm-badge-blue"
                      style={{ cursor: 'pointer' }}
                      onClick={() =>
                        setNearbyAreas(prev =>
                          prev.filter(currentArea => currentArea !== area),
                        )
                      }
                    >
                      {area} ✕
                    </span>
                  ))}
                </div>

                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    marginTop: 4,
                  }}
                >
                  Click a badge to remove it
                </p>
              </div>
            )}

            {!vacancy.postcode && !vacancy.lat && (
              <p
                style={{
                  fontSize: 12,
                  color: '#d97706',
                  fontWeight: 600,
                  marginBottom: 10,
                }}
              >
                ⚠ Add a postcode in the Briefing tab to enable nearby area
                loading
              </p>
            )}

            <div
              style={{
                background: 'var(--light-bg)',
                borderRadius: 8,
                padding: '10px 12px',
                marginBottom: 12,
                fontFamily: 'monospace',
                fontSize: 11,
                color: 'var(--text-muted)',
                lineHeight: 1.5,
                wordBreak: 'break-all',
              }}
            >
              {buildLinkedinUrl().replace(
                'https://www.google.com/search?q=',
                'google.com → ',
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <a
                href={buildLinkedinUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="crm-btn-primary"
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  textDecoration: 'none',
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                Search LinkedIn on Google
              </a>

              <button
                className="crm-btn-ghost"
                onClick={() => navigator.clipboard.writeText(buildLinkedinUrl())}
                style={{ flexShrink: 0 }}
              >
                Copy URL
              </button>
            </div>
            <div
  style={{
    marginTop: 14,
    paddingTop: 14,
    borderTop: '1px solid var(--border-light)',
    display: 'grid',
    gap: 12,
  }}
>
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      gap: 10,
      alignItems: 'flex-start',
      flexWrap: 'wrap',
    }}
  >
    <div>
      <p className="crm-card-title">LinkedIn outreach message</p>
      <p
        style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          marginTop: 3,
          lineHeight: 1.5,
        }}
      >
        Generate a short message to use when connecting with new candidates
        about this role. Employer details stay anonymous.
      </p>
    </div>

    {linkedinOutreachMessage && (
      <button
        type="button"
        className="crm-btn-ghost crm-btn-sm"
        onClick={copyLinkedinOutreachMessage}
      >
        {linkedinOutreachCopied ? '✓ Copied' : 'Copy message'}
      </button>
    )}
  </div>

  <div
    style={{
      display: 'grid',
      gridTemplateColumns: '220px 1fr',
      gap: 10,
    }}
  >
    <div className="crm-field">
      <label className="crm-label">Message type</label>
      <select
        className="crm-select crm-select-sm"
        value={linkedinOutreachType}
        onChange={event =>
          setLinkedinOutreachType(event.target.value as any)
        }
      >
        <option value="connection_request">Connection request</option>
        <option value="existing_connection">Existing connection</option>
        <option value="inmail">InMail-style message</option>
      </select>
    </div>

    <div className="crm-field">
      <label className="crm-label">Extra context</label>
      <input
        className="crm-input"
        value={linkedinOutreachContext}
        onChange={event => setLinkedinOutreachContext(event.target.value)}
        placeholder="Optional — e.g. mention hybrid working, immediate interviews, sector background, or avoid salary."
      />
    </div>
  </div>

  <button
    type="button"
    className="crm-btn-ai"
    onClick={generateLinkedinOutreachMessage}
    disabled={generatingLinkedinOutreach}
    style={{ justifyContent: 'center' }}
  >
    {generatingLinkedinOutreach
      ? '✦ Generating...'
      : '✦ Generate LinkedIn outreach'}
  </button>

  {linkedinOutreachMessage && (
    <div className="crm-field">
      <label className="crm-label">Generated message</label>
      <textarea
        className="crm-input"
        rows={7}
        value={linkedinOutreachMessage}
        onChange={event => setLinkedinOutreachMessage(event.target.value)}
        style={{ lineHeight: 1.6 }}
      />
    </div>
  )}
</div>
          </div>

          <div className="crm-card" style={{ marginBottom: 16 }}>
  <h3 className="crm-card-title" style={{ marginBottom: 14 }}>
    ✦ Candidate Matching
  </h3>

  <div className="crm-field" style={{ marginBottom: 12 }}>
  <label className="crm-label">Search type</label>
  <select
    className="crm-select"
    value={matchMode}
    onChange={e => setMatchMode(e.target.value as any)}
  >
    <option value="role_standard">Role + apprenticeship standard</option>
    <option value="role">Role only</option>
    <option value="standard">Apprenticeship standard only</option>
    <option value="keyword">Keyword search</option>
  </select>
</div>

  {(matchMode === 'role' || matchMode === 'role_standard') && (
  <div className="crm-card" style={{ marginBottom: 12, padding: 14 }}>
    <div style={{ marginBottom: 12 }}>
      <p className="crm-card-title">Role match</p>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
        Select the same role family and specific role used on candidate records.
      </p>
    </div>

    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
      }}
    >
      <div className="crm-field">
        <label className="crm-label">Main role type</label>
        <select
          className="crm-select"
          value={matchMainRoleType}
          onChange={e => {
            setMatchMainRoleType(e.target.value)
            setMatchSubRoleType('')
          }}
        >
          <option value="">Select role family...</option>

          {MAIN_ROLE_TYPES.map(roleType => (
            <option key={roleType} value={roleType}>
              {roleType}
            </option>
          ))}
        </select>
      </div>

      <div className="crm-field">
        <label className="crm-label">Specific role</label>
        <select
          className="crm-select"
          value={matchSubRoleType}
          onChange={e => setMatchSubRoleType(e.target.value)}
          disabled={!matchMainRoleType}
        >
          <option value="">
            {matchMainRoleType ? 'Select specific role...' : 'Select main role first'}
          </option>

          {matchMainRoleType &&
            ROLE_TYPE_HIERARCHY[matchMainRoleType]?.subTypes.map(role => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
        </select>
      </div>
    </div>

    {matchRoleQuery && (
      <p
        style={{
          fontSize: 11,
          color: 'var(--primary)',
          marginTop: 8,
          fontWeight: 700,
        }}
      >
        Matching against: {matchRoleQuery}
      </p>
    )}

    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
      Searches candidate main role type, specific role, seeking role and looking-for roles.
    </p>
  </div>
)}

{(matchMode === 'standard' || matchMode === 'role_standard') && (
  <div className="crm-card" style={{ marginBottom: 12, padding: 14 }}>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 12,
      }}
    >
      <div>
        <p className="crm-card-title">Apprenticeship standard</p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
          Choose a subject area first, then select the standard to match against.
        </p>
      </div>

      <span className="crm-badge crm-badge-blue">
        {filteredStandardOptions.length} found
      </span>
    </div>

    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '220px 1fr',
        gap: 10,
        marginBottom: 10,
      }}
    >
      <select
        className="crm-select"
        value={standardSubjectFilter}
        onChange={e => {
          setStandardSubjectFilter(e.target.value)
          setMatchStandardQuery('')
          setStandardSearch('')
        }}
        disabled={loadingStandards}
      >
        <option value="all">All subject areas</option>

        {standardSubjects.map(subject => (
          <option key={subject} value={subject}>
            {subject}
          </option>
        ))}
      </select>

      <input
        className="crm-input"
        placeholder="Search within selected subject area..."
        value={standardSearch}
        onChange={e => setStandardSearch(e.target.value)}
        disabled={loadingStandards}
      />
    </div>

    <select
      className="crm-select"
      value={matchStandardQuery}
      onChange={e => setMatchStandardQuery(e.target.value)}
      disabled={loadingStandards || filteredStandardOptions.length === 0}
    >
      <option value="">
        {loadingStandards
          ? 'Loading standards...'
          : 'Select apprenticeship standard...'}
      </option>

      {filteredStandardOptions.map(standard => (
        <option key={standard.id} value={standard.label}>
          {standard.label}
          {standard.level ? ` · Level ${standard.level}` : ''}
        </option>
      ))}
    </select>

    {standardsError && (
      <p
        style={{
          fontSize: 11,
          color: '#e53e3e',
          marginTop: 6,
          fontWeight: 700,
        }}
      >
        {standardsError}
      </p>
    )}

    {matchStandardQuery && (
      <p
        style={{
          fontSize: 11,
          color: 'var(--primary)',
          marginTop: 6,
          fontWeight: 700,
        }}
      >
        Matching against: {matchStandardQuery}
      </p>
    )}

    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
      Searches the candidate&apos;s can deliver, qualifications and notes.
    </p>
  </div>
)}

{matchMode === 'keyword' && (
  <div className="crm-field" style={{ marginBottom: 12 }}>
    <label className="crm-label">Keyword search</label>

    <input
      className="crm-input"
      placeholder="e.g. adult care assessor health social care trainer"
      value={matchKeywordQuery}
      onChange={e => setMatchKeywordQuery(e.target.value)}
    />
  </div>
)}

  <div style={{ marginBottom: 16 }}>
      <label className="crm-label">Search radius</label>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginTop: 8,
        }}
      >
        <input
          type="range"
          min={5}
          max={50}
          step={5}
          value={radius}
          onChange={e => setRadius(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--primary)',
            minWidth: 60,
          }}
        >
          {radius} miles
        </span>
      </div>

      {!vacancy.lat && !vacancy.postcode && (
        <p
          style={{
            fontSize: 12,
            color: '#d97706',
            fontWeight: 600,
            marginTop: 8,
          }}
        >
          ⚠ Add a postcode in the Briefing tab to enable precise radius matching
        </p>
      )}
    </div>

  <button
    className="crm-btn-ai"
    onClick={findMatches}
    disabled={matching}
    style={{ width: '100%', justifyContent: 'center' }}
  >
    {matching ? '✦ Searching...' : '✦ Find matching candidates'}
  </button>
</div>

          {matchError && (
            <p
              style={{
                fontSize: 13,
                color: '#e53e3e',
                fontWeight: 600,
              }}
            >
              {matchError}
            </p>
          )}

          {matchResults && (
            <div>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: 12,
                }}
              >
                {matchResults.length} candidate
                {matchResults.length !== 1 ? 's' : ''} found
              </p>

              <div className="candidate-match-results">
  {matchResults.map(candidate => (
    <CandidateMatchingCard
      key={candidate.id}
      candidate={{
        ...candidate,
        alreadyAdded:
          candidate.alreadyAdded ||
          candidate.alreadyPresented ||
          presentedIds.has(candidate.id),
      }}
      addingCandidateId={addingMatchId}
      onAdd={candidateToAdd => addMatchToJob(candidateToAdd.id)}
    />
  ))}

  {matchResults.length === 0 && (
    <div className="crm-pipeline-empty">
      <p>
        No matching candidates found. Try widening the radius or adding more
        candidates.
      </p>
    </div>
  )}
              </div>
            </div>
          )}
        </div>
      )}
      {showEditVacancy && (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15,23,42,0.45)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}
    onClick={() => setShowEditVacancy(false)}
  >
    <div
      className="crm-card"
      style={{
        width: '100%',
        maxWidth: 820,
        maxHeight: '90vh',
        overflowY: 'auto',
      }}
      onClick={e => e.stopPropagation()}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'flex-start',
          marginBottom: 18,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 22, color: 'var(--text-dark)' }}>
            Edit vacancy
          </h2>
          <p
            style={{
              margin: 0,
              marginTop: 5,
              fontSize: 13,
              color: 'var(--text-muted)',
            }}
          >
            Update the main vacancy details, salary, location and role information.
          </p>
        </div>

        <button
          type="button"
          className="crm-btn-ghost crm-btn-sm"
          onClick={() => setShowEditVacancy(false)}
        >
          Close
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 14,
        }}
      >
        <div className="crm-field" style={{ gridColumn: '1 / -1' }}>
          <label className="crm-label">Vacancy title</label>
          <input
            className="crm-input"
            value={editVacancyForm.title}
            onChange={e =>
              setEditVacancyForm(form => ({
                ...form,
                title: e.target.value,
              }))
            }
          />
        </div>

        <div className="crm-field">
          <label className="crm-label">Main role type</label>
          <input
            className="crm-input"
            placeholder="e.g. Delivery, Commercial"
            value={editVacancyForm.role_type}
            onChange={e =>
              setEditVacancyForm(form => ({
                ...form,
                role_type: e.target.value,
              }))
            }
          />
        </div>

        <div className="crm-field">
          <label className="crm-label">Specific role / sector</label>
          <input
            className="crm-input"
            placeholder="e.g. Business Development Manager"
            value={editVacancyForm.sector}
            onChange={e =>
              setEditVacancyForm(form => ({
                ...form,
                sector: e.target.value,
              }))
            }
          />
        </div>

        <div className="crm-field">
          <label className="crm-label">Employment type</label>
          <input
            className="crm-input"
            placeholder="e.g. Permanent · Full Time"
            value={editVacancyForm.type}
            onChange={e =>
              setEditVacancyForm(form => ({
                ...form,
                type: e.target.value,
              }))
            }
          />
        </div>

        <div className="crm-field">
          <label className="crm-label">Subject area / standard</label>
          <input
            className="crm-input"
            placeholder="e.g. Adult Care, Digital, Business Admin"
            value={editVacancyForm.subject_area}
            onChange={e =>
              setEditVacancyForm(form => ({
                ...form,
                subject_area: e.target.value,
              }))
            }
          />
        </div>

        <div className="crm-field">
          <label className="crm-label">Location</label>
          <input
            className="crm-input"
            value={editVacancyForm.location}
            onChange={e =>
              setEditVacancyForm(form => ({
                ...form,
                location: e.target.value,
              }))
            }
          />
        </div>

        <div className="crm-field">
          <label className="crm-label">Region</label>
          <input
            className="crm-input"
            value={editVacancyForm.region}
            onChange={e =>
              setEditVacancyForm(form => ({
                ...form,
                region: e.target.value,
              }))
            }
          />
        </div>

        <div className="crm-field">
          <label className="crm-label">Postcode</label>
          <input
            className="crm-input"
            placeholder="Used for radius matching"
            value={editVacancyForm.postcode}
            onChange={e =>
              setEditVacancyForm(form => ({
                ...form,
                postcode: e.target.value,
              }))
            }
          />
        </div>

        <div className="crm-field">
          <label className="crm-label">Work type</label>
          <select
            className="crm-select"
            value={editVacancyForm.work_type}
            onChange={e =>
              setEditVacancyForm(form => ({
                ...form,
                work_type: e.target.value,
              }))
            }
          >
            <option value="">Select...</option>
            <option value="office">Office / On-site</option>
            <option value="hybrid">Hybrid</option>
            <option value="remote">Remote</option>
          </select>
        </div>

        <div className="crm-field" style={{ gridColumn: '1 / -1' }}>
          <label className="crm-label">Salary display</label>
          <input
            className="crm-input"
            placeholder="e.g. £35,000 – £40,000"
            value={editVacancyForm.salary_display}
            onChange={e =>
              setEditVacancyForm(form => ({
                ...form,
                salary_display: e.target.value,
              }))
            }
          />
        </div>

        <div className="crm-field">
          <label className="crm-label">Salary minimum</label>
          <input
            className="crm-input"
            type="number"
            placeholder="35000"
            value={editVacancyForm.salary_min}
            onChange={e =>
              setEditVacancyForm(form => ({
                ...form,
                salary_min: e.target.value,
              }))
            }
          />
        </div>

        <div className="crm-field">
          <label className="crm-label">Salary maximum</label>
          <input
            className="crm-input"
            type="number"
            placeholder="40000"
            value={editVacancyForm.salary_max}
            onChange={e =>
              setEditVacancyForm(form => ({
                ...form,
                salary_max: e.target.value,
              }))
            }
          />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          marginTop: 20,
        }}
      >
        <button
          type="button"
          className="crm-btn-ghost"
          onClick={() => setShowEditVacancy(false)}
          disabled={savingVacancyDetails}
        >
          Cancel
        </button>

        <button
          type="button"
          className="crm-btn-primary"
          onClick={saveVacancyDetails}
          disabled={savingVacancyDetails}
        >
          {savingVacancyDetails ? 'Saving...' : 'Save vacancy'}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  )
}