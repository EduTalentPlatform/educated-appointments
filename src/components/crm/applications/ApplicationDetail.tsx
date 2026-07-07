'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  Dispatch,
  MutableRefObject,
  ReactNode,
  SetStateAction,
} from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useCrmRoleSettings } from '@/hooks/useCrmRoleSettings'

type Application = {
  id: string
  candidate_id?: string | null
  vacancy_id: string | null
  original_vacancy_id?: string | null
  role_switched_at?: string | null
  role_switch_reason?: string | null

  status: string
  created_at: string
  updated_at?: string | null

  ea_interview_date: string | null
  ea_interview_notes: string | null
  ea_interview_verdict: string | null

  client_interview_date: string | null
  client_interview_time: string | null
  client_interview_format: string | null
  client_interview_location: string | null
  client_interview_notes: string | null
  client_interview_feedback: string | null
  client_interview_outcome: string | null

  profile_text: string | null
  profile_anonymous: boolean | null
  profile_sent_at: string | null
  employer_profile_notes: string | null
  profile_builder_context: string | null

  internal_notes: string | null
  cover_note: string | null

  candidates?: any
  vacancies?: any
}

type SwitchRoleVacancy = {
  id: string
  title: string
  status?: string | null
  location?: string | null
  region?: string | null
  salary_display?: string | null
  clients?: {
    id: string
    company_name: string
  } | {
    id: string
    company_name: string
  }[] | null
}

type CandidateDocument = {
  id: string
  name: string
  doc_type: string | null
  file_url: string | null
  storage_bucket?: string | null
  storage_path?: string | null
  released?: boolean | null
  show_in_employer_portal?: boolean | null
  visible_to_employer?: boolean | null
  extracted_text?: string | null
  ai_summary?: string | null
  created_at?: string | null
}

type ApprenticeshipStandard = {
  id: string
  label?: string | null
  title?: string | null
  name?: string | null
  standard_name?: string | null
  reference?: string | null
  code?: string | null
  sector?: string | null
  route?: string | null
  level?: string | number | null
  status?: string | null
  programme_type?: string | null
  is_active?: boolean | null
}

type VacancyDocument = {
  id: string
  name: string
  doc_type: string | null
  file_url: string | null
  storage_bucket?: string | null
  storage_path?: string | null
  extracted_text?: string | null
  ai_summary?: string | null
  created_at?: string | null
}

type Activity = {
  id: string
  activity_type: string
  content: string | null
  created_at: string
}

type AiReview = {
  id: string
  application_id: string
  candidate_id: string | null
  vacancy_id: string | null
  overall_fit: string | null
  score: number | null
  summary: string | null
  strengths: string[] | null
  missing_or_unclear: string[] | null
  risks: string[] | null
  candidate_questions: string[] | null
  client_questions: string[] | null
  recommended_next_action: string | null
  created_at: string
  raw_response?: any
}

type ApplicationInterview = {
  id: string
  application_id: string
  interview_type: 'ea' | 'client'
  stage_number: number | null
  counts_for_interview_to_fill: boolean | null
  interview_date: string | null
  interview_time: string | null
  interview_format: string | null
  location: string | null
  instructions: string | null
  employer_contact_ids?: string[] | null
  employer_contact_names?: string[] | null
  employer_contact_job_titles?: string[] | null
  confirmation_email: string | null
  feedback: string | null
  outcome: string | null
  created_at: string
  updated_at?: string | null
}

type ClientContact = {
  id: string
  [key: string]: any
}

type EmailTemplate = {
  id: string
  name: string
  template_type: string
  subject: string | null
  body: string | null
  description?: string | null
  is_active: boolean | null
}

type ClientInterviewForm = {
  id: string
  stage_number: string
  interview_date: string
  interview_time: string
  interview_format: string
  location: string
  instructions: string
  employer_contact_ids: string[]
  confirmation_email: string
  feedback: string
  outcome: string
  counts_for_interview_to_fill: boolean
}

type CandidateFactsForm = {
  email: string
  phone: string
  linkedin: string
  job_title: string
  main_role_type: string
  specific_roles: string[]
  preferred_location: string
  town_city: string
  county: string
  postcode: string
  current_salary: string
  salary_expected: string
  notice_period: string
  dbs_status: string
  right_to_work: string
  qualifications: string
  apprenticeship_standards: string[]
}

type CandidateTextFactKey = Exclude<
  keyof CandidateFactsForm,
  'specific_roles' | 'apprenticeship_standards'
>

type CandidateFactField = {
  key: CandidateTextFactKey
  label: string
  type?: 'text' | 'email' | 'tel' | 'url' | 'select' | 'textarea'
  placeholder?: string
  options?: Array<{ value: string; label: string }>
}

const CANDIDATE_FACT_FIELDS: CandidateFactField[] = [
  { key: 'email', label: 'Email', type: 'email', placeholder: 'candidate@email.com' },
  { key: 'phone', label: 'Phone', type: 'tel', placeholder: 'Mobile or telephone number' },
  { key: 'linkedin', label: 'LinkedIn', type: 'url', placeholder: 'https://www.linkedin.com/in/...' },
  { key: 'job_title', label: 'Current job title', placeholder: 'e.g. Account Manager' },
  { key: 'preferred_location', label: 'Preferred location', placeholder: 'e.g. East Midlands / Remote' },
  { key: 'town_city', label: 'Town / city', placeholder: 'e.g. Derby' },
  { key: 'county', label: 'County', placeholder: 'e.g. Derbyshire' },
  { key: 'postcode', label: 'Postcode', placeholder: 'e.g. DE1 1AA' },
  { key: 'current_salary', label: 'Current salary', placeholder: 'e.g. £35,000' },
  { key: 'salary_expected', label: 'Salary expected', placeholder: 'e.g. £40,000' },
  { key: 'notice_period', label: 'Notice period', placeholder: 'e.g. 4 weeks' },
  {
    key: 'dbs_status',
    label: 'DBS status',
    type: 'select',
    options: [
      { value: '', label: 'Select DBS status...' },
      { value: 'not_completed', label: 'Not completed' },
      {
        value: 'not_completed_happy_to_undertake_no_issues',
        label: 'Not completed but happy to undertake — no issues',
      },
      { value: 'completed_clear', label: 'Completed — clear' },
      { value: 'completed_disclosures', label: 'Completed — disclosures' },
      { value: 'on_update_service', label: 'On update service' },
    ],
  },
  {
    key: 'right_to_work',
    label: 'Right to work confirmed',
    type: 'select',
    options: [
      { value: '', label: 'Select...' },
      { value: 'true', label: 'Yes — confirmed' },
      { value: 'false', label: 'No / not confirmed' },
    ],
  },
  {
    key: 'qualifications',
    label: 'Qualifications',
    type: 'textarea',
    placeholder: 'Relevant qualifications, certificates or professional memberships...',
  },
]

const APPLICATION_PORTAL_DOCUMENT_TYPES = [
  { value: 'cv', label: 'CV' },
  { value: 'qualification', label: 'Certificates / qualifications' },
  { value: 'right_to_work', label: 'Right to work' },
  { value: 'dbs', label: 'DBS' },
  { value: 'reference', label: 'References' },
  { value: 'interview_prep', label: 'Interview prep' },
  { value: 'other', label: 'Other documents' },
]

const APPLICATION_UPLOAD_DOCUMENT_TYPES = [
  { value: 'formatted_cv', label: 'Formatted CV' },
  { value: 'cv', label: 'Original CV' },
  { value: 'qualification', label: 'Certificates / qualifications' },
  { value: 'right_to_work', label: 'Right to work' },
  { value: 'dbs', label: 'DBS' },
  { value: 'reference', label: 'References' },
  { value: 'interview_prep', label: 'Interview prep' },
  { value: 'other', label: 'Other documents' },
]

function isBlankCandidateValue(value: unknown) {
  if (value === null || value === undefined) return true
  if (Array.isArray(value)) return value.length === 0
  return String(value).trim().length === 0
}

function hasRightToWorkValue(value: unknown) {
  if (value === true || value === false) return true

  const text = String(value ?? '').trim().toLowerCase()

  return [
    'true',
    'false',
    'yes',
    'no',
    'confirmed',
    'not_confirmed',
    'seen',
    'not_seen',
    'evidence_seen',
  ].includes(text)
}

function isCandidateFactMissing(candidate: any, key: keyof CandidateFactsForm) {
  if (!candidate) return true

  if (key === 'specific_roles') {
    return getCandidateSpecificRoles(candidate).length === 0
  }

  if (key === 'apprenticeship_standards') {
    return splitCandidateList(candidate.can_deliver).length === 0
  }

  if (key === 'right_to_work') {
    return !hasRightToWorkValue(candidate.right_to_work)
  }

  return isBlankCandidateValue(candidate[key])
}

function candidateToFactsForm(candidate: any): CandidateFactsForm {
  return {
    email: candidate?.email ?? '',
    phone: candidate?.phone ?? '',
    linkedin: candidate?.linkedin ?? '',
    job_title: candidate?.job_title ?? '',
    main_role_type: candidate?.main_role_type ?? '',
    specific_roles: getCandidateSpecificRoles(candidate),
    preferred_location: candidate?.preferred_location ?? '',
    town_city: candidate?.town_city ?? '',
    county: candidate?.county ?? '',
    postcode: candidate?.postcode ?? '',
    current_salary: candidate?.current_salary ?? '',
    salary_expected: candidate?.salary_expected ?? '',
    notice_period: candidate?.notice_period ?? '',
    dbs_status: candidate?.dbs_status ?? '',
    right_to_work:
      candidate?.right_to_work === true ||
      String(candidate?.right_to_work ?? '').toLowerCase() === 'confirmed' ||
      String(candidate?.right_to_work ?? '').toLowerCase() === 'yes'
        ? 'true'
        : candidate?.right_to_work === false
          ? 'false'
          : '',
    qualifications: candidate?.qualifications ?? '',
    apprenticeship_standards: splitCandidateList(candidate?.can_deliver),
  }
}

function splitCandidateList(value?: string | string[] | null) {
  if (Array.isArray(value)) {
    return value
      .map(item => String(item || '').trim())
      .filter(Boolean)
  }

  return String(value || '')
    .split(/[|,\n]/)
    .map(item => item.trim())
    .filter(Boolean)
}

