'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Dispatch, FormEvent, ReactNode, SetStateAction } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type ClientRef = {
  id: string
  company_name: string
}

type Candidate = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  job_title: string | null
  main_role_type: string | null
  sub_role_type: string | null
  seeking_role_type: string | null
  looking_for_roles?: string[] | null
  preferred_location: string | null
  address_line_1?: string | null
  address_line_2?: string | null
  town_city?: string | null
  county?: string | null
  postcode?: string | null
  source: string | null
  actively_looking: boolean | null
  work_type_pref?: string | null
  status?: string | null
  cv_url?: string | null
  formatted_cv?: string | null
  linkedin?: string | null
  can_deliver?: string | null
  qualifications?: string | null
  notes?: string | null
  dbs_status?: string | null
  current_salary?: string | null
  salary_expected?: string | null
  salary_notes?: string | null
  notice_period?: string | null
  right_to_work?: string | boolean | null
  created_at?: string | null
}

type Application = {
  id: string
  status: string
  created_at: string
  updated_at?: string | null

  ea_interview_date?: string | null
  ea_interview_notes?: string | null
  ea_interview_verdict?: string | null

  client_interview_date?: string | null
  client_interview_time?: string | null
  client_interview_feedback?: string | null
  client_interview_outcome?: string | null

  vacancies?: {
    id?: string
    title?: string | null
    salary_display?: string | null
    location?: string | null
    region?: string | null
    status?: string | null
    clients?: ClientRef | ClientRef[] | null
  } | null
}

type CandidateDocument = {
  id: string
  candidate_id: string
  name: string
  doc_type: string | null
  file_url: string | null
  storage_bucket?: string | null
  storage_path?: string | null
  released?: boolean | null
  released_at?: string | null
  summary?: string | null
  details?: Record<string, any> | null
  visibility?: string | null
  visible_to_employer?: boolean | null
  show_in_employer_portal?: boolean | null
  created_at?: string | null
}

type Activity = {
  id: string
  activity_type: string
  content: string | null
  created_at: string
}

type Task = {
  id: string
  title?: string | null
  task_title?: string | null
  due_date?: string | null
  status?: string | null
  completed?: boolean | null
}

type Vacancy = {
  id: string
  title: string
  status: string
  location: string | null
  region: string | null
  salary_display: string | null
  clients?: ClientRef | ClientRef[] | null
}

type Placement = {
  id: string
  placement_ref?: string | null
  status?: string | null
  start_date?: string | null
  salary?: number | string | null
  fee_amount?: number | string | null
  fee_percentage?: number | string | null
  final_documents_released?: boolean | null
  created_at?: string | null
  vacancies?: {
    id?: string
    title?: string | null
    location?: string | null
    region?: string | null
    clients?: ClientRef | ClientRef[] | null
  } | null
  clients?: ClientRef | ClientRef[] | null
  placement_tasks?: Array<{
    id: string
    completed?: boolean | null
  }> | null
}

type ApprenticeshipStandard = {
  id: string
  title?: string | null
  name?: string | null
  standard_name?: string | null
  reference?: string | null
  sector?: string | null
  route?: string | null
  level?: string | number | null
  status?: string | null
  programme_type?: string | null
  is_active?: boolean | null
}

type EditCandidateForm = {
  first_name: string
  last_name: string
  email: string
  phone: string
  job_title: string
  main_role_type: string
  sub_role_type: string
  seeking_role_type: string
  looking_for_roles: string[]
  preferred_location: string
  address_line_1: string
  address_line_2: string
  town_city: string
  county: string
  postcode: string
  source: string
  status: string
  actively_looking: boolean
  work_type_pref: string
  linkedin: string
  can_deliver: string
  qualifications: string
  notes: string
  dbs_status: string
  current_salary: string
  salary_expected: string
  salary_notes: string
  notice_period: string
  right_to_work: boolean
}

type DocUploadForm = {
  name: string
  doc_type: string
}

type ReferenceForm = {
  referee_name: string
  referee_job_title: string
  organisation: string
  relationship: string
  email: string
  phone: string
  reference_type: string
  status: string
  requested_at: string
  received_at: string
  notes: string
}

interface Props {
  candidate: Candidate
  applications: Application[]
  documents: CandidateDocument[]
  activities: Activity[]
  tasks: Task[]
  vacancies?: Vacancy[]
  standards?: ApprenticeshipStandard[]
  placements?: Placement[]
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

const DOCUMENT_TYPES = [
  { value: 'cv', label: 'CV' },
  { value: 'formatted_cv', label: 'Formatted CV' },
  { value: 'qualification', label: 'Qualification' },
  { value: 'right_to_work', label: 'Right to work' },
  { value: 'dbs', label: 'DBS' },
  { value: 'reference', label: 'Reference' },
  { value: 'interview_prep', label: 'Interview preparation' },
  { value: 'gdpr_acceptance', label: 'GDPR Acceptance' },
  { value: 'other', label: 'Other' },
]

const REFERENCE_TYPES = [
  { value: '', label: 'Select reference type...' },
  { value: 'employment', label: 'Employment reference' },
  { value: 'character', label: 'Character reference' },
  { value: 'academic', label: 'Academic reference' },
  { value: 'other', label: 'Other' },
]

const REFERENCE_STATUS_OPTIONS = [
  { value: 'not_requested', label: 'Not requested' },
  { value: 'requested', label: 'Requested' },
  { value: 'received', label: 'Received' },
  { value: 'declined', label: 'Declined' },
  { value: 'unable_to_contact', label: 'Unable to contact' },
]

const DOCUMENT_GROUPS = [
  { value: 'cv', label: 'CVs', icon: '📄' },
  { value: 'formatted_cv', label: 'Formatted CVs', icon: '🧾' },
  { value: 'qualification', label: 'Qualifications', icon: '🎓' },
  { value: 'right_to_work', label: 'Right to Work', icon: '🪪' },
  { value: 'dbs', label: 'DBS', icon: '🛡️' },
  { value: 'reference', label: 'References', icon: '📞' },
  { value: 'interview_prep', label: 'Interview Preparation', icon: '📝' },
  { value: 'gdpr_acceptance', label: 'GDPR Acceptance', icon: '🛡️' },
  { value: 'other', label: 'Other Documents', icon: '📎' },
]

const CANDIDATE_SOURCES = [
  '',
  'LinkedIn',
  'Job Board',
  'Referral',
  'Direct approach',
  'Website registration',
  'Indeed',
  'Reed',
  'CV Library',
  'Other',
]

const CANDIDATE_REGIONS = [
  '',
  'East of England',
  'East Midlands',
  'West Midlands',
  'North West',
  'North East',
  'Yorkshire & Humber',
  'South East',
  'South West',
  'London',
  'Wales',
  'Scotland',
  'Northern Ireland',
  'Remote / Flexible',
]

const WORK_TYPE_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'office', label: 'Office / On-site' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' },
]

const CANDIDATE_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'passive', label: 'Passive' },
  { value: 'placed', label: 'Placed' },
  { value: 'do_not_contact', label: 'Do not contact' },
  { value: 'archived', label: 'Archived' },
]

function getActivelyLookingFromStatus(
  status: string,
  fallback: boolean | null | undefined,
) {
  if (status === 'active') return true

  if (
    status === 'passive' ||
    status === 'placed' ||
    status === 'do_not_contact' ||
    status === 'archived'
  ) {
    return false
  }

  return fallback ?? true
}

const DBS_STATUS_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'not_completed', label: 'Not completed' },
  {
    value: 'not_completed_happy_to_undertake_no_issues',
    label: 'Not completed but happy to undertake — no issues',
  },
  { value: 'completed_clear', label: 'Completed — clear' },
  { value: 'completed_disclosures', label: 'Completed — disclosures' },
  { value: 'on_update_service', label: 'On update service' },
]

const APPLICATION_STAGE_COLOURS: Record<string, { bg: string; text: string }> = {
  screening: { bg: '#f0f0f2', text: '#737373' },
  ea_interview: { bg: '#e0f0fb', text: '#0B72B8' },
  docs_received: { bg: '#f3f0ff', text: '#7c3aed' },
  ready_to_present: { bg: '#fffbeb', text: '#d97706' },
  presented: { bg: '#e8f5e8', text: '#217822' },
  client_interview: { bg: '#f3f0ff', text: '#7c3aed' },
  offer: { bg: '#e8f5e8', text: '#1a6e1a' },
  placed: { bg: '#e8f5e8', text: '#1a6e1a' },
  rejected: { bg: '#fef2f2', text: '#e53e3e' },
  withdrawn: { bg: '#f0f0f2', text: '#737373' },
  not_interested: { bg: '#f0f0f2', text: '#737373' },
}

const STARTING_STAGES = [
  { value: 'screening', label: 'Screening' },
  { value: 'ea_interview', label: 'EA interview' },
  { value: 'docs_received', label: 'Docs received' },
  { value: 'ready_to_present', label: 'Ready to present' },
  { value: 'presented', label: 'Presented' },
  { value: 'client_interview', label: 'Client interview' },
  { value: 'offer', label: 'Offer' },
]

const ACTIVITY_TYPES = [
  { id: 'call', label: 'Call', icon: '📞' },
  { id: 'email', label: 'Email', icon: '✉️' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '🟢' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { id: 'sms', label: 'SMS', icon: '💬' },
  { id: 'meeting', label: 'Meeting', icon: '🤝' },
  { id: 'note', label: 'Note', icon: '📝' },
]

export default function CandidateDetail({
  candidate,
  applications: initialApplications,
  documents,
  activities,
  tasks,
  vacancies = [],
  standards = [],
  placements = [],
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<
  | 'overview'
  | 'applications'
  | 'placements'
  | 'standards'
  | 'documents'
  | 'activity'
  | 'tasks'
>('overview')

const [candidateRecord, setCandidateRecord] = useState(candidate)
const [applications] = useState(initialApplications)
const [candidateTasks, setCandidateTasks] = useState<Task[]>(tasks)
const [newTaskTitle, setNewTaskTitle] = useState('')
const [newTaskDueDate, setNewTaskDueDate] = useState('')
const [addingTask, setAddingTask] = useState(false)
const [candidateActivities, setCandidateActivities] = useState<Activity[]>(activities)
const [actType, setActType] = useState('call')
const [actContent, setActContent] = useState('')
const [addingAct, setAddingAct] = useState(false)
const [activitySaved, setActivitySaved] = useState(false)
const [candidateDocuments, setCandidateDocuments] = useState(documents)
const [selectedDocument, setSelectedDocument] = useState<CandidateDocument | null>(
  documents[0] ?? null,
)
const [selectedDocumentUrl, setSelectedDocumentUrl] = useState('')
const [loadingSelectedDocumentUrl, setLoadingSelectedDocumentUrl] = useState(false)
const [selectedDocumentUrlError, setSelectedDocumentUrlError] = useState<string | null>(null)

const [updatingDocumentId, setUpdatingDocumentId] = useState<string | null>(null)
  const [releasingDocumentId, setReleasingDocumentId] = useState<string | null>(null)
  const [updatingPortalDocumentId, setUpdatingPortalDocumentId] = useState<string | null>(null)
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null)

  const [showDocForm, setShowDocForm] = useState(false)
  const [docForm, setDocForm] = useState<DocUploadForm>({
  name: '',
  doc_type: 'cv',
})
const [docFile, setDocFile] = useState<File | null>(null)
const [referenceForm, setReferenceForm] = useState<ReferenceForm>(() =>
  emptyReferenceForm(),
)
const [uploadingDoc, setUploadingDoc] = useState(false)
const [docUploadError, setDocUploadError] = useState<string | null>(null)

  const [showEditCandidate, setShowEditCandidate] = useState(false)
const [savingCandidate, setSavingCandidate] = useState(false)
const [deletingCandidate, setDeletingCandidate] = useState(false)
const [updatingCandidateStatus, setUpdatingCandidateStatus] = useState(false)
const [candidateSaveError, setCandidateSaveError] = useState<string | null>(null)

  const [showAddApplication, setShowAddApplication] = useState(false)
const [creatingApplication, setCreatingApplication] = useState(false)
const [creatingSpeculation, setCreatingSpeculation] = useState(false)

const [showUploadLinkForm, setShowUploadLinkForm] = useState(false)
const [creatingUploadLink, setCreatingUploadLink] = useState(false)
const [lastPortalMessage, setLastPortalMessage] = useState<string | null>(null)
const [uploadLinkMessage, setUploadLinkMessage] = useState(
  'Please upload the requested documents using the secure link below.',
)
const [requestedDocumentTypes, setRequestedDocumentTypes] = useState<string[]>([
  'cv',
  'qualification',
  'right_to_work',
  'dbs',
])

const [createError, setCreateError] = useState<string | null>(null)

  const [standardSearch, setStandardSearch] = useState('')
  const [standardSectorFilter, setStandardSectorFilter] = useState('all')
  const [manualStandardInput, setManualStandardInput] = useState('')
  const [savingStandards, setSavingStandards] = useState(false)
  const [standardsSaved, setStandardsSaved] = useState(false)

  const [editCandidateForm, setEditCandidateForm] = useState<EditCandidateForm>(
    candidateToForm(candidate),
  )

  const [newApplicationForm, setNewApplicationForm] = useState({
    vacancy_id: '',
    status: 'screening',
  })

  const candidateName = `${candidateRecord.first_name ?? ''} ${candidateRecord.last_name ?? ''}`.trim()

  const groupedDocuments = useMemo(() => {
    return DOCUMENT_GROUPS.map(group => ({
      ...group,
      documents: candidateDocuments.filter(
        doc => (doc.doc_type || 'other') === group.value,
      ),
    }))
  }, [candidateDocuments])

  const selectedDocSafe = selectedDocument ?? candidateDocuments[0] ?? null

  function documentHasStoredFile(document: CandidateDocument | null) {
  if (!document) return false

  return Boolean(
    document.file_url ||
      (document.storage_bucket && document.storage_path),
  )
}

async function loadCandidateDocumentUrl(document: CandidateDocument | null) {
  if (!document || !documentHasStoredFile(document)) {
    setSelectedDocumentUrl('')
    setSelectedDocumentUrlError(null)
    return
  }

  setLoadingSelectedDocumentUrl(true)
  setSelectedDocumentUrlError(null)

  try {
    const res = await fetch('/api/crm/document-signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id: document.id,
        document_kind: 'candidate',
      }),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setSelectedDocumentUrl('')
      setSelectedDocumentUrlError(
        json?.error || 'Could not open this document securely.',
      )
      return
    }

    setSelectedDocumentUrl(json?.url || '')
  } catch {
    setSelectedDocumentUrl('')
    setSelectedDocumentUrlError('Could not open this document securely.')
  } finally {
    setLoadingSelectedDocumentUrl(false)
  }
}

async function openSelectedDocument() {
  if (!selectedDocSafe || !documentHasStoredFile(selectedDocSafe)) return

  let url = selectedDocumentUrl

  if (!url) {
    setLoadingSelectedDocumentUrl(true)

    const res = await fetch('/api/crm/document-signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id: selectedDocSafe.id,
        document_kind: 'candidate',
      }),
    })

    const json = await res.json().catch(() => null)

    setLoadingSelectedDocumentUrl(false)

    if (!res.ok || !json?.url) {
      alert(json?.error || 'Could not open this document securely.')
      return
    }

    url = json.url
    setSelectedDocumentUrl(url)
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

  const selectedStandards = useMemo(() => {
    return splitStandards(editCandidateForm.can_deliver)
  }, [editCandidateForm.can_deliver])

  const standardSectors = useMemo(() => {
    return Array.from(
      new Set(standards.map(standard => getStandardSubjectArea(standard))),
    ).sort()
  }, [standards])

  const filteredStandards = useMemo(() => {
    const term = standardSearch.toLowerCase().trim()

    return standards.filter(standard => {
      const standardName = getStandardName(standard)
      const subjectArea = getStandardSubjectArea(standard)
      const reference = standard.reference || ''

      const matchSearch =
        !term ||
        standardName.toLowerCase().includes(term) ||
        subjectArea.toLowerCase().includes(term) ||
        reference.toLowerCase().includes(term)

      const matchSubjectArea =
        standardSectorFilter === 'all' || subjectArea === standardSectorFilter

      return matchSearch && matchSubjectArea
    })
  }, [standards, standardSearch, standardSectorFilter])

  function isRightToWorkConfirmed(value: Candidate['right_to_work']) {
    return value === true || value === 'true' || value === 'confirmed' || value === 'yes'
  }

  function getCandidateLookingForRoles(row: Candidate): string[] {
    const savedRoles = Array.isArray(row.looking_for_roles)
      ? row.looking_for_roles
          .map(role => String(role || '').trim())
          .filter((role): role is string => role.length > 0)
      : []

    if (savedRoles.length > 0) return savedRoles

    const fallbackRole = row.seeking_role_type || row.sub_role_type

    return fallbackRole ? [fallbackRole] : []
  }

  function candidateToForm(row: Candidate): EditCandidateForm {
    return {
      first_name: row.first_name ?? '',
      last_name: row.last_name ?? '',
      email: row.email ?? '',
      phone: row.phone ?? '',
      job_title: row.job_title ?? '',
      main_role_type: row.main_role_type ?? '',
      sub_role_type: row.sub_role_type ?? '',
      seeking_role_type: row.seeking_role_type ?? row.sub_role_type ?? '',
      looking_for_roles: getCandidateLookingForRoles(row),
      preferred_location: row.preferred_location ?? '',
      address_line_1: row.address_line_1 ?? '',
      address_line_2: row.address_line_2 ?? '',
      town_city: row.town_city ?? '',
      county: row.county ?? '',
      postcode: row.postcode ?? '',
      source: row.source ?? '',
      status: row.status ?? (row.actively_looking === false ? 'passive' : 'active'),
      actively_looking: row.actively_looking ?? true,
      work_type_pref: row.work_type_pref ?? '',
      linkedin: row.linkedin ?? '',
      can_deliver: row.can_deliver ?? '',
      qualifications: row.qualifications ?? '',
      notes: row.notes ?? '',
      dbs_status: row.dbs_status ?? '',
      current_salary: row.current_salary ?? '',
      salary_expected: row.salary_expected ?? '',
      salary_notes: row.salary_notes ?? '',
      notice_period: row.notice_period ?? '',
      right_to_work: isRightToWorkConfirmed(row.right_to_work),
    }
  }

  function buildCandidatePayload(form: EditCandidateForm) {
    return {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      phone: form.phone,
      job_title: form.job_title,
      main_role_type: form.main_role_type,
      sub_role_type: form.sub_role_type,
      seeking_role_type: form.seeking_role_type || form.sub_role_type,
      looking_for_roles: form.looking_for_roles,
      preferred_location: form.preferred_location,
      address_line_1: form.address_line_1,
      address_line_2: form.address_line_2,
      town_city: form.town_city,
      county: form.county,
      postcode: form.postcode,
      source: form.source,
      status: form.status,
      actively_looking: getActivelyLookingFromStatus(
       form.status,
       form.actively_looking,
      ),
      work_type_pref: form.work_type_pref,
      linkedin: form.linkedin,
      can_deliver: form.can_deliver,
      qualifications: form.qualifications,
      notes: form.notes,
      dbs_status: form.dbs_status,
      current_salary: form.current_salary,
      salary_expected: form.salary_expected,
      salary_notes: form.salary_notes,
      notice_period: form.notice_period,
      right_to_work: form.right_to_work,
    }
  }

  function emptyReferenceForm(): ReferenceForm {
  return {
    referee_name: '',
    referee_job_title: '',
    organisation: '',
    relationship: '',
    email: '',
    phone: '',
    reference_type: '',
    status: 'not_requested',
    requested_at: '',
    received_at: '',
    notes: '',
  }
}

useEffect(() => {
  loadCandidateDocumentUrl(selectedDocSafe)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedDocSafe?.id])

  function openEditCandidate() {
    setEditCandidateForm(candidateToForm(candidateRecord))
    setCandidateSaveError(null)
    setShowEditCandidate(true)
  }

  async function updateCandidateStatus(nextStatus: string) {
  setUpdatingCandidateStatus(true)

  const nextForm: EditCandidateForm = {
    ...candidateToForm(candidateRecord),
    status: nextStatus,
    actively_looking: getActivelyLookingFromStatus(
      nextStatus,
      candidateRecord.actively_looking,
    ),
  }

  const res = await fetch('/api/crm/candidates', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: candidateRecord.id,
      ...buildCandidatePayload(nextForm),
    }),
  })

  const json = await res.json()

  if (!res.ok) {
    alert(json.error || 'Could not update candidate status.')
    setUpdatingCandidateStatus(false)
    return
  }

  if (json.data) {
    setCandidateRecord(json.data)
    setEditCandidateForm(candidateToForm(json.data))
  }

  setUpdatingCandidateStatus(false)
}

async function deleteCandidate() {
  if (applications.length > 0) {
    alert(
      'This candidate cannot be deleted because they are linked to one or more applications.',
    )
    return
  }

  const confirmed = confirm(
    `Delete ${candidateName || 'this candidate'}? This will permanently remove the candidate record, documents, activity and tasks. This cannot be undone.`,
  )

  if (!confirmed) return

  const finalConfirmed = confirm(
    'Final check: are you absolutely sure you want to permanently delete this candidate?',
  )

  if (!finalConfirmed) return

  setDeletingCandidate(true)

  const res = await fetch('/api/crm/candidates', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: candidateRecord.id,
    }),
  })

  const json = await res.json().catch(() => null)

  if (!res.ok) {
    alert(json?.error || 'Could not delete candidate.')
    setDeletingCandidate(false)
    return
  }

  router.push('/crm/candidates')
}

async function createCandidateUploadLink() {
  if (requestedDocumentTypes.length === 0) {
    alert('Please select at least one document type to request.')
    return
  }

  const confirmed = confirm(
    `Send a secure candidate portal link to ${candidateRecord.email || 'this candidate'}?`,
  )

  if (!confirmed) return

  setCreatingUploadLink(true)
  setLastPortalMessage(null)

  const res = await fetch('/api/crm/candidate-upload-links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      candidate_id: candidateRecord.id,
      requested_document_types: requestedDocumentTypes,
      message: uploadLinkMessage,
    }),
  })

  const json = await res.json().catch(() => null)

  if (!res.ok) {
    alert(json?.error || 'Could not send candidate portal link.')
    setCreatingUploadLink(false)
    return
  }

  setShowUploadLinkForm(false)
  setCreatingUploadLink(false)
  setLastPortalMessage(
    json?.message ||
      `Candidate portal link sent to ${candidateRecord.email || 'candidate'}.`,
  )

  alert(
    json?.message ||
      `Candidate portal link sent to ${candidateRecord.email || 'candidate'}.`,
  )
}

function formatDate(date?: string | null) {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-GB')
  }

  function getClient(clientField: ClientRef | ClientRef[] | null | undefined) {
    if (Array.isArray(clientField)) return clientField[0] ?? null
    return clientField ?? null
  }

  function getWorkTypeLabel(value?: string | null) {
    if (!value) return '—'
    if (value === 'office') return 'Office / On-site'
    if (value === 'hybrid') return 'Hybrid'
    if (value === 'remote') return 'Remote'
    return value
  }

  function getDbsLabel(value?: string | null) {
    return DBS_STATUS_OPTIONS.find(option => option.value === value)?.label || value || '—'
  }

  function getFileKind(url: string | null) {
    if (!url) return 'unknown'

    const cleanUrl = url.split('?')[0].toLowerCase()

    if (/\.(jpg|jpeg|png|webp|gif)$/i.test(cleanUrl)) return 'image'
    if (/\.pdf$/i.test(cleanUrl)) return 'pdf'
    if (/\.(doc|docx)$/i.test(cleanUrl)) return 'word'

    return 'unknown'
  }

  function getDocumentLabel(docType?: string | null) {
    return DOCUMENT_TYPES.find(type => type.value === docType)?.label || 'Other'
  }

  function getReferenceDetails(doc: CandidateDocument | null) {
    if (!doc || doc.doc_type !== 'reference') return null
    return doc.details ?? {}
  }

  function getStandardName(standard: ApprenticeshipStandard) {
    return (
      standard.title ||
      standard.standard_name ||
      standard.name ||
      'Unnamed standard'
    )
  }

  function getStandardSubjectArea(standard: ApprenticeshipStandard) {
    return standard.sector || standard.route || 'Uncategorised'
  }

  function splitStandards(value?: string | null) {
  const rawValue = String(value || '').trim()
  if (!rawValue) return []

  const seen = new Set<string>()
  const matchedStandards: string[] = []

  const allStandardNames = standards
    .map(standard => getStandardName(standard).trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)

  let remaining = ` ${rawValue} `

  allStandardNames.forEach(standardName => {
    const escapedName = standardName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    const pattern = new RegExp(
      `(^|[,|\\n]\\s*)(${escapedName})(?=\\s*($|[,|\\n]))`,
      'i',
    )

    if (pattern.test(remaining)) {
      const key = standardName.toLowerCase()

      if (!seen.has(key)) {
        seen.add(key)
        matchedStandards.push(standardName)
      }

      remaining = remaining.replace(pattern, '$1')
    }
  })

  const leftoverStandards = remaining
    .split(/[\n|,]/)
    .map(item => item.trim())
    .filter(Boolean)

  leftoverStandards.forEach(item => {
    const key = item.toLowerCase()

    if (!seen.has(key)) {
      seen.add(key)
      matchedStandards.push(item)
    }
  })

  return matchedStandards
}

function joinStandards(items: string[]) {
  return splitStandards(items.join(' | ')).join(' | ')
}

  function isStandardSelected(standardName: string) {
    return selectedStandards.some(
      item => item.toLowerCase() === standardName.toLowerCase(),
    )
  }

  function toggleStandard(standardName: string) {
  const cleanStandard = standardName.trim()
  if (!cleanStandard) return

  const standardKey = cleanStandard.toLowerCase()

  const exists = selectedStandards.some(
    item => item.trim().toLowerCase() === standardKey,
  )

  const next = exists
    ? selectedStandards.filter(
        item => item.trim().toLowerCase() !== standardKey,
      )
    : [...selectedStandards, cleanStandard]

  setEditCandidateForm(form => ({
    ...form,
    can_deliver: joinStandards(next),
  }))
}

  function removeStandard(standard: string) {
  const standardKey = standard.trim().toLowerCase()

  const next = selectedStandards.filter(
    item => item.trim().toLowerCase() !== standardKey,
  )

  setEditCandidateForm(form => ({
    ...form,
    can_deliver: joinStandards(next),
  }))
}

  function addManualStandard() {
  const value = manualStandardInput.trim()
  if (!value) return

  const exists = selectedStandards.some(
    item => item.trim().toLowerCase() === value.toLowerCase(),
  )

  if (!exists) {
    setEditCandidateForm(form => ({
      ...form,
      can_deliver: joinStandards([...selectedStandards, value]),
    }))
  }

  setManualStandardInput('')
}

  async function saveStandards() {
    setSavingStandards(true)

    const res = await fetch('/api/crm/candidates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: candidateRecord.id,
        ...buildCandidatePayload(editCandidateForm),
      }),
    })

    const json = await res.json()

    if (res.ok && json.data) {
      setCandidateRecord(json.data)
      setEditCandidateForm(candidateToForm(json.data))
      setStandardsSaved(true)
      setTimeout(() => setStandardsSaved(false), 2000)
    } else {
      alert(json.error || 'Could not save standards.')
    }

    setSavingStandards(false)
  }

  async function uploadDoc(e: FormEvent) {
  e.preventDefault()

  setDocUploadError(null)

  if (docForm.doc_type === 'reference') {
    if (!referenceForm.referee_name.trim()) {
      setDocUploadError('Referee name is required.')
      return
    }

    if (
      !referenceForm.email.trim() &&
      !referenceForm.phone.trim() &&
      !referenceForm.organisation.trim()
    ) {
      setDocUploadError(
        'Please add at least an email, phone number or organisation.',
      )
      return
    }

    setUploadingDoc(true)

    const res = await fetch('/api/crm/candidate-documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_id: candidateRecord.id,
        doc_type: 'reference',
        name: docForm.name,
        ...referenceForm,
      }),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setDocUploadError(json?.error || 'Could not save reference.')
      setUploadingDoc(false)
      return
    }

    if (json?.data) {
      setCandidateDocuments(current => [
        json.data as CandidateDocument,
        ...current,
      ])
      setSelectedDocument(json.data as CandidateDocument)
    }

    setShowDocForm(false)
    setDocFile(null)
    setDocForm({ name: '', doc_type: 'cv' })
    setReferenceForm(emptyReferenceForm())
    setUploadingDoc(false)
    return
  }

  if (!docFile) {
    setDocUploadError('Please select a file to upload.')
    return
  }

  setUploadingDoc(true)

const formData = new FormData()
formData.append('candidate_id', candidateRecord.id)
formData.append('name', docForm.name)
formData.append('doc_type', docForm.doc_type)
formData.append('file', docFile)