function uniqueCleanList(items: string[]) {
  const seen = new Set<string>()

  return items
    .map(item => item.trim())
    .filter(Boolean)
    .filter(item => {
      const key = item.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function getCandidateSpecificRoles(candidate: any) {
  const roles = Array.isArray(candidate?.looking_for_roles)
    ? candidate.looking_for_roles
    : []

  return uniqueCleanList([
    ...roles,
    candidate?.sub_role_type,
    candidate?.seeking_role_type,
  ].filter(Boolean))
}

function getStandardName(standard: ApprenticeshipStandard) {
  return (
    standard.label ||
    standard.title ||
    standard.standard_name ||
    standard.name ||
    'Unnamed standard'
  )
}

function getStandardSubjectArea(standard: ApprenticeshipStandard) {
  return standard.route || standard.sector || 'Uncategorised'
}

function toggleListValue(current: string[], value: string) {
  const cleanValue = value.trim()
  if (!cleanValue) return current

  const exists = current.some(
    item => item.trim().toLowerCase() === cleanValue.toLowerCase(),
  )

  if (exists) {
    return current.filter(
      item => item.trim().toLowerCase() !== cleanValue.toLowerCase(),
    )
  }

  return uniqueCleanList([...current, cleanValue])
}

function cleanCandidateFact(value: unknown) {
  const text = String(value ?? '').trim()
  return text.length > 0 ? text : null
}

function buildClientAddress(client: any) {
  if (!client) return ''

  return [
    client.address_line_1,
    client.address_line_2,
    client.town_city,
    client.county,
    client.postcode,
  ]
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .join(', ')
}

function joinCleanParts(parts: Array<string | null | undefined>) {
  return parts
    .map(part => String(part || '').trim())
    .filter(Boolean)
    .join(', ')
}

function renderEmailTemplate(
  templateText: string | null | undefined,
  values: Record<string, string>,
) {
  let output = String(templateText || '')

  Object.entries(values).forEach(([key, value]) => {
    output = output.split(`{{${key}}}`).join(value || '')
  })

  return output
}

function getActivityTemplateTypes(activityType: string) {
  if (activityType === 'email') {
    return [
      'candidate_outreach',
      'candidate_document_request',
      'candidate_rejection',
      'employer_feedback',
      'offer_confirmation',
      'placement_confirmation',
      'reference_request',
      'client_outreach',
      'bd_follow_up',
      'general',
    ]
  }

  if (['sms', 'whatsapp', 'linkedin'].includes(activityType)) {
    return ['candidate_outreach', 'general']
  }

  return ['general']
}

type PlacementSummary = {
  id: string
  placement_ref?: string | null
  status?: string | null
  start_date?: string | null
  salary?: number | string | null
  fee_amount?: number | string | null
  fee_percentage?: number | string | null
  final_documents_released?: boolean | null
  placed_at?: string | null
  allVacancies?: SwitchRoleVacancy[]
}

interface Props {
  application: Application
  documents: CandidateDocument[]
  vacancyDocuments?: VacancyDocument[]
  activities: Activity[]
  aiReview?: AiReview | null
  applicationInterviews?: ApplicationInterview[]
  clientContacts?: ClientContact[]
  placement?: PlacementSummary | null
  standards?: ApprenticeshipStandard[]
  allVacancies?: SwitchRoleVacancy[]
}

const ALL_STAGES = [
  'screening',
  'ea_interview',
  'docs_received',
  'ready_to_present',
  'submitted',
  'client_interview',
  'offer',
  'placed',
  'rejected',
  'not_interested',
  'withdrawn',
]

const STAGE_COLOURS: Record<string, { bg: string; text: string }> = {
  screening: { bg: '#f0f0f2', text: '#737373' },
  ea_interview: { bg: '#e0f0fb', text: '#0B72B8' },
  docs_received: { bg: '#f3f0ff', text: '#7c3aed' },
  ready_to_present: { bg: '#fffbeb', text: '#d97706' },
  submitted: { bg: '#e8f5e8', text: '#217822' },
  client_interview: { bg: '#f3f0ff', text: '#7c3aed' },
  offer: { bg: '#e8f5e8', text: '#217822' },
  placed: { bg: '#e8f5e8', text: '#1a6e1a' },
  rejected: { bg: '#fef2f2', text: '#e53e3e' },
  not_interested: { bg: '#f0f0f2', text: '#737373' },
  withdrawn: { bg: '#f0f0f2', text: '#737373' },
}

function getApplicationStageLabel(stage: string) {
  const labels: Record<string, string> = {
    screening: 'Screening',
    ea_interview: 'EA interview',
    docs_received: 'Docs received',
    ready_to_present: 'Ready to submit',
    submitted: 'Submitted',
    presented: 'Submitted',
    client_interview: 'Client interview',
    offer: 'Offer',
    placed: 'Placed',
    rejected: 'Rejected',
    not_interested: 'Not interested',
    withdrawn: 'Withdrawn',
  }

  return labels[stage] || stage.replace(/_/g, ' ')
}

const INTERVIEW_FORMATS = [
  { value: '', label: 'Select format...' },
  { value: 'face_to_face', label: 'Face to face' },
  { value: 'video', label: 'Video call' },
  { value: 'telephone', label: 'Telephone' },
]

const CLIENT_INTERVIEW_CANCELLED_OUTCOME = 'Cancelled'

const CLIENT_INTERVIEW_OUTCOMES = [
  '',
  'Awaiting feedback',
  'Progressing — next stage',
  'Offer to be made',
  'Not successful',
  'Withdrawn',
  CLIENT_INTERVIEW_CANCELLED_OUTCOME,
]

const PROTECTED_APPLICATION_STATUSES = [
  'offer',
  'placed',
  'rejected',
  'not_interested',
  'withdrawn',
]

function isClientInterviewCancelled(
  interview?: { outcome?: string | null } | null,
) {
  return (
    String(interview?.outcome || '').trim().toLowerCase() ===
    CLIENT_INTERVIEW_CANCELLED_OUTCOME.toLowerCase()
  )
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
  try {
    const url = await getSecureDocumentUrl(document, documentKind)
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch (error: any) {
    alert(error?.message || 'Could not open this document securely.')
  }
}

export default function ApplicationDetail({
  application: initial,
  documents: initialDocuments,
  vacancyDocuments = [],
  activities,
  aiReview: initialAiReview = null,
  applicationInterviews = [],
  clientContacts = [],
  placement: initialPlacement = null,
  standards = [],
  allVacancies = [],
}: Props) {

  const [app, setApp] = useState(initial)
  const [documents, setDocuments] =
    useState<CandidateDocument[]>(initialDocuments)
  const [availableStandards, setAvailableStandards] =
  useState<ApprenticeshipStandard[]>(standards)

const [loadingStandards, setLoadingStandards] = useState(false)
const [placement, setPlacement] = useState<PlacementSummary | null>(initialPlacement)
const [creatingPlacement, setCreatingPlacement] = useState(false)
const supabase = createClient()

const [activityItems, setActivityItems] = useState<Activity[]>(activities)
const [activityType, setActivityType] = useState('call')
const [activityContent, setActivityContent] = useState('')
const [savingActivity, setSavingActivity] = useState(false)
const [activitySaved, setActivitySaved] = useState(false)
const [generatingActivityMessage, setGeneratingActivityMessage] = useState(false)
const [activityAiContext, setActivityAiContext] = useState('')
const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null)
const [selectedActivityTemplateId, setSelectedActivityTemplateId] = useState('')

const [switchRoleOpen, setSwitchRoleOpen] = useState(false)
const [switchRoleVacancyId, setSwitchRoleVacancyId] = useState('')
const [switchRoleReason, setSwitchRoleReason] = useState('')
const [switchingRole, setSwitchingRole] = useState(false)
const [switchRoleError, setSwitchRoleError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'ea_interview'
    | 'client_interview'
    | 'ai_review'
    | 'profile'
    | 'portal'
    | 'documents'
    | 'activity'
  >('overview')

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [analysing, setAnalysing] = useState(false)
  const [interviewAnalysis, setInterviewAnalysis] = useState<any>(null)
  const recognitionRef = useRef<any>(null)
  const transcriptRef = useRef('')

  const [profileText, setProfileText] = useState(app.profile_text ?? '')
  const [anonymous, setAnonymous] = useState(app.profile_anonymous ?? false)
  const [buildingProfile, setBuildingProfile] = useState(false)
  const [profileCopied, setProfileCopied] = useState(false)
  const [employerProfileNotes, setEmployerProfileNotes] = useState(
  app.employer_profile_notes ?? '',
)
  const [profileBuilderContext, setProfileBuilderContext] = useState(
  app.profile_builder_context ?? '',
)

  const [notes, setNotes] = useState(app.internal_notes ?? '')
  const [coverNote, setCoverNote] = useState(app.cover_note ?? '')

  const [aiReview, setAiReview] = useState<AiReview | null>(initialAiReview)
  const [runningAiReview, setRunningAiReview] = useState(false)
  const [aiReviewError, setAiReviewError] = useState<string | null>(null)
  const [aiReviewMessage, setAiReviewMessage] = useState<string | null>(null)

  const [interviews, setInterviews] =
    useState<ApplicationInterview[]>(applicationInterviews)
  const [savingClientInterview, setSavingClientInterview] = useState(false)
const [clientInterviewSaved, setClientInterviewSaved] = useState(false)
const [cancellingClientInterview, setCancellingClientInterview] = useState(false)
const [clientInterviewCancelled, setClientInterviewCancelled] = useState(false)
const [clientEmailCopied, setClientEmailCopied] = useState(false)

  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([])
const [loadingEmailTemplates, setLoadingEmailTemplates] = useState(false)
const [
  selectedClientInterviewTemplateId,
  setSelectedClientInterviewTemplateId,
] = useState('')
const [clientEmailSubject, setClientEmailSubject] = useState('')
const [sendingRolePortalEmail, setSendingRolePortalEmail] = useState(false)
const [previewingRolePortalEmail, setPreviewingRolePortalEmail] = useState(false)
const [rolePortalEmailMessage, setRolePortalEmailMessage] = useState<string | null>(null)
const [rolePortalEmailError, setRolePortalEmailError] = useState<string | null>(null)
const [rolePortalEmailPreview, setRolePortalEmailPreview] = useState<{
  subject?: string
  text?: string
  html?: string
  body?: string
} | null>(null)
const [rolePortalRequestOpen, setRolePortalRequestOpen] = useState(false)
const [rolePortalRequestedDocuments, setRolePortalRequestedDocuments] = useState<string[]>([
  'cv',
  'qualification',
  'right_to_work',
  'dbs',
  'reference',
])
const [rolePortalRequestMode, setRolePortalRequestMode] = useState<
  'initial' | 'interview_chase'
>('initial')
const [rolePortalMessage, setRolePortalMessage] = useState('')

const [candidateDocumentUploadOpen, setCandidateDocumentUploadOpen] =
  useState(false)
const [candidateDocumentUploadName, setCandidateDocumentUploadName] =
  useState('')
const [candidateDocumentUploadType, setCandidateDocumentUploadType] =
  useState('qualification')
const [candidateDocumentUploadFile, setCandidateDocumentUploadFile] =
  useState<File | null>(null)
const [uploadingCandidateDocument, setUploadingCandidateDocument] =
  useState(false)
const [candidateDocumentUploadMessage, setCandidateDocumentUploadMessage] =
  useState<string | null>(null)
const [candidateDocumentUploadError, setCandidateDocumentUploadError] =
  useState<string | null>(null)

const [deletingCandidateDocumentId, setDeletingCandidateDocumentId] =
  useState<string | null>(null)

async function deleteCandidateDocument(documentId: string) {
  const confirmed = window.confirm(
    'Delete this candidate document? This will remove the file from the CRM.',
  )

  if (!confirmed) return

  setDeletingCandidateDocumentId(documentId)

  try {
    const res = await fetch(`/api/crm/candidate-documents/${documentId}`, {
      method: 'DELETE',
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      throw new Error(json?.error || 'Could not delete candidate document.')
    }

    setDocuments(current =>
      current.filter(document => document.id !== documentId),
    )
  } catch (error: any) {
    alert(error?.message || 'Could not delete candidate document.')
  } finally {
    setDeletingCandidateDocumentId(null)
  }
}

  const c = app.candidates
  const v = app.vacancies
  const client = Array.isArray(v?.clients) ? v?.clients?.[0] : v?.clients

async function uploadCandidateDocumentFromApplication(event: React.FormEvent) {
  event.preventDefault()

  if (!c?.id) {
    setCandidateDocumentUploadError(
      'This application is not linked to a candidate.',
    )
    return
  }

  if (!candidateDocumentUploadFile) {
    setCandidateDocumentUploadError('Please choose a file to upload.')
    return
  }

  setUploadingCandidateDocument(true)
  setCandidateDocumentUploadMessage(null)
  setCandidateDocumentUploadError(null)

  const formData = new FormData()
  formData.append('candidate_id', c.id)
  formData.append('application_id', app.id)
  formData.append('doc_type', candidateDocumentUploadType)
  formData.append('name', candidateDocumentUploadName.trim())
  formData.append('file', candidateDocumentUploadFile)

  try {
    const res = await fetch('/api/crm/candidate-document-upload', {
      method: 'POST',
      body: formData,
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      throw new Error(json?.error || 'Could not upload candidate document.')
    }

    if (json?.data) {
      setDocuments(current => [json.data, ...current])
    }

    setCandidateDocumentUploadName('')
    setCandidateDocumentUploadFile(null)
    setCandidateDocumentUploadType('qualification')
    setCandidateDocumentUploadMessage(
      'Candidate document uploaded and saved to the candidate record.',
    )

    setActivityItems(current => [
      {
        id: `local-document-upload-${Date.now()}`,
        activity_type: 'note',
        content: [
          'Candidate document uploaded from application.',
          `Document: ${json?.data?.name || candidateDocumentUploadFile.name}`,
          `Type: ${candidateDocumentUploadType.replace(/_/g, ' ')}`,
          v?.title ? `Application: ${v.title}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
        created_at: new Date().toISOString(),
      },
      ...current,
    ])
  } catch (error: any) {
    setCandidateDocumentUploadError(
      error?.message || 'Could not upload candidate document.',
    )
  } finally {
    setUploadingCandidateDocument(false)
  }
}


  function buildRolePortalEmailPayload(previewOnly: boolean) {
  return {
    candidate_id: c?.id,
    application_id: app.id,
    requested_document_types: rolePortalRequestedDocuments,
    message: rolePortalMessage,
    request_mode: rolePortalRequestMode,
    preview_only: previewOnly,
  }
}

    function toggleRolePortalRequestedDocument(type: string) {
    setRolePortalRequestedDocuments(current =>
      current.includes(type)
        ? current.filter(item => item !== type)
        : [...current, type],
    )
  }

  async function previewRoleCandidatePortalEmail() {
  if (!c?.id) {
    setRolePortalEmailError('This application does not have a candidate linked.')
    return
  }

  if (!c?.email) {
    setRolePortalEmailError(
      'The candidate needs an email address before previewing the portal email.',
    )
    return
  }

  if (rolePortalRequestedDocuments.length === 0) {
    setRolePortalEmailError('Please select at least one document to request.')
    return
  }

  setPreviewingRolePortalEmail(true)
  setRolePortalEmailMessage(null)
  setRolePortalEmailError(null)
  setRolePortalEmailPreview(null)

  try {
    const res = await fetch('/api/crm/candidate-upload-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildRolePortalEmailPayload(true)),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      throw new Error(json?.error || 'Could not preview the candidate portal email.')
    }

    setRolePortalEmailPreview(json?.emailPreview || null)

    if (!json?.emailPreview) {
      setRolePortalEmailError('The preview was created, but no email content was returned.')
    }
  } catch (error: any) {
    setRolePortalEmailError(
      error?.message || 'Could not preview the candidate portal email.',
    )
  } finally {
    setPreviewingRolePortalEmail(false)
  }
}

async function switchApplicationRole() {
  if (!switchRoleVacancyId) {
    setSwitchRoleError('Please choose the new role.')
    return
  }

  if (switchRoleVacancyId === app.vacancy_id || switchRoleVacancyId === v?.id) {
    setSwitchRoleError('This application is already linked to that role.')
    return
  }

  setSwitchingRole(true)
  setSwitchRoleError(null)

  try {
    const res = await fetch('/api/crm/application', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: app.id,
        action: 'switch_role',
        new_vacancy_id: switchRoleVacancyId,
        reason: switchRoleReason.trim(),
      }),
    })

    const json = await res.json()

    if (!res.ok) {
      throw new Error(json.error || 'Could not switch role.')
    }

    setApp(json.data)
    setAiReview(null)
    setSwitchRoleOpen(false)
    setSwitchRoleVacancyId('')
    setSwitchRoleReason('')

    window.location.reload()
  } catch (error: any) {
    setSwitchRoleError(error?.message || 'Could not switch role.')
  } finally {
    setSwitchingRole(false)
  }
}

  async function sendRoleCandidatePortalEmail() {
  if (!c?.id) {
    setRolePortalEmailError('This application does not have a candidate linked.')
    return
  }

  if (!c?.email) {
    setRolePortalEmailError(
      'The candidate needs an email address before sending the portal link.',
    )
    return
  }

  if (rolePortalRequestedDocuments.length === 0) {
    setRolePortalEmailError('Please select at least one document to request.')
    return
  }

  setSendingRolePortalEmail(true)
setRolePortalEmailMessage(null)
setRolePortalEmailError(null)
setRolePortalEmailPreview(null)

  try {
    const res = await fetch('/api/crm/candidate-upload-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildRolePortalEmailPayload(false)),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      throw new Error(json?.error || 'Could not send the candidate portal email.')
    }

    setRolePortalEmailMessage(
      json?.message || `Candidate portal email sent to ${c.email}.`,
    )

    setActivityItems(current => [
      {
        id: `local-role-portal-${Date.now()}`,
        activity_type: 'email',
        content: [
          rolePortalRequestMode === 'interview_chase'
  ? 'Candidate document chase sent ahead of client interview.'
  : 'Role-specific candidate portal email sent.',
          `Email: ${c.email}`,
          v?.title ? `Role: ${v.title}` : null,
          client?.company_name ? `Employer: ${client.company_name}` : null,
          json?.uploadUrl ? `Portal link: ${json.uploadUrl}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
        created_at: new Date().toISOString(),
      },
      ...current,
    ])
  } catch (error: any) {
    setRolePortalEmailError(
      error?.message || 'Could not send the candidate portal email.',
    )
  } finally {
    setSendingRolePortalEmail(false)
  }
}

  const [candidateFactsForm, setCandidateFactsForm] =
  useState<CandidateFactsForm>(() => candidateToFactsForm(c))

const [savingCandidateFacts, setSavingCandidateFacts] = useState(false)
const [candidateFactsSaved, setCandidateFactsSaved] = useState(false)

useEffect(() => {
  setCandidateFactsForm(candidateToFactsForm(c))
}, [c?.id])

useEffect(() => {
  let cancelled = false

  async function loadStandards() {
    if (availableStandards.length > 0) return

    setLoadingStandards(true)

    try {
      const res = await fetch('/api/crm/apprenticeship-standards')
      const json = await res.json().catch(() => null)

      if (!res.ok) {
        console.error('Could not load apprenticeship standards:', json)
        return
      }

      const rows = Array.isArray(json?.standards)
        ? json.standards
        : Array.isArray(json?.data)
          ? json.data
          : []

      if (!cancelled) {
        setAvailableStandards(rows)
      }
    } catch (error) {
      console.error('Could not load apprenticeship standards:', error)
    } finally {
      if (!cancelled) {
        setLoadingStandards(false)
      }
    }
  }

  loadStandards()

  return () => {
    cancelled = true
  }
}, [availableStandards.length])

useEffect(() => {
  let cancelled = false

  async function loadEmailTemplates() {
    setLoadingEmailTemplates(true)

    try {
      const res = await fetch('/api/crm/email-templates', {
        cache: 'no-store',
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        console.error('Could not load email templates:', json)
        return
      }

      if (!cancelled) {
        setEmailTemplates(Array.isArray(json?.data) ? json.data : [])
      }
    } catch (error) {
      console.error('Could not load email templates:', error)
    } finally {
      if (!cancelled) {
        setLoadingEmailTemplates(false)
      }
    }
  }

  loadEmailTemplates()

  return () => {
    cancelled = true
  }
}, [])

useEffect(() => {
  setSelectedActivityTemplateId('')
}, [activityType])

const missingCandidateFactFields = useMemo(() => {
  return CANDIDATE_FACT_FIELDS.filter(field =>
    isCandidateFactMissing(c, field.key),
  )
}, [c])

  const [portalCandidateForm, setPortalCandidateForm] = useState({
  salary_expected: c?.salary_expected ?? '',
  notice_period: c?.notice_period ?? '',
  preferred_location: c?.preferred_location ?? '',
  town_city: c?.town_city ?? '',
  county: c?.county ?? '',
  postcode: c?.postcode ?? '',
})

const [savingPortalCandidateFacts, setSavingPortalCandidateFacts] =
  useState(false)

  const candidateName =
    `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim() || 'Candidate'

  const candidateFirstName = c?.first_name || 'there'
  const documentCount = documents.length + vacancyDocuments.length

  const originalCv =
  documents.find(doc => doc.doc_type === 'cv') ||
  documents.find(doc => documentHasStoredFile(doc)) ||
  null

  const latestClientInterview = useMemo(() => {
  return (
    interviews.find(
      item =>
        item.interview_type === 'client' &&
        !isClientInterviewCancelled(item),
    ) || null
  )
}, [interviews])

  const [clientInterviewForm, setClientInterviewForm] =
    useState<ClientInterviewForm>(() =>
      clientInterviewToForm(latestClientInterview),
    )

  const selectedEmployerContacts = useMemo(() => {
    return clientContacts.filter(contact =>
      clientInterviewForm.employer_contact_ids.includes(contact.id),
    )
  }, [clientContacts, clientInterviewForm.employer_contact_ids])

  const clientInterviewEmailTemplates = useMemo(() => {
  return emailTemplates.filter(
    template =>
      template.is_active !== false &&
      template.template_type === 'client_interview_confirmation',
  )
}, [emailTemplates])

const activityEmailTemplates = useMemo(() => {
  const allowedTypes = getActivityTemplateTypes(activityType)

  return emailTemplates.filter(template => {
    if (template.is_active === false) return false

    return (
      allowedTypes.includes(template.template_type) ||
      template.template_type === 'general'
    )
  })
}, [emailTemplates, activityType])

  async function patchApp(updates: Record<string, any>) {
  const res = await fetch('/api/crm/application', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: app.id, ...updates }),
  })

  const json = await res.json()

  if (!res.ok) {
    console.error('Application save failed:', json)
    alert(json.error || 'Could not save application changes.')
    throw new Error(json.error || 'Could not save application changes.')
  }

  if (json.data) {
    setApp(current => ({ ...current, ...json.data }))
  } else {
    setApp(current => ({ ...current, ...updates }))
  }

  return json.data
}

  async function saveCandidateFactsFromInterview() {
  if (!c?.id) return 0

    const updates: Partial<Record<CandidateTextFactKey, string>> = {}

  missingCandidateFactFields.forEach(field => {
    const value = candidateFactsForm[field.key]

    if (!isBlankCandidateValue(value)) {
      updates[field.key] = String(value)
    }
  })

  const selectedSpecificRoles = uniqueCleanList(candidateFactsForm.specific_roles)
  const selectedStandards = uniqueCleanList(
    candidateFactsForm.apprenticeship_standards,
  )

  const existingLookingForRoles = Array.isArray(c.looking_for_roles)
    ? c.looking_for_roles
    : []

  const nextSpecificRoles =
    selectedSpecificRoles.length > 0
      ? selectedSpecificRoles
      : existingLookingForRoles.length > 0
        ? existingLookingForRoles
        : getCandidateSpecificRoles(c)

  const nextPrimaryRole =
    nextSpecificRoles[0] || c.sub_role_type || c.seeking_role_type || null

  const nextCanDeliver =
    selectedStandards.length > 0
      ? selectedStandards.join(' | ')
      : c.can_deliver ?? null

  const currentSpecificRolesKey = getCandidateSpecificRoles(c).join('|')
  const nextSpecificRolesKey = nextSpecificRoles.join('|')

  const updatedKeys = uniqueCleanList([
    ...Object.keys(updates),
    candidateFactsForm.main_role_type !== (c.main_role_type ?? '')
      ? 'main_role_type'
      : '',
    nextSpecificRolesKey !== currentSpecificRolesKey ? 'specific_roles' : '',
    nextCanDeliver !== (c.can_deliver ?? null)
      ? 'apprenticeship_standards'
      : '',
  ])

  if (updatedKeys.length === 0) return 0

  setSavingCandidateFacts(true)

  const res = await fetch('/api/crm/candidates', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: c.id,

      first_name: c.first_name || '',
      last_name: c.last_name || '',
      email: cleanCandidateFact(updates.email) ?? c.email ?? null,
      phone: cleanCandidateFact(updates.phone) ?? c.phone ?? null,
      linkedin: cleanCandidateFact(updates.linkedin) ?? c.linkedin ?? null,

      job_title: cleanCandidateFact(updates.job_title) ?? c.job_title ?? null,
      main_role_type:
        cleanCandidateFact(candidateFactsForm.main_role_type) ??
        c.main_role_type ??
        null,
      sub_role_type: nextPrimaryRole,
      seeking_role_type: nextPrimaryRole,
      looking_for_roles: nextSpecificRoles,

      preferred_location:
        cleanCandidateFact(updates.preferred_location) ??
        c.preferred_location ??
        null,
      address_line_1: c.address_line_1 ?? null,
      address_line_2: c.address_line_2 ?? null,
      town_city: cleanCandidateFact(updates.town_city) ?? c.town_city ?? null,
      county: cleanCandidateFact(updates.county) ?? c.county ?? null,
      postcode: cleanCandidateFact(updates.postcode) ?? c.postcode ?? null,

      source: c.source ?? null,
      status: c.status ?? 'passive',
actively_looking: c.actively_looking ?? false,
      work_type_pref: c.work_type_pref ?? null,

      can_deliver: nextCanDeliver,
      qualifications:
        cleanCandidateFact(updates.qualifications) ?? c.qualifications ?? null,
      dbs_status: cleanCandidateFact(updates.dbs_status) ?? c.dbs_status ?? null,

      current_salary:
        cleanCandidateFact(updates.current_salary) ?? c.current_salary ?? null,
      salary_expected:
        cleanCandidateFact(updates.salary_expected) ?? c.salary_expected ?? null,
      salary_notes: c.salary_notes ?? null,
      notice_period:
        cleanCandidateFact(updates.notice_period) ?? c.notice_period ?? null,

      right_to_work:
        updates.right_to_work === 'true'
          ? true
          : updates.right_to_work === 'false'
            ? false
            : c.right_to_work ?? null,
    }),
  })

  const json = await res.json().catch(() => null)

  if (!res.ok) {
    alert(json?.error || 'Could not save candidate details.')
    setSavingCandidateFacts(false)
    return 0
  }

  if (json?.data) {
    setApp(current => ({
      ...current,
      candidates: json.data,
    }))
  }

  setCandidateFactsSaved(true)
  setTimeout(() => setCandidateFactsSaved(false), 2500)
  setSavingCandidateFacts(false)

  return updatedKeys.length
}

async function saveEaInterviewAndCandidateFacts() {
  await saveCandidateFactsFromInterview()

  await saveAndFlash({
    ea_interview_date: app.ea_interview_date,
    ea_interview_notes: app.ea_interview_notes,
    ea_interview_verdict: app.ea_interview_verdict,
  })
}

  async function saveAndFlash(updates: Record<string, any>) {
  setSaving(true)

  try {
    await patchApp(updates)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  } finally {
    setSaving(false)
  }
}

async function savePortalCandidateFacts() {
  if (!c?.id) {
    alert('Candidate record not found.')
    return
  }

  setSavingPortalCandidateFacts(true)

  const res = await fetch('/api/crm/candidates', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: c.id,

      first_name: c.first_name || '',
      last_name: c.last_name || '',
      email: c.email || '',
      phone: c.phone || null,
      job_title: c.job_title || null,

      main_role_type: c.main_role_type || null,
      sub_role_type: c.sub_role_type || null,
      seeking_role_type: c.seeking_role_type || c.sub_role_type || null,
      looking_for_roles: Array.isArray(c.looking_for_roles)
        ? c.looking_for_roles
        : [],

      preferred_location: portalCandidateForm.preferred_location || null,
      address_line_1: c.address_line_1 || null,
      address_line_2: c.address_line_2 || null,
      town_city: portalCandidateForm.town_city || null,
      county: portalCandidateForm.county || null,
      postcode: portalCandidateForm.postcode || null,

      source: c.source || null,
      status: c.status || 'passive',
actively_looking: c.actively_looking ?? false,
      work_type_pref: c.work_type_pref || null,
      linkedin: c.linkedin || null,

      can_deliver: c.can_deliver || null,
      qualifications: c.qualifications || null,
      dbs_status: c.dbs_status || null,

      current_salary: c.current_salary || null,
      salary_expected: portalCandidateForm.salary_expected || null,
      salary_notes: c.salary_notes || null,
      notice_period: portalCandidateForm.notice_period || null,
      right_to_work: c.right_to_work ?? null,
    }),
  })

  const json = await res.json().catch(() => null)

  if (!res.ok) {
    alert(json?.error || 'Could not save candidate portal facts.')
    setSavingPortalCandidateFacts(false)
    return
  }

  if (json?.data) {
    setApp(current => ({
      ...current,
      candidates: json.data,
    }))
  }

  setSavingPortalCandidateFacts(false)
}

async function addActivity(e?: React.FormEvent) {
  e?.preventDefault()

  if (!c?.id) {
    alert('Cannot save activity because this application is not linked to a candidate.')
    return
  }

  if (!activityContent.trim()) return

  setSavingActivity(true)

  const { data, error } = await supabase
    .from('candidate_activities')
    .insert({
      candidate_id: c.id,
      activity_type: activityType,
      content: activityContent.trim(),
    })
    .select()
    .single()

  if (error) {
    alert(error.message)
    setSavingActivity(false)
    return
  }

  if (data) {
  setActivityItems(current => [data, ...current])
  setActivityContent('')
  setActivityAiContext('')
  setActivityType('call')
  setActivitySaved(true)
  setTimeout(() => setActivitySaved(false), 2000)
}

  setSavingActivity(false)
}

async function deleteActivity(activityId: string) {
  const confirmed = window.confirm(
    'Delete this activity? This cannot be undone.',
  )

  if (!confirmed) return

  setDeletingActivityId(activityId)

  const query = supabase
    .from('candidate_activities')
    .delete()
    .eq('id', activityId)

  if (c?.id) {
    query.eq('candidate_id', c.id)
  }

  const { error } = await query

  if (error) {
    alert(error.message || 'Could not delete activity.')
    setDeletingActivityId(null)
    return
  }

  setActivityItems(current =>
    current.filter(activity => activity.id !== activityId),
  )

  setDeletingActivityId(null)
}

function buildActivityTemplateValues() {
  const candidateFullName =
    `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim() || 'Candidate'

  const candidateLocation = joinCleanParts([
    c?.preferred_location,
    c?.town_city,
    c?.county,
    c?.postcode,
  ])

  return {
    'candidate.first_name': c?.first_name || 'there',
    'candidate.last_name': c?.last_name || '',
    'candidate.full_name': candidateFullName,
    'candidate.email': c?.email || '',
    'candidate.phone': c?.phone || '',
    'candidate.location': candidateLocation || '',
    'candidate.notice_period': c?.notice_period || '',
    'candidate.salary_expected': c?.salary_expected || '',
    'candidate.dbs_status': c?.dbs_status || '',
    'candidate.linkedin': c?.linkedin || '',

    'client.company_name': client?.company_name || '',
    'client.contact_name': client?.contact_name || '',
    'client.email': client?.email || '',
    'client.website': client?.website || '',

    'vacancy.title': v?.title || '',
    'vacancy.location': v?.location || '',
    'vacancy.region': v?.region || '',
    'vacancy.salary_display': v?.salary_display || '',

    'application.profile_text': app.profile_text || '',
    'application.ea_interview_notes': app.ea_interview_notes || '',
    'application.cover_note': app.cover_note || '',

    'interview.date': app.client_interview_date
      ? formatDisplayDate(app.client_interview_date)
      : '',
    'interview.time': app.client_interview_time || '',
    'interview.location': app.client_interview_location || '',
    'interview.instructions': app.client_interview_notes || '',
  }
}

function applyActivityTemplate() {
  const selectedTemplate = emailTemplates.find(
    template => template.id === selectedActivityTemplateId,
  )

  if (!selectedTemplate) return

  const values = buildActivityTemplateValues()

  const subject = renderEmailTemplate(selectedTemplate.subject, values).trim()
  const body = renderEmailTemplate(selectedTemplate.body, values).trim()

  const nextContent = subject
    ? `Subject: ${subject}\n\n${body}`
    : body

  setActivityContent(nextContent)
}

async function generateActivityMessage() {
  if (!['email', 'sms', 'whatsapp', 'linkedin'].includes(activityType)) {
    return
  }

  setGeneratingActivityMessage(true)

  const res = await fetch('/api/crm/application-outreach-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
  channel: activityType,
  extra_context: activityAiContext.trim(),
  application: {
        id: app.id,
        status: app.status,
        ea_interview_date: app.ea_interview_date,
        ea_interview_notes: app.ea_interview_notes,
        ea_interview_verdict: app.ea_interview_verdict,
        internal_notes: app.internal_notes,
      },
      candidate: {
        id: c?.id,
        first_name: c?.first_name,
        last_name: c?.last_name,
        email: c?.email,
        phone: c?.phone,
        job_title: c?.job_title,
        main_role_type: c?.main_role_type,
        sub_role_type: c?.sub_role_type,
        seeking_role_type: c?.seeking_role_type,
        looking_for_roles: c?.looking_for_roles,
        preferred_location: c?.preferred_location,
        postcode: c?.postcode,
        current_salary: c?.current_salary,
        salary_expected: c?.salary_expected,
        notice_period: c?.notice_period,
        dbs_status: c?.dbs_status,
        notes: c?.notes,
        qualifications: c?.qualifications,
        can_deliver: c?.can_deliver,
      },
      vacancy: {
        id: v?.id,
        title: v?.title,
        sector: v?.sector,
        role_type: v?.role_type,
        type: v?.type,
        location: v?.location,
        region: v?.region,
        salary_display: v?.salary_display,
        description: v?.description,
        anonymous_description: v?.anonymous_description,
        employer_job_description: v?.employer_job_description,
        briefing_notes: v?.briefing_notes,
      },
      client: {
        id: client?.id,
        company_name: client?.company_name,
        website: client?.website,
      },
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    alert(data.error || 'Could not generate outreach message.')
    setGeneratingActivityMessage(false)
    return
  }

  setActivityContent(data.message || '')
  setGeneratingActivityMessage(false)
}

  function startRecording() {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SR) {
      alert('Speech recognition is not supported in this browser.')
      return
    }

    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-GB'

    recognition.onresult = (event: any) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += `${event.results[i][0].transcript} `
        } else {
          interim += event.results[i][0].transcript
        }
      }

      if (final) {
        transcriptRef.current += final
        setTranscript(transcriptRef.current)
      }

      setInterimText(interim)
    }

    recognition.onend = () => {
      if (recognitionRef.current) {
        try {
          recognition.start()
        } catch {}
      }
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  function stopRecording() {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    setInterimText('')
    setIsRecording(false)
  }

  async function analyseInterview() {
    const text = transcript.trim()
    if (!text) return

    setAnalysing(true)

    const res = await fetch('/api/crm/interview-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: text,
        candidate: {
          name: candidateName,
          job_title: c?.job_title,
          seeking_role_type: c?.sub_role_type || c?.seeking_role_type,
        },
      }),
    })

    const data = await res.json()

    if (data.result) {
  const result = data.result

  setInterviewAnalysis(result)

  const eaInterviewNotes = [
    'EA INTERVIEW OVERVIEW',
    '',
    '1. Candidate confirmation',
    result.candidate_confirmation || 'Not discussed',
    '',
    '2. Interview summary',
    result.interview_summary || 'Not discussed',
    '',
    '3. Key findings',
    result.key_findings || 'Not discussed',
    '',
    '4. Relevant experience',
    result.relevant_experience || 'Not discussed',
    '',
    '5. Qualifications / standards / sectors',
    result.qualifications_mentioned || 'Not discussed',
    '',
    '6. Apprenticeship standards or delivery areas',
    result.apprenticeship_standards_or_sectors || 'Not discussed',
    '',
    '7. Salary discussed',
    result.salary_discussed || 'Not discussed',
    '',
    '8. Availability / notice period',
    result.availability || 'Not discussed',
    '',
    '9. Work type / location preference',
    result.work_type_preference || 'Not discussed',
    '',
    '10. Motivation and role preferences',
    result.motivation_and_preferences || 'Not discussed',
    '',
    '11. Candidate strengths',
    result.candidate_strengths || 'Not discussed',
    '',
    '12. Concerns / gaps / points to clarify',
    result.candidate_concerns || 'None identified from the interview',
    '',
    '13. Fit assessment',
    result.fit_assessment || 'Not discussed',
    '',
    '14. Recommended roles',
    result.recommended_roles || 'Not discussed',
    '',
    '15. Employer-facing summary',
    result.employer_facing_summary || 'Not discussed',
    '',
    '16. Recommended next steps',
    result.next_steps || 'Not discussed',
    '',
    '17. Internal notes',
    result.internal_notes || 'None',
  ].join('\n')

  await patchApp({
    ea_interview_notes: eaInterviewNotes,
    ea_interview_verdict: result.verdict,
  })
}

    setAnalysing(false)
  }

  async function buildProfile() {
  setBuildingProfile(true)

  const res = await fetch('/api/crm/application-profile-builder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
  anonymous,
  cover_note: coverNote,
  profile_builder_context: profileBuilderContext,
  application: {
        id: app.id,
        status: app.status,
        ea_interview_date: app.ea_interview_date,
        ea_interview_notes: app.ea_interview_notes,
        ea_interview_verdict: app.ea_interview_verdict,
        client_interview_date: app.client_interview_date,
        client_interview_time: app.client_interview_time,
        client_interview_format: app.client_interview_format,
        client_interview_location: app.client_interview_location,
        client_interview_notes: app.client_interview_notes,
        client_interview_feedback: app.client_interview_feedback,
        client_interview_outcome: app.client_interview_outcome,
        internal_notes: app.internal_notes,
        cover_note: app.cover_note,
        profile_builder_context: profileBuilderContext,
      },
      candidate: {
  id: c?.id,
  first_name: anonymous ? 'Candidate' : c?.first_name,
  last_name: anonymous ? '' : c?.last_name,
  email: c?.email,
  phone: c?.phone,
  job_title: c?.job_title,
  main_role_type: c?.main_role_type,
  sub_role_type: c?.sub_role_type,
  seeking_role_type: c?.seeking_role_type,
  looking_for_roles: c?.looking_for_roles,
  formatted_cv: c?.formatted_cv,
  notes: c?.notes,
  qualifications: c?.qualifications,
  can_deliver: c?.can_deliver,

  preferred_location: c?.preferred_location,
  address_line_1: c?.address_line_1,
  address_line_2: c?.address_line_2,
  town_city: c?.town_city,
  county: c?.county,
  postcode: c?.postcode,

  current_salary: c?.current_salary,
  salary_expected: c?.salary_expected,
  salary_notes: c?.salary_notes,
  notice_period: c?.notice_period,
  dbs_status: c?.dbs_status,

  cv_url: c?.cv_url,
  linkedin: c?.linkedin,
},
      vacancy: {
        id: v?.id,
        title: v?.title,
        sector: v?.sector,
        role_type: v?.role_type,
        type: v?.type,
        location: v?.location,
        region: v?.region,
        salary_display: v?.salary_display,
        description: v?.description,
        employer_job_description: v?.employer_job_description,
        anonymous_description: v?.anonymous_description,
        briefing_notes: v?.briefing_notes,
      },
      client: {
        id: client?.id,
        company_name: client?.company_name,
        contact_name: client?.contact_name,
        email: client?.email,
        website: client?.website,
      },
            candidate_documents: documents.map(doc => ({
        id: doc.id,
        name: doc.name,
        doc_type: doc.doc_type,
        extracted_text: doc.extracted_text || null,
        ai_summary: doc.ai_summary || null,
        file_url: doc.file_url || null,
      })),

      vacancy_documents: vacancyDocuments.map(doc => ({
        id: doc.id,
        name: doc.name,
        doc_type: doc.doc_type,
        extracted_text: doc.extracted_text || null,
        ai_summary: doc.ai_summary || null,
        file_url: doc.file_url || null,

      candidate_activities: activityItems.map(activity => ({
  id: activity.id,
  activity_type: activity.activity_type,
  content: activity.content,
  created_at: activity.created_at,
})),
      })),
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    alert(data.error || 'Could not build profile.')
    setBuildingProfile(false)
    return
  }

  if (data.profile) {
  setProfileText(data.profile)

  await patchApp({
  profile_text: data.profile,
  profile_anonymous: anonymous,
  profile_builder_context: profileBuilderContext,
})
}

  setBuildingProfile(false)
}

  async function copyProfile() {
    await navigator.clipboard.writeText(profileText)
    setProfileCopied(true)
    setTimeout(() => setProfileCopied(false), 2000)

    await patchApp({
      profile_sent_at: new Date().toISOString(),
    })
  }

  async function runAiSuitabilityReview(force = false, deep = false) {
    setRunningAiReview(true)
    setAiReviewError(null)
    setAiReviewMessage(null)

    const res = await fetch('/api/crm/application/ai-suitability-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        application_id: app.id,
        force,
        deep,
      }),
    })

    const json = await res.json()

    if (!res.ok) {
      setAiReviewError(json.error || 'Could not run AI suitability review.')
      setRunningAiReview(false)
      return
    }

    if (json.data) {
      setAiReview(json.data)

      if (json.cached) {
        setAiReviewMessage('Loaded saved review — no new Claude cost.')
      } else if (json.deep) {
        setAiReviewMessage('Deep Claude review created and saved.')
      } else {
        setAiReviewMessage('Claude review created and saved.')
      }
    }

    setRunningAiReview(false)
  }

  function buildClientInterviewTemplateValues() {
  const contactNames = selectedEmployerContacts
    .map(getContactDisplayName)
    .filter(Boolean)

  const contactTitles = selectedEmployerContacts
    .map(getContactJobTitle)
    .filter(Boolean)

  const employerContactText =
    contactNames.length > 0
      ? joinHumanList(contactNames)
      : client?.contact_name || '[Employer Contact]'

  const employerTitleText =
    contactTitles.length > 0 ? joinHumanList(contactTitles) : ''

  const companyName = client?.company_name || '[Company Name]'
  const interviewDate = formatDisplayDate(clientInterviewForm.interview_date)
  const interviewTime = clientInterviewForm.interview_time || '[Time]'

  let interviewLocation =
    clientInterviewForm.location || '[Location of interview]'

  if (clientInterviewForm.interview_format === 'video') {
    interviewLocation = `${companyName} will email you a link to the call directly.`
  }

  if (clientInterviewForm.interview_format === 'telephone') {
    interviewLocation = `${employerContactText} will call you at ${interviewTime}.`
  }

  const candidateFullName =
    `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim() || 'Candidate'

  const candidateLocation = joinCleanParts([
    c?.preferred_location,
    c?.town_city,
    c?.county,
    c?.postcode,
  ])

  return {
    'candidate.first_name': c?.first_name || 'there',
    'candidate.last_name': c?.last_name || '',
    'candidate.full_name': candidateFullName,
    'candidate.email': c?.email || '',
    'candidate.phone': c?.phone || '',
    'candidate.location': candidateLocation || '',
    'candidate.notice_period': c?.notice_period || '',
    'candidate.salary_expected': c?.salary_expected || '',
    'candidate.dbs_status': c?.dbs_status || '',
    'candidate.linkedin': c?.linkedin || '',

    'client.company_name': companyName,
    'client.contact_name': client?.contact_name || employerContactText,
    'client.email': client?.email || '',
    'client.website': client?.website || '',

    'vacancy.title': v?.title || '[Vacancy Name]',
    'vacancy.location': v?.location || '',
    'vacancy.region': v?.region || '',
    'vacancy.salary_display': v?.salary_display || '',

    'application.profile_text': app.profile_text || '',
    'application.ea_interview_notes': app.ea_interview_notes || '',
    'application.cover_note': app.cover_note || '',

    'interview.date': interviewDate,
    'interview.time': interviewTime,
    'interview.location': interviewLocation,
    'interview.instructions': clientInterviewForm.instructions || '',

    'employer_contact.name': employerContactText,
    'employer_contact.job_title': employerTitleText,
  }
}
  
  function generateClientInterviewEmail() {
  const selectedTemplate = emailTemplates.find(
    template => template.id === selectedClientInterviewTemplateId,
  )

  if (selectedTemplate) {
    const values = buildClientInterviewTemplateValues()

    setClientEmailSubject(
      renderEmailTemplate(selectedTemplate.subject, values),
    )

    setClientInterviewForm(form => ({
      ...form,
      confirmation_email: renderEmailTemplate(selectedTemplate.body, values),
    }))

    return
  }

  const contactNames = selectedEmployerContacts
    .map(getContactDisplayName)
    .filter(Boolean)

  const contactTitles = selectedEmployerContacts
    .map(getContactJobTitle)
    .filter(Boolean)

  const employerContactText =
    contactNames.length > 0
      ? joinHumanList(contactNames)
      : '[Employer Contact]'

  const employerTitleText =
    contactTitles.length > 0 ? ` ${joinHumanList(contactTitles)}` : ''

  const companyName = client?.company_name || '[Company Name]'
  const roleName = v?.title || '[Vacancy Name]'
  const employerWebsite = client?.website || '[Employer Website]'
  const interviewDate = formatDisplayDate(clientInterviewForm.interview_date)
  const interviewTime = clientInterviewForm.interview_time || '[Time]'

  let addressText = clientInterviewForm.location || '[Location of interview]'

  if (clientInterviewForm.interview_format === 'video') {
    addressText = `${companyName} will email you a link to the call directly.`
  }

  if (clientInterviewForm.interview_format === 'telephone') {
    addressText = `${employerContactText} will call you at ${interviewTime}.`
  }

  setClientEmailSubject(`Interview confirmation - ${roleName}`)

  const email = `Hi ${candidateFirstName},

I am pleased to invite you to speak with ${employerContactText}${employerTitleText} at ${companyName} for the role of ${roleName}. Please see below the details for the interview:

Date: ${interviewDate}
Time: ${interviewTime}
Address: ${addressText}

${employerContactText} will want to learn more about you, including your previous work history. It’s a good idea to review the attached job description and make notes on how your experience relates to the role. I’ve also attached an Interview Preparation Document (Things to Consider). Although you may not need this level of detail for your first interview, it’s still worth keeping these points in mind.

For any gaps on your CV, ${employerContactText} will want to know why these are so please make notes as to why before the interview if there are any.

Their web site address is ${employerWebsite} which I would highly recommend researching and exploring what the company offers.

If you have any questions, please don’t hesitate to let me know. If you’d like to book some time to go over some interview prep with me, please email me back with some dates and times you’re free and we can pencil this in.

Kind regards,`

  setClientInterviewForm(form => ({
    ...form,
    confirmation_email: email,
  }))
}

function buildClientInterviewPayload(
  overrides: Partial<ClientInterviewForm> = {},
) {
  const form = {
    ...clientInterviewForm,
    ...overrides,
  }

  const selectedContacts = clientContacts.filter(contact =>
    form.employer_contact_ids.includes(contact.id),
  )

  const cancelled = isClientInterviewCancelled(form)

  return {
    id: form.id || undefined,
    application_id: app.id,
    interview_type: 'client',

    stage_number: form.stage_number ? Number(form.stage_number) : null,
    interview_date: form.interview_date || null,
    interview_time: form.interview_time || null,
    interview_format: form.interview_format || null,
    location: form.location || null,
    instructions: form.instructions || null,

    employer_contact_ids: form.employer_contact_ids,
    employer_contact_names: selectedContacts.map(getContactDisplayName),
    employer_contact_job_titles: selectedContacts.map(getContactJobTitle),

    confirmation_email: form.confirmation_email || null,
    feedback: form.feedback || null,
    outcome: form.outcome || null,
    counts_for_interview_to_fill: cancelled
      ? false
      : form.counts_for_interview_to_fill,
  }
}

async function saveClientInterview() {
  setSavingClientInterview(true)
  setClientInterviewCancelled(false)

  try {
    const payload = buildClientInterviewPayload()

    const res = await fetch('/api/crm/application-interviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok || !json?.data) {
      throw new Error(json?.error || 'Could not save client interview.')
    }

    const savedInterview = json.data as ApplicationInterview
    const savedIsCancelled = isClientInterviewCancelled(savedInterview)

    setClientInterviewForm(
      savedIsCancelled
        ? clientInterviewToForm(null)
        : clientInterviewToForm(savedInterview),
    )

    setInterviews(current => {
      const exists = current.some(item => item.id === savedInterview.id)

      if (exists) {
        return current.map(item =>
          item.id === savedInterview.id ? savedInterview : item,
        )
      }

      return [savedInterview, ...current]
    })

    const nextStatus = savedIsCancelled
      ? PROTECTED_APPLICATION_STATUSES.includes(app.status)
        ? app.status
        : 'submitted'
      : PROTECTED_APPLICATION_STATUSES.includes(app.status)
        ? app.status
        : 'client_interview'

    await patchApp({
      status: nextStatus,
      client_interview_date: savedIsCancelled
        ? null
        : savedInterview.interview_date,
      client_interview_time: savedIsCancelled
        ? null
        : savedInterview.interview_time,
      client_interview_format: savedIsCancelled
        ? null
        : savedInterview.interview_format,
      client_interview_location: savedIsCancelled
        ? null
        : savedInterview.location,
      client_interview_notes: savedIsCancelled
        ? null
        : savedInterview.instructions,
      client_interview_feedback: savedInterview.feedback,
      client_interview_outcome: savedInterview.outcome,
    })

    setClientInterviewSaved(!savedIsCancelled)
    setClientInterviewCancelled(savedIsCancelled)

    setTimeout(() => {
      setClientInterviewSaved(false)
      setClientInterviewCancelled(false)
    }, 2000)
  } catch (error: any) {
    alert(error?.message || 'Could not save client interview.')
  } finally {
    setSavingClientInterview(false)
  }
}

async function cancelClientInterview() {
  if (!clientInterviewForm.id) {
    alert('Save the client interview before cancelling it.')
    return
  }

  const confirmed = window.confirm(
    'Cancel this client interview? It will remain in the interview history as Cancelled and will not count for reporting.',
  )

  if (!confirmed) return

  setCancellingClientInterview(true)
  setClientInterviewSaved(false)

  try {
    const cancelledFeedback = [
      clientInterviewForm.feedback.trim(),
      `Cancelled on ${new Date().toLocaleDateString('en-GB')}.`,
    ]
      .filter(Boolean)
      .join('\n\n')

    const payload = buildClientInterviewPayload({
      feedback: cancelledFeedback,
      outcome: CLIENT_INTERVIEW_CANCELLED_OUTCOME,
      counts_for_interview_to_fill: false,
    })

    const res = await fetch('/api/crm/application-interviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok || !json?.data) {
      throw new Error(json?.error || 'Could not cancel client interview.')
    }

    const cancelledInterview = json.data as ApplicationInterview

    setInterviews(current => {
      const exists = current.some(item => item.id === cancelledInterview.id)

      if (exists) {
        return current.map(item =>
          item.id === cancelledInterview.id ? cancelledInterview : item,
        )
      }

      return [cancelledInterview, ...current]
    })

    setClientInterviewForm(clientInterviewToForm(null))

    await patchApp({
      status: PROTECTED_APPLICATION_STATUSES.includes(app.status)
        ? app.status
        : 'submitted',
      client_interview_date: null,
      client_interview_time: null,
      client_interview_format: null,
      client_interview_location: null,
      client_interview_notes: null,
      client_interview_feedback: cancelledFeedback || null,
      client_interview_outcome: CLIENT_INTERVIEW_CANCELLED_OUTCOME,
    })

    if (c?.id) {
      const activityContent = [
        'Client interview cancelled.',
        cancelledInterview.stage_number
          ? `Stage: ${stageNumberLabel(cancelledInterview.stage_number)}`
          : null,
        cancelledInterview.interview_date
          ? `Date: ${formatDisplayDate(cancelledInterview.interview_date)}`
          : null,
        cancelledInterview.interview_time
          ? `Time: ${cancelledInterview.interview_time}`
          : null,
        v?.title ? `Vacancy: ${v.title}` : null,
        client?.company_name ? `Client: ${client.company_name}` : null,
        'Outcome recorded as: Cancelled',
      ]
        .filter(Boolean)
        .join('\n')

      const { data: activityData, error: activityError } = await supabase
        .from('candidate_activities')
        .insert({
          candidate_id: c.id,
          activity_type: 'note',
          content: activityContent,
        })
        .select()
        .single()

      if (activityError) {
        console.error('Could not record cancelled interview activity:', activityError)
      }

      if (activityData) {
        setActivityItems(current => [activityData, ...current])
      }
    }

    setClientInterviewCancelled(true)
    setTimeout(() => setClientInterviewCancelled(false), 2500)
  } catch (error: any) {
    alert(error?.message || 'Could not cancel client interview.')
  } finally {
    setCancellingClientInterview(false)
  }
}

  async function handleApplicationStatusChange(nextStatus: string) {
    if (nextStatus === 'submitted') {
      setActiveTab('portal')
      return
    }

    if (nextStatus === 'offer') {
      await patchApp({ status: 'offer' })
      setActiveTab('placement' as any)
      return
    }

    if (nextStatus === 'placed') {
      await patchApp({ status: 'placed' })
      setActiveTab('placement' as any)
      return
    }

    await patchApp({ status: nextStatus })
  }

  async function createPlacementFromApplication() {
  setCreatingPlacement(true)

  const res = await fetch('/api/crm/placements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      application_id: app.id,
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    alert(data.error || 'Could not create placement.')
    setCreatingPlacement(false)
    return
  }

  if (data.placement?.id) {
    setPlacement(data.placement)

    await patchApp({
      status: 'placed',
    })
    window.location.href = `/crm/placements/${data.placement.id}`
    return
  }

  setCreatingPlacement(false)
}

  async function copyClientEmail() {
  if (!clientInterviewForm.confirmation_email && !clientEmailSubject) return

  const text = [
    clientEmailSubject ? `Subject: ${clientEmailSubject}` : '',
    clientEmailSubject ? '' : '',
    clientInterviewForm.confirmation_email,
  ]
    .filter((part, index) => index < 2 || Boolean(part))
    .join('\n')

  await navigator.clipboard.writeText(text)
  setClientEmailCopied(true)
  setTimeout(() => setClientEmailCopied(false), 2000)
}

  return (
    <div className="crm-page">
      <div className="crm-page-header">
        <div>
          <div className="crm-breadcrumb">
            <Link href="/crm/applications" className="crm-breadcrumb-link">
              Applications
            </Link>
            <span>/</span>
            <span>{candidateName}</span>
          </div>

          <div className="crm-lead-header-title">
  {c?.id ? (
    <Link
      href={`/crm/candidates/${c.id}`}
      className="crm-page-title"
      style={{
        textDecoration: 'none',
        color: 'var(--primary)',
        fontWeight: 900,
      }}
    >
      {candidateName}
    </Link>
  ) : (
    <h1 className="crm-page-title">{candidateName}</h1>
  )}

  <select
              className="crm-select crm-select-sm"
              value={app.status}
              onChange={e => handleApplicationStatusChange(e.target.value)}
              style={{
                background: STAGE_COLOURS[app.status]?.bg,
                color: STAGE_COLOURS[app.status]?.text,
                fontWeight: 700,
              }}
            >
              {ALL_STAGES.map(stage => (
                <option key={stage} value={stage}>
                  {getApplicationStageLabel(stage)}
                </option>
              ))}
            </select>
  {app.status === 'placed' && !placement && (
    <button
      type="button"
      className="crm-btn-primary crm-btn-sm"
      onClick={createPlacementFromApplication}
      disabled={creatingPlacement}
      style={{
        marginLeft: 8,
        background: '#217822',
        whiteSpace: 'nowrap',
      }}
    >
      {creatingPlacement ? 'Creating placement...' : '+ Add placement'}
    </button>
  )}

  {placement?.id && (
    <Link
      href={`/crm/placements/${placement.id}`}
      className="crm-btn-ghost crm-btn-sm"
      style={{
        marginLeft: 8,
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      Open placement →
    </Link>
  )}

          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
            {v?.id && (
              <Link
                href={`/crm/vacancies/${v.id}`}
                style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}
              >
                ◫ {v.title}
              </Link>
            )}

            {client?.id && (
              <Link
                href={`/crm/clients/${client.id}`}
                style={{
                  fontSize: 13,
                  color: 'var(--text-muted)',
                  fontWeight: 500,
                }}
              >
                ◉ {client.company_name}
              </Link>
            )}

            {c?.id && (
              <Link
                href={`/crm/candidates/${c.id}`}
                style={{
                  fontSize: 13,
                  color: 'var(--text-muted)',
                  fontWeight: 500,
                }}
              >
                ◔ View candidate profile
              </Link>
            )}
          </div>
        </div>

                        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          {app.status === 'ready_to_present' && (
            <button
              className="crm-btn-primary"
              style={{ background: '#217822' }}
              onClick={() => setActiveTab('portal')}
            >
              Review submission →
            </button>
          )}
        </div>
      </div>

                  <div
        style={{
          marginBottom: 14,
          padding: 14,
          borderRadius: 16,
          border: '1px solid var(--border-light)',
          background: '#ffffff',
          boxShadow: '0 10px 30px rgba(15,23,42,0.04)',
        }}
      >
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
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 900,
                color: 'var(--text-main)',
              }}
            >
              Candidate portal request
            </p>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 12,
                color: 'var(--text-muted)',
              }}
            >
              Send the candidate the role details, employer website, job description and a secure upload link.
            </p>
          </div>

          <button
            type="button"
            className="crm-btn-secondary"
            onClick={() => setRolePortalRequestOpen(open => !open)}
          >
            {rolePortalRequestOpen
              ? 'Hide request options'
              : 'Choose documents to request'}
          </button>
        </div>

        {rolePortalRequestOpen && (
  <div
    style={{
      marginTop: 14,
      paddingTop: 14,
      borderTop: '1px solid var(--border-light)',
      display: 'grid',
      gap: 12,
    }}
  >
    <div>
      <label className="crm-label">Request type</label>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 8,
          marginTop: 8,
        }}
      >
        <label
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            background: '#fff',
            border:
              rolePortalRequestMode === 'initial'
                ? '1.5px solid var(--primary)'
                : '1px solid var(--border-light)',
            borderRadius: 10,
            padding: '10px 12px',
            fontSize: 12,
            fontWeight: 800,
            color:
              rolePortalRequestMode === 'initial'
                ? 'var(--primary)'
                : 'var(--text-dark)',
            cursor: 'pointer',
          }}
        >
          <input
            type="radio"
            checked={rolePortalRequestMode === 'initial'}
            onChange={() => {
              setRolePortalRequestMode('initial')
              setRolePortalMessage('')
            }}
          />
          Initial document request
        </label>

        <label
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            background: '#fff',
            border:
              rolePortalRequestMode === 'interview_chase'
                ? '1.5px solid var(--primary)'
                : '1px solid var(--border-light)',
            borderRadius: 10,
            padding: '10px 12px',
            fontSize: 12,
            fontWeight: 800,
            color:
              rolePortalRequestMode === 'interview_chase'
                ? 'var(--primary)'
                : 'var(--text-dark)',
            cursor: 'pointer',
          }}
        >
          <input
            type="radio"
            checked={rolePortalRequestMode === 'interview_chase'}
            onChange={() => {
              setRolePortalRequestMode('interview_chase')
              setRolePortalMessage(
                'Just a reminder to upload the outstanding documents ahead of your client interview.',
              )
            }}
          />
          Chase documents for interview
        </label>
      </div>
    </div>

    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 10,
      }}
    >
      {APPLICATION_PORTAL_DOCUMENT_TYPES.map(type => (
        <label
          key={type.value}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid var(--border-light)',
            background: rolePortalRequestedDocuments.includes(type.value)
              ? '#f3f0ff'
              : '#f9fafb',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          <input
            type="checkbox"
            checked={rolePortalRequestedDocuments.includes(type.value)}
            onChange={() => toggleRolePortalRequestedDocument(type.value)}
          />
          {type.label}
        </label>
      ))}
    </div>

    <label style={{ display: 'grid', gap: 6 }}>
      <span
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: 'var(--text-muted)',
        }}
      >
        Optional message to candidate
      </span>
      <textarea
        rows={3}
        className="crm-textarea"
        value={rolePortalMessage}
        onChange={event => setRolePortalMessage(event.target.value)}
        placeholder={
          rolePortalRequestMode === 'interview_chase'
            ? 'Just a reminder to upload the outstanding documents ahead of your client interview.'
            : `Please upload the requested documents for the ${v?.title || 'role'} opportunity.`
        }
      />
    </label>

    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 12,
          color: 'var(--text-muted)',
        }}
      >
        Selected: {rolePortalRequestedDocuments.length || 0} document type
        {rolePortalRequestedDocuments.length === 1 ? '' : 's'}
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="crm-btn-ghost"
          onClick={previewRoleCandidatePortalEmail}
          disabled={
            previewingRolePortalEmail ||
            sendingRolePortalEmail ||
            rolePortalRequestedDocuments.length === 0
          }
        >
          {previewingRolePortalEmail ? 'Building preview...' : 'Preview email'}
        </button>

        <button
          type="button"
          className="crm-btn-primary"
          onClick={sendRoleCandidatePortalEmail}
          disabled={
            sendingRolePortalEmail ||
            rolePortalRequestedDocuments.length === 0
          }
        >
          {sendingRolePortalEmail
            ? 'Sending...'
            : rolePortalRequestMode === 'interview_chase'
              ? 'Send document chase'
              : 'Send role portal email'}
        </button>
      </div>
    </div>
  </div>
)}

            </div>
            
            {rolePortalEmailPreview && (
  <div
    className="crm-card"
    style={{
      marginBottom: 14,
      padding: 14,
      display: 'grid',
      gap: 12,
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
        <p className="crm-card-title">Candidate portal email preview</p>
        <p
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            marginTop: 4,
            lineHeight: 1.5,
          }}
        >
          Review the email below before sending it to {c?.email || 'the candidate'}.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="crm-btn-ghost crm-btn-sm"
          onClick={() => setRolePortalEmailPreview(null)}
          disabled={sendingRolePortalEmail}
        >
          Close preview
        </button>

        <button
          type="button"
          className="crm-btn-primary crm-btn-sm"
          onClick={sendRoleCandidatePortalEmail}
          disabled={sendingRolePortalEmail}
        >
          {sendingRolePortalEmail ? 'Sending...' : 'Send this email'}
        </button>
      </div>
    </div>

    <div
      style={{
        display: 'grid',
        gap: 10,
        padding: 12,
        borderRadius: 12,
        background: '#fff',
        border: '1px solid var(--border-light)',
      }}
    >
      <div>
        <p className="crm-label">To</p>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800 }}>
          {c?.email || '—'}
        </p>
      </div>

      <div>
        <p className="crm-label">Subject</p>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800 }}>
          {rolePortalEmailPreview.subject || '—'}
        </p>
      </div>

      <div>
        <p className="crm-label">Email body</p>
        <div
          style={{
            whiteSpace: 'pre-wrap',
            fontSize: 13,
            lineHeight: 1.6,
            color: 'var(--text-dark)',
            padding: 12,
            borderRadius: 10,
            background: 'var(--light-bg)',
            border: '1px solid var(--border-light)',
            maxHeight: 360,
            overflowY: 'auto',
          }}
        >
          {rolePortalEmailPreview.text ||
            rolePortalEmailPreview.body ||
            'No preview body returned.'}
        </div>
      </div>

      <p
        style={{
          margin: 0,
          fontSize: 11,
          color: 'var(--text-muted)',
          lineHeight: 1.5,
        }}
      >
        The secure portal link will be generated when you click “Send this email”.
      </p>
    </div>
  </div>
)}

            {rolePortalEmailMessage && (
        <div
          style={{
            marginBottom: 14,
            padding: 12,
            borderRadius: 12,
            border: '1px solid #bbf7d0',
            background: '#f0fdf4',
            color: '#166534',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {rolePortalEmailMessage}
        </div>
      )}

      {rolePortalEmailError && (
        <div
          style={{
            marginBottom: 14,
            padding: 12,
            borderRadius: 12,
            border: '1px solid #fecaca',
            background: '#fef2f2',
            color: '#991b1b',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {rolePortalEmailError}
        </div>
      )}
      
      <div className="crm-tabs">
  {[
    { id: 'overview', label: '◈ Overview' },
{ id: 'ai_review', label: '✦ AI Review' },
{ id: 'ea_interview', label: '🎙 EA Interview' },
{ id: 'profile', label: '📄 Profile Builder' },
{ id: 'portal', label: '🔐 Employer Portal' },
{ id: 'client_interview', label: '🏢 Client Interview' },
{ id: 'documents', label: `📎 Documents (${documentCount})` },
{ id: 'activity', label: `📋 Activity (${activityItems.length})` },
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

            {activeTab === 'overview' && (
        <OverviewTab
  app={app}
  c={c}
  v={v}
  client={client}
  candidateName={candidateName}
  notes={notes}
  setNotes={setNotes}
  saveAndFlash={saveAndFlash}
  saving={saving}
  saved={saved}
  patchApp={patchApp}
  allVacancies={allVacancies}
  switchRoleOpen={switchRoleOpen}
  setSwitchRoleOpen={setSwitchRoleOpen}
  switchRoleVacancyId={switchRoleVacancyId}
  setSwitchRoleVacancyId={setSwitchRoleVacancyId}
  switchRoleReason={switchRoleReason}
  setSwitchRoleReason={setSwitchRoleReason}
  switchingRole={switchingRole}
  switchRoleError={switchRoleError}
  switchApplicationRole={switchApplicationRole}
/>
      )}

      {activeTab === 'ea_interview' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '420px 1fr',
            gap: 16,
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <OriginalCvPanel document={originalCv} candidate={c} />

            <CompactAiReviewPanel
              aiReview={aiReview}
              runningAiReview={runningAiReview}
              runReview={() => runAiSuitabilityReview(false, false)}
            />
          </div>

          <EaInterviewPanel
  app={app}
  setApp={setApp}
  saving={saving}
  isRecording={isRecording}
  transcript={transcript}
  interimText={interimText}
  analysing={analysing}
  interviewAnalysis={interviewAnalysis}
  startRecording={startRecording}
  stopRecording={stopRecording}
  setTranscript={setTranscript}
  transcriptRef={transcriptRef}
  analyseInterview={analyseInterview}
  saveEaInterviewAndCandidateFacts={saveEaInterviewAndCandidateFacts}
  candidateFactsForm={candidateFactsForm}
  setCandidateFactsForm={setCandidateFactsForm}
  missingCandidateFactFields={missingCandidateFactFields}
  savingCandidateFacts={savingCandidateFacts}
  candidateFactsSaved={candidateFactsSaved}
  standards={availableStandards}
  loadingStandards={loadingStandards}
/>
        </div>
      )}

      {activeTab === 'client_interview' && (
        <ClientInterviewPanel
  clientInterviewForm={clientInterviewForm}
  setClientInterviewForm={setClientInterviewForm}
  clientContacts={clientContacts}
  selectedEmployerContacts={selectedEmployerContacts}
  generateClientInterviewEmail={generateClientInterviewEmail}
  saveClientInterview={saveClientInterview}
  cancelClientInterview={cancelClientInterview}
  savingClientInterview={savingClientInterview}
  cancellingClientInterview={cancellingClientInterview}
  clientInterviewSaved={clientInterviewSaved}
  clientInterviewCancelled={clientInterviewCancelled}
  copyClientEmail={copyClientEmail}
  clientEmailCopied={clientEmailCopied}
  interviews={interviews}
  client={client}
  clientInterviewEmailTemplates={clientInterviewEmailTemplates}
  selectedClientInterviewTemplateId={selectedClientInterviewTemplateId}
  setSelectedClientInterviewTemplateId={setSelectedClientInterviewTemplateId}
  loadingEmailTemplates={loadingEmailTemplates}
  clientEmailSubject={clientEmailSubject}
  setClientEmailSubject={setClientEmailSubject}
/>
      )}

      {activeTab === 'ai_review' && (
        <AiReviewTab
          aiReview={aiReview}
          aiReviewMessage={aiReviewMessage}
          aiReviewError={aiReviewError}
          runningAiReview={runningAiReview}
          runAiSuitabilityReview={runAiSuitabilityReview}
          candidateName={candidateName}
          v={v}
          client={client}
          documents={documents}
          vacancyDocuments={vacancyDocuments}
        />
      )}

      {activeTab === 'profile' && (
        <ProfileBuilderTab
  c={c}
  v={v}
  client={client}
  anonymous={anonymous}
  setAnonymous={setAnonymous}
  coverNote={coverNote}
  setCoverNote={setCoverNote}
  profileBuilderContext={profileBuilderContext}
  setProfileBuilderContext={setProfileBuilderContext}
  buildProfile={buildProfile}
  buildingProfile={buildingProfile}
  profileText={profileText}
  setProfileText={setProfileText}
  employerProfileNotes={employerProfileNotes}
  setEmployerProfileNotes={setEmployerProfileNotes}
  copyProfile={copyProfile}
  profileCopied={profileCopied}
  saveAndFlash={saveAndFlash}
  app={app}
/>
      )}

      {activeTab === 'portal' && (
  <PortalPresentationTab
    app={app}
    c={c}
    v={v}
    client={client}
    documents={documents}
    employerProfileNotes={employerProfileNotes}
    setEmployerProfileNotes={setEmployerProfileNotes}
    saveAndFlash={saveAndFlash}
    portalCandidateForm={portalCandidateForm}
    setPortalCandidateForm={setPortalCandidateForm}
    savePortalCandidateFacts={savePortalCandidateFacts}
    savingPortalCandidateFacts={savingPortalCandidateFacts}
  />
)}
      
      {activeTab === 'documents' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div
            className="crm-card"
            style={{
              display: 'grid',
              gap: 12,
            }}
          >
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
                <p className="crm-card-title">Upload candidate document</p>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    marginTop: 4,
                    lineHeight: 1.5,
                  }}
                >
                  Upload documents from this application. They will be saved
                  against the candidate record and linked back to this
                  application.
                </p>
              </div>

              <button
                type="button"
                className="crm-btn-ghost crm-btn-sm"
                onClick={() =>
                  setCandidateDocumentUploadOpen(current => !current)
                }
              >
                {candidateDocumentUploadOpen ? 'Hide upload' : '+ Upload document'}
              </button>
            </div>

            {candidateDocumentUploadOpen && (
              <form
                onSubmit={uploadCandidateDocumentFromApplication}
                style={{
                  display: 'grid',
                  gap: 12,
                  paddingTop: 12,
                  borderTop: '1px solid var(--border-light)',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 12,
                  }}
                >
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span className="crm-label">Document type</span>
                    <select
                      className="crm-select"
                      value={candidateDocumentUploadType}
                      onChange={event =>
                        setCandidateDocumentUploadType(event.target.value)
                      }
                    >
                      {APPLICATION_UPLOAD_DOCUMENT_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: 'grid', gap: 6 }}>
                    <span className="crm-label">Document name</span>
                    <input
                      className="crm-input"
                      value={candidateDocumentUploadName}
                      onChange={event =>
                        setCandidateDocumentUploadName(event.target.value)
                      }
                      placeholder="Optional — defaults to file name"
                    />
                  </label>
                </div>

                <label style={{ display: 'grid', gap: 6 }}>
                  <span className="crm-label">File</span>
                  <input
                    type="file"
                    className="crm-input"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                    onChange={event =>
                      setCandidateDocumentUploadFile(
                        event.target.files?.[0] ?? null,
                      )
                    }
                  />
                </label>

                {candidateDocumentUploadError && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: '#dc2626',
                      fontWeight: 800,
                    }}
                  >
                    {candidateDocumentUploadError}
                  </p>
                )}

                {candidateDocumentUploadMessage && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: '#217822',
                      fontWeight: 800,
                    }}
                  >
                    {candidateDocumentUploadMessage}
                  </p>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    type="button"
                    className="crm-btn-ghost"
                    onClick={() => {
                      setCandidateDocumentUploadOpen(false)
                      setCandidateDocumentUploadName('')
                      setCandidateDocumentUploadFile(null)
                      setCandidateDocumentUploadError(null)
                      setCandidateDocumentUploadMessage(null)
                    }}
                    disabled={uploadingCandidateDocument}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="crm-btn-primary"
                    disabled={
                      uploadingCandidateDocument || !candidateDocumentUploadFile
                    }
                  >
                    {uploadingCandidateDocument
                      ? 'Uploading...'
                      : 'Upload to candidate'}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <DocumentGroupCard
  title="Candidate documents"
  empty="No candidate documents on file. Upload one above or add them on the candidate profile."
  documents={documents}
  documentKind="candidate"
  onDeleteDocument={deleteCandidateDocument}
  deletingDocumentId={deletingCandidateDocumentId}
/>

<DocumentGroupCard
  title="Vacancy documents / Job descriptions"
  empty="No vacancy documents on file. Upload the client JD on the vacancy Description tab."
  documents={vacancyDocuments}
  documentKind="vacancy"
/>

          </div>
        </div>
      )}

      {activeTab === 'activity' && (
  <ActivityTab
  activities={activityItems}
  activityType={activityType}
  setActivityType={setActivityType}
  activityContent={activityContent}
  setActivityContent={setActivityContent}
  activityAiContext={activityAiContext}
  setActivityAiContext={setActivityAiContext}
  addActivity={addActivity}
  savingActivity={savingActivity}
  activitySaved={activitySaved}
  generateActivityMessage={generateActivityMessage}
  generatingActivityMessage={generatingActivityMessage}
  deleteActivity={deleteActivity}
  deletingActivityId={deletingActivityId}
  activityEmailTemplates={activityEmailTemplates}
  selectedActivityTemplateId={selectedActivityTemplateId}
  setSelectedActivityTemplateId={setSelectedActivityTemplateId}
  applyActivityTemplate={applyActivityTemplate}
  loadingEmailTemplates={loadingEmailTemplates}
/>
)}
    </div>
  )
}

function PortalPresentationTab({
  app,
  c,
  v,
  client,
  documents,
  employerProfileNotes,
  setEmployerProfileNotes,
  saveAndFlash,
  portalCandidateForm,
  setPortalCandidateForm,
  savePortalCandidateFacts,
  savingPortalCandidateFacts,
}: {
  app: Application
  c: any
  v: any
  client: any
  documents: CandidateDocument[]
  employerProfileNotes: string
  setEmployerProfileNotes: (value: string) => void
  saveAndFlash: (updates: Record<string, any>) => Promise<void>
  portalCandidateForm: {
    salary_expected: string
    notice_period: string
    preferred_location: string
    town_city: string
    county: string
    postcode: string
  }
  setPortalCandidateForm: React.Dispatch<
    React.SetStateAction<{
      salary_expected: string
      notice_period: string
      preferred_location: string
      town_city: string
      county: string
      postcode: string
    }>
  >
  savePortalCandidateFacts: () => Promise<void>
  savingPortalCandidateFacts: boolean
}) {
  const [submittingToEmployerPortal, setSubmittingToEmployerPortal] =
    useState(false)
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null)
  const [submissionError, setSubmissionError] = useState<string | null>(null)

  const candidateName = `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim()

  const formattedCv = documents.find(
    doc => doc.doc_type === 'formatted_cv' && documentHasStoredFile(doc),
  )

  const [formattedCvPreviewUrl, setFormattedCvPreviewUrl] = useState<string | null>(null)
  const [formattedCvPreviewError, setFormattedCvPreviewError] = useState<string | null>(null)
  const [loadingFormattedCvPreview, setLoadingFormattedCvPreview] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadFormattedCvPreview() {
      if (!formattedCv || !documentHasStoredFile(formattedCv)) {
        setFormattedCvPreviewUrl(null)
        setFormattedCvPreviewError(null)
        setLoadingFormattedCvPreview(false)
        return
      }

      setLoadingFormattedCvPreview(true)
      setFormattedCvPreviewError(null)

      try {
        const url = await getSecureDocumentUrl(formattedCv, 'candidate')

        if (!cancelled) {
          setFormattedCvPreviewUrl(url)
        }
      } catch (error: any) {
        if (!cancelled) {
          setFormattedCvPreviewUrl(null)
          setFormattedCvPreviewError(
            error?.message || 'Could not load formatted CV preview.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoadingFormattedCvPreview(false)
        }
      }
    }

    loadFormattedCvPreview()

    return () => {
      cancelled = true
    }
  }, [formattedCv?.id])

  const documentsShownOnPortal = documents.filter(
    doc =>
      doc.doc_type !== 'formatted_cv' &&
      Boolean((doc as any).show_in_employer_portal),
  )

  function getFileKind(url?: string | null) {
    if (!url) return 'unknown'

    const clean = url.split('?')[0].toLowerCase()

    if (/\.(jpg|jpeg|png|webp|gif)$/i.test(clean)) return 'image'
    if (/\.pdf$/i.test(clean)) return 'pdf'
    if (/\.(doc|docx)$/i.test(clean)) return 'word'

    return 'unknown'
  }

  async function confirmAndSubmit() {
    if (app.status === 'submitted') return

    setSubmittingToEmployerPortal(true)
    setSubmissionMessage(null)
    setSubmissionError(null)

    try {
      await savePortalCandidateFacts()

      const res = await fetch('/api/crm/application/confirm-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: app.id,
          employer_profile_notes: employerProfileNotes,
        }),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || 'Could not confirm submission.')
      }

      await saveAndFlash({
        status: 'submitted',
        profile_sent_at: new Date().toISOString(),
        employer_profile_notes: employerProfileNotes,
      })

      setSubmissionMessage(
        json?.notified && json.notified > 0
          ? `Submitted and client notification sent to ${json.notified} portal user${json.notified === 1 ? '' : 's'}.`
          : 'Submitted. No active portal notification recipient was found.',
      )
    } catch (error: any) {
      setSubmissionError(
        error?.message || 'Could not confirm and submit this candidate.',
      )
    } finally {
      setSubmittingToEmployerPortal(false)
    }
  }

  const formattedCvKind = getFileKind(
    formattedCvPreviewUrl || formattedCv?.file_url || formattedCv?.storage_path,
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        className="crm-card"
        style={{
          border: '1.5px solid var(--primary)',
          background:
            'radial-gradient(circle at top right, rgba(53,45,235,0.08), transparent 35%), #fff',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <p className="crm-card-title">Employer Portal presentation</p>
            <p
              style={{
                marginTop: 5,
                fontSize: 12,
                color: 'var(--text-muted)',
                lineHeight: 1.6,
              }}
            >
              Control how this candidate appears to the employer for this
              specific application.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="crm-btn-ghost crm-btn-sm"
              onClick={() =>
                window.open(`/employer-portal/vacancies/${v?.id}`, '_blank')
              }
            >
              Preview vacancy portal ↗
            </button>

            <button
              type="button"
              className="crm-btn-ghost crm-btn-sm"
              onClick={() =>
                window.open(
                  `/employer-portal/vacancies/${v?.id}?crm_preview=1&application_id=${app.id}`,
                  '_blank',
                )
              }
            >
              View as employer ↗
            </button>

            <button
              type="button"
              className="crm-btn-primary crm-btn-sm"
              onClick={confirmAndSubmit}
            >
              {app.status === 'submitted' ? 'Submitted' : 'Confirm and Submit'}
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 380px',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="crm-card">
            <p className="crm-card-title" style={{ marginBottom: 12 }}>
              Candidate facts shown on portal
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 12,
              }}
            >
              <div>
                <label className="crm-label">Salary expectation</label>
                <input
                  className="crm-input"
                  value={portalCandidateForm.salary_expected}
                  onChange={event =>
                    setPortalCandidateForm(form => ({
                      ...form,
                      salary_expected: event.target.value,
                    }))
                  }
                  placeholder="e.g. £38,000"
                />
              </div>

              <div>
                <label className="crm-label">Notice period</label>
                <input
                  className="crm-input"
                  value={portalCandidateForm.notice_period}
                  onChange={event =>
                    setPortalCandidateForm(form => ({
                      ...form,
                      notice_period: event.target.value,
                    }))
                  }
                  placeholder="e.g. 4 weeks"
                />
              </div>

              <div>
                <label className="crm-label">Preferred location</label>
                <input
                  className="crm-input"
                  value={portalCandidateForm.preferred_location}
                  onChange={event =>
                    setPortalCandidateForm(form => ({
                      ...form,
                      preferred_location: event.target.value,
                    }))
                  }
                  placeholder="e.g. East Midlands"
                />
              </div>

              <div>
                <label className="crm-label">Town / city</label>
                <input
                  className="crm-input"
                  value={portalCandidateForm.town_city}
                  onChange={event =>
                    setPortalCandidateForm(form => ({
                      ...form,
                      town_city: event.target.value,
                    }))
                  }
                  placeholder="e.g. Derby"
                />
              </div>

              <div>
                <label className="crm-label">County</label>
                <input
                  className="crm-input"
                  value={portalCandidateForm.county}
                  onChange={event =>
                    setPortalCandidateForm(form => ({
                      ...form,
                      county: event.target.value,
                    }))
                  }
                  placeholder="e.g. Derbyshire"
                />
              </div>

              <div>
                <label className="crm-label">Postcode</label>
                <input
                  className="crm-input"
                  value={portalCandidateForm.postcode}
                  onChange={event =>
                    setPortalCandidateForm(form => ({
                      ...form,
                      postcode: event.target.value,
                    }))
                  }
                  placeholder="e.g. DE1"
                />
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: 'var(--text-muted)',
                }}
              >
                These fields save back to the Candidate ID and feed the employer
                portal card.
              </p>

              <button
                type="button"
                className="crm-btn-primary crm-btn-sm"
                onClick={savePortalCandidateFacts}
                disabled={savingPortalCandidateFacts}
              >
                {savingPortalCandidateFacts
                  ? 'Saving...'
                  : 'Save candidate facts'}
              </button>
            </div>
          </div>

          <div className="crm-card">
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
                <p className="crm-card-title">Employer-facing profile</p>
                <p
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                  }}
                >
                  This is the profile shown on the employer portal candidate
                  card.
                </p>
              </div>

              <button
                type="button"
                className="crm-btn-primary crm-btn-sm"
                onClick={() =>
                  saveAndFlash({
                    employer_profile_notes: employerProfileNotes,
                  })
                }
              >
                Save profile
              </button>
            </div>

            <textarea
              className="crm-input"
              rows={12}
              value={employerProfileNotes}
              onChange={event => setEmployerProfileNotes(event.target.value)}
              placeholder="Write the employer-facing profile for this specific vacancy..."
              style={{ lineHeight: 1.7 }}
            />
          </div>

          <div
            className="crm-card"
            style={{
              border: '1.5px solid #bbf7d0',
              background: '#f0fdf4',
            }}
          >
            <p className="crm-card-title" style={{ marginBottom: 8 }}>
              Confirm employer portal submission
            </p>

            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: 'var(--text-muted)',
                lineHeight: 1.6,
              }}
            >
              Once confirmed, this candidate will be marked as Submitted, made
              available in the employer portal and the client will be emailed a
              link to sign in and review the submission.
            </p>

            {submissionError && (
              <p
                style={{
                  margin: '12px 0 0',
                  fontSize: 12,
                  color: '#dc2626',
                  fontWeight: 800,
                }}
              >
                {submissionError}
              </p>
            )}

            {submissionMessage && (
              <p
                style={{
                  margin: '12px 0 0',
                  fontSize: 12,
                  color: '#217822',
                  fontWeight: 800,
                }}
              >
                {submissionMessage}
              </p>
            )}

            <div style={{ marginTop: 14, textAlign: 'right' }}>
              <button
                type="button"
                className="crm-btn-primary"
                style={{ background: '#217822' }}
                onClick={confirmAndSubmit}
                disabled={submittingToEmployerPortal || app.status === 'submitted'}
              >
                {submittingToEmployerPortal
                  ? 'Submitting...'
                  : app.status === 'submitted'
                    ? 'Submitted'
                    : 'Confirm and Submit'}
              </button>
            </div>
          </div>

        </div>

        <aside
          className="crm-card"
          style={{
            position: 'sticky',
            top: 16,
            background: 'var(--text-dark)',
            color: 'var(--white)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: 170,
              height: 170,
              right: -70,
              top: -70,
              borderRadius: '50%',
              background: 'var(--primary)',
              opacity: 0.38,
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <p
              style={{
                margin: 0,
                marginBottom: 8,
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: 'var(--teal)',
              }}
            >
              Portal preview
            </p>

            <h3
              style={{
                margin: 0,
                fontSize: 24,
                lineHeight: 1.08,
                letterSpacing: -0.7,
                color: 'var(--white)',
              }}
            >
              {candidateName || 'Candidate'}
            </h3>

            <p
              style={{
                margin: 0,
                marginTop: 6,
                fontSize: 13,
                color: 'rgba(255,255,255,0.66)',
                lineHeight: 1.5,
              }}
            >
              {c?.job_title || c?.seeking_role_type || 'Candidate background'}
            </p>

            <div
              style={{
                display: 'grid',
                gap: 8,
                marginTop: 16,
                marginBottom: 16,
              }}
            >
              {[
                ['Salary expected', portalCandidateForm.salary_expected],
                ['Notice period', portalCandidateForm.notice_period],
                [
                  'Location',
                  [
                    portalCandidateForm.preferred_location,
                    portalCandidateForm.town_city,
                    portalCandidateForm.county,
                    portalCandidateForm.postcode,
                  ]
                    .filter(Boolean)
                    .join(', '),
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: 12,
                    padding: 10,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10,
                      fontWeight: 900,
                      color: 'rgba(255,255,255,0.45)',
                      textTransform: 'uppercase',
                      letterSpacing: 0.7,
                    }}
                  >
                    {label}
                  </p>

                  <p
                    style={{
                      margin: 0,
                      marginTop: 3,
                      fontSize: 13,
                      fontWeight: 900,
                      color: 'var(--white)',
                    }}
                  >
                    {value || 'Not specified'}
                  </p>
                </div>
              ))}
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 14,
                padding: 12,
                marginBottom: 16,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  fontWeight: 900,
                  color: 'var(--teal)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  marginBottom: 7,
                }}
              >
                Profile preview
              </p>

              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  lineHeight: 1.65,
                  color: 'rgba(255,255,255,0.72)',
                  whiteSpace: 'pre-wrap',
                  maxHeight: 220,
                  overflow: 'auto',
                }}
              >
                {employerProfileNotes ||
                  'Employer-facing profile has not been added yet.'}
              </p>
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 16,
                height: 360,
                overflow: 'hidden',
              }}
            >
              {formattedCv ? (
                <>
                  {loadingFormattedCvPreview && !formattedCvPreviewUrl && (
                    <div
                      style={{
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        padding: 20,
                        color: 'var(--white)',
                        fontSize: 13,
                        fontWeight: 900,
                      }}
                    >
                      Loading formatted CV...
                    </div>
                  )}

                  {formattedCvPreviewError && !loadingFormattedCvPreview && (
                    <div
                      style={{
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        padding: 20,
                      }}
                    >
                      <div>
                        <p style={{ fontSize: 30, marginBottom: 8 }}>⚠️</p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 13,
                            fontWeight: 900,
                            color: 'var(--white)',
                          }}
                        >
                          Could not load CV preview
                        </p>
                        <p
                          style={{
                            margin: '6px 0 0',
                            fontSize: 12,
                            color: 'rgba(255,255,255,0.68)',
                          }}
                        >
                          {formattedCvPreviewError}
                        </p>
                      </div>
                    </div>
                  )}

                  {formattedCvPreviewUrl && formattedCvKind === 'pdf' && (
                    <iframe
                      src={formattedCvPreviewUrl}
                      title="Formatted CV preview"
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 0,
                        background: '#fff',
                      }}
                    />
                  )}

                  {formattedCvPreviewUrl && formattedCvKind === 'image' && (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        background: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 10,
                      }}
                    >
                      <img
                        src={formattedCvPreviewUrl}
                        alt="Formatted CV preview"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                        }}
                      />
                    </div>
                  )}

                  {formattedCvPreviewUrl && ['word', 'unknown'].includes(formattedCvKind) && (
                    <div
                      style={{
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        padding: 20,
                      }}
                    >
                      <div>
                        <p style={{ fontSize: 34, marginBottom: 8 }}>📄</p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 13,
                            fontWeight: 900,
                            color: 'var(--white)',
                          }}
                        >
                          Preview not available
                        </p>

                        <button
                          type="button"
                          className="crm-btn-primary crm-btn-sm"
                          style={{
                            marginTop: 12,
                            display: 'inline-flex',
                            textDecoration: 'none',
                          }}
                          onClick={() => openSecureDocument(formattedCv, 'candidate')}
                        >
                          Open formatted CV
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: 20,
                  }}
                >
                  <div>
                    <p style={{ fontSize: 34, marginBottom: 8 }}>📄</p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        fontWeight: 900,
                        color: 'var(--white)',
                      }}
                    >
                      Formatted CV pending
                    </p>

                    <p
                      style={{
                        margin: 0,
                        marginTop: 6,
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.62)',
                        lineHeight: 1.5,
                      }}
                    >
                      Upload a formatted CV on the Candidate ID documents tab.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function OverviewTab({
  app,
  c,
  v,
  client,
  candidateName,
  notes,
  setNotes,
  saveAndFlash,
  saving,
  saved,
  patchApp,
  allVacancies,
  switchRoleOpen,
  setSwitchRoleOpen,
  switchRoleVacancyId,
  setSwitchRoleVacancyId,
  switchRoleReason,
  setSwitchRoleReason,
  switchingRole,
  switchRoleError,
  switchApplicationRole,
}: {
  app: Application
  c: any
  v: any
  client: any
  candidateName: string
  notes: string
  setNotes: (value: string) => void
  saveAndFlash: (updates: Record<string, any>) => Promise<void>
  saving: boolean
  saved: boolean
  patchApp: (updates: Record<string, any>) => Promise<void>
  allVacancies: SwitchRoleVacancy[]
switchRoleOpen: boolean
setSwitchRoleOpen: (value: boolean) => void
switchRoleVacancyId: string
setSwitchRoleVacancyId: (value: string) => void
switchRoleReason: string
setSwitchRoleReason: (value: string) => void
switchingRole: boolean
switchRoleError: string | null
switchApplicationRole: () => Promise<void>
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="crm-card">
          <p className="crm-card-title" style={{ marginBottom: 12 }}>
            Candidate
          </p>

          <div className="crm-detail-list">
            <DetailRow label="Name">
  {c?.id ? (
    <Link
      href={`/crm/candidates/${c.id}`}
      style={{
        color: 'var(--primary)',
        fontWeight: 800,
        textDecoration: 'none',
      }}
    >
      {candidateName}
    </Link>
  ) : (
    candidateName
  )}
</DetailRow>
            <DetailRow label="Role type">
              {c?.sub_role_type || c?.seeking_role_type || '—'}
            </DetailRow>
            <DetailRow label="Current role">{c?.job_title || '—'}</DetailRow>

            {Array.isArray(c?.looking_for_roles) && c.looking_for_roles.length > 0 && (
              <DetailRow label="Looking for">
                {c.looking_for_roles.join(', ')}
              </DetailRow>
            )}

            {c?.email && (
              <div className="crm-detail-row">
                <span className="crm-detail-label">Email</span>
                <a href={`mailto:${c.email}`} className="crm-detail-link">
                  {c.email}
                </a>
              </div>
            )}

            {c?.phone && (
              <div className="crm-detail-row">
                <span className="crm-detail-label">Phone</span>
                <a href={`tel:${c.phone}`} className="crm-detail-link">
                  {c.phone}
                </a>
              </div>
            )}

            {c?.linkedin && (
              <div className="crm-detail-row">
                <span className="crm-detail-label">LinkedIn</span>
                <a
                  href={c.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="crm-detail-link"
                >
                  View ↗
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="crm-card">
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 12,
    }}
  >
    <div>
      <p className="crm-card-title">Vacancy</p>
      {app.role_switched_at && (
        <p
          style={{
            margin: 0,
            marginTop: 4,
            fontSize: 11,
            color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}
        >
          Role switched on{' '}
          {new Date(app.role_switched_at).toLocaleDateString('en-GB')}
        </p>
      )}
    </div>

    <button
      type="button"
      className="crm-btn-ghost crm-btn-sm"
      onClick={() => {
        setSwitchRoleOpen(!switchRoleOpen)
        setSwitchRoleVacancyId('')
        setSwitchRoleReason('')
      }}
    >
      Switch role
    </button>
  </div>

  <div className="crm-detail-list">
    <DetailRow label="Role">{v?.title || '—'}</DetailRow>
    <DetailRow label="Client">{client?.company_name || '—'}</DetailRow>
    <DetailRow label="Location">{v?.location || v?.region || '—'}</DetailRow>
    <DetailRow label="Salary">{v?.salary_display || '—'}</DetailRow>
    <DetailRow label="Type">{v?.type || '—'}</DetailRow>
  </div>

  {app.role_switch_reason && (
    <div
      style={{
        marginTop: 12,
        padding: 10,
        borderRadius: 10,
        background: '#f8fafc',
        border: '1px solid var(--border-light)',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 900,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
        }}
      >
        Switch reason
      </p>
      <p
        style={{
          margin: 0,
          marginTop: 4,
          fontSize: 12,
          color: 'var(--text-dark)',
          lineHeight: 1.5,
        }}
      >
        {app.role_switch_reason}
      </p>
    </div>
  )}

  {switchRoleOpen && (
    <div
      style={{
        marginTop: 14,
        padding: 14,
        borderRadius: 12,
        background: '#f8fafc',
        border: '1px solid var(--border-light)',
      }}
    >
      <p
        style={{
          margin: 0,
          marginBottom: 8,
          fontSize: 13,
          fontWeight: 900,
          color: 'var(--text-dark)',
        }}
      >
        Move this application to another role
      </p>

      <p
        style={{
          margin: 0,
          marginBottom: 12,
          fontSize: 12,
          color: 'var(--text-muted)',
          lineHeight: 1.5,
        }}
      >
        This keeps the same application record, but changes the current role.
        It will not create a second application.
      </p>

      <div className="crm-field" style={{ marginBottom: 10 }}>
        <label className="crm-label">New role</label>
        <select
          className="crm-select"
          value={switchRoleVacancyId}
          onChange={event => setSwitchRoleVacancyId(event.target.value)}
        >
          <option value="">Choose role...</option>

          {allVacancies
            .filter(vacancy => vacancy.id !== app.vacancy_id)
            .map(vacancy => {
              const vacancyClient = Array.isArray(vacancy.clients)
                ? vacancy.clients[0]
                : vacancy.clients

              const sameClient =
                client?.id && vacancyClient?.id === client.id

              return (
                <option key={vacancy.id} value={vacancy.id}>
                  {sameClient ? '★ ' : ''}
                  {vacancy.title}
                  {vacancyClient?.company_name
                    ? ` - ${vacancyClient.company_name}`
                    : ''}
                  {vacancy.location || vacancy.region
                    ? ` (${vacancy.location || vacancy.region})`
                    : ''}
                </option>
              )
            })}
        </select>
      </div>

      <div className="crm-field" style={{ marginBottom: 10 }}>
        <label className="crm-label">Reason / notes</label>
        <textarea
          className="crm-input"
          rows={3}
          value={switchRoleReason}
          onChange={event => setSwitchRoleReason(event.target.value)}
          placeholder="Example: Client interviewed for BDM but wants to offer an alternative role."
          style={{ lineHeight: 1.6 }}
        />
      </div>

      {switchRoleError && (
        <div
          style={{
            marginBottom: 10,
            padding: 10,
            borderRadius: 10,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {switchRoleError}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="crm-btn-ghost crm-btn-sm"
          onClick={() => setSwitchRoleOpen(false)}
          disabled={switchingRole}
        >
          Cancel
        </button>

        <button
          type="button"
          className="crm-btn-primary crm-btn-sm"
          onClick={switchApplicationRole}
          disabled={switchingRole || !switchRoleVacancyId}
        >
          {switchingRole ? 'Switching...' : 'Switch role'}
        </button>
      </div>
    </div>
  )}
</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="crm-card">
          <p className="crm-card-title" style={{ marginBottom: 14 }}>
            Pipeline
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ALL_STAGES.map((stage, index) => {
              const stageIndex = ALL_STAGES.indexOf(app.status)
              const isDone = index < stageIndex
              const isCurrent = index === stageIndex

              return (
                <div
                  key={stage}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                  }}
                  onClick={() => patchApp({ status: stage })}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 800,
                      background: isCurrent
                        ? 'var(--primary)'
                        : isDone
                          ? '#217822'
                          : 'var(--border)',
                      color: isCurrent || isDone ? 'white' : 'var(--text-muted)',
                    }}
                  >
                    {isDone ? '✓' : index + 1}
                  </div>

                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: isCurrent ? 800 : 500,
                      color: isCurrent
                        ? 'var(--primary)'
                        : isDone
                          ? '#217822'
                          : 'var(--text-muted)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {getApplicationStageLabel(stage)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="crm-card">
          <p className="crm-card-title" style={{ marginBottom: 10 }}>
            Internal notes
          </p>

          <textarea
            className="crm-input"
            rows={5}
            placeholder="Internal notes about this application..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />

          <button
            className="crm-btn-primary crm-btn-sm"
            style={{ marginTop: 8, width: '100%' }}
            disabled={saving}
            onClick={() => saveAndFlash({ internal_notes: notes })}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>

          {saved && (
            <p
              style={{
                fontSize: 11,
                color: '#217822',
                fontWeight: 700,
                marginTop: 4,
              }}
            >
              ✓ Saved
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function OriginalCvPanel({
  document,
  candidate,
}: {
  document: CandidateDocument | null
  candidate: any
}) {
  const fallbackUrl = candidate?.cv_url || null
  const fileName = document?.name || 'Original CV'
  const hasStoredFile = documentHasStoredFile(document)
  const hasAnyFile = hasStoredFile || Boolean(fallbackUrl)

  const [fileUrl, setFileUrl] = useState('')
  const [loadingUrl, setLoadingUrl] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [loadingWordPreview, setLoadingWordPreview] = useState(false)
  const [wordPreviewError, setWordPreviewError] = useState<string | null>(null)

  const wordPreviewRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadUrl() {
      setUrlError(null)

      if (document && hasStoredFile) {
        setLoadingUrl(true)

        try {
          const url = await getSecureDocumentUrl(document, 'candidate')

          if (!cancelled) {
            setFileUrl(url)
          }
        } catch (error: any) {
          if (!cancelled) {
            setFileUrl('')
            setUrlError(error?.message || 'Could not create secure CV link.')
          }
        } finally {
          if (!cancelled) {
            setLoadingUrl(false)
          }
        }

        return
      }

      setFileUrl(fallbackUrl || '')
    }

    loadUrl()

    return () => {
      cancelled = true
    }
  }, [document?.id, fallbackUrl, hasStoredFile, document])

  const fileKind = getFileKind(fileUrl || document?.file_url || fallbackUrl || fileName)
  const isDocx = /\.(docx)(\?|$)/i.test(
    fileUrl || document?.storage_path || document?.file_url || fileName || '',
  )
  const isOldDoc = /\.(doc)(\?|$)/i.test(
    fileUrl || document?.storage_path || document?.file_url || fileName || '',
  )

  useEffect(() => {
    let cancelled = false

    async function renderWordPreview() {
      if (!fileUrl || !isDocx || !wordPreviewRef.current) return

      setLoadingWordPreview(true)
      setWordPreviewError(null)
      wordPreviewRef.current.innerHTML = ''

      try {
        const response = await fetch(fileUrl)

        if (!response.ok) {
          throw new Error(`Could not load Word document preview (${response.status}).`)
        }

        const blob = await response.blob()

        if (cancelled || !wordPreviewRef.current) return

        const { renderAsync } = await import('docx-preview')

        await renderAsync(blob, wordPreviewRef.current, undefined, {
          className: 'crm-docx-preview',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
        })
      } catch (error: any) {
        if (!cancelled) {
          setWordPreviewError(
            error?.message || 'Could not preview this Word document.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoadingWordPreview(false)
        }
      }
    }

    renderWordPreview()

    return () => {
      cancelled = true
    }
  }, [fileUrl, isDocx])

  async function openCv() {
    if (fileUrl) {
      window.open(fileUrl, '_blank', 'noopener,noreferrer')
      return
    }

    if (document && hasStoredFile) {
      try {
        const url = await getSecureDocumentUrl(document, 'candidate')
        setFileUrl(url)
        window.open(url, '_blank', 'noopener,noreferrer')
      } catch (error: any) {
        alert(error?.message || 'Could not open this CV securely.')
      }
    }
  }

  return (
    <div className="crm-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          padding: 12,
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div>
          <p className="crm-card-title">Original CV</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {fileName}
          </p>
        </div>

        {hasAnyFile && (
          <button
            type="button"
            onClick={openCv}
            disabled={loadingUrl}
            className="crm-btn-ghost crm-btn-sm"
          >
            {loadingUrl ? 'Opening...' : 'Open ↗'}
          </button>
        )}
      </div>

      {loadingUrl && (
        <div style={{ padding: 14, fontSize: 12, color: 'var(--text-muted)' }}>
          Creating secure CV link...
        </div>
      )}

      {urlError && (
        <div style={{ padding: 14, fontSize: 12, color: '#dc2626', fontWeight: 800 }}>
          {urlError}
        </div>
      )}

      {!hasAnyFile ? (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 28, marginBottom: 8 }}>📄</p>
          <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-dark)' }}>
            No CV file available
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Upload a CV on the candidate profile.
          </p>
        </div>
      ) : fileUrl && fileKind === 'pdf' ? (
        <iframe
          src={fileUrl}
          title={fileName}
          style={{ width: '100%', height: 520, border: 0, background: '#fff' }}
        />
      ) : fileUrl && isDocx ? (
        <div
          style={{
            height: 520,
            overflow: 'auto',
            background: '#e5e7eb',
            padding: 16,
          }}
        >
          {loadingWordPreview && (
            <div
              style={{
                padding: 18,
                fontSize: 12,
                color: 'var(--text-muted)',
                background: '#fff',
                borderRadius: 12,
                border: '1px solid var(--border-light)',
              }}
            >
              Loading Word preview...
            </div>
          )}

          {wordPreviewError && (
            <div
              style={{
                padding: 18,
                fontSize: 12,
                color: '#dc2626',
                fontWeight: 800,
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #fecaca',
              }}
            >
              {wordPreviewError}
            </div>
          )}

          <div
            ref={wordPreviewRef}
            style={{
              background: '#fff',
              minHeight: 480,
              margin: '0 auto',
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.18)',
            }}
          />
        </div>
      ) : fileUrl && fileKind === 'image' ? (
        <div
          style={{
            minHeight: 420,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 12,
            background: '#fff',
          }}
        >
          <img
            src={fileUrl}
            alt={fileName}
            style={{ maxWidth: '100%', maxHeight: 500, objectFit: 'contain' }}
          />
        </div>
      ) : isOldDoc ? (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 28, marginBottom: 8 }}>📄</p>
          <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-dark)' }}>
            Old Word document preview not available
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Older .doc files cannot be previewed in-browser. Open the original or
            re-save it as .docx/PDF.
          </p>
        </div>
      ) : (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 28, marginBottom: 8 }}>📄</p>
          <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-dark)' }}>
            Preview not available
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Open the document in a new tab.
          </p>
        </div>
      )}
    </div>
  )
}