const res = await fetch('/api/crm/candidate-document-upload', {
  method: 'POST',
  body: formData,
})

const json = await res.json().catch(() => null)

if (!res.ok) {
  setDocUploadError(json?.error || 'Could not upload document.')
  setUploadingDoc(false)
  return
}

if (json?.data) {
  setCandidateDocuments(current => [json.data as CandidateDocument, ...current])
  setSelectedDocument(json.data as CandidateDocument)
}

  setShowDocForm(false)
  setDocFile(null)
  setDocForm({ name: '', doc_type: 'cv' })
  setReferenceForm(emptyReferenceForm())
  setUploadingDoc(false)
}

  async function updateDocumentType(documentId: string, docType: string) {
    setUpdatingDocumentId(documentId)

    const res = await fetch('/api/crm/candidate-documents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: documentId,
        doc_type: docType,
      }),
    })

    const json = await res.json()

    if (!res.ok) {
      alert(json.error || 'Could not update document type.')
      setUpdatingDocumentId(null)
      return
    }

    if (json.data) {
      setCandidateDocuments(current =>
        current.map(doc =>
          doc.id === documentId
            ? {
                ...doc,
                doc_type: json.data.doc_type,
              }
            : doc,
        ),
      )

      setSelectedDocument(current =>
        current?.id === documentId
          ? {
              ...current,
              doc_type: json.data.doc_type,
            }
          : current,
      )
    }

    setUpdatingDocumentId(null)
  }

  async function toggleDocumentRelease(documentId: string, nextReleased: boolean) {
  const confirmed = confirm(
    nextReleased
      ? 'Release this document for employer download? Only do this once the placement has happened and you are ready for the employer to access it.'
      : 'Hide this document from employer download?',
  )

  if (!confirmed) return

  setReleasingDocumentId(documentId)

  const res = await fetch('/api/crm/candidate-documents', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: documentId,
      released: nextReleased,
    }),
  })

  const json = await res.json()

  if (!res.ok) {
    alert(json.error || 'Could not update document release status.')
    setReleasingDocumentId(null)
    return
  }

  if (json.data) {
    setCandidateDocuments(current =>
      current.map(doc =>
        doc.id === documentId
          ? {
              ...doc,
              released: json.data.released,
              released_at: json.data.released_at,
              visible_to_employer: json.data.visible_to_employer,
            }
          : doc,
      ),
    )

    setSelectedDocument(current =>
      current?.id === documentId
        ? {
            ...current,
            released: json.data.released,
            released_at: json.data.released_at,
            visible_to_employer: json.data.visible_to_employer,
          }
        : current,
    )
  }

  setReleasingDocumentId(null)
}

async function toggleDocumentPortalVisibility(
  documentId: string,
  nextVisible: boolean,
) {
  setUpdatingPortalDocumentId(documentId)

  const res = await fetch('/api/crm/candidate-documents', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: documentId,
      show_in_employer_portal: nextVisible,
    }),
  })

  const json = await res.json()

  if (!res.ok) {
    alert(json.error || 'Could not update employer portal visibility.')
    setUpdatingPortalDocumentId(null)
    return
  }

  if (json.data) {
    setCandidateDocuments(current =>
      current.map(doc =>
        doc.id === documentId
          ? {
              ...doc,
              show_in_employer_portal:
                json.data.show_in_employer_portal,
            }
          : doc,
      ),
    )

    setSelectedDocument(current =>
      current?.id === documentId
        ? {
            ...current,
            show_in_employer_portal:
              json.data.show_in_employer_portal,
          }
        : current,
    )
  }

  setUpdatingPortalDocumentId(null)
}

async function deleteDocument(document: CandidateDocument) {
  const confirmed = confirm(
    `Delete "${document.name || 'this document'}"? This will remove it from the candidate record and cannot be undone.`,
  )

  if (!confirmed) return

  const finalConfirmed = confirm(
    'Final check: are you sure you want to permanently delete this document?',
  )

  if (!finalConfirmed) return

  setDeletingDocumentId(document.id)

  const res = await fetch('/api/crm/candidate-documents', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: document.id,
    }),
  })

  const json = await res.json().catch(() => null)

  if (!res.ok) {
    alert(json?.error || 'Could not delete document.')
    setDeletingDocumentId(null)
    return
  }

  setCandidateDocuments(current => {
    const nextDocuments = current.filter(item => item.id !== document.id)

    setSelectedDocument(currentSelected => {
      if (currentSelected?.id !== document.id) return currentSelected
      return nextDocuments[0] ?? null
    })

    return nextDocuments
  })

  setDeletingDocumentId(null)
}  

async function saveCandidate(e: FormEvent) {
    e.preventDefault()

    setSavingCandidate(true)
    setCandidateSaveError(null)

    const res = await fetch('/api/crm/candidates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: candidateRecord.id,
        ...buildCandidatePayload(editCandidateForm),
      }),
    })

    const json = await res.json()

    if (!res.ok) {
      setCandidateSaveError(json.error || 'Could not update candidate.')
      setSavingCandidate(false)
      return
    }

    if (json.data) {
      setCandidateRecord(json.data)
      setEditCandidateForm(candidateToForm(json.data))
      setShowEditCandidate(false)
    }

    setSavingCandidate(false)
  }

  async function createSpeculation() {
  setCreatingSpeculation(true)

  const res = await fetch('/api/crm/speculations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      candidate_id: candidateRecord.id,
      target_role:
        candidateRecord.seeking_role_type ||
        candidateRecord.sub_role_type ||
        candidateRecord.main_role_type ||
        candidateRecord.job_title ||
        '',
      target_roles: Array.isArray(candidateRecord.looking_for_roles)
        ? candidateRecord.looking_for_roles
        : [],
      target_sector: candidateRecord.main_role_type || '',
      target_regions: [
        candidateRecord.preferred_location,
        candidateRecord.postcode,
      ].filter(Boolean),
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    alert(data.error || 'Could not create speculation.')
    setCreatingSpeculation(false)
    return
  }

  if (data.speculation?.id) {
    router.push(`/crm/speculations/${data.speculation.id}`)
    return
  }

  alert('Speculation created, but no speculation ID was returned.')
  setCreatingSpeculation(false)
}
  
  async function createApplication(e: FormEvent) {
    e.preventDefault()

    setCreatingApplication(true)
    setCreateError(null)

    if (!newApplicationForm.vacancy_id) {
      setCreateError('Please select a vacancy.')
      setCreatingApplication(false)
      return
    }

    const res = await fetch('/api/crm/vacancies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        addCandidate: true,
        candidateId: candidateRecord.id,
        vacancyId: newApplicationForm.vacancy_id,
        initialStatus: newApplicationForm.status,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setCreateError(data.error || 'Could not create application.')
      setCreatingApplication(false)
      return
    }

    if (data.application?.id) {
      router.push(`/crm/applications/${data.application.id}`)
      return
    }

    setCreateError('Application created, but no application ID was returned.')
    setCreatingApplication(false)
  }

  function resetAddApplicationModal() {
    setNewApplicationForm({
      vacancy_id: '',
      status: 'screening',
    })
    setCreateError(null)
    setShowAddApplication(false)
  }

  async function addTask(event?: FormEvent) {
  event?.preventDefault()

  if (!newTaskTitle.trim()) return

  setAddingTask(true)

  const basePayload = {
  candidate_id: candidateRecord.id,
  due_date: newTaskDueDate || null,
  completed: false,
}

  let insertResult = await supabase
    .from('candidate_tasks')
    .insert({
      ...basePayload,
      title: newTaskTitle.trim(),
    })
    .select()
    .single()

  // Fallback for older schemas that use task_title instead of title.
  if (
    insertResult.error &&
    insertResult.error.message.toLowerCase().includes('title')
  ) {
    insertResult = await supabase
      .from('candidate_tasks')
      .insert({
        ...basePayload,
        task_title: newTaskTitle.trim(),
      })
      .select()
      .single()
  }

  if (insertResult.error) {
    alert(insertResult.error.message)
    setAddingTask(false)
    return
  }

  if (insertResult.data) {
    setCandidateTasks(current => [insertResult.data as Task, ...current])
    setNewTaskTitle('')
    setNewTaskDueDate('')
  }

  setAddingTask(false)
}

async function toggleTask(task: Task) {
  const nextCompleted = !task.completed

  const { data, error } = await supabase
  .from('candidate_tasks')
  .update({
    completed: nextCompleted,
  })
  .eq('id', task.id)
  .select()
  .single()

  if (error) {
    alert(error.message)
    return
  }

  if (data) {
    setCandidateTasks(current =>
      current.map(item => (item.id === task.id ? (data as Task) : item)),
    )
  }
}

async function deleteTask(taskId: string) {
  const confirmed = confirm('Delete this task?')
  if (!confirmed) return

  const { error } = await supabase
    .from('candidate_tasks')
    .delete()
    .eq('id', taskId)

  if (error) {
    alert(error.message)
    return
  }

  setCandidateTasks(current => current.filter(task => task.id !== taskId))
}

  async function addActivity(event?: FormEvent) {
  event?.preventDefault()

  if (!actContent.trim()) return

  setAddingAct(true)

  const { data, error } = await supabase
    .from('candidate_activities')
    .insert({
      candidate_id: candidateRecord.id,
      activity_type: actType,
      content: actContent.trim(),
    })
    .select()
    .single()

  if (error) {
    alert(error.message)
    setAddingAct(false)
    return
  }

  if (data) {
    setCandidateActivities(current => [data as Activity, ...current])
    setActContent('')
    setActType('call')
    setActivitySaved(true)
    setTimeout(() => setActivitySaved(false), 2000)
  }

  setAddingAct(false)
}

async function deleteActivity(activityId: string) {
  const confirmed = confirm('Delete this activity note?')
  if (!confirmed) return

  const { error } = await supabase
    .from('candidate_activities')
    .delete()
    .eq('id', activityId)

  if (error) {
    alert(error.message)
    return
  }

  setCandidateActivities(current =>
    current.filter(activity => activity.id !== activityId),
  )
}

  const mainRoleOptions = useMemo(() => {
    return Array.from(
      new Set([...MAIN_ROLE_TYPES, editCandidateForm.main_role_type].filter(Boolean)),
    )
  }, [editCandidateForm.main_role_type])

  const subRoleOptions = useMemo(() => {
    const options =
      ROLE_TYPE_HIERARCHY[editCandidateForm.main_role_type]?.subTypes ?? []

    return Array.from(
      new Set([...options, editCandidateForm.sub_role_type].filter(Boolean)),
    )
  }, [editCandidateForm.main_role_type, editCandidateForm.sub_role_type])

  return (
    <div className="crm-page">
            <div className="crm-page-header">
        <div>
          <div className="crm-breadcrumb">
            <Link href="/crm/candidates" className="crm-breadcrumb-link">
              Candidates
            </Link>
            <span>/</span>
            <span>{candidateName || 'Candidate'}</span>
          </div>

          <h1 className="crm-page-title">{candidateName || 'Candidate'}</h1>

          <p className="crm-page-sub">
            {Array.isArray(candidateRecord.looking_for_roles) &&
            candidateRecord.looking_for_roles.length > 0
              ? candidateRecord.looking_for_roles.join(', ')
              : candidateRecord.sub_role_type ||
                candidateRecord.seeking_role_type ||
                candidateRecord.main_role_type ||
                'Role preference not recorded'}
            {candidateRecord.preferred_location
              ? ` · ${candidateRecord.preferred_location}`
              : ''}
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                fontWeight: 800,
              }}
            >
              Status
            </span>

            <select
              className="crm-select crm-select-sm"
              value={
                candidateRecord.status ??
                (candidateRecord.actively_looking === false
                  ? 'passive'
                  : 'active')
              }
              onChange={event => updateCandidateStatus(event.target.value)}
              disabled={updatingCandidateStatus}
              style={{
                minWidth: 150,
                fontWeight: 800,
              }}
            >
              {CANDIDATE_STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {updatingCandidateStatus && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Saving...
              </span>
            )}
          </div>

<button
  type="button"
  className="crm-btn-ghost"
  onClick={() => setShowUploadLinkForm(true)}
  disabled={creatingUploadLink}
>
  {creatingUploadLink ? 'Sending...' : 'Send Candidate Portal Link'}
</button>
          
<button className="crm-btn-ghost" onClick={openEditCandidate}>
  Edit Candidate
</button>

<button
  type="button"
  className="crm-btn-ghost"
  onClick={deleteCandidate}
  disabled={deletingCandidate || applications.length > 0}
  title={
    applications.length > 0
      ? 'Candidate cannot be deleted because they are linked to applications.'
      : 'Delete candidate'
  }
  style={{
    borderColor: applications.length > 0 ? 'var(--border)' : '#fecaca',
    color: applications.length > 0 ? 'var(--text-muted)' : '#e53e3e',
    cursor:
      deletingCandidate || applications.length > 0 ? 'not-allowed' : 'pointer',
    opacity: deletingCandidate || applications.length > 0 ? 0.6 : 1,
  }}
>
  {deletingCandidate
    ? 'Deleting...'
    : applications.length > 0
      ? 'Delete locked'
      : 'Delete Candidate'}
</button>

<button
  type="button"
  className="crm-btn-ghost"
  onClick={createSpeculation}
  disabled={creatingSpeculation}
>
  {creatingSpeculation ? 'Creating...' : '+ Create Speculation'}
</button>

          <button
            className="crm-btn-primary"
            onClick={() => setShowAddApplication(true)}
          >
            + Add Application
          </button>
        </div>
            </div>

      {showUploadLinkForm && (
  <div
    className="crm-card"
    style={{
      marginBottom: 14,
      display: 'grid',
      gap: 14,
      border: '1.5px solid #bae6fd',
      background: '#f0f9ff',
    }}
  >
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        alignItems: 'flex-start',
        flexWrap: 'wrap',
      }}
    >
      <div>
        <p className="crm-card-title">Send candidate portal link</p>
        <p
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            marginTop: 4,
            lineHeight: 1.5,
          }}
        >
          Select the documents you want the candidate to upload. The portal will also
  ask them to accept the Candidate Privacy Notice if this has not already been
  signed.
        </p>
      </div>

      <button
        type="button"
        className="crm-btn-ghost crm-btn-sm"
        onClick={() => setShowUploadLinkForm(false)}
      >
        Close
      </button>
    </div>

    <div>
      <label className="crm-label">Documents requested</label>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 8,
          marginTop: 8,
        }}
      >
        {DOCUMENT_TYPES.filter(
  doc => doc.value !== 'formatted_cv' && doc.value !== 'gdpr_acceptance',
).map(doc => {
          const checked = requestedDocumentTypes.includes(doc.value)

          return (
            <label
              key={doc.value}
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                background: '#fff',
                border: checked
                  ? '1.5px solid var(--primary)'
                  : '1px solid var(--border)',
                borderRadius: 10,
                padding: '9px 10px',
                fontSize: 12,
                fontWeight: 800,
                color: checked ? 'var(--primary)' : 'var(--text-dark)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={event => {
                  setRequestedDocumentTypes(current =>
                    event.target.checked
                      ? [...current, doc.value]
                      : current.filter(value => value !== doc.value),
                  )
                }}
              />

              {doc.label}
            </label>
          )
        })}
      </div>
    </div>

    <div>
      <label className="crm-label">Message to candidate</label>
      <textarea
        className="crm-input"
        rows={4}
        value={uploadLinkMessage}
        onChange={event => setUploadLinkMessage(event.target.value)}
        style={{ lineHeight: 1.6 }}
      />
    </div>

    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
      <button
        type="button"
        className="crm-btn-ghost"
        onClick={() => setShowUploadLinkForm(false)}
        disabled={creatingUploadLink}
      >
        Cancel
      </button>

      <button
        type="button"
        className="crm-btn-primary"
        onClick={createCandidateUploadLink}
        disabled={creatingUploadLink}
      >
        {creatingUploadLink ? 'Sending...' : 'Send portal link'}
      </button>
    </div>
  </div>
)}

      {lastPortalMessage && (
  <div
    className="crm-card"
    style={{
      marginBottom: 14,
      display: 'grid',
      gap: 12,
      border: '1.5px solid #bbf7d0',
      background: '#f0fdf4',
    }}
  >
    <div>
      <p className="crm-card-title">Candidate portal email sent</p>
      <p
        style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          marginTop: 4,
          lineHeight: 1.5,
        }}
      >
        {lastPortalMessage}
      </p>
    </div>
  </div>
)}

      <div className="crm-tabs" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
  {[
    { id: 'overview', label: '◈ Overview' },
    { id: 'applications', label: `📌 Applications (${applications.length})` },
    { id: 'placements', label: `✓ Placements (${placements.length})` },
    { id: 'standards', label: `🎓 Standards (${selectedStandards.length})` },
    { id: 'documents', label: `📎 Documents (${candidateDocuments.length})` },
    { id: 'activity', label: `📋 Activity (${candidateActivities.length})` },
    { id: 'tasks', label: `✅ Tasks (${candidateTasks.length})` },
  ].map(tab => (
    <button
      key={tab.id}
      className={`crm-tab${activeTab === tab.id ? ' active' : ''}`}
      onClick={() => setActiveTab(tab.id as any)}
      style={{ whiteSpace: 'nowrap' }}
    >
      {tab.label}
    </button>
  ))}
</div>

      {activeTab === 'overview' && (
        <OverviewTab
          candidateRecord={candidateRecord}
          candidateName={candidateName}
          getWorkTypeLabel={getWorkTypeLabel}
          getDbsLabel={getDbsLabel}
          selectedStandards={selectedStandards}
          isRightToWorkConfirmed={isRightToWorkConfirmed}
        />
      )}

      {activeTab === 'applications' && (
        <ApplicationsTab
          applications={applications}
          router={router}
          getClient={getClient}
          formatDate={formatDate}
        />
      )}

      {activeTab === 'placements' && (
  <PlacementsTab
    placements={placements}
    getClient={getClient}
    formatDate={formatDate}
  />
)}

      {activeTab === 'standards' && (
        <StandardsTab
          standards={standards}
          filteredStandards={filteredStandards}
          selectedStandards={selectedStandards}
          standardSearch={standardSearch}
          setStandardSearch={setStandardSearch}
          standardSectorFilter={standardSectorFilter}
          setStandardSectorFilter={setStandardSectorFilter}
          standardSectors={standardSectors}
          manualStandardInput={manualStandardInput}
          setManualStandardInput={setManualStandardInput}
          addManualStandard={addManualStandard}
          toggleStandard={toggleStandard}
          removeStandard={removeStandard}
          isStandardSelected={isStandardSelected}
          getStandardName={getStandardName}
          getStandardSubjectArea={getStandardSubjectArea}
          saveStandards={saveStandards}
          savingStandards={savingStandards}
          standardsSaved={standardsSaved}
        />
      )}

      {activeTab === 'documents' && (
        <DocumentsTab
  groupedDocuments={groupedDocuments}
  selectedDocSafe={selectedDocSafe}
  setSelectedDocument={setSelectedDocument}
  showDocForm={showDocForm}
  setShowDocForm={setShowDocForm}
  docForm={docForm}
  setDocForm={setDocForm}
  docFile={docFile}
  setDocFile={setDocFile}
  uploadingDoc={uploadingDoc}
  uploadDoc={uploadDoc}
  docUploadError={docUploadError}
  updateDocumentType={updateDocumentType}
  updatingDocumentId={updatingDocumentId}
  toggleDocumentRelease={toggleDocumentRelease}
  releasingDocumentId={releasingDocumentId}
  releaseAllowed={placements.length > 0}
  toggleDocumentPortalVisibility={toggleDocumentPortalVisibility}
  updatingPortalDocumentId={updatingPortalDocumentId}
  deleteDocument={deleteDocument}
  deletingDocumentId={deletingDocumentId}
  formatDate={formatDate}
  getDocumentLabel={getDocumentLabel}
  getFileKind={getFileKind}
  getReferenceDetails={getReferenceDetails}
  candidateDocuments={candidateDocuments}
  referenceForm={referenceForm}
  setReferenceForm={setReferenceForm}
  selectedDocumentUrl={selectedDocumentUrl}
loadingSelectedDocumentUrl={loadingSelectedDocumentUrl}
selectedDocumentUrlError={selectedDocumentUrlError}
openSelectedDocument={openSelectedDocument}
/>
      )}

      {activeTab === 'activity' && (
  <ActivityTab
    activities={candidateActivities}
    actType={actType}
    setActType={setActType}
    actContent={actContent}
    setActContent={setActContent}
    addActivity={addActivity}
    deleteActivity={deleteActivity}
    addingAct={addingAct}
    activitySaved={activitySaved}
  />
)}

      {activeTab === 'tasks' && (
  <TasksTab
    tasks={candidateTasks}
    formatDate={formatDate}
    newTaskTitle={newTaskTitle}
    setNewTaskTitle={setNewTaskTitle}
    newTaskDueDate={newTaskDueDate}
    setNewTaskDueDate={setNewTaskDueDate}
    addTask={addTask}
    toggleTask={toggleTask}
    deleteTask={deleteTask}
    addingTask={addingTask}
  />
)}

      {showEditCandidate && (
        <EditCandidateModal
          editCandidateForm={editCandidateForm}
          setEditCandidateForm={setEditCandidateForm}
          saveCandidate={saveCandidate}
          savingCandidate={savingCandidate}
          candidateSaveError={candidateSaveError}
          close={() => setShowEditCandidate(false)}
          mainRoleOptions={mainRoleOptions}
          subRoleOptions={subRoleOptions}
        />
      )}

      {showAddApplication && (
        <AddApplicationModal
          candidateName={candidateName}
          vacancies={vacancies}
          newApplicationForm={newApplicationForm}
          setNewApplicationForm={setNewApplicationForm}
          createApplication={createApplication}
          creatingApplication={creatingApplication}
          createError={createError}
          resetAddApplicationModal={resetAddApplicationModal}
          getClient={getClient}
        />
      )}
    </div>
  )
}