function CompactAiReviewPanel({
  aiReview,
  runningAiReview,
  runReview,
}: {
  aiReview: AiReview | null
  runningAiReview: boolean
  runReview: () => void
}) {
  function ReviewSection({
    title,
    icon,
    items,
    emptyText,
  }: {
    title: string
    icon: string
    items?: string[] | null
    emptyText: string
  }) {
    const safeItems = Array.isArray(items)
      ? items.filter(item => String(item || '').trim())
      : []

    return (
      <div
        style={{
          border: '1px solid var(--border-light)',
          borderRadius: 12,
          padding: 12,
          background: '#fff',
        }}
      >
        <p
          style={{
            margin: 0,
            marginBottom: 8,
            fontSize: 12,
            fontWeight: 900,
            color: 'var(--text-dark)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>{icon}</span>
          {title}
        </p>

        {safeItems.length === 0 ? (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: 'var(--text-muted)',
              lineHeight: 1.5,
            }}
          >
            {emptyText}
          </p>
        ) : (
          <ul
            style={{
              margin: 0,
              paddingLeft: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {safeItems.map((item, index) => (
              <li
                key={`${title}-${index}-${item}`}
                style={{
                  fontSize: 12,
                  color: 'var(--text-dark)',
                  lineHeight: 1.55,
                }}
              >
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="crm-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          padding: 14,
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'flex-start',
          background: '#f8fafc',
        }}
      >
        <div>
          <p className="crm-card-title">AI Review</p>
          <p
            style={{
              margin: 0,
              marginTop: 4,
              fontSize: 12,
              color: 'var(--text-muted)',
              lineHeight: 1.5,
            }}
          >
            Screening notes to support the EA interview.
          </p>
        </div>

        <button
          type="button"
          className="crm-btn-ghost crm-btn-sm"
          onClick={runReview}
          disabled={runningAiReview}
          style={{ whiteSpace: 'nowrap' }}
        >
          {runningAiReview ? 'Loading...' : aiReview ? 'Refresh' : 'Run review'}
        </button>
      </div>

      {!aiReview ? (
        <div style={{ padding: 16 }}>
          <p className="crm-empty">
            No AI review yet. Run it before or during the EA interview.
          </p>
        </div>
      ) : (
        <div
          style={{
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              border: '1px solid var(--border-light)',
              borderRadius: 12,
              padding: 12,
              background: '#fff',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <span className="crm-badge crm-badge-blue">
                {aiReview.overall_fit || 'Unclear'}
              </span>

              {aiReview.score !== null && aiReview.score !== undefined && (
                <span className="crm-badge crm-badge-blue">
                  {aiReview.score}/100
                </span>
              )}

              {aiReview.recommended_next_action && (
                <span className="crm-badge crm-badge-green">
                  {aiReview.recommended_next_action}
                </span>
              )}
            </div>

            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: 'var(--text-dark)',
                lineHeight: 1.65,
              }}
            >
              {aiReview.summary || 'No summary returned.'}
            </p>
          </div>

          <ReviewSection
            title="What is good about them"
            icon="✅"
            items={aiReview.strengths}
            emptyText="No strengths returned."
          />

          <ReviewSection
            title="Missing or unclear"
            icon="❓"
            items={aiReview.missing_or_unclear}
            emptyText="No missing or unclear points returned."
          />

          <ReviewSection
            title="Risks / concerns"
            icon="⚠️"
            items={aiReview.risks}
            emptyText="No risks returned."
          />

          <ReviewSection
            title="Questions to ask the candidate"
            icon="🎙"
            items={aiReview.candidate_questions}
            emptyText="No candidate questions returned."
          />

          <ReviewSection
            title="Questions to ask the client"
            icon="🏢"
            items={aiReview.client_questions}
            emptyText="No client questions returned."
          />
        </div>
      )}
    </div>
  )
}

function EaInterviewPanel({
  app,
  setApp,
  saving,
  isRecording,
  transcript,
  interimText,
  analysing,
  interviewAnalysis,
  startRecording,
  stopRecording,
  setTranscript,
  transcriptRef,
  analyseInterview,
  saveEaInterviewAndCandidateFacts,
  candidateFactsForm,
  setCandidateFactsForm,
  missingCandidateFactFields,
  savingCandidateFacts,
  candidateFactsSaved,
  standards,
  loadingStandards,
}: {
  app: Application
  setApp: Dispatch<SetStateAction<Application>>
  saving: boolean
  isRecording: boolean
  transcript: string
  interimText: string
  analysing: boolean
  interviewAnalysis: any
  startRecording: () => void
  stopRecording: () => void
  setTranscript: (value: string) => void
  transcriptRef: MutableRefObject<string>
  analyseInterview: () => Promise<void>
  saveEaInterviewAndCandidateFacts: () => Promise<void>
  candidateFactsForm: CandidateFactsForm
  setCandidateFactsForm: Dispatch<SetStateAction<CandidateFactsForm>>
  missingCandidateFactFields: CandidateFactField[]
  savingCandidateFacts: boolean
  candidateFactsSaved: boolean
  standards: ApprenticeshipStandard[]
  loadingStandards: boolean
}) {
  return (
    <div className="crm-card">
      <p className="crm-card-title" style={{ marginBottom: 14 }}>
        EA Interview
      </p>

      <div className="crm-field" style={{ marginBottom: 12 }}>
        <label className="crm-label">Interview date</label>
        <input
          className="crm-input"
          type="date"
          value={app.ea_interview_date ?? ''}
          onChange={e =>
            setApp(current => ({
              ...current,
              ea_interview_date: e.target.value || null,
            }))
          }
        />
      </div>

      <RoleAndStandardsInterviewCard
  candidateFactsForm={candidateFactsForm}
  setCandidateFactsForm={setCandidateFactsForm}
  standards={standards}
  loadingStandards={loadingStandards}
/>

      <div
        className="crm-card"
        style={{
          marginBottom: 12,
          padding: 14,
          border:
            missingCandidateFactFields.length > 0
              ? '1.5px solid #fde68a'
              : '1px solid var(--border-light)',
          background:
            missingCandidateFactFields.length > 0 ? '#fffbeb' : '#f8fafc',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'flex-start',
            marginBottom: missingCandidateFactFields.length > 0 ? 12 : 0,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 900,
                color: 'var(--text-dark)',
              }}
            >
              Candidate details to confirm
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
              {missingCandidateFactFields.length > 0
                ? `${missingCandidateFactFields.length} missing field${
                    missingCandidateFactFields.length === 1 ? '' : 's'
                  } from the Candidate ID. Capture them during the EA interview.`
                : 'Candidate ID has the key interview fields completed.'}
            </p>
          </div>

          {candidateFactsSaved && (
            <span className="crm-badge crm-badge-green">Candidate updated</span>
          )}
        </div>

        {missingCandidateFactFields.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 10,
            }}
          >
            {missingCandidateFactFields.map(field => {
              const isTextarea = field.type === 'textarea'
              const isSelect = field.type === 'select'

              return (
                <div
                  key={field.key}
                  className="crm-field"
                  style={{
                    gridColumn: isTextarea ? '1 / -1' : undefined,
                  }}
                >
                  <label className="crm-label">{field.label}</label>

                  {isSelect ? (
                    <select
                      className="crm-select"
                      value={candidateFactsForm[field.key]}
                      onChange={event =>
                        setCandidateFactsForm(form => ({
                          ...form,
                          [field.key]: event.target.value,
                        }))
                      }
                    >
                      {(field.options || []).map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : isTextarea ? (
                    <textarea
                      className="crm-input"
                      rows={3}
                      value={candidateFactsForm[field.key]}
                      placeholder={field.placeholder}
                      onChange={event =>
                        setCandidateFactsForm(form => ({
                          ...form,
                          [field.key]: event.target.value,
                        }))
                      }
                      style={{ lineHeight: 1.6 }}
                    />
                  ) : (
                    <input
                      className="crm-input"
                      type={field.type || 'text'}
                      value={candidateFactsForm[field.key]}
                      placeholder={field.placeholder}
                      onChange={event =>
                        setCandidateFactsForm(form => ({
                          ...form,
                          [field.key]: event.target.value,
                        }))
                      }
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {missingCandidateFactFields.length > 0 && (
          <p
            style={{
              margin: 0,
              marginTop: 10,
              fontSize: 11,
              color: 'var(--text-muted)',
              lineHeight: 1.5,
            }}
          >
            These fields save back to the Candidate ID when you save the EA interview.
            Existing candidate data is not overwritten with blanks.
          </p>
        )}
      </div>

      <div className="ld-recorder-card" style={{ marginBottom: 12 }}>
        <div className="ld-recorder-header">
          <div>
            <p className="ld-recorder-title">Record interview</p>
            <p className="ld-recorder-sub">
              {isRecording ? 'Recording...' : 'Record or type notes below'}
            </p>
          </div>

          <div className="ld-recorder-controls">
            {!isRecording ? (
              <button className="ld-btn-record" onClick={startRecording}>
                <span className="ld-record-dot" />
                Record
              </button>
            ) : (
              <button className="ld-btn-stop" onClick={stopRecording}>
                <span className="ld-stop-square" />
                Stop
              </button>
            )}
          </div>
        </div>

        {isRecording && (
          <div className="ld-recording-indicator">
            <span className="ld-pulse" />
            Recording
          </div>
        )}
      </div>

      <div className="crm-field" style={{ marginBottom: 12 }}>
        <label className="crm-label">Transcript / notes</label>
        <textarea
          className="crm-input"
          rows={7}
          value={transcript + (interimText ? ` ${interimText}` : '')}
          onChange={e => {
            setTranscript(e.target.value)
            transcriptRef.current = e.target.value
          }}
          style={{ lineHeight: 1.7 }}
        />
      </div>

      {transcript && !isRecording && (
        <button
          className="crm-btn-ai"
          style={{
            width: '100%',
            justifyContent: 'center',
            marginBottom: 12,
          }}
          onClick={analyseInterview}
          disabled={analysing}
        >
          {analysing ? '✦ Analysing...' : '✦ Analyse EA interview with Claude'}
        </button>
      )}

      <div className="crm-field" style={{ marginBottom: 12 }}>
        <label className="crm-label">Interview notes</label>
        <textarea
          className="crm-input"
          rows={18}
          placeholder="Summary of EA interview..."
          value={app.ea_interview_notes ?? ''}
          onChange={e =>
            setApp(current => ({
              ...current,
              ea_interview_notes: e.target.value,
            }))
          }
        />
      </div>

      <div className="crm-field" style={{ marginBottom: 12 }}>
        <label className="crm-label">Verdict</label>
        <select
          className="crm-select"
          value={app.ea_interview_verdict ?? ''}
          onChange={e =>
            setApp(current => ({
              ...current,
              ea_interview_verdict: e.target.value,
            }))
          }
        >
          <option value="">Select verdict...</option>
          <option value="Strong candidate — present widely">
            Strong candidate — present widely
          </option>
          <option value="Good candidate — selective roles">
            Good candidate — selective roles
          </option>
          <option value="Borderline — specific roles only">
            Borderline — specific roles only
          </option>
          <option value="Not suitable at this time">
            Not suitable at this time
          </option>
        </select>
      </div>

            <button
        className="crm-btn-primary"
        style={{ width: '100%' }}
        disabled={saving || savingCandidateFacts}
        onClick={saveEaInterviewAndCandidateFacts}
      >
        {saving || savingCandidateFacts
          ? 'Saving...'
          : 'Save EA interview & update Candidate ID'}
      </button>

      {interviewAnalysis && (
        <div className="ld-analysis" style={{ marginTop: 16 }}>
          <div className="ld-analysis-header">
            <p className="ld-analysis-title">✦ Claude Analysis</p>
          </div>

          <div className="ld-analysis-section">
            <p className="ld-analysis-label">Summary</p>
            <p className="ld-analysis-text">
              {interviewAnalysis.interview_summary}
            </p>
          </div>

          <div className="ld-analysis-grid">
            {[
              { label: 'Strengths', value: interviewAnalysis.candidate_strengths },
              { label: 'Concerns', value: interviewAnalysis.candidate_concerns },
              { label: 'Salary', value: interviewAnalysis.salary_discussed },
              { label: 'Availability', value: interviewAnalysis.availability },
            ]
              .filter(item => item.value)
              .map(item => (
                <div key={item.label} className="ld-analysis-field">
                  <p className="ld-analysis-field-label">{item.label}</p>
                  <p className="ld-analysis-field-value">{item.value}</p>
                </div>
              ))}
          </div>

          {interviewAnalysis.next_steps && (
            <div className="ld-analysis-section ld-analysis-next-steps">
              <p className="ld-analysis-label">Next steps</p>
              <p className="ld-analysis-text">{interviewAnalysis.next_steps}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


function RoleAndStandardsInterviewCard({
  candidateFactsForm,
  setCandidateFactsForm,
  standards,
  loadingStandards,
}: {
  candidateFactsForm: CandidateFactsForm
  setCandidateFactsForm: Dispatch<SetStateAction<CandidateFactsForm>>
  standards: ApprenticeshipStandard[]
  loadingStandards: boolean
}) {
  const [standardSearch, setStandardSearch] = useState('')
  const [standardSectorFilter, setStandardSectorFilter] = useState('all')
  const [manualStandardInput, setManualStandardInput] = useState('')

  const { roleTypeHierarchy: crmRoleTypeHierarchy, mainRoleTypes: crmMainRoleTypes } = useCrmRoleSettings()

  const specificRoleOptions = useMemo(() => {
    const options =
      crmRoleTypeHierarchy[candidateFactsForm.main_role_type]?.subTypes ?? []

    return uniqueCleanList([
      ...options,
      ...candidateFactsForm.specific_roles,
    ]).sort()
  }, [candidateFactsForm.main_role_type, candidateFactsForm.specific_roles])

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

  function toggleSpecificRole(role: string) {
    setCandidateFactsForm(form => ({
      ...form,
      specific_roles: toggleListValue(form.specific_roles, role),
    }))
  }

  function toggleStandard(standardName: string) {
    setCandidateFactsForm(form => ({
      ...form,
      apprenticeship_standards: toggleListValue(
        form.apprenticeship_standards,
        standardName,
      ),
    }))
  }

  function removeStandard(standardName: string) {
    setCandidateFactsForm(form => ({
      ...form,
      apprenticeship_standards: form.apprenticeship_standards.filter(
        item => item.toLowerCase() !== standardName.toLowerCase(),
      ),
    }))
  }

  function addManualStandard() {
    const value = manualStandardInput.trim()
    if (!value) return

    setCandidateFactsForm(form => ({
      ...form,
      apprenticeship_standards: toggleListValue(
        form.apprenticeship_standards,
        value,
      ),
    }))

    setManualStandardInput('')
  }

  return (
    <div
      className="crm-card"
      style={{
        marginBottom: 12,
        padding: 14,
        border: '1.5px solid #dbeafe',
        background: '#eff6ff',
      }}
    >
      <div style={{ marginBottom: 14 }}>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 900,
            color: 'var(--text-dark)',
          }}
        >
          Role preferences and Apprenticeship Standards
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
          These save back to the Candidate ID when you save the EA interview.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '260px 1fr',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div className="crm-field">
          <label className="crm-label">Main role type</label>
          <select
            className="crm-select"
            value={candidateFactsForm.main_role_type}
            onChange={event =>
              setCandidateFactsForm(form => ({
                ...form,
                main_role_type: event.target.value,
                specific_roles: [],
              }))
            }
          >
            <option value="">Select type...</option>

            {crmMainRoleTypes.map(roleType => (
              <option key={roleType} value={roleType}>
                {roleType}
              </option>
            ))}
          </select>
        </div>

        <div className="crm-field">
          <label className="crm-label">Specific roles</label>

          {!candidateFactsForm.main_role_type ? (
            <div
              style={{
                padding: 12,
                borderRadius: 10,
                border: '1px solid var(--border-light)',
                background: '#fff',
                fontSize: 12,
                color: 'var(--text-muted)',
              }}
            >
              Select a main role type first.
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                padding: 8,
                borderRadius: 10,
                border: '1px solid var(--border-light)',
                background: '#fff',
              }}
            >
              {specificRoleOptions.map(role => {
                const selected = candidateFactsForm.specific_roles.some(
                  item => item.toLowerCase() === role.toLowerCase(),
                )

                return (
                  <button
                    key={role}
                    type="button"
                    className={`crm-status-filter${selected ? ' active' : ''}`}
                    onClick={() => toggleSpecificRole(role)}
                    style={{ fontSize: 11 }}
                  >
                    {selected ? '✓ ' : ''}
                    {role}
                  </button>
                )
              })}
            </div>
          )}

          {candidateFactsForm.specific_roles.length > 0 && (
            <p
              style={{
                margin: 0,
                marginTop: 6,
                fontSize: 11,
                color: 'var(--text-muted)',
              }}
            >
              Selected: {candidateFactsForm.specific_roles.join(', ')}
            </p>
          )}
        </div>
      </div>

      <div
        style={{
          borderTop: '1px solid #bfdbfe',
          paddingTop: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 10,
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                fontWeight: 900,
                color: 'var(--text-dark)',
              }}
            >
              Apprenticeship Standards
            </p>

            <p
              style={{
                margin: 0,
                marginTop: 3,
                fontSize: 11,
                color: 'var(--text-muted)',
              }}
            >
              Search and select the standards this candidate can deliver.
            </p>
          </div>

          <span className="crm-badge crm-badge-blue">
            {candidateFactsForm.apprenticeship_standards.length} selected
          </span>
        </div>

        {candidateFactsForm.apprenticeship_standards.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              marginBottom: 10,
            }}
          >
            {candidateFactsForm.apprenticeship_standards.map(standard => (
              <button
                key={standard}
                type="button"
                className="crm-status-filter active"
                onClick={() => removeStandard(standard)}
                style={{ fontSize: 11 }}
              >
                ✓ {standard} ×
              </button>
            ))}
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 220px',
            gap: 10,
            marginBottom: 10,
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
              onChange={event => setStandardSearch(event.target.value)}
            />
          </div>

          <select
            className="crm-select crm-select-sm"
            value={standardSectorFilter}
            onChange={event => setStandardSectorFilter(event.target.value)}
          >
            <option value="all">All subject areas</option>

            {standardSectors.map(sector => (
              <option key={sector} value={sector}>
                {sector}
              </option>
            ))}
          </select>
        </div>

        {loadingStandards ? (
  <div
    style={{
      padding: 12,
      background: '#eff6ff',
      border: '1px solid #bfdbfe',
      borderRadius: 10,
      marginBottom: 10,
    }}
  >
    <p style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 800 }}>
      Loading apprenticeship standards...
    </p>
  </div>
) : standards.length === 0 ? (
  <div
    style={{
      padding: 12,
      background: '#fffbeb',
      border: '1px solid #fde68a',
      borderRadius: 10,
      marginBottom: 10,
    }}
  >
    <p style={{ fontSize: 12, color: '#92400e', fontWeight: 700 }}>
      No standards found in the apprenticeship standards table. You can still add a manual standard below.
    </p>
  </div>
) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 8,
              maxHeight: 260,
              overflow: 'auto',
              paddingRight: 4,
            }}
          >
            {filteredStandards.slice(0, 80).map(standard => {
              const standardName = getStandardName(standard)
              const subjectArea = getStandardSubjectArea(standard)
              const selected =
                candidateFactsForm.apprenticeship_standards.some(
                  item => item.toLowerCase() === standardName.toLowerCase(),
                )

              return (
                <button
                  key={standard.id || standardName}
                  type="button"
                  onClick={() => toggleStandard(standardName)}
                  style={{
                    textAlign: 'left',
                    border: selected
                      ? '1.5px solid var(--primary)'
                      : '1px solid var(--border-light)',
                    background: selected ? '#eef2ff' : '#fff',
                    borderRadius: 10,
                    padding: 10,
                    cursor: 'pointer',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      fontWeight: 900,
                      color: selected ? 'var(--primary)' : 'var(--text-dark)',
                      lineHeight: 1.35,
                    }}
                  >
                    {selected ? '✓ ' : ''}
                    {standardName}
                  </p>

                  <p
                    style={{
                      margin: 0,
                      marginTop: 3,
                      fontSize: 10,
                      color: 'var(--text-muted)',
                    }}
                  >
                    {[
                      subjectArea,
                      standard.reference ? `Ref ${standard.reference}` : null,
                      standard.level ? `Level ${standard.level}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </button>
              )
            })}
          </div>
        )}

        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: '1px solid var(--border-light)',
            borderRadius: 10,
            background: '#fff',
          }}
        >
          <label className="crm-label">Add manual standard</label>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="crm-input"
              placeholder="Type standard..."
              value={manualStandardInput}
              onChange={event => setManualStandardInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault()
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
    </div>
  )
}

function ClientInterviewPanel({
  clientInterviewForm,
  setClientInterviewForm,
  clientContacts,
  selectedEmployerContacts,
    generateClientInterviewEmail,
  saveClientInterview,
  cancelClientInterview,
  savingClientInterview,
  cancellingClientInterview,
  clientInterviewSaved,
  clientInterviewCancelled,
  copyClientEmail,
  clientEmailCopied,
  interviews,
  client,
  clientInterviewEmailTemplates,
  selectedClientInterviewTemplateId,
  setSelectedClientInterviewTemplateId,
  loadingEmailTemplates,
  clientEmailSubject,
  setClientEmailSubject,
}: {
  clientInterviewForm: ClientInterviewForm
  setClientInterviewForm: Dispatch<SetStateAction<ClientInterviewForm>>
  clientContacts: ClientContact[]
  selectedEmployerContacts: ClientContact[]
    generateClientInterviewEmail: () => void
  saveClientInterview: () => Promise<void>
  cancelClientInterview: () => Promise<void>
  savingClientInterview: boolean
  cancellingClientInterview: boolean
  clientInterviewSaved: boolean
  clientInterviewCancelled: boolean
  copyClientEmail: () => Promise<void>
  clientEmailCopied: boolean
  interviews: ApplicationInterview[]
  client: any
  clientInterviewEmailTemplates: EmailTemplate[]
  selectedClientInterviewTemplateId: string
  setSelectedClientInterviewTemplateId: Dispatch<SetStateAction<string>>
  loadingEmailTemplates: boolean
  clientEmailSubject: string
  setClientEmailSubject: Dispatch<SetStateAction<string>>
}) {
  const clientAddress = buildClientAddress(client)
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '380px 1fr',
        gap: 16,
        alignItems: 'start',
      }}
    >
      <div className="crm-card">
        <p className="crm-card-title" style={{ marginBottom: 14 }}>
          Client Interview
        </p>

        <div style={{ display: 'grid', gap: 12 }}>
          <div className="crm-field">
            <label className="crm-label">Interview stage</label>
            <select
              className="crm-select"
              value={clientInterviewForm.stage_number}
              onChange={e =>
                setClientInterviewForm(form => ({
                  ...form,
                  stage_number: e.target.value,
                }))
              }
            >
              <option value="">Select stage...</option>
              {[1, 2, 3, 4, 5].map(stage => (
                <option key={stage} value={stage}>
                  {stageNumberLabel(stage)}
                </option>
              ))}
            </select>
          </div>

          <div className="crm-field">
            <label className="crm-label">Interview format</label>
            <select
              className="crm-select"
              value={clientInterviewForm.interview_format}
              onChange={e =>
                setClientInterviewForm(form => ({
                  ...form,
                  interview_format: e.target.value,
                }))
              }
            >
              {INTERVIEW_FORMATS.map(format => (
                <option key={format.value} value={format.value}>
                  {format.label}
                </option>
              ))}
            </select>
          </div>

          <div className="crm-form-row">
            <div className="crm-field">
              <label className="crm-label">Date</label>
              <input
                className="crm-input"
                type="date"
                value={clientInterviewForm.interview_date}
                onChange={e =>
                  setClientInterviewForm(form => ({
                    ...form,
                    interview_date: e.target.value,
                  }))
                }
              />
            </div>

            <div className="crm-field">
              <label className="crm-label">Time</label>
              <input
                className="crm-input"
                type="time"
                value={clientInterviewForm.interview_time}
                onChange={e =>
                  setClientInterviewForm(form => ({
                    ...form,
                    interview_time: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="crm-field">
            <label className="crm-label">Employer contacts</label>

            {clientContacts.length > 0 ? (
              <select
                className="crm-select"
                multiple
                value={clientInterviewForm.employer_contact_ids}
                onChange={e => {
                  const values = Array.from(e.target.selectedOptions).map(
                    option => option.value,
                  )

                  setClientInterviewForm(form => ({
                    ...form,
                    employer_contact_ids: values,
                  }))
                }}
                style={{ minHeight: 110 }}
              >
                {clientContacts.map(contact => (
                  <option key={contact.id} value={contact.id}>
                    {getContactDisplayName(contact)}
                    {getContactJobTitle(contact)
                      ? ` — ${getContactJobTitle(contact)}`
                      : ''}
                  </option>
                ))}
              </select>
            ) : (
              <p className="crm-empty">
                No client contacts found. Add contacts to the client first.
              </p>
            )}

            {selectedEmployerContacts.length > 0 && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                Selected: {joinHumanList(selectedEmployerContacts.map(getContactDisplayName))}
              </p>
            )}
          </div>

          <div className="crm-field">
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      gap: 8,
      alignItems: 'center',
      marginBottom: 5,
    }}
  >
    <label className="crm-label" style={{ marginBottom: 0 }}>
      Location / instructions
    </label>

    {clientAddress && (
      <button
        type="button"
        className="crm-btn-ghost crm-btn-sm"
        onClick={() =>
          setClientInterviewForm(form => ({
            ...form,
            location: clientAddress,
          }))
        }
      >
        Use client address
      </button>
    )}
  </div>

  <textarea
    className="crm-input"
    rows={3}
    placeholder={
      clientAddress || 'Address, video call notes, telephone instructions...'
    }
    value={clientInterviewForm.location}
    onChange={e =>
      setClientInterviewForm(form => ({
        ...form,
        location: e.target.value,
      }))
    }
  />

  {clientAddress && (
    <p
      style={{
        margin: 0,
        marginTop: 5,
        fontSize: 11,
        color: 'var(--text-muted)',
        lineHeight: 1.4,
      }}
    >
      Client address on file: {clientAddress}
    </p>
  )}
</div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--text-dark)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={clientInterviewForm.counts_for_interview_to_fill}
              onChange={e =>
                setClientInterviewForm(form => ({
                  ...form,
                  counts_for_interview_to_fill: e.target.checked,
                }))
              }
              style={{ width: 16, height: 16 }}
            />
            Count this interview for interview-to-fill reporting
          </label>

          <div className="crm-field">
  <label className="crm-label">Email template</label>
  <select
    className="crm-select"
    value={selectedClientInterviewTemplateId}
    onChange={event =>
      setSelectedClientInterviewTemplateId(event.target.value)
    }
    disabled={loadingEmailTemplates}
  >
    <option value="">
      {loadingEmailTemplates
        ? 'Loading templates...'
        : 'Use default EA wording'}
    </option>

    {clientInterviewEmailTemplates.map(template => (
      <option key={template.id} value={template.id}>
        {template.name}
      </option>
    ))}
  </select>

  <p
    style={{
      margin: 0,
      marginTop: 5,
      fontSize: 11,
      color: 'var(--text-muted)',
      lineHeight: 1.4,
    }}
  >
    Select a saved template or use the default EA confirmation wording.
  </p>
</div>

          <button
            type="button"
            className="crm-btn-ai"
            onClick={generateClientInterviewEmail}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            ✦ Generate confirmation email
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="crm-card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 10,
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <p className="crm-card-title">Interview confirmation email</p>

            <div className="crm-field" style={{ marginBottom: 12 }}>
  <label className="crm-label">Subject</label>
  <input
    className="crm-input"
    value={clientEmailSubject}
    onChange={event => setClientEmailSubject(event.target.value)}
    placeholder="e.g. Interview confirmation - Account Manager"
  />
</div>

            {clientInterviewForm.confirmation_email && (
              <button
                type="button"
                className="crm-btn-ghost crm-btn-sm"
                onClick={copyClientEmail}
              >
                {clientEmailCopied ? '✓ Copied' : 'Copy'}
              </button>
            )}
          </div>

          <textarea
            className="crm-input"
            rows={18}
            placeholder="Generate or write the candidate interview confirmation email..."
            value={clientInterviewForm.confirmation_email}
            onChange={e =>
              setClientInterviewForm(form => ({
                ...form,
                confirmation_email: e.target.value,
              }))
            }
            style={{ lineHeight: 1.7 }}
          />
        </div>

        <div className="crm-card">
          <p className="crm-card-title" style={{ marginBottom: 12 }}>
            Feedback / outcome
          </p>

          <div style={{ display: 'grid', gap: 12 }}>
            <div className="crm-field">
              <label className="crm-label">Client feedback</label>
              <textarea
                className="crm-input"
                rows={4}
                value={clientInterviewForm.feedback}
                onChange={e =>
                  setClientInterviewForm(form => ({
                    ...form,
                    feedback: e.target.value,
                  }))
                }
              />
            </div>

            <div className="crm-field">
              <label className="crm-label">Outcome</label>
              <select
                className="crm-select"
                value={clientInterviewForm.outcome}
                onChange={e =>
                  setClientInterviewForm(form => ({
                    ...form,
                    outcome: e.target.value,
                  }))
                }
              >
                {CLIENT_INTERVIEW_OUTCOMES.map(outcome => (
                  <option key={outcome} value={outcome}>
                    {outcome || 'Select outcome...'}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
  <button
    className="crm-btn-primary"
    style={{ width: '100%' }}
    onClick={saveClientInterview}
    disabled={savingClientInterview || cancellingClientInterview}
  >
    {savingClientInterview ? 'Saving...' : 'Save client interview'}
  </button>

  {clientInterviewForm.id && !isClientInterviewCancelled(clientInterviewForm) && (
    <button
      type="button"
      className="crm-btn-ghost"
      style={{
        width: '100%',
        borderColor: '#fecaca',
        background: '#fef2f2',
        color: '#b91c1c',
        fontWeight: 900,
      }}
      onClick={cancelClientInterview}
      disabled={savingClientInterview || cancellingClientInterview}
    >
      {cancellingClientInterview ? 'Cancelling...' : 'Cancel interview'}
    </button>
  )}
</div>

{clientInterviewSaved && (
  <p style={{ fontSize: 12, color: '#217822', fontWeight: 800 }}>
    ✓ Client interview saved
  </p>
)}

{clientInterviewCancelled && (
  <p style={{ fontSize: 12, color: '#b91c1c', fontWeight: 800 }}>
    ✓ Client interview cancelled and recorded in history
  </p>
)}
          </div>
        </div>

        <div className="crm-card">
          <p className="crm-card-title" style={{ marginBottom: 10 }}>
            Previous client interviews
          </p>

          {interviews.filter(item => item.interview_type === 'client').length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {interviews
  .filter(item => item.interview_type === 'client')
  .map(item => {
    const cancelled = isClientInterviewCancelled(item)

    return (
      <div
        key={item.id}
        style={{
          padding: 10,
          borderRadius: 10,
          background: cancelled ? '#fef2f2' : 'var(--light-bg)',
          border: cancelled
            ? '1px solid #fecaca'
            : '1px solid var(--border-light)',
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: cancelled ? '#b91c1c' : 'var(--text-dark)',
          }}
        >
          {item.stage_number
            ? stageNumberLabel(item.stage_number)
            : 'Client interview'}
        </p>

        <p
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            marginTop: 3,
          }}
        >
          {formatDisplayDate(item.interview_date)}{' '}
          {item.interview_time || ''}
          {item.counts_for_interview_to_fill
            ? ' · Counts for reporting'
            : cancelled
              ? ' · Does not count for reporting'
              : ''}
        </p>

        {item.outcome && (
          <p
            style={{
              fontSize: 12,
              color: cancelled ? '#b91c1c' : 'var(--text-dark)',
              fontWeight: 800,
              marginTop: 5,
            }}
          >
            Outcome: {item.outcome}
          </p>
        )}
      </div>
    )
  })}
            </div>
          ) : (
            <p className="crm-empty">No client interviews saved yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function AiReviewTab({
  aiReview,
  aiReviewMessage,
  aiReviewError,
  runningAiReview,
  runAiSuitabilityReview,
  candidateName,
  v,
  client,
  documents,
  vacancyDocuments,
}: {
  aiReview: AiReview | null
  aiReviewMessage: string | null
  aiReviewError: string | null
  runningAiReview: boolean
  runAiSuitabilityReview: (force?: boolean, deep?: boolean) => Promise<void>
  candidateName: string
  v: any
  client: any
  documents: CandidateDocument[]
  vacancyDocuments: VacancyDocument[]
}) {
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
        <p className="crm-card-title" style={{ marginBottom: 10 }}>
          AI Suitability Review
        </p>

        <p
          style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            marginBottom: 14,
          }}
        >
          Normal reviews use saved CV/JD summaries to keep costs sensible. Deep
          review uses more source text and may cost more.
        </p>

        <button
          className="crm-btn-ai"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => runAiSuitabilityReview(false, false)}
          disabled={runningAiReview}
        >
          {runningAiReview
            ? '✦ Reviewing...'
            : aiReview
              ? '✦ Load saved review'
              : '✦ Run AI suitability review'}
        </button>

        {aiReview && (
          <button
            className="crm-btn-ghost"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            onClick={() => runAiSuitabilityReview(true, false)}
            disabled={runningAiReview}
          >
            Re-run review with Claude
          </button>
        )}

        <button
          className="crm-btn-ghost"
          style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
          onClick={() => runAiSuitabilityReview(true, true)}
          disabled={runningAiReview}
        >
          Deep review with more source text
        </button>

        {aiReviewMessage && (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 8,
              background: '#e8f5e8',
              border: '1px solid #bbf7d0',
              color: '#217822',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {aiReviewMessage}
          </div>
        )}

        {aiReviewError && (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 8,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#e53e3e',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {aiReviewError}
          </div>
        )}

        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 10,
            background: 'var(--light-bg)',
            border: '1px solid var(--border-light)',
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: 'var(--text-dark)',
              marginBottom: 6,
            }}
          >
            Review sources
          </p>

          <p
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              lineHeight: 1.6,
            }}
          >
            Candidate: {candidateName}
            <br />
            Vacancy: {v?.title || '—'}
            <br />
            Client: {client?.company_name || '—'}
            <br />
            Candidate docs: {documents.length}
            <br />
            Vacancy docs: {vacancyDocuments.length}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!aiReview ? (
          <div
            className="crm-card"
            style={{ textAlign: 'center', padding: '48px 24px' }}
          >
            <p style={{ fontSize: 32, marginBottom: 12 }}>✦</p>
            <p
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: 'var(--text-dark)',
                marginBottom: 6,
              }}
            >
              No AI review yet
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Run the review to compare the candidate against the uploaded job
              description.
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
                  <p className="crm-card-title">Overall assessment</p>
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      marginTop: 3,
                    }}
                  >
                    Created {new Date(aiReview.created_at).toLocaleDateString('en-GB')}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="crm-badge crm-badge-blue">
                    {aiReview.overall_fit || 'Unclear'}
                  </span>

                  {aiReview.score !== null && aiReview.score !== undefined && (
                    <span
                      className="crm-badge"
                      style={{
                        background:
                          aiReview.score >= 75
                            ? '#e8f5e8'
                            : aiReview.score >= 50
                              ? '#fffbeb'
                              : '#fef2f2',
                        color:
                          aiReview.score >= 75
                            ? '#217822'
                            : aiReview.score >= 50
                              ? '#d97706'
                              : '#e53e3e',
                      }}
                    >
                      {aiReview.score}/100
                    </span>
                  )}
                </div>
              </div>

              <p
                style={{
                  fontSize: 13,
                  color: 'var(--text-dark)',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {aiReview.summary || 'No summary returned.'}
              </p>

              {aiReview.recommended_next_action && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 10,
                    background: 'var(--primary-light)',
                    border: '1px solid var(--primary)',
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      color: 'var(--primary)',
                      marginBottom: 4,
                    }}
                  >
                    Recommended next action
                  </p>

                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: 'var(--text-dark)',
                    }}
                  >
                    {aiReview.recommended_next_action}
                  </p>
                </div>
              )}
            </div>

            <AiReviewSection
              title="What is good about them"
              icon="✅"
              items={aiReview.strengths}
              empty="No strengths returned."
            />

            <AiReviewSection
              title="Missing or unclear"
              icon="❓"
              items={aiReview.missing_or_unclear}
              empty="No missing points returned."
            />

            <AiReviewSection
              title="Risks / concerns"
              icon="⚠️"
              items={aiReview.risks}
              empty="No risks returned."
            />

            <AiReviewSection
              title="Questions to ask the candidate"
              icon="🎙"
              items={aiReview.candidate_questions}
              empty="No candidate questions returned."
            />

            <AiReviewSection
              title="Questions to ask the client"
              icon="🏢"
              items={aiReview.client_questions}
              empty="No client questions returned."
            />
          </>
        )}
      </div>
    </div>
  )
}

function ProfileBuilderTab({
  c,
  v,
  client,
  anonymous,
  setAnonymous,
  coverNote,
setCoverNote,
profileBuilderContext,
setProfileBuilderContext,
buildProfile,
  buildingProfile,
  profileText,
  setProfileText,
  employerProfileNotes,
  setEmployerProfileNotes,
  copyProfile,
  profileCopied,
  saveAndFlash,
  app,
}: {
  c: any
  v: any
  client: any
  anonymous: boolean
  setAnonymous: (value: boolean) => void
  coverNote: string
  setCoverNote: (value: string) => void
    profileBuilderContext: string
  setProfileBuilderContext: (value: string) => void
  buildProfile: () => Promise<void>
  buildingProfile: boolean
  profileText: string
  setProfileText: (value: string) => void
  employerProfileNotes: string
  setEmployerProfileNotes: (value: string) => void
  copyProfile: () => Promise<void>
  profileCopied: boolean
  saveAndFlash: (updates: Record<string, any>) => Promise<void>
  app: Application
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
        alignItems: 'start',
      }}
    >
      <div className="crm-card">
        <p className="crm-card-title" style={{ marginBottom: 12 }}>
          Build profile pack
        </p>

        <p
          style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            marginBottom: 14,
          }}
        >
          Generates a formatted candidate profile for{' '}
          <strong>{v?.title || 'this role'}</strong>
          {client?.company_name ? (
            <>
              {' '}
              at <strong>{client.company_name}</strong>
            </>
          ) : null}
          .
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 14,
          }}
        >
          <input
            type="checkbox"
            id="anon"
            checked={anonymous}
            onChange={e => setAnonymous(e.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />

          <label
            htmlFor="anon"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-dark)',
              cursor: 'pointer',
            }}
          >
            Anonymous profile{' '}
            {anonymous ? '(candidate name hidden)' : '(candidate name shown)'}
          </label>
        </div>

        <div className="crm-field" style={{ marginBottom: 14 }}>
          <label className="crm-label">
            Recruiter&apos;s cover note{' '}
            <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
              (added to end of profile)
            </span>
          </label>

          <textarea
            className="crm-input"
            rows={4}
            placeholder="e.g. This candidate is a strong match for this role because..."
            value={coverNote}
            onChange={e => setCoverNote(e.target.value)}
          />
        </div>

        <div
  className="crm-field"
  style={{
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    background: 'var(--primary-light)',
    border: '1px solid rgba(53,45,235,0.14)',
  }}
>
  <label className="crm-label">
    Profile builder context notes{' '}
    <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
      (used by AI when writing the profile)
    </span>
  </label>

  <p
    style={{
      margin: 0,
      marginBottom: 8,
      fontSize: 12,
      color: 'var(--text-muted)',
      lineHeight: 1.5,
    }}
  >
    Add anything the AI should consider when shaping this profile. This is for
    guidance only and should not be used to invent facts.
  </p>

  <textarea
    className="crm-input"
    rows={5}
    placeholder="e.g. Candidate is strongest on compliance and quality. Mention their apprenticeship background, but avoid making them sound like a senior manager. Client values someone consultative and hands-on."
    value={profileBuilderContext}
    onChange={e => setProfileBuilderContext(e.target.value)}
    style={{
      background: '#fff',
      lineHeight: 1.6,
    }}
  />

  <div
    style={{
      display: 'flex',
      justifyContent: 'flex-end',
      marginTop: 8,
    }}
  >
    <button
      type="button"
      className="crm-btn-ghost crm-btn-sm"
      onClick={() =>
        saveAndFlash({
          profile_builder_context: profileBuilderContext,
        })
      }
    >
      Save context notes
    </button>
  </div>
</div>

        {!c?.formatted_cv && !c?.notes && (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 14,
            }}
          >
            <p style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>
              ⚠ No formatted CV on file. Go to the candidate profile to add one
              for a better result.
            </p>
          </div>
        )}

        <button
          className="crm-btn-ai"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={buildProfile}
          disabled={buildingProfile}
        >
          {buildingProfile ? '✦ Building profile...' : '✦ Build profile pack'}
        </button>
      </div>

      <div className="crm-card">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <p className="crm-card-title">Profile pack</p>

          {profileText && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="crm-btn-ghost crm-btn-sm" onClick={copyProfile}>
                {profileCopied ? '✓ Copied' : 'Copy'}
              </button>

              <button
                className="crm-btn-primary crm-btn-sm"
                onClick={() =>
                  saveAndFlash({
                    profile_text: profileText,
                    profile_anonymous: anonymous,
                  })
                }
              >
                Save
              </button>
            </div>
          )}
        </div>

        <div
  className="crm-card"
  style={{
    marginBottom: 14,
    border: '1.5px solid #bbf7d0',
    background: '#f0fdf4',
  }}
>
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      gap: 12,
      alignItems: 'flex-start',
      marginBottom: 10,
    }}
  >
    <div>
      <p className="crm-card-title">Employer portal profile notes</p>
      <p
        style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          marginTop: 4,
          lineHeight: 1.5,
        }}
      >
        This is what the employer will see for this specific application in their
portal. Keep it client-facing and vacancy-specific.
      </p>
    </div>

    <button
      type="button"
      className="crm-btn-primary crm-btn-sm"
      onClick={() =>
        saveAndFlash({
          employer_profile_notes: employerProfileNotes,
        })
      }
    >
      Save portal notes
    </button>
  </div>

  <textarea
    className="crm-input"
    rows={10}
    value={employerProfileNotes}
    onChange={e => setEmployerProfileNotes(e.target.value)}
    placeholder="Write the employer-facing candidate summary here..."
    style={{
      lineHeight: 1.7,
      fontFamily: 'inherit',
      fontSize: 12,
      background: '#fff',
    }}
  />

  <div
    style={{
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      marginTop: 8,
    }}
  >
    <button
      type="button"
      className="crm-btn-ghost crm-btn-sm"
      onClick={() => setEmployerProfileNotes(profileText)}
      disabled={!profileText}
    >
      Use generated profile
    </button>

    <button
      type="button"
      className="crm-btn-ghost crm-btn-sm"
      onClick={() =>
        navigator.clipboard.writeText(employerProfileNotes)
      }
      disabled={!employerProfileNotes.trim()}
    >
      Copy portal notes
    </button>
  </div>
</div>

        {profileText ? (
          <>
            <textarea
              className="crm-input"
              rows={24}
              value={profileText}
              onChange={e => setProfileText(e.target.value)}
              style={{
                lineHeight: 1.7,
                fontFamily: 'inherit',
                fontSize: 12,
              }}
            />

            {app.profile_sent_at && (
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  marginTop: 8,
                }}
              >
                Last copied/sent:{' '}
                {new Date(app.profile_sent_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>📄</p>
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-dark)',
              }}
            >
              No profile built yet
            </p>
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-muted)',
                marginTop: 4,
              }}
            >
              Click Build on the left to generate one
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function ActivityTab({
  activities,
  activityType,
  setActivityType,
  activityContent,
  setActivityContent,
  activityAiContext,
  setActivityAiContext,
  addActivity,
  savingActivity,
  activitySaved,
  generateActivityMessage,
  generatingActivityMessage,
  deleteActivity,
  deletingActivityId,
  activityEmailTemplates,
  selectedActivityTemplateId,
  setSelectedActivityTemplateId,
  applyActivityTemplate,
  loadingEmailTemplates,
}: {
  activities: Activity[]
  activityType: string
  setActivityType: (value: string) => void
  activityContent: string
  setActivityContent: (value: string) => void
  activityAiContext: string
  setActivityAiContext: (value: string) => void
  addActivity: (e?: React.FormEvent) => Promise<void>
  savingActivity: boolean
  activitySaved: boolean
  generateActivityMessage: () => Promise<void>
  generatingActivityMessage: boolean
    deleteActivity: (activityId: string) => Promise<void>
  deletingActivityId: string | null
  activityEmailTemplates: EmailTemplate[]
  selectedActivityTemplateId: string
  setSelectedActivityTemplateId: Dispatch<SetStateAction<string>>
  applyActivityTemplate: () => void
  loadingEmailTemplates: boolean
}) {
  const actIcon = (type: string) =>
    ({
      call: '📞',
      email: '✉️',
      whatsapp: '🟢',
      linkedin: '💼',
      sms: '💬',
      meeting: '🤝',
      interview: '🎙',
      note: '📝',
    })[type] ?? '📝'

  const canGenerateMessage = ['email', 'sms', 'whatsapp', 'linkedin'].includes(
    activityType,
  )

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
        <p className="crm-card-title" style={{ marginBottom: 12 }}>
          Log activity
        </p>

        <form onSubmit={addActivity}>
          <div className="crm-field" style={{ marginBottom: 12 }}>
            <label className="crm-label">Activity type</label>

            <select
              className="crm-select"
              value={activityType}
              onChange={e => setActivityType(e.target.value)}
            >
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="linkedin">LinkedIn</option>
              <option value="meeting">Meeting</option>
              <option value="note">Note</option>
            </select>
          </div>

          <div className="crm-field" style={{ marginBottom: 12 }}>
  <label className="crm-label">Notes</label>

  <textarea
    className="crm-input"
    rows={7}
    placeholder={
      canGenerateMessage
        ? 'Write or generate the outreach message here...'
        : 'Log the call, email, WhatsApp, meeting or note...'
    }
    value={activityContent}
    onChange={e => setActivityContent(e.target.value)}
    style={{ lineHeight: 1.6 }}
  />
</div>

{canGenerateMessage && (
  <div
    style={{
      marginBottom: 12,
      display: 'grid',
      gap: 10,
    }}
  >
    <div className="crm-field">
      <label className="crm-label">Use saved template</label>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 8,
        }}
      >
        <select
          className="crm-select"
          value={selectedActivityTemplateId}
          onChange={event =>
            setSelectedActivityTemplateId(event.target.value)
          }
          disabled={loadingEmailTemplates}
        >
          <option value="">
            {loadingEmailTemplates
              ? 'Loading templates...'
              : 'Select a template...'}
          </option>

          {activityEmailTemplates.map(template => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="crm-btn-ghost crm-btn-sm"
          onClick={applyActivityTemplate}
          disabled={!selectedActivityTemplateId}
          style={{ whiteSpace: 'nowrap' }}
        >
          Use template
        </button>
      </div>

      <p
        style={{
          margin: 0,
          marginTop: 5,
          fontSize: 11,
          color: 'var(--text-muted)',
          lineHeight: 1.4,
        }}
      >
        Applies the selected template into the notes box. You can still edit it
        before saving.
      </p>
    </div>

    <div className="crm-field">
      <label className="crm-label">Extra context for AI message</label>
      <textarea
        className="crm-input"
        rows={3}
        placeholder="Optional — add anything the AI should include or avoid. Example: mention immediate interviews, salary expectations, remote working, candidate availability, or do not name the employer."
        value={activityAiContext}
        onChange={event => setActivityAiContext(event.target.value)}
        style={{ lineHeight: 1.6 }}
      />
    </div>

    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 8,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <p
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          lineHeight: 1.4,
          margin: 0,
          flex: 1,
        }}
      >
        Generate a candidate outreach message for this role, then edit it before
        saving.
      </p>

      <button
        type="button"
        className="crm-btn-ai crm-btn-sm"
        onClick={generateActivityMessage}
        disabled={generatingActivityMessage}
      >
        {generatingActivityMessage
          ? '✦ Generating...'
          : `✦ Generate ${activityType} message`}
      </button>
    </div>
  </div>
)}
          <button
            type="submit"
            className="crm-btn-primary"
            style={{ width: '100%' }}
            disabled={savingActivity || !activityContent.trim()}
          >
            {savingActivity ? 'Saving...' : 'Save activity'}
          </button>

          {activitySaved && (
            <p
              style={{
                fontSize: 12,
                color: '#217822',
                fontWeight: 800,
                marginTop: 8,
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
    {activity.activity_type.replace(/_/g, ' ')}
  </span>

  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginLeft: 'auto',
    }}
  >
    <span className="ld-activity-date">
      {new Date(activity.created_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}
    </span>

    <button
      type="button"
      className="crm-icon-btn crm-icon-btn-danger"
      title="Delete activity"
      onClick={() => deleteActivity(activity.id)}
      disabled={deletingActivityId === activity.id}
      style={{
        width: 24,
        height: 24,
        fontSize: 11,
      }}
    >
      {deletingActivityId === activity.id ? '…' : '✕'}
    </button>
  </div>
</div>

                {activity.content && (
                  <p className="ld-activity-content">{activity.content}</p>
                )}
              </div>
            </div>
          ))}

          {activities.length === 0 && (
            <p className="crm-empty">
              No activity yet — calls, emails and WhatsApps will appear here.
            </p>
          )}
        </div>
      </div>
    </div>
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
      <span className="crm-detail-value">{children || '—'}</span>
    </div>
  )
}

function AiReviewSection({
  title,
  icon,
  items,
  empty,
}: {
  title: string
  icon: string
  items: string[] | null
  empty: string
}) {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : []

  return (
    <div className="crm-card">
      <p className="crm-card-title" style={{ marginBottom: 10 }}>
        {icon} {title}
      </p>

      {safeItems.length > 0 ? (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {safeItems.map(item => (
            <li
              key={item}
              style={{
                fontSize: 13,
                color: 'var(--text-dark)',
                lineHeight: 1.6,
                paddingLeft: 18,
                position: 'relative',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  color: 'var(--primary)',
                  fontWeight: 900,
                }}
              >
                →
              </span>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="crm-empty">{empty}</p>
      )}
    </div>
  )
}

function DocumentGroupCard({
  title,
  empty,
  documents,
  documentKind,
  onDeleteDocument,
  deletingDocumentId,
}: {
  title: string
  empty: string
  documents: Array<{
    id: string
    name: string
    doc_type: string | null
    file_url: string | null
    storage_bucket?: string | null
    storage_path?: string | null
    released?: boolean | null
    ai_summary?: string | null
    extracted_text?: string | null
  }>
  documentKind: 'candidate' | 'vacancy'
  onDeleteDocument?: (documentId: string) => void
  deletingDocumentId?: string | null
}) {
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null)

  async function handleOpenDocument(document: SecureDocument) {
    setOpeningDocumentId(document.id)

    try {
      await openSecureDocument(document, documentKind)
    } finally {
      setOpeningDocumentId(null)
    }
  }

  return (
    <div className="crm-card">
      <p className="crm-card-title" style={{ marginBottom: 12 }}>
        {title}
      </p>

      {documents.length > 0 ? (
        <div className="crm-docs-grid">
          {documents.map(doc => {
            const hasFile = documentHasStoredFile(doc)
            const isOpening = openingDocumentId === doc.id

            return (
              <div key={doc.id} className="crm-doc-card">
                <div className="crm-doc-card-top">
                  <span
                    className="crm-doc-type-badge"
                    style={{
                      background: '#352DEB18',
                      color: '#352DEB',
                      textTransform: 'capitalize',
                    }}
                  >
                    {(doc.doc_type || 'document').replace(/_/g, ' ')}
                  </span>

                  {doc.released && (
                    <span className="crm-doc-released">✓ Released</span>
                  )}
                </div>

                <p className="crm-doc-name">{doc.name}</p>

                {doc.extracted_text && (
                  <p
                    style={{
                      fontSize: 11,
                      color: '#217822',
                      fontWeight: 700,
                      marginTop: 6,
                    }}
                  >
                    ✓ Text extracted
                  </p>
                )}

                {doc.ai_summary && (
                  <p
                    style={{
                      fontSize: 11,
                      color: '#217822',
                      fontWeight: 700,
                      marginTop: 4,
                    }}
                  >
                    ✓ AI summary saved
                  </p>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 10,
                    alignItems: 'center',
                    marginTop: 10,
                  }}
                >
                  {hasFile ? (
                    <button
                      type="button"
                      onClick={() => handleOpenDocument(doc)}
                      disabled={isOpening}
                      className="crm-pipeline-link"
                      style={{
                        border: 0,
                        background: 'transparent',
                        padding: 0,
                        cursor: isOpening ? 'wait' : 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {isOpening
                        ? 'Opening secure link...'
                        : 'Open full document ↗'}
                    </button>
                  ) : (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      No file attached.
                    </p>
                  )}

                  {onDeleteDocument && documentKind === 'candidate' && (
                    <button
                      type="button"
                      className="crm-icon-btn crm-icon-btn-danger"
                      onClick={() => onDeleteDocument(doc.id)}
                      disabled={deletingDocumentId === doc.id}
                      title="Delete candidate document"
                    >
                      {deletingDocumentId === doc.id ? '…' : '✕'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="crm-empty">{empty}</p>
      )}
    </div>
  )
}

function clientInterviewToForm(
  interview: ApplicationInterview | null,
): ClientInterviewForm {
  return {
    id: interview?.id ?? '',
    stage_number: interview?.stage_number ? String(interview.stage_number) : '',
    interview_date: interview?.interview_date ?? '',
    interview_time: interview?.interview_time ?? '',
    interview_format: interview?.interview_format ?? '',
    location: interview?.location ?? '',
    instructions: interview?.instructions ?? '',
    employer_contact_ids: interview?.employer_contact_ids ?? [],
    confirmation_email: interview?.confirmation_email ?? '',
    feedback: interview?.feedback ?? '',
    outcome: interview?.outcome ?? '',
    counts_for_interview_to_fill:
      interview?.counts_for_interview_to_fill ?? false,
  }
}

function getFileKind(url: string | null) {
  if (!url) return 'unknown'

  const cleanUrl = url.split('?')[0].toLowerCase()

  if (/\.(jpg|jpeg|png|webp|gif)$/i.test(cleanUrl)) return 'image'
  if (/\.pdf$/i.test(cleanUrl)) return 'pdf'
  if (/\.(doc|docx)$/i.test(cleanUrl)) return 'word'

  return 'unknown'
}

function getContactDisplayName(contact: ClientContact) {
  return (
    contact.name ||
    contact.contact_name ||
    [contact.first_name, contact.last_name].filter(Boolean).join(' ') ||
    contact.email ||
    'Unnamed contact'
  )
}

function getContactJobTitle(contact: ClientContact) {
  return contact.job_title || contact.title || contact.role || ''
}

function joinHumanList(items: string[]) {
  const clean = items.filter(Boolean)

  if (clean.length === 0) return ''
  if (clean.length === 1) return clean[0]
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`

  return `${clean.slice(0, -1).join(', ')} and ${clean[clean.length - 1]}`
}

function formatDisplayDate(date?: string | null) {
  if (!date) return '[Date]'

  return new Date(date).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function stageNumberLabel(stage: number) {
  if (stage === 1) return '1st stage interview'
  if (stage === 2) return '2nd stage interview'
  if (stage === 3) return '3rd stage interview'

  return `${stage}th stage interview`
}