function OverviewTab({
  candidateRecord,
  candidateName,
  getWorkTypeLabel,
  getDbsLabel,
  selectedStandards,
  isRightToWorkConfirmed,
}: {
  candidateRecord: Candidate
  candidateName: string
  getWorkTypeLabel: (value?: string | null) => string
  getDbsLabel: (value?: string | null) => string
  selectedStandards: string[]
  isRightToWorkConfirmed: (value: Candidate['right_to_work']) => boolean
}) {
  const lookingForRoles = Array.isArray(candidateRecord.looking_for_roles)
    ? candidateRecord.looking_for_roles.filter(Boolean)
    : []

  const addressParts = [
    candidateRecord.address_line_1,
    candidateRecord.address_line_2,
    candidateRecord.town_city,
    candidateRecord.county,
    candidateRecord.postcode,
  ].filter(Boolean)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="crm-card">
          <p className="crm-card-title" style={{ marginBottom: 12 }}>
            Candidate details
          </p>

          <div className="crm-detail-list">
            <DetailRow label="Name">
              <span className="crm-detail-value">{candidateName || '—'}</span>
            </DetailRow>

            <DetailRow label="Email">
              {candidateRecord.email ? (
                <a href={`mailto:${candidateRecord.email}`} className="crm-detail-link">
                  {candidateRecord.email}
                </a>
              ) : (
                <span className="crm-detail-value">—</span>
              )}
            </DetailRow>

            <DetailRow label="Phone">
              {candidateRecord.phone ? (
                <a href={`tel:${candidateRecord.phone}`} className="crm-detail-link">
                  {candidateRecord.phone}
                </a>
              ) : (
                <span className="crm-detail-value">—</span>
              )}
            </DetailRow>

            <DetailRow label="LinkedIn">
              {candidateRecord.linkedin ? (
                <a
                  href={candidateRecord.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="crm-detail-link"
                >
                  View ↗
                </a>
              ) : (
                <span className="crm-detail-value">—</span>
              )}
            </DetailRow>

            <DetailRow label="Current role">
              <span className="crm-detail-value">{candidateRecord.job_title || '—'}</span>
            </DetailRow>

            <DetailRow label="Looking for">
              {lookingForRoles.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {lookingForRoles.map(role => (
                    <span key={role} className="crm-badge crm-badge-blue">
                      {role}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="crm-detail-value">
                  {candidateRecord.sub_role_type ||
                    candidateRecord.seeking_role_type ||
                    candidateRecord.main_role_type ||
                    '—'}
                </span>
              )}
            </DetailRow>

            <DetailRow label="Location">
              <span className="crm-detail-value">
                {candidateRecord.preferred_location || candidateRecord.postcode || '—'}
              </span>
            </DetailRow>

            <DetailRow label="Address">
              <span className="crm-detail-value">
                {addressParts.length > 0 ? addressParts.join(', ') : '—'}
              </span>
            </DetailRow>

            <DetailRow label="Work type">
              <span className="crm-detail-value">
                {getWorkTypeLabel(candidateRecord.work_type_pref)}
              </span>
            </DetailRow>

            <DetailRow label="Source">
              <span className="crm-detail-value">{candidateRecord.source || '—'}</span>
            </DetailRow>
          </div>
        </div>

                <div className="crm-card">
          <p className="crm-card-title" style={{ marginBottom: 12 }}>
            Availability & salary
          </p>

          <div className="crm-detail-list">
            <DetailRow label="Current salary">
              <span className="crm-detail-value">
                {candidateRecord.current_salary || '—'}
              </span>
            </DetailRow>

            <DetailRow label="Salary expected">
              <span className="crm-detail-value">
                {candidateRecord.salary_expected || '—'}
              </span>
            </DetailRow>

            <DetailRow label="Notice period">
              <span className="crm-detail-value">
                {candidateRecord.notice_period || '—'}
              </span>
            </DetailRow>

            <DetailRow label="Salary notes">
              <span className="crm-detail-value">
                {candidateRecord.salary_notes || '—'}
              </span>
            </DetailRow>
          </div>
        </div>
        
        <div className="crm-card">
          <p className="crm-card-title" style={{ marginBottom: 12 }}>
            Compliance / checks
          </p>

          <div className="crm-detail-list">
            <DetailRow label="DBS status">
              <span className="crm-detail-value">
                {getDbsLabel(candidateRecord.dbs_status)}
              </span>
            </DetailRow>

            <DetailRow label="Right to work">
              <span
                className="crm-badge"
                style={{
                  background: isRightToWorkConfirmed(candidateRecord.right_to_work)
                    ? '#e8f5e8'
                    : '#f0f0f2',
                  color: isRightToWorkConfirmed(candidateRecord.right_to_work)
                    ? '#217822'
                    : '#737373',
                }}
              >
                {isRightToWorkConfirmed(candidateRecord.right_to_work)
                  ? 'Confirmed'
                  : 'Not confirmed'}
              </span>
            </DetailRow>

            <DetailRow label="CV">
              {candidateRecord.cv_url ? (
                <a
                  href={candidateRecord.cv_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="crm-detail-link"
                >
                  Open CV ↗
                </a>
              ) : (
                <span className="crm-detail-value">—</span>
              )}
            </DetailRow>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="crm-card">
          <p className="crm-card-title" style={{ marginBottom: 12 }}>
            Standards / delivery areas
          </p>

          {selectedStandards.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {selectedStandards.map(item => (
                <span key={item} className="crm-badge crm-badge-blue">
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <p className="crm-empty">No standards / delivery areas recorded.</p>
          )}
        </div>

        <div className="crm-card">
          <p className="crm-card-title" style={{ marginBottom: 12 }}>
            Qualifications
          </p>

          {candidateRecord.qualifications ? (
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-dark)',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
              }}
            >
              {candidateRecord.qualifications}
            </p>
          ) : (
            <p className="crm-empty">No qualifications recorded.</p>
          )}
        </div>

        <div className="crm-card">
          <p className="crm-card-title" style={{ marginBottom: 12 }}>
            Notes
          </p>

          {candidateRecord.notes ? (
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-dark)',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
              }}
            >
              {candidateRecord.notes}
            </p>
          ) : (
            <p className="crm-empty">No notes recorded.</p>
          )}
        </div>
      </div>
    </div>
  )
}
function ApplicationsTab({
  applications,
  router,
  getClient,
  formatDate,
}: {
  applications: Application[]
  router: ReturnType<typeof useRouter>
  getClient: (clientField: ClientRef | ClientRef[] | null | undefined) => ClientRef | null
  formatDate: (date?: string | null) => string
}) {
  return (
    <div className="crm-card crm-table-card">
      <table className="crm-table">
        <thead>
          <tr>
  <th>Vacancy</th>
  <th>Client</th>
  <th>Location</th>
  <th>Stage</th>
  <th>EA interview</th>
  <th>Client interview</th>
  <th>Added</th>
</tr>
        </thead>

        <tbody>
          {applications.map(app => {
            const client = getClient(app.vacancies?.clients)

            return (
              <tr
                key={app.id}
                className="crm-table-row-clickable"
                onClick={() => router.push(`/crm/applications/${app.id}`)}
              >
                <td>
                  <p className="crm-table-main">
                    {app.vacancies?.title || 'Unknown vacancy'}
                  </p>
                  {app.vacancies?.salary_display && (
                    <p className="crm-table-sub">{app.vacancies.salary_display}</p>
                  )}
                </td>

                <td>{client?.company_name || '—'}</td>

                <td>{app.vacancies?.location || app.vacancies?.region || '—'}</td>

                <td>
  <span
    className="crm-badge"
    style={{
      background:
        APPLICATION_STAGE_COLOURS[app.status]?.bg ?? '#f0f0f2',
      color:
        APPLICATION_STAGE_COLOURS[app.status]?.text ?? '#737373',
    }}
  >
    {app.status.replace(/_/g, ' ')}
  </span>
</td>

<td>
  <p className="crm-table-main">
    {formatDate(app.ea_interview_date)}
  </p>

  {app.ea_interview_verdict && (
    <p className="crm-table-sub">
      {app.ea_interview_verdict.replace(/_/g, ' ')}
    </p>
  )}
</td>

<td>
  <p className="crm-table-main">
    {formatDate(app.client_interview_date)}
    {app.client_interview_time ? ` · ${app.client_interview_time}` : ''}
  </p>

  {app.client_interview_outcome && (
    <p className="crm-table-sub">
      {app.client_interview_outcome.replace(/_/g, ' ')}
    </p>
  )}
</td>

<td>{formatDate(app.created_at)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {applications.length === 0 && (
        <p className="crm-empty crm-empty-table">
          No applications linked to this candidate yet.
        </p>
      )}
    </div>
  )
}

function PlacementsTab({
  placements,
  getClient,
  formatDate,
}: {
  placements: Placement[]
  getClient: (clientField: ClientRef | ClientRef[] | null | undefined) => ClientRef | null
  formatDate: (date?: string | null) => string
}) {
  function formatMoney(value?: number | string | null) {
    if (value === null || value === undefined || value === '') return '—'

    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      maximumFractionDigits: 0,
    }).format(Number(value))
  }

  return (
    <div className="crm-card crm-table-card">
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <p className="crm-card-title">Placements</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
            Confirmed placement records linked to this candidate.
          </p>
        </div>

        <span className="crm-badge crm-badge-blue">
          {placements.length}
        </span>
      </div>

      <table className="crm-table">
        <thead>
          <tr>
            <th>Placement</th>
            <th>Client / Vacancy</th>
            <th>Start date</th>
            <th>Salary</th>
            <th>Fee</th>
            <th>Status</th>
            <th>Aftercare</th>
            <th />
          </tr>
        </thead>

        <tbody>
          {placements.map(placement => {
            const vacancy = Array.isArray(placement.vacancies)
              ? placement.vacancies[0] ?? null
              : placement.vacancies ?? null

            const placementClient = getClient(placement.clients)
            const vacancyClient = getClient(vacancy?.clients)
            const client = placementClient || vacancyClient

            const placementTasks = Array.isArray(placement.placement_tasks)
              ? placement.placement_tasks
              : []

            const completedTasks = placementTasks.filter(task => task.completed).length

            return (
              <tr key={placement.id}>
                <td>
                  <p className="crm-table-main">
                    {placement.placement_ref || 'Placement'}
                  </p>

                  <p className="crm-table-sub">
                    Created {formatDate(placement.created_at)}
                  </p>
                </td>

                <td>
                  <p className="crm-table-main">
                    {client?.company_name || 'No client'}
                  </p>

                  <p className="crm-table-sub">
                    {vacancy?.title || 'No vacancy'}
                  </p>
                </td>

                <td>{formatDate(placement.start_date)}</td>

                <td>{formatMoney(placement.salary)}</td>

                <td>
                  {placement.fee_amount
                    ? formatMoney(placement.fee_amount)
                    : placement.fee_percentage
                      ? `${placement.fee_percentage}%`
                      : '—'}
                </td>

                <td>
                  <span
                    className="crm-badge"
                    style={{
                      background:
                        placement.status === 'placed' ? '#e8f5e8' : '#fffbeb',
                      color:
                        placement.status === 'placed' ? '#217822' : '#d97706',
                    }}
                  >
                    {String(placement.status || 'draft').replace(/_/g, ' ')}
                  </span>
                </td>

                <td>
                  <span className="crm-badge crm-badge-blue">
                    {completedTasks}/{placementTasks.length}
                  </span>
                </td>

                <td>
                  <Link
                    href={`/crm/placements/${placement.id}`}
                    className="crm-card-link"
                  >
                    Open →
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {placements.length === 0 && (
        <p className="crm-empty crm-empty-table">
          No placements linked to this candidate yet.
        </p>
      )}
    </div>
  )
}

function StandardsTab({
  standards,
  filteredStandards,
  selectedStandards,
  standardSearch,
  setStandardSearch,
  standardSectorFilter,
  setStandardSectorFilter,
  standardSectors,
  manualStandardInput,
  setManualStandardInput,
  addManualStandard,
  toggleStandard,
  removeStandard,
  isStandardSelected,
  getStandardName,
  getStandardSubjectArea,
  saveStandards,
  savingStandards,
  standardsSaved,
}: {
  standards: ApprenticeshipStandard[]
  filteredStandards: ApprenticeshipStandard[]
  selectedStandards: string[]
  standardSearch: string
  setStandardSearch: (value: string) => void
  standardSectorFilter: string
  setStandardSectorFilter: (value: string) => void
  standardSectors: string[]
  manualStandardInput: string
  setManualStandardInput: (value: string) => void
  addManualStandard: () => void
  toggleStandard: (standardName: string) => void
  removeStandard: (standard: string) => void
  isStandardSelected: (standardName: string) => boolean
  getStandardName: (standard: ApprenticeshipStandard) => string
  getStandardSubjectArea: (standard: ApprenticeshipStandard) => string
  saveStandards: () => Promise<void>
  savingStandards: boolean
  standardsSaved: boolean
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 14 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="crm-card">
          <p className="crm-card-title" style={{ marginBottom: 10 }}>
            Selected standards
          </p>

          <p
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              lineHeight: 1.5,
              marginBottom: 12,
            }}
          >
            These are the standards or delivery areas saved against this candidate.
          </p>

          {selectedStandards.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Array.from(
  new Map(
    selectedStandards
      .map(standard => String(standard || '').trim())
      .filter(Boolean)
      .map(standard => [standard.toLowerCase(), standard]),
  ).values(),
).map(standard => (
  <button
    key={`selected-standard-${standard.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
    type="button"
    onClick={() => removeStandard(standard)}
                  className="crm-badge crm-badge-blue"
                  style={{
                    border: 0,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  title="Click to remove"
                >
                  {standard}
                  <span style={{ fontWeight: 900 }}>×</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="crm-empty">No standards selected yet.</p>
          )}

          <button
            type="button"
            className="crm-btn-primary"
            onClick={saveStandards}
            disabled={savingStandards}
            style={{ width: '100%', marginTop: 14 }}
          >
            {savingStandards ? 'Saving...' : 'Save standards'}
          </button>

          {standardsSaved && (
            <p
              style={{
                fontSize: 12,
                color: '#217822',
                fontWeight: 800,
                marginTop: 8,
              }}
            >
              ✓ Standards saved
            </p>
          )}
        </div>

        <div className="crm-card">
          <p className="crm-card-title" style={{ marginBottom: 10 }}>
            Add manual standard
          </p>

          <p
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              lineHeight: 1.5,
              marginBottom: 12,
            }}
          >
            Use this if the standard is not yet in your standards table.
          </p>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="crm-input"
              placeholder="Type standard..."
              value={manualStandardInput}
              onChange={e => setManualStandardInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addManualStandard()
                }
              }}
            />

            <button
              type="button"
              className="crm-btn-primary crm-btn-sm"
              onClick={addManualStandard}
              style={{ whiteSpace: 'nowrap' }}
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <div className="crm-card">
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
            <p className="crm-card-title">Apprenticeship standards</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
              Search and select the standards this candidate can deliver.
            </p>
          </div>

          <span className="crm-badge crm-badge-blue">
            {filteredStandards.length} found
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 220px',
            gap: 10,
            marginBottom: 12,
          }}
        >
          <div className="crm-search-wrap">
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

            <input
              className="crm-search"
              placeholder="Search standards, subject area or reference..."
              value={standardSearch}
              onChange={e => setStandardSearch(e.target.value)}
            />
          </div>

          <select
            className="crm-select crm-select-sm"
            value={standardSectorFilter}
            onChange={e => setStandardSectorFilter(e.target.value)}
          >
            <option value="all">All subject areas</option>

            {standardSectors.map(sector => (
              <option key={sector} value={sector}>
                {sector}
              </option>
            ))}
          </select>
        </div>

        {standards.length === 0 && (
          <div
            style={{
              padding: 12,
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 10,
              marginBottom: 12,
            }}
          >
            <p style={{ fontSize: 12, color: '#92400e', fontWeight: 700 }}>
              No apprenticeship standards were passed into this page. Check the
              candidate detail page query is fetching standards and passing the
              standards prop.
            </p>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            maxHeight: 560,
            overflowY: 'auto',
            paddingRight: 4,
          }}
        >
          {filteredStandards.map(standard => {
            const standardName = getStandardName(standard)
            const subjectArea = getStandardSubjectArea(standard)
            const selected = isStandardSelected(standardName)

            return (
              <button
                key={standard.id}
                type="button"
                onClick={() => toggleStandard(standardName)}
                style={{
                  border: `1.5px solid ${
                    selected ? 'var(--primary)' : 'var(--border-light)'
                  }`,
                  background: selected ? 'var(--primary-light)' : '#fff',
                  borderRadius: 10,
                  padding: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 10,
                    alignItems: 'flex-start',
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
                      {standardName}
                    </p>

                    <p
                      style={{
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        marginTop: 3,
                      }}
                    >
                      {[
                        subjectArea,
                        standard.level ? `Level ${standard.level}` : '',
                        standard.reference || '',
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'No subject area recorded'}
                    </p>
                  </div>

                  <span
                    className="crm-badge"
                    style={{
                      background: selected ? '#e8f5e8' : '#f0f0f2',
                      color: selected ? '#217822' : '#737373',
                      flexShrink: 0,
                    }}
                  >
                    {selected ? 'Selected' : 'Select'}
                  </span>
                </div>
              </button>
            )
          })}

          {filteredStandards.length === 0 && (
            <p className="crm-empty">
              No standards found. Try another search or subject area.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

type DocumentsTabProps = {
  groupedDocuments: Array<{
    value: string
    label: string
    icon: string
    documents: CandidateDocument[]
  }>
  selectedDocSafe: CandidateDocument | null
  setSelectedDocument: Dispatch<SetStateAction<CandidateDocument | null>>
  showDocForm: boolean
  setShowDocForm: Dispatch<SetStateAction<boolean>>
  docForm: DocUploadForm
  setDocForm: Dispatch<SetStateAction<DocUploadForm>>
  docFile: File | null
  setDocFile: Dispatch<SetStateAction<File | null>>
  uploadingDoc: boolean
  uploadDoc: (e: FormEvent) => Promise<void>
  docUploadError: string | null
  updateDocumentType: (documentId: string, docType: string) => Promise<void>
  updatingDocumentId: string | null
  toggleDocumentRelease: (
    documentId: string,
    nextReleased: boolean,
  ) => Promise<void>
  releasingDocumentId: string | null
  releaseAllowed: boolean
  formatDate: (date?: string | null) => string
  getDocumentLabel: (docType?: string | null) => string
  getFileKind: (url: string | null) => string
  getReferenceDetails: (
    doc: CandidateDocument | null,
  ) => Record<string, any> | null
  candidateDocuments: CandidateDocument[]
  toggleDocumentPortalVisibility: (
    documentId: string,
    nextVisible: boolean,
  ) => Promise<void>
  updatingPortalDocumentId: string | null
  deleteDocument: (document: CandidateDocument) => Promise<void>
  deletingDocumentId: string | null
  referenceForm: ReferenceForm
  setReferenceForm: Dispatch<SetStateAction<ReferenceForm>>
  selectedDocumentUrl: string
  loadingSelectedDocumentUrl: boolean
  selectedDocumentUrlError: string | null
  openSelectedDocument: () => Promise<void>
}

function DocumentsTab({
  groupedDocuments,
  selectedDocSafe,
  setSelectedDocument,
  showDocForm,
  setShowDocForm,
  docForm,
  setDocForm,
  docFile,
  setDocFile,
  uploadingDoc,
  uploadDoc,
  docUploadError,
  updateDocumentType,
  updatingDocumentId,
  toggleDocumentRelease,
  releasingDocumentId,
  releaseAllowed,
  formatDate,
  getDocumentLabel,
  getFileKind,
  getReferenceDetails,
  candidateDocuments,
  toggleDocumentPortalVisibility,
  updatingPortalDocumentId,
  deleteDocument,
  deletingDocumentId,
  referenceForm,
  setReferenceForm,
  selectedDocumentUrl,
  loadingSelectedDocumentUrl,
  selectedDocumentUrlError,
  openSelectedDocument,
}: DocumentsTabProps) {
  const selectedFileUrl = selectedDocumentUrl || selectedDocSafe?.file_url || ''

const selectedFileKind =
  getFileKind(selectedDocSafe?.name || null) !== 'unknown'
    ? getFileKind(selectedDocSafe?.name || null)
    : getFileKind(
        selectedDocSafe?.storage_path ||
          selectedDocSafe?.file_url ||
          selectedFileUrl ||
          null,
      )
  const selectedIsFormattedCv = selectedDocSafe?.doc_type === 'formatted_cv'
  const selectedIsReleased = Boolean(selectedDocSafe?.released)
  const selectedShowsOnPortal = Boolean(selectedDocSafe?.show_in_employer_portal)
  const selectedHasFile = Boolean(
    selectedDocSafe?.file_url ||
      (selectedDocSafe?.storage_bucket && selectedDocSafe?.storage_path),
  )
  const selectedReferenceDetails = getReferenceDetails(selectedDocSafe)

  const isReferenceEntry = docForm.doc_type === 'reference'
  const referenceCanSave =
    referenceForm.referee_name.trim().length > 0 &&
    Boolean(
      referenceForm.email.trim() ||
        referenceForm.phone.trim() ||
        referenceForm.organisation.trim(),
    )

  const canSubmitDocument = isReferenceEntry ? referenceCanSave : Boolean(docFile)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p className="crm-card-title">Candidate documents</p>
          <p
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              marginTop: 4,
              lineHeight: 1.5,
            }}
          >
            Manage uploaded documents, employer portal visibility and final
            release/download access.
          </p>
        </div>

        <button className="crm-btn-primary" onClick={() => setShowDocForm(true)}>
          + Upload Document
        </button>
      </div>

      {showDocForm && (
        <div
          className="crm-card"
          style={{
            border: '1.5px solid var(--primary)',
            background: '#fff',
          }}
        >
          <form onSubmit={uploadDoc}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 220px',
                gap: 12,
                alignItems: 'end',
              }}
            >
              <div className="crm-field">
                <label className="crm-label">Document name</label>
                <input
                  className="crm-input"
                  value={docForm.name}
                  onChange={event =>
                    setDocForm(form => ({
                      ...form,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g. CV, Level 3 Certificate, DBS"
                />
              </div>

              <div className="crm-field">
                <label className="crm-label">Document type</label>
                <select
                  className="crm-select"
                  value={docForm.doc_type}
                  onChange={event =>
                    setDocForm(form => ({
                      ...form,
                      doc_type: event.target.value,
                    }))
                  }
                >
                  {DOCUMENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isReferenceEntry ? (
  <div
    style={{
      marginTop: 12,
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: 12,
    }}
  >
    <div className="crm-field">
      <label className="crm-label">Referee name *</label>
      <input
        className="crm-input"
        value={referenceForm.referee_name}
        onChange={event =>
          setReferenceForm(form => ({
            ...form,
            referee_name: event.target.value,
          }))
        }
        placeholder="e.g. Jane Smith"
      />
    </div>

    <div className="crm-field">
      <label className="crm-label">Referee job title</label>
      <input
        className="crm-input"
        value={referenceForm.referee_job_title}
        onChange={event =>
          setReferenceForm(form => ({
            ...form,
            referee_job_title: event.target.value,
          }))
        }
        placeholder="e.g. Operations Manager"
      />
    </div>

    <div className="crm-field">
      <label className="crm-label">Organisation *</label>
      <input
        className="crm-input"
        value={referenceForm.organisation}
        onChange={event =>
          setReferenceForm(form => ({
            ...form,
            organisation: event.target.value,
          }))
        }
        placeholder="e.g. Example Training Ltd"
      />
    </div>

    <div className="crm-field">
      <label className="crm-label">Relationship to candidate</label>
      <input
        className="crm-input"
        value={referenceForm.relationship}
        onChange={event =>
          setReferenceForm(form => ({
            ...form,
            relationship: event.target.value,
          }))
        }
        placeholder="e.g. Line manager"
      />
    </div>

    <div className="crm-field">
      <label className="crm-label">Email</label>
      <input
        className="crm-input"
        type="email"
        value={referenceForm.email}
        onChange={event =>
          setReferenceForm(form => ({
            ...form,
            email: event.target.value,
          }))
        }
        placeholder="referee@email.com"
      />
    </div>

    <div className="crm-field">
      <label className="crm-label">Phone</label>
      <input
        className="crm-input"
        value={referenceForm.phone}
        onChange={event =>
          setReferenceForm(form => ({
            ...form,
            phone: event.target.value,
          }))
        }
        placeholder="Telephone / mobile"
      />
    </div>

    <div className="crm-field">
      <label className="crm-label">Reference type</label>
      <select
        className="crm-select"
        value={referenceForm.reference_type}
        onChange={event =>
          setReferenceForm(form => ({
            ...form,
            reference_type: event.target.value,
          }))
        }
      >
        {REFERENCE_TYPES.map(type => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>
    </div>

    <div className="crm-field">
      <label className="crm-label">Status</label>
      <select
        className="crm-select"
        value={referenceForm.status}
        onChange={event =>
          setReferenceForm(form => ({
            ...form,
            status: event.target.value,
          }))
        }
      >
        {REFERENCE_STATUS_OPTIONS.map(status => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>
    </div>

    <div className="crm-field">
      <label className="crm-label">Date requested</label>
      <input
        className="crm-input"
        type="date"
        value={referenceForm.requested_at}
        onChange={event =>
          setReferenceForm(form => ({
            ...form,
            requested_at: event.target.value,
          }))
        }
      />
    </div>

    <div className="crm-field">
      <label className="crm-label">Date received</label>
      <input
        className="crm-input"
        type="date"
        value={referenceForm.received_at}
        onChange={event =>
          setReferenceForm(form => ({
            ...form,
            received_at: event.target.value,
          }))
        }
      />
    </div>

    <div className="crm-field" style={{ gridColumn: '1 / -1' }}>
      <label className="crm-label">Reference notes</label>
      <textarea
        className="crm-input"
        rows={5}
        value={referenceForm.notes}
        onChange={event =>
          setReferenceForm(form => ({
            ...form,
            notes: event.target.value,
          }))
        }
        placeholder="Add notes from the reference, contact attempts or verification details..."
        style={{ lineHeight: 1.6 }}
      />
    </div>
  </div>
) : (
  <div className="crm-field" style={{ marginTop: 12 }}>
    <label className="crm-label">File</label>
    <input
      className="crm-input"
      type="file"
      onChange={event => setDocFile(event.target.files?.[0] ?? null)}
    />
  </div>
)}

            {docUploadError && (
              <p
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: '#dc2626',
                  fontWeight: 800,
                }}
              >
                {docUploadError}
              </p>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                marginTop: 14,
              }}
            >
              <button
                type="button"
                className="crm-btn-ghost"
                onClick={() => setShowDocForm(false)}
                disabled={uploadingDoc}
              >
                Cancel
              </button>

              <button
  type="submit"
  className="crm-btn-primary"
  disabled={uploadingDoc || !canSubmitDocument}
>
  {uploadingDoc
    ? isReferenceEntry
      ? 'Saving...'
      : 'Uploading...'
    : isReferenceEntry
      ? 'Save reference'
      : 'Upload document'}
</button>
            </div>
          </form>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '380px minmax(0, 1fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {groupedDocuments.map(group => {
            if (group.documents.length === 0) return null

            return (
              <div key={group.value} className="crm-card" style={{ padding: 12 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}
                >
                  <p className="crm-card-title">
                    {group.icon} {group.label}
                  </p>

                  <span className="crm-badge crm-badge-blue">
                    {group.documents.length}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.documents.map(doc => {
                    const isSelected = selectedDocSafe?.id === doc.id
                    const isFormattedCv = doc.doc_type === 'formatted_cv'

                    return (
                      <div
                        key={doc.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedDocument(doc)}
                        onKeyDown={event => {
                          if (event.key === 'Enter') setSelectedDocument(doc)
                        }}
                        style={{
                          border: `1.5px solid ${
                            isSelected ? 'var(--primary)' : 'var(--border-light)'
                          }`,
                          background: isSelected
                            ? 'var(--primary-light)'
                            : 'var(--light-bg)',
                          borderRadius: 12,
                          padding: 10,
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ marginBottom: 8 }}>
                          <p
                            style={{
                              fontSize: 13,
                              fontWeight: 900,
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
                              marginTop: 3,
                            }}
                          >
                            Added {formatDate(doc.created_at)}
                          </p>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            gap: 6,
                            flexWrap: 'wrap',
                            marginBottom: 8,
                          }}
                        >
                          {isFormattedCv && (
                            <span
                              className="crm-badge"
                              style={{
                                background: '#e0f0fb',
                                color: '#0B72B8',
                              }}
                            >
                              Employer CV
                            </span>
                          )}

                          {doc.show_in_employer_portal && !isFormattedCv && (
                            <span
                              className="crm-badge"
                              style={{
                                background: '#fffbeb',
                                color: '#d97706',
                              }}
                            >
                              On-file visible
                            </span>
                          )}

                          {doc.released && !isFormattedCv && (
                            <span
                              className="crm-badge"
                              style={{
                                background: '#e8f5e8',
                                color: '#217822',
                              }}
                            >
                              Released
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto',
                            gap: 8,
                            alignItems: 'center',
                          }}
                          onClick={event => event.stopPropagation()}
                        >
                          <select
                            className="crm-select crm-select-sm"
                            value={doc.doc_type || 'other'}
                            onChange={event =>
                              updateDocumentType(doc.id, event.target.value)
                            }
                            disabled={updatingDocumentId === doc.id}
                          >
                            {DOCUMENT_TYPES.map(type => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>

                          {doc.file_url && (
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="crm-btn-ghost crm-btn-sm"
                              style={{ textDecoration: 'none' }}
                            >
                              Open ↗
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {candidateDocuments.length === 0 && (
            <div className="crm-card" style={{ textAlign: 'center', padding: 28 }}>
              <p style={{ fontSize: 30, marginBottom: 8 }}>📎</p>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 900,
                  color: 'var(--text-dark)',
                }}
              >
                No documents uploaded
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  marginTop: 4,
                }}
              >
                Upload CVs, certificates, DBS, right to work or reference files.
              </p>
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            position: 'sticky',
            top: 16,
          }}
        >
          {!selectedDocSafe ? (
            <div className="crm-card" style={{ textAlign: 'center', padding: 36 }}>
              <p style={{ fontSize: 34, marginBottom: 10 }}>📄</p>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 900,
                  color: 'var(--text-dark)',
                }}
              >
                Select a document
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  marginTop: 5,
                }}
              >
                Choose a document on the left to preview and manage it.
              </p>
            </div>
          ) : (
            <>
              <div className="crm-card">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    alignItems: 'flex-start',
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <p className="crm-card-title">{selectedDocSafe.name}</p>
                    <p
                      style={{
                        fontSize: 12,
                        color: 'var(--text-muted)',
                        marginTop: 4,
                      }}
                    >
                      {getDocumentLabel(selectedDocSafe.doc_type)} · Added{' '}
                      {formatDate(selectedDocSafe.created_at)}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
  {selectedHasFile && (
  <button
    type="button"
    onClick={openSelectedDocument}
    disabled={loadingSelectedDocumentUrl}
    className="crm-btn-ghost crm-btn-sm"
  >
    {loadingSelectedDocumentUrl ? 'Opening...' : 'Open ↗'}
  </button>
)}

  <button
    type="button"
    className="crm-btn-ghost crm-btn-sm"
    onClick={() => deleteDocument(selectedDocSafe)}
    disabled={deletingDocumentId === selectedDocSafe.id}
    style={{
      borderColor: '#fecaca',
      color: '#e53e3e',
      background: '#fff',
    }}
  >
    {deletingDocumentId === selectedDocSafe.id ? 'Deleting...' : 'Delete'}
  </button>
</div>
                </div>

                <div
                  style={{
                    border: '1px solid var(--border-light)',
                    borderRadius: 14,
                    overflow: 'hidden',
                    minHeight: 520,
                    background: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {loadingSelectedDocumentUrl && selectedHasFile && (
  <div
    style={{
      padding: 10,
      borderBottom: '1px solid var(--border-light)',
      background: '#eff6ff',
      color: '#1d4ed8',
      fontSize: 12,
      fontWeight: 800,
    }}
  >
    Creating secure document link...
  </div>
)}

{selectedDocumentUrlError && (
  <div
    style={{
      padding: 10,
      borderBottom: '1px solid #fecaca',
      background: '#fef2f2',
      color: '#991b1b',
      fontSize: 12,
      fontWeight: 800,
    }}
  >
    {selectedDocumentUrlError}
  </div>
)}
                  {selectedDocSafe.doc_type === 'reference' &&
                  selectedReferenceDetails ? (
                    <div style={{ padding: 18 }}>
                      <p className="crm-card-title" style={{ marginBottom: 10 }}>
                        Reference details
                      </p>

                      <div className="crm-detail-list">
                        {Object.entries(selectedReferenceDetails).map(
                          ([key, value]) => (
                            <div key={key} className="crm-detail-row">
                              <span className="crm-detail-label">
                                {key.replace(/_/g, ' ')}
                              </span>
                              <span className="crm-detail-value">
                                {String(value || '—')}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  ) : selectedHasFile && selectedDocumentUrl ? (
                    <>
                      {selectedFileKind === 'image' && (
                        <div
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 12,
                            background: '#fff',
                          }}
                        >
                          <img
                            src={selectedDocumentUrl}
                            alt={selectedDocSafe.name}
                            style={{
                              maxWidth: '100%',
                              maxHeight: 620,
                              objectFit: 'contain',
                              borderRadius: 8,
                            }}
                          />
                        </div>
                      )}

                      {selectedFileKind === 'pdf' && (
                        <iframe
  src={selectedDocumentUrl}
                          title={selectedDocSafe.name}
                          style={{
                            width: '100%',
                            height: 620,
                            border: 0,
                            background: '#fff',
                          }}
                        />
                      )}

                      {['word', 'unknown'].includes(selectedFileKind) && (
                        <div
                          style={{
                            flex: 1,
                            padding: 24,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                          }}
                        >
                          <div>
                            <p style={{ fontSize: 34, marginBottom: 10 }}>📄</p>

                            <p
                              style={{
                                fontSize: 14,
                                fontWeight: 900,
                                color: 'var(--text-dark)',
                              }}
                            >
                              Preview not available in browser
                            </p>

                            <p
                              style={{
                                fontSize: 12,
                                color: 'var(--text-muted)',
                                marginTop: 5,
                                lineHeight: 1.5,
                              }}
                            >
                              Word documents often need to be opened directly.
                              PDFs and images will preview here.
                            </p>

                            <button
  type="button"
  onClick={openSelectedDocument}
  disabled={loadingSelectedDocumentUrl}
  className="crm-btn-primary crm-btn-sm"
  style={{
    display: 'inline-flex',
    marginTop: 14,
  }}
>
  {loadingSelectedDocumentUrl ? 'Opening...' : 'Open document'}
</button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div
                      style={{
                        flex: 1,
                        padding: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                      }}
                    >
                      <div>
                        <p style={{ fontSize: 34, marginBottom: 10 }}>📎</p>

                        <p
                          style={{
                            fontSize: 14,
                            fontWeight: 900,
                            color: 'var(--text-dark)',
                          }}
                        >
                          No file attached
                        </p>

                        <p
                          style={{
                            fontSize: 12,
                            color: 'var(--text-muted)',
                            marginTop: 5,
                            lineHeight: 1.5,
                          }}
                        >
                          This document record exists, but there is no file URL
                          saved.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div
                className="crm-card"
                style={{
                  border: selectedIsFormattedCv
                    ? '1.5px solid #bae6fd'
                    : selectedIsReleased
                      ? '1.5px solid #bbf7d0'
                      : '1.5px solid #fde68a',
                  background: selectedIsFormattedCv
                    ? '#f0f9ff'
                    : selectedIsReleased
                      ? '#f0fdf4'
                      : '#fffbeb',
                }}
              >
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 900,
                    color: 'var(--text-dark)',
                    marginBottom: 6,
                  }}
                >
                  Employer portal access
                </p>

                {selectedIsFormattedCv ? (
                  <>
                    <p
                      style={{
                        fontSize: 12,
                        color: 'var(--text-muted)',
                        lineHeight: 1.5,
                        marginBottom: 10,
                      }}
                    >
                      Formatted CVs are automatically available in the employer
                      portal once the application has been moved to Presented or
                      beyond. They do not need manual release.
                    </p>

                    <span
                      className="crm-badge"
                      style={{
                        background: '#e0f0fb',
                        color: '#0B72B8',
                      }}
                    >
                      Auto-unlocked after Presented
                    </span>
                  </>
                ) : (
                  <>
                    <p
                      style={{
                        fontSize: 12,
                        color: 'var(--text-muted)',
                        lineHeight: 1.5,
                        marginBottom: 12,
                      }}
                    >
                      Choose whether the employer can see that this document is
                      on file. Download access remains locked until it is
                      released after placement.
                    </p>

                    <button
                      type="button"
                      className={
                        selectedShowsOnPortal
                          ? 'crm-btn-primary crm-btn-sm'
                          : 'crm-btn-ghost crm-btn-sm'
                      }
                      onClick={() =>
                        toggleDocumentPortalVisibility(
                          selectedDocSafe.id,
                          !selectedShowsOnPortal,
                        )
                      }
                      disabled={updatingPortalDocumentId === selectedDocSafe.id}
                      style={{ marginRight: 8 }}
                    >
                      {updatingPortalDocumentId === selectedDocSafe.id
                        ? 'Updating...'
                        : selectedShowsOnPortal
                          ? 'Shown as on file'
                          : 'Show as on file'}
                    </button>

                    <button
                      type="button"
                      className={
                        selectedIsReleased
                          ? 'crm-btn-primary crm-btn-sm'
                          : 'crm-btn-ghost crm-btn-sm'
                      }
                      onClick={() =>
                        toggleDocumentRelease(
                          selectedDocSafe.id,
                          !selectedIsReleased,
                        )
                      }
                      disabled={
                        releasingDocumentId === selectedDocSafe.id ||
                        (!releaseAllowed && !selectedIsReleased)
                      }
                    >
                      {releasingDocumentId === selectedDocSafe.id
                        ? 'Updating...'
                        : selectedIsReleased
                          ? 'Released for download'
                          : 'Release for download'}
                    </button>

                    {!releaseAllowed && !selectedIsReleased && (
                      <p
                        style={{
                          fontSize: 11,
                          color: '#dc2626',
                          fontWeight: 900,
                          marginTop: 10,
                        }}
                      >
                        Release is locked until a placement exists for this
                        candidate.
                      </p>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
function ActivityTab({
  activities,
  actType,
  setActType,
  actContent,
  setActContent,
  addActivity,
  deleteActivity,
  addingAct,
  activitySaved,
}: {
  activities: Activity[]
  actType: string
  setActType: (value: string) => void
  actContent: string
  setActContent: (value: string) => void
  addActivity: (event?: FormEvent) => Promise<void>
  deleteActivity: (activityId: string) => Promise<void>
  addingAct: boolean
  activitySaved: boolean
}) {
  const actIcon = (type: string) =>
    ACTIVITY_TYPES.find(item => item.id === type)?.icon ?? '📝'

  const actLabel = (type: string) =>
    ACTIVITY_TYPES.find(item => item.id === type)?.label ??
    type.replace(/_/g, ' ')

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '360px 1fr',
        gap: 16,
        alignItems: 'start',
      }}
    >
      <div className="crm-card">
        <p className="crm-card-title" style={{ marginBottom: 6 }}>
          Log activity
        </p>

        <p
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            marginBottom: 12,
          }}
        >
          Log calls, emails, WhatsApps, SMS, LinkedIn messages, meetings and notes.
        </p>

        <form onSubmit={addActivity} style={{ display: 'grid', gap: 12 }}>
          <div className="crm-field">
            <label className="crm-label">Type</label>

            <select
              className="crm-select"
              value={actType}
              onChange={event => setActType(event.target.value)}
            >
              {ACTIVITY_TYPES.map(type => (
                <option key={type.id} value={type.id}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="crm-field">
            <label className="crm-label">Notes</label>

            <textarea
              className="crm-input"
              rows={8}
              placeholder="What happened? What is the next step?"
              value={actContent}
              onChange={event => setActContent(event.target.value)}
              style={{ lineHeight: 1.6 }}
            />
          </div>

          <button
            type="submit"
            className="crm-btn-primary"
            disabled={addingAct || !actContent.trim()}
          >
            {addingAct ? 'Adding...' : 'Add activity'}
          </button>

          {activitySaved && (
            <p
              style={{
                fontSize: 12,
                color: '#217822',
                fontWeight: 800,
              }}
            >
              ✓ Activity saved
            </p>
          )}
        </form>
      </div>

      <div className="crm-card">
        <p className="crm-card-title" style={{ marginBottom: 12 }}>
          Activity timeline
        </p>

        {activities.length > 0 ? (
          <div className="ld-activity-feed">
            {activities.map(activity => (
              <div key={activity.id} className="ld-activity-item">
                <div className="ld-activity-icon">
                  {actIcon(activity.activity_type)}
                </div>

                <div className="ld-activity-body">
                  <div className="ld-activity-header">
                    <span
                      className="ld-activity-type"
                      style={{ textTransform: 'capitalize' }}
                    >
                      {actLabel(activity.activity_type)}
                    </span>

                    <span className="ld-activity-date">
                      {new Date(activity.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {activity.content && (
                    <p className="ld-activity-content">{activity.content}</p>
                  )}

                  <button
                    type="button"
                    className="crm-pipeline-link"
                    onClick={() => deleteActivity(activity.id)}
                    style={{
                      marginTop: 8,
                      color: '#e53e3e',
                      border: 0,
                      background: 'transparent',
                      padding: 0,
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="crm-empty">No activity logged yet.</p>
        )}
      </div>
    </div>
  )
}

function TasksTab({
  tasks,
  formatDate,
  newTaskTitle,
  setNewTaskTitle,
  newTaskDueDate,
  setNewTaskDueDate,
  addTask,
  toggleTask,
  deleteTask,
  addingTask,
}: {
  tasks: Task[]
  formatDate: (date?: string | null) => string
  newTaskTitle: string
  setNewTaskTitle: (value: string) => void
  newTaskDueDate: string
  setNewTaskDueDate: (value: string) => void
  addTask: (event?: FormEvent) => Promise<void>
  toggleTask: (task: Task) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  addingTask: boolean
}) {
  const openTasks = tasks.filter(task => !task.completed)
  const completedTasks = tasks.filter(task => task.completed)

  function taskTitle(task: Task) {
    return task.title || task.task_title || 'Task'
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '360px 1fr',
        gap: 16,
        alignItems: 'start',
      }}
    >
      <div className="crm-card">
        <p className="crm-card-title" style={{ marginBottom: 6 }}>
          Add task
        </p>

        <p
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            marginBottom: 12,
          }}
        >
          Add follow-ups, call reminders, document chases or candidate actions.
        </p>

        <form onSubmit={addTask} style={{ display: 'grid', gap: 12 }}>
          <div className="crm-field">
            <label className="crm-label">Task</label>
            <input
              className="crm-input"
              placeholder="e.g. Call candidate about availability"
              value={newTaskTitle}
              onChange={event => setNewTaskTitle(event.target.value)}
            />
          </div>

          <div className="crm-field">
            <label className="crm-label">Due date</label>
            <input
              className="crm-input"
              type="date"
              value={newTaskDueDate}
              onChange={event => setNewTaskDueDate(event.target.value)}
            />
          </div>

          <button
            type="submit"
            className="crm-btn-primary"
            disabled={addingTask || !newTaskTitle.trim()}
          >
            {addingTask ? 'Adding...' : 'Add task'}
          </button>
        </form>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="crm-card crm-table-card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 16px',
              borderBottom: '1px solid var(--border-light)',
            }}
          >
            <p className="crm-card-title">Open tasks</p>
            <span className="crm-badge crm-badge-blue">{openTasks.length}</span>
          </div>

          <table className="crm-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Due date</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {openTasks.map(task => (
                <tr key={task.id}>
                  <td>
                    <p className="crm-table-main">{taskTitle(task)}</p>
                  </td>

                  <td>{formatDate(task.due_date)}</td>

                  <td>
                    <span
                      className="crm-badge"
                      style={{
                        background: '#fffbeb',
                        color: '#d97706',
                      }}
                    >
                      {task.status || 'Open'}
                    </span>
                  </td>

                  <td>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="crm-btn-ghost crm-btn-sm"
                        onClick={() => toggleTask(task)}
                      >
                        Mark done
                      </button>

                      <button
                        type="button"
                        className="crm-pipeline-link"
                        onClick={() => deleteTask(task.id)}
                        style={{
                          color: '#e53e3e',
                          border: 0,
                          background: 'transparent',
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {openTasks.length === 0 && (
            <p className="crm-empty crm-empty-table">No open tasks.</p>
          )}
        </div>

        <div className="crm-card crm-table-card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 16px',
              borderBottom: '1px solid var(--border-light)',
            }}
          >
            <p className="crm-card-title">Completed tasks</p>
            <span className="crm-badge">{completedTasks.length}</span>
          </div>

          <table className="crm-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Due date</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {completedTasks.map(task => (
                <tr key={task.id}>
                  <td>
                    <p
                      className="crm-table-main"
                      style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}
                    >
                      {taskTitle(task)}
                    </p>
                  </td>

                  <td>{formatDate(task.due_date)}</td>

                  <td>
                    <span
                      className="crm-badge"
                      style={{
                        background: '#e8f5e8',
                        color: '#217822',
                      }}
                    >
                      Completed
                    </span>
                  </td>

                  <td>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="crm-btn-ghost crm-btn-sm"
                        onClick={() => toggleTask(task)}
                      >
                        Reopen
                      </button>

                      <button
                        type="button"
                        className="crm-pipeline-link"
                        onClick={() => deleteTask(task.id)}
                        style={{
                          color: '#e53e3e',
                          border: 0,
                          background: 'transparent',
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {completedTasks.length === 0 && (
            <p className="crm-empty crm-empty-table">No completed tasks yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function EditCandidateModal({
  editCandidateForm,
  setEditCandidateForm,
  saveCandidate,
  savingCandidate,
  candidateSaveError,
  close,
  mainRoleOptions,
  subRoleOptions,
}: {
  editCandidateForm: EditCandidateForm
  setEditCandidateForm: Dispatch<SetStateAction<EditCandidateForm>>
  saveCandidate: (e: FormEvent) => Promise<void>
  savingCandidate: boolean
  candidateSaveError: string | null
  close: () => void
  mainRoleOptions: string[]
  subRoleOptions: string[]
}) {
  return (
    <>
      <div className="crm-modal-backdrop" onClick={close} />

      <div className="crm-modal crm-modal-wide">
        <div className="crm-modal-header">
          <h2 className="crm-modal-title">Edit Candidate</h2>

          <button className="crm-modal-close" onClick={close}>
            ✕
          </button>
        </div>

        <form onSubmit={saveCandidate} className="crm-modal-form">
          <div className="crm-form-row">
            <div className="crm-field">
              <label className="crm-label">First name *</label>
              <input
                className="crm-input"
                required
                value={editCandidateForm.first_name}
                onChange={e =>
                  setEditCandidateForm(f => ({ ...f, first_name: e.target.value }))
                }
              />
            </div>

            <div className="crm-field">
              <label className="crm-label">Last name *</label>
              <input
                className="crm-input"
                required
                value={editCandidateForm.last_name}
                onChange={e =>
                  setEditCandidateForm(f => ({ ...f, last_name: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="crm-form-row">
            <div className="crm-field">
              <label className="crm-label">Email</label>
              <input
                className="crm-input"
                type="email"
                value={editCandidateForm.email}
                onChange={e =>
                  setEditCandidateForm(f => ({ ...f, email: e.target.value }))
                }
              />
            </div>

            <div className="crm-field">
              <label className="crm-label">Phone</label>
              <input
                className="crm-input"
                value={editCandidateForm.phone}
                onChange={e =>
                  setEditCandidateForm(f => ({ ...f, phone: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="crm-form-row">
            <div className="crm-field">
              <label className="crm-label">Current role</label>
              <input
                className="crm-input"
                value={editCandidateForm.job_title}
                onChange={e =>
                  setEditCandidateForm(f => ({ ...f, job_title: e.target.value }))
                }
              />
            </div>

            <div className="crm-field">
              <label className="crm-label">Main role type</label>
              <select
                className="crm-select"
                value={editCandidateForm.main_role_type}
                onChange={e =>
                  setEditCandidateForm(f => ({
                    ...f,
                    main_role_type: e.target.value,
                    sub_role_type: '',
                    seeking_role_type: '',
                  }))
                }
              >
                <option value="">Select type...</option>
                {mainRoleOptions.map(role => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="crm-field">
            <label className="crm-label">Add looking for role</label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
              <select
                className="crm-select"
                value={editCandidateForm.sub_role_type}
                disabled={!editCandidateForm.main_role_type}
                onChange={e =>
                  setEditCandidateForm(f => ({
                    ...f,
                    sub_role_type: e.target.value,
                    seeking_role_type: e.target.value,
                  }))
                }
              >
                <option value="">
                  {editCandidateForm.main_role_type
                    ? 'Select role...'
                    : 'Select main role type first'}
                </option>

                {subRoleOptions.map(role => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="crm-btn-primary crm-btn-sm"
                disabled={!editCandidateForm.sub_role_type}
                onClick={() =>
                  setEditCandidateForm(f => {
                    const role = f.sub_role_type.trim()
                    if (!role) return f

                    const current = Array.isArray(f.looking_for_roles)
                      ? f.looking_for_roles
                      : []

                    const exists = current.some(
                      item => item.toLowerCase() === role.toLowerCase(),
                    )

                    return {
                      ...f,
                      looking_for_roles: exists ? current : [...current, role],
                    }
                  })
                }
                style={{ whiteSpace: 'nowrap' }}
              >
                Add role
              </button>
            </div>
          </div>

          <div className="crm-field">
            <label className="crm-label">Looking for roles</label>

            {editCandidateForm.looking_for_roles.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {editCandidateForm.looking_for_roles.map(role => (
                  <button
                    key={role}
                    type="button"
                    className="crm-badge crm-badge-blue"
                    onClick={() =>
                      setEditCandidateForm(f => ({
                        ...f,
                        looking_for_roles: f.looking_for_roles.filter(
                          item => item !== role,
                        ),
                      }))
                    }
                    style={{
                      border: 0,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                    title="Click to remove"
                  >
                    {role}
                    <span style={{ fontWeight: 900 }}>×</span>
                  </button>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                No roles selected yet.
              </p>
            )}
          </div>

          <div className="crm-form-row">
            <div className="crm-field">
              <label className="crm-label">Preferred location / region</label>
              <select
                className="crm-select"
                value={editCandidateForm.preferred_location}
                onChange={e =>
                  setEditCandidateForm(f => ({
                    ...f,
                    preferred_location: e.target.value,
                  }))
                }
              >
                {CANDIDATE_REGIONS.map(region => (
                  <option key={region} value={region}>
                    {region || 'Select region...'}
                  </option>
                ))}
              </select>
            </div>

            <div className="crm-field">
              <label className="crm-label">Postcode</label>
              <input
                className="crm-input"
                value={editCandidateForm.postcode}
                onChange={e =>
                  setEditCandidateForm(f => ({ ...f, postcode: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="crm-form-row">
            <div className="crm-field">
              <label className="crm-label">Address line 1</label>
              <input
                className="crm-input"
                value={editCandidateForm.address_line_1}
                onChange={e =>
                  setEditCandidateForm(f => ({
                    ...f,
                    address_line_1: e.target.value,
                  }))
                }
              />
            </div>

            <div className="crm-field">
              <label className="crm-label">Address line 2</label>
              <input
                className="crm-input"
                value={editCandidateForm.address_line_2}
                onChange={e =>
                  setEditCandidateForm(f => ({
                    ...f,
                    address_line_2: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="crm-form-row">
            <div className="crm-field">
              <label className="crm-label">Town / city</label>
              <input
                className="crm-input"
                value={editCandidateForm.town_city}
                onChange={e =>
                  setEditCandidateForm(f => ({
                    ...f,
                    town_city: e.target.value,
                  }))
                }
              />
            </div>

            <div className="crm-field">
              <label className="crm-label">County</label>
              <input
                className="crm-input"
                value={editCandidateForm.county}
                onChange={e =>
                  setEditCandidateForm(f => ({
                    ...f,
                    county: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="crm-form-row">
            <div className="crm-field">
              <label className="crm-label">Source</label>
              <select
                className="crm-select"
                value={editCandidateForm.source}
                onChange={e =>
                  setEditCandidateForm(f => ({ ...f, source: e.target.value }))
                }
              >
                {CANDIDATE_SOURCES.map(source => (
                  <option key={source} value={source}>
                    {source || 'Select source...'}
                  </option>
                ))}
              </select>
            </div>

            <div className="crm-field">
  <label className="crm-label">Candidate status</label>
  <select
    className="crm-select"
    value={editCandidateForm.status}
    onChange={e =>
      setEditCandidateForm(form => ({
        ...form,
        status: e.target.value,
        actively_looking:
          e.target.value === 'active'
            ? true
            : e.target.value === 'passive'
              ? false
              : form.actively_looking,
      }))
    }
  >
    {CANDIDATE_STATUS_OPTIONS.map(option => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
</div>

            <div className="crm-field">
              <label className="crm-label">Work type preference</label>
              <select
                className="crm-select"
                value={editCandidateForm.work_type_pref}
                onChange={e =>
                  setEditCandidateForm(f => ({
                    ...f,
                    work_type_pref: e.target.value,
                  }))
                }
              >
                {WORK_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

                    <div className="crm-form-row">
            <div className="crm-field">
              <label className="crm-label">Current salary</label>
              <input
                className="crm-input"
                placeholder="e.g. £35,000 + bonus"
                value={editCandidateForm.current_salary}
                onChange={e =>
                  setEditCandidateForm(f => ({
                    ...f,
                    current_salary: e.target.value,
                  }))
                }
              />
            </div>

            <div className="crm-field">
              <label className="crm-label">Salary expected</label>
              <input
                className="crm-input"
                placeholder="e.g. £40,000 or happy to negotiate"
                value={editCandidateForm.salary_expected}
                onChange={e =>
                  setEditCandidateForm(f => ({
                    ...f,
                    salary_expected: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="crm-form-row">
            <div className="crm-field">
              <label className="crm-label">Notice period</label>
              <input
                className="crm-input"
                placeholder="e.g. Immediate, 4 weeks, 1 month"
                value={editCandidateForm.notice_period}
                onChange={e =>
                  setEditCandidateForm(f => ({
                    ...f,
                    notice_period: e.target.value,
                  }))
                }
              />
            </div>

            <div className="crm-field">
              <label className="crm-label">Salary / availability notes</label>
              <input
                className="crm-input"
                placeholder="e.g. Flexible for the right role"
                value={editCandidateForm.salary_notes}
                onChange={e =>
                  setEditCandidateForm(f => ({
                    ...f,
                    salary_notes: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          
          <div className="crm-form-row">
            <div className="crm-field">
              <label className="crm-label">DBS status</label>
              <select
                className="crm-select"
                value={editCandidateForm.dbs_status}
                onChange={e =>
                  setEditCandidateForm(f => ({ ...f, dbs_status: e.target.value }))
                }
              >
                {DBS_STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="crm-field">
              <label className="crm-label">Right to work</label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--text-dark)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={editCandidateForm.right_to_work}
                  onChange={e =>
                    setEditCandidateForm(f => ({
                      ...f,
                      right_to_work: e.target.checked,
                    }))
                  }
                  style={{ width: 16, height: 16 }}
                />
                Right to work confirmed / evidence seen
              </label>
            </div>
          </div>

          <div className="crm-field">
            <label className="crm-label">LinkedIn</label>
            <input
              className="crm-input"
              value={editCandidateForm.linkedin}
              onChange={e =>
                setEditCandidateForm(f => ({ ...f, linkedin: e.target.value }))
              }
            />
          </div>

          <div className="crm-field">
            <label className="crm-label">Qualifications</label>
            <textarea
              className="crm-input"
              rows={3}
              value={editCandidateForm.qualifications}
              onChange={e =>
                setEditCandidateForm(f => ({
                  ...f,
                  qualifications: e.target.value,
                }))
              }
            />
          </div>

          <div className="crm-field">
            <label className="crm-label">Notes</label>
            <textarea
              className="crm-input"
              rows={4}
              value={editCandidateForm.notes}
              onChange={e =>
                setEditCandidateForm(f => ({ ...f, notes: e.target.value }))
              }
            />
          </div>

          {candidateSaveError && (
            <div
              style={{
                padding: 10,
                borderRadius: 8,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#e53e3e',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {candidateSaveError}
            </div>
          )}

          <div className="crm-modal-footer">
            <button type="button" className="crm-btn-ghost" onClick={close}>
              Cancel
            </button>

            <button
              type="submit"
              className="crm-btn-primary"
              disabled={savingCandidate}
            >
              {savingCandidate ? 'Saving...' : 'Save candidate'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
function AddApplicationModal({
  candidateName,
  vacancies,
  newApplicationForm,
  setNewApplicationForm,
  createApplication,
  creatingApplication,
  createError,
  resetAddApplicationModal,
  getClient,
}: {
  candidateName: string
  vacancies: Vacancy[]
  newApplicationForm: { vacancy_id: string; status: string }
  setNewApplicationForm: Dispatch<
    SetStateAction<{ vacancy_id: string; status: string }>
  >
  createApplication: (e: FormEvent) => Promise<void>
  creatingApplication: boolean
  createError: string | null
  resetAddApplicationModal: () => void
  getClient: (clientField: ClientRef | ClientRef[] | null | undefined) => ClientRef | null
}) {
  return (
    <>
      <div className="crm-modal-backdrop" onClick={resetAddApplicationModal} />

      <div className="crm-modal">
        <div className="crm-modal-header">
          <h2 className="crm-modal-title">Add Application</h2>

          <button className="crm-modal-close" onClick={resetAddApplicationModal}>
            ✕
          </button>
        </div>

        <form onSubmit={createApplication} className="crm-modal-form">
          <div className="crm-field">
            <label className="crm-label">Candidate</label>
            <input className="crm-input" value={candidateName} disabled />
          </div>

          <div className="crm-field">
            <label className="crm-label">Vacancy *</label>
            <select
              className="crm-select"
              required
              value={newApplicationForm.vacancy_id}
              onChange={event =>
                setNewApplicationForm(form => ({
                  ...form,
                  vacancy_id: event.target.value,
                }))
              }
            >
              <option value="">Select vacancy...</option>

              {vacancies.map(vacancy => {
                const client = getClient(vacancy.clients)

                return (
                  <option key={vacancy.id} value={vacancy.id}>
                    {vacancy.title}
                    {client?.company_name ? ` — ${client.company_name}` : ''}
                    {vacancy.status ? ` (${vacancy.status})` : ''}
                  </option>
                )
              })}
            </select>
          </div>

          <div className="crm-field">
            <label className="crm-label">Starting stage</label>
            <select
              className="crm-select"
              value={newApplicationForm.status}
              onChange={event =>
                setNewApplicationForm(form => ({
                  ...form,
                  status: event.target.value,
                }))
              }
            >
              {STARTING_STAGES.map(stage => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
          </div>

          {createError && (
            <div
              style={{
                padding: 10,
                borderRadius: 8,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#e53e3e',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {createError}
            </div>
          )}

          <div className="crm-modal-footer">
            <button
              type="button"
              className="crm-btn-ghost"
              onClick={resetAddApplicationModal}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="crm-btn-primary"
              disabled={creatingApplication}
            >
              {creatingApplication ? 'Creating...' : 'Create application'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="crm-detail-row">
      <span className="crm-detail-label">{label}</span>
      {children}
    </div>
  )
}

function DocumentPreview({
  document,
  getFileKind,
  getDocumentLabel,
  getReferenceDetails,
}: {
  document: CandidateDocument | null
  getFileKind: (url: string | null) => string
  getDocumentLabel: (docType?: string | null) => string
  getReferenceDetails: (doc: CandidateDocument | null) => Record<string, any> | null
}) {
  if (!document) {
    return (
      <div
        className="crm-card"
        style={{
          minHeight: 560,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <div>
          <p style={{ fontSize: 34, marginBottom: 10 }}>📎</p>
          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-dark)' }}>
            No document selected
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5 }}>
            Select a document from the grouped list.
          </p>
        </div>
      </div>
    )
  }

  const fileKind = getFileKind(document.file_url)
  const ref = getReferenceDetails(document)

  return (
    <div
      className="crm-card"
      style={{
        minHeight: 560,
        padding: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontSize: 14,
              fontWeight: 900,
              color: 'var(--text-dark)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {document.name}
          </p>

          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {getDocumentLabel(document.doc_type)}
          </p>
        </div>

        {document.file_url && (
          <a
            href={document.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="crm-btn-ghost crm-btn-sm"
            style={{ textDecoration: 'none' }}
          >
            Open ↗
          </a>
        )}
      </div>

      {document.doc_type === 'reference' ? (
        <div
          style={{
            flex: 1,
            padding: 24,
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: 'var(--text-dark)',
                marginBottom: 4,
              }}
            >
              {ref?.reference_name || document.name}
            </p>

            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {[ref?.reference_job_title, ref?.reference_company]
                .filter(Boolean)
                .join(' · ') || 'Reference details'}
            </p>
          </div>

          <div className="crm-detail-list">
            <DetailRow label="Relationship">
              <span className="crm-detail-value">{ref?.relationship || '—'}</span>
            </DetailRow>

            <DetailRow label="Email">
              {ref?.reference_email ? (
                <a
                  href={`mailto:${ref.reference_email}`}
                  className="crm-detail-link"
                >
                  {ref.reference_email}
                </a>
              ) : (
                <span className="crm-detail-value">—</span>
              )}
            </DetailRow>

            <DetailRow label="Phone">
              {ref?.reference_phone ? (
                <a href={`tel:${ref.reference_phone}`} className="crm-detail-link">
                  {ref.reference_phone}
                </a>
              ) : (
                <span className="crm-detail-value">—</span>
              )}
            </DetailRow>

            <DetailRow label="Permission to contact">
              <span
                className="crm-badge"
                style={{
                  background: ref?.permission_to_contact ? '#e8f5e8' : '#fffbeb',
                  color: ref?.permission_to_contact ? '#217822' : '#d97706',
                }}
              >
                {ref?.permission_to_contact ? 'Yes' : 'Not confirmed'}
              </span>
            </DetailRow>
          </div>

          {ref?.notes && (
            <div
              style={{
                padding: 12,
                borderRadius: 10,
                background: 'var(--light-bg)',
                border: '1px solid var(--border-light)',
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                Notes
              </p>

              <p
                style={{
                  fontSize: 13,
                  color: 'var(--text-dark)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {ref.notes}
              </p>
            </div>
          )}
        </div>
      ) : document.file_url ? (
        <>
          {fileKind === 'image' && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 12,
                background: '#fff',
              }}
            >
              <img
                src={document.file_url}
                alt={document.name}
                style={{
                  maxWidth: '100%',
                  maxHeight: 500,
                  objectFit: 'contain',
                  borderRadius: 8,
                }}
              />
            </div>
          )}

          {fileKind === 'pdf' && (
            <iframe
              src={document.file_url}
              title={document.name}
              style={{
                width: '100%',
                height: 520,
                border: 0,
                background: '#fff',
              }}
            />
          )}

          {['word', 'unknown'].includes(fileKind) && (
            <div
              style={{
                flex: 1,
                padding: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              <div>
                <p style={{ fontSize: 34, marginBottom: 10 }}>📄</p>

                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: 'var(--text-dark)',
                  }}
                >
                  Preview not available in browser
                </p>

                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    marginTop: 5,
                    lineHeight: 1.5,
                  }}
                >
                  Word documents often need to be opened directly. PDFs and images
                  will preview here.
                </p>

                <a
                  href={document.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="crm-btn-primary crm-btn-sm"
                  style={{
                    display: 'inline-flex',
                    marginTop: 14,
                    textDecoration: 'none',
                  }}
                >
                  Open document
                </a>
              </div>
            </div>
          )}
        </>
      ) : (
        <div
          style={{
            flex: 1,
            padding: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <div>
            <p style={{ fontSize: 34, marginBottom: 10 }}>📎</p>

            <p
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: 'var(--text-dark)',
              }}
            >
              No file attached
            </p>

            <p
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                marginTop: 5,
                lineHeight: 1.5,
              }}
            >
              This document record exists, but there is no file URL saved.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}