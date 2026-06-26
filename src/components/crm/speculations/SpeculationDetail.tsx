'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

const ALL_SYSTEM_ROLES = [
  'Assessor', 'IQA', 'Lead IQA', 'End-Point Assessor (EPA)', 'Skills Coach',
  'Tutor / Trainer', 'Distance Learning Tutor', 'Workshop Facilitator',
  'Vocational Trainer', 'Functional Skills Tutor (Maths)',
  'Functional Skills Tutor (English)', 'Learning Support Worker',
  'Curriculum Manager', 'Curriculum Developer', 'Qualification Developer',
  'E-Learning Developer', 'Quality Manager', 'Compliance Manager',
  'Ofsted Nominee', 'Head of Quality', 'EPA Centre Coordinator', 'CEIAG Adviser',
  'Business Development Manager', 'Employer Engagement Manager',
  'Apprenticeship Advisor', 'Recruitment Consultant', 'Partnerships Manager',
  'Account Manager', 'Key Account Manager', 'Bid Writer', 'Marketing Manager',
  'Apprenticeship Levy Consultant', 'Operations Manager', 'Centre Manager',
  'Programme Manager', 'Regional Manager', 'Training Coordinator',
  'Learner Services Manager', 'Timetabling / Scheduling Manager',
  'Contract Manager', 'Functional Skills Coordinator', 'Head of Department',
  'Head of Apprenticeships', 'Head of Commercial', 'Assistant Principal',
  'Vice Principal', 'Director of Education', 'Director of Quality',
  'Director of Business Development', 'Principal', 'CEO / MD',
  'MIS Officer', 'MIS Manager', 'Data Analyst', 'Apprenticeship Administrator',
  'Learner Records Officer', 'Funding & Compliance Officer', 'Exams Officer',
  'Finance Manager', 'HR Manager',
]

const UK_REGIONS_LIST = [
  'London', 'South East England', 'South West England', 'East of England',
  'East Midlands', 'West Midlands', 'Yorkshire and the Humber',
  'North West England', 'North East England', 'Wales', 'Scotland',
  'Northern Ireland', 'Remote / UK-wide',
]

const OUTREACH_TYPES = [
  { id: 'email', label: 'Email' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'call', label: 'Call' },
  { id: 'meeting', label: 'Meeting' },
  { id: 'inbound', label: 'Inbound enquiry' },
  { id: 'internal_note', label: 'Internal note' },
]

const OUTREACH_STATUSES = [
  { id: 'not_contacted', label: 'Not contacted' },
  { id: 'email_sent', label: 'Email sent' },
  { id: 'linkedin_sent', label: 'LinkedIn sent' },
  { id: 'called', label: 'Called' },
  { id: 'follow_up_required', label: 'Follow-up required' },
  { id: 'interested', label: 'Interested' },
  { id: 'vacancy_discussed', label: 'Vacancy discussed' },
  { id: 'candidate_submitted', label: 'Candidate submitted' },
  { id: 'not_right_now', label: 'Not right now' },
  { id: 'no_interest', label: 'No interest' },
]

type Props = {
  speculation: any
  notes: any[]
  tasks: any[]
  targets: any[]
  opportunities: any[]
  outreach: any[]
  documents: any[]
  activities: any[]
  standards: any[]
  leads: any[]
  clients: any[]
  providerSites: any[]
}

function normaliseRelation<T = any>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function formatDate(value?: string | null) {
  if (!value) return '—'

  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function candidateName(candidate: any) {
  return `${candidate?.first_name ?? ''} ${candidate?.last_name ?? ''}`.trim() ||
    'Unknown candidate'
}

function getDefaultFollowUpDate(days = 3) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

function getFileKind(url?: string | null) {
  if (!url) return 'unknown'

  const clean = url.split('?')[0].toLowerCase()

  if (/\.(jpg|jpeg|png|webp|gif)$/i.test(clean)) return 'image'
  if (/\.pdf$/i.test(clean)) return 'pdf'
  if (/\.(doc|docx)$/i.test(clean)) return 'word'

  return 'unknown'
}

function getCandidateCvDocument(documents: any[]) {
  return (
    documents.find(doc => doc.doc_type === 'formatted_cv' && doc.file_url) ||
    documents.find(doc => doc.doc_type === 'cv' && doc.file_url) ||
    documents.find(doc => doc.file_url) ||
    null
  )
}

export default function SpeculationDetail({
  speculation: initialSpeculation,
  notes: initialNotes,
  tasks: initialTasks,
  targets: initialTargets,
  opportunities: initialOpportunities,
  outreach: initialOutreach,
  documents,
  activities,
  standards,
  leads,
  clients,
  providerSites,
}: Props) {
  const initialCandidate = normaliseRelation(initialSpeculation.candidates)

  const [speculation, setSpeculation] = useState(initialSpeculation)
const [speculationNotes, setSpeculationNotes] = useState(initialNotes)
const [speculationTasks, setSpeculationTasks] = useState(initialTasks)
const [speculationTargets, setSpeculationTargets] = useState(initialTargets)
const [savedOpportunities, setSavedOpportunities] =
  useState(initialOpportunities)
const [specOutreach, setSpecOutreach] = useState(initialOutreach)
const [providerRadius, setProviderRadius] = useState('50')
const [candidateLocation, setCandidateLocation] = useState<{
  lat: number | null
  lng: number | null
  postcode: string
}>(() => ({
  lat: toNumber((normaliseRelation(initialSpeculation.candidates) as any)?.lat),
  lng: toNumber((normaliseRelation(initialSpeculation.candidates) as any)?.lng),
  postcode: candidatePostcode(normaliseRelation(initialSpeculation.candidates)),
}))
const [geocodingCandidate, setGeocodingCandidate] = useState(false)
const [addingOutreach, setAddingOutreach] = useState(false)
const [showAddEmployerForm, setShowAddEmployerForm] = useState(false)
const [updatingOutreachId, setUpdatingOutreachId] = useState<string | null>(null)
const [closingSpeculation, setClosingSpeculation] = useState(false)

const [outreachForm, setOutreachForm] = useState({
  source_type: 'manual',
  linked_record_id: '',
  employer_name: '',
  contact_name: '',
  contact_title: '',
  contact_email: '',
  contact_phone: '',
  website: '',
  sector: '',
  region: '',
  outreach_direction: 'outbound',
  outreach_type: 'email',
  status: 'email_sent',
  reason_for_approach: '',
  message_sent: '',
  linkedin_message_sent: '',
  call_notes: '',
  response_notes: '',
  follow_up_date: '',
})

const [aiOutreachType, setAiOutreachType] = useState<'email' | 'linkedin'>(
  'email',
)
const [aiOutreachTone, setAiOutreachTone] = useState('professional')
const [aiOutreachContext, setAiOutreachContext] = useState('')
const [generatingOutreachDraft, setGeneratingOutreachDraft] = useState(false)
const [draftingEmployerOutreachId, setDraftingEmployerOutreachId] =
  useState<string | null>(null)
const [generatingOpportunityDraftId, setGeneratingOpportunityDraftId] =
  useState<string | null>(null)
const [aiOutreachDraft, setAiOutreachDraft] = useState<{
  subject: string
  body: string
  linkedin_message: string
} | null>(null)

const [specEmailModal, setSpecEmailModal] = useState<{
  open: boolean
  loading: boolean
  saving: boolean
  outreach: any | null
  subject: string
  body: string
  linkedin_message: string
  reason_for_approach: string
  fit_summary: string
  save_email: boolean
  save_linkedin: boolean
  save_reason: boolean
  log_to_employer_activity: boolean
  set_email_sent: boolean
}>({
  open: false,
  loading: false,
  saving: false,
  outreach: null,
  subject: '',
  body: '',
  linkedin_message: '',
  reason_for_approach: '',
  fit_summary: '',
  save_email: true,
  save_linkedin: false,
  save_reason: true,
  log_to_employer_activity: true,
  set_email_sent: false,
})

const [savingJobKey, setSavingJobKey] = useState<string | null>(null)

const [convertingOpportunityId, setConvertingOpportunityId] =
  useState<string | null>(null)

const [noteType, setNoteType] = useState('note')
const [noteContent, setNoteContent] = useState('')
const [addingNote, setAddingNote] = useState(false)

const [taskTitle, setTaskTitle] = useState('')
const [taskDescription, setTaskDescription] = useState('')
const [taskDueDate, setTaskDueDate] = useState('')
const [addingTask, setAddingTask] = useState(false)
const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)

const [targetForm, setTargetForm] = useState({
  employer_name: '',
  website: '',
  linkedin: '',
  sector: '',
  region: '',
  fit_reason: '',
  suggested_contact_title: '',
  approach_status: 'not_contacted',
})
const [addingTarget, setAddingTarget] = useState(false)
const [updatingTargetId, setUpdatingTargetId] = useState<string | null>(null)
const [convertingTargetId, setConvertingTargetId] = useState<string | null>(null)
const [generatingProfile, setGeneratingProfile] = useState(false)
const [generatingTargets, setGeneratingTargets] = useState(false)
const [targetSearchStrategy, setTargetSearchStrategy] = useState('')
const [suggestedSearchQueries, setSuggestedSearchQueries] = useState<string[]>([])

const [searchMode, setSearchMode] = useState(
  speculation.search_mode || 'auto',
)

const [evidenceLevel, setEvidenceLevel] = useState(
  speculation.evidence_level || 'strict',
)

const [targetJobTitles, setTargetJobTitles] = useState(() => {
  const savedRoles = Array.isArray(initialSpeculation.target_roles)
    ? initialSpeculation.target_roles.filter(Boolean).join(', ')
    : ''

  return (
    savedRoles ||
    initialSpeculation.target_role ||
    initialCandidate?.seeking_role_type ||
    initialCandidate?.sub_role_type ||
    initialCandidate?.job_title ||
    ''
  )
})

const [jobSearchLocation, setJobSearchLocation] = useState(() => {
  const savedRegions = Array.isArray(initialSpeculation.target_regions)
    ? initialSpeculation.target_regions.filter(Boolean).join(', ')
    : ''

  return (
    savedRegions ||
    initialCandidate?.preferred_location ||
    initialCandidate?.postcode ||
    ''
  )
})

const [jobSearchKeywords, setJobSearchKeywords] = useState('')
const [jobSearchNotes, setJobSearchNotes] = useState('')

const [standardSearch, setStandardSearch] = useState('')

const [selectedStandardIds, setSelectedStandardIds] = useState<string[]>(
  Array.isArray(speculation.selected_standard_ids)
    ? speculation.selected_standard_ids
    : [],
)

const [generatingOutreachTargetId, setGeneratingOutreachTargetId] =
  useState<string | null>(null)

const [generatedOutreach, setGeneratedOutreach] = useState<{
  target_id: string
  employer_name: string
  email_subject: string
  email_body: string
  linkedin_message: string
  call_script: string
  follow_up_message: string
} | null>(null)

const [outreachFollowUpDate, setOutreachFollowUpDate] = useState(
  getDefaultFollowUpDate(3),
)
const [creatingOutreachTask, setCreatingOutreachTask] = useState(false)

const [liveJobs, setLiveJobs] = useState<any[]>([])
const [searchingJobs, setSearchingJobs] = useState(false)
const [jobSearchError, setJobSearchError] = useState<string | null>(null)
const [jobSearchSummary, setJobSearchSummary] = useState('')
const [jobsLastSearched, setJobsLastSearched] = useState<string | null>(null)
const [jobRegionFilter, setJobRegionFilter] = useState('all')
const [jobMaxDays, setJobMaxDays] = useState(30)

// Live jobs search controls
const [jobRoleSearch, setJobRoleSearch] = useState('')
const [selectedJobRoles, setSelectedJobRoles] = useState<string[]>(() => {
  const initialCandidate = Array.isArray(initialSpeculation.candidates)
    ? initialSpeculation.candidates[0] ?? null
    : initialSpeculation.candidates ?? null

  const roles = [
    ...(Array.isArray(initialSpeculation.target_roles) ? initialSpeculation.target_roles : []),
    initialSpeculation.target_role,
    initialCandidate?.seeking_role_type,
    initialCandidate?.sub_role_type,
  ].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i) as string[]
  return roles
})
const [selectedJobRegions, setSelectedJobRegions] = useState<string[]>([])
const [jobSearchScope, setJobSearchScope] = useState<
  'uk_wide_remote' | 'selected_regions' | 'candidate_area'
>('uk_wide_remote')

const [includeRemoteHybrid, setIncludeRemoteHybrid] = useState(true)
const [includeUkWide, setIncludeUkWide] = useState(true)
const [jobExtraKeywords, setJobExtraKeywords] = useState('')
const [jobSearchNotesFreetext, setJobSearchNotesFreetext] = useState('')

const [activeTab, setActiveTab] = useState<
  | 'overview'
  | 'profile'
  | 'targets'
  | 'nearby'
  | 'notes'
  | 'tasks'
  | 'jobs'
>('overview')

  const candidate = normaliseRelation(speculation.candidates)
  const nearbyProviderRows = useMemo(() => {
  const candidateLat = candidateLocation.lat
  const candidateLng = candidateLocation.lng
  const radius = Number(providerRadius)

  if (!candidateLat || !candidateLng) return []

  const leadMainOffices = leads
    .filter((lead: any) => lead.main_office_lat && lead.main_office_lng)
    .map((lead: any) => ({
      id: `lead-main-${lead.id}`,
      record_type: 'lead',
      record_id: lead.id,
      company_name: lead.company_name,
      site_name: 'Main office',
      sector: lead.sector,
      region: lead.region,
      status: lead.status,
      website: lead.website,
      lat: Number(lead.main_office_lat),
      lng: Number(lead.main_office_lng),
      address_line_1: lead.main_office_address_line_1,
      town_city: lead.main_office_town_city,
      county: lead.main_office_county,
      postcode: lead.main_office_postcode,
      contact_name: lead.contact_name,
      contact_title: lead.contact_title,
      email: lead.email,
      phone: lead.phone,
    }))

  const clientMainOffices = clients
    .filter((client: any) => client.main_office_lat && client.main_office_lng)
    .map((client: any) => ({
      id: `client-main-${client.id}`,
      record_type: 'client',
      record_id: client.id,
      company_name: client.company_name,
      site_name: 'Main office',
      sector: client.sector,
      region: client.region,
      status: client.status,
      website: client.website,
      lat: Number(client.main_office_lat),
      lng: Number(client.main_office_lng),
      address_line_1: client.main_office_address_line_1,
      town_city: client.main_office_town_city,
      county: client.main_office_county,
      postcode: client.main_office_postcode,
      contact_name: client.contact_name,
      contact_title: client.contact_title,
      email: client.email,
      phone: client.phone,
    }))

  const siteRows = providerSites
    .filter((site: any) => site.lat && site.lng)
    .map((site: any) => {
      const linkedLead = site.lead_id
        ? leads.find((lead: any) => lead.id === site.lead_id)
        : null

      const linkedClient = site.client_id
        ? clients.find((client: any) => client.id === site.client_id)
        : null

      const owner = linkedLead || linkedClient

      return {
        id: `site-${site.id}`,
        record_type: site.client_id ? 'client' : 'lead',
        record_id: site.client_id || site.lead_id,
        site_id: site.id,
        company_name: owner?.company_name || site.site_name,
        site_name: site.site_name,
        sector: owner?.sector || null,
        region: owner?.region || site.county,
        status: owner?.status || null,
        website: owner?.website || null,
        lat: Number(site.lat),
        lng: Number(site.lng),
        address_line_1: site.address_line_1,
        town_city: site.town_city,
        county: site.county,
        postcode: site.postcode,
        contact_name: owner?.contact_name || null,
        contact_title: owner?.contact_title || null,
        email: site.email || owner?.email || null,
        phone: site.phone || owner?.phone || null,
      }
    })

  return [...leadMainOffices, ...clientMainOffices, ...siteRows]
    .map((provider: any) => ({
      ...provider,
      distance_miles: haversineMiles(
        candidateLat,
        candidateLng,
        provider.lat,
        provider.lng,
      ),
    }))
    .filter((provider: any) => provider.distance_miles <= radius)
    .sort((a: any, b: any) => a.distance_miles - b.distance_miles)
}, [candidateLocation.lat, candidateLocation.lng, providerRadius, leads, clients, providerSites])

  const candidateCvDocument = getCandidateCvDocument(documents)
  const candidateCvFileKind = getFileKind(candidateCvDocument?.file_url)

  const candidateStandardText = [
  candidate?.can_deliver,
  candidate?.qualifications,
  candidate?.notes,
  speculation.target_role,
  Array.isArray(speculation.target_roles) ? speculation.target_roles.join(', ') : '',
]
  .filter(Boolean)
  .join(' ')
  .toLowerCase()

const suggestedStandards = standards
  .filter(standard => {
    const name = String(
      standard.standard_name || standard.title || '',
    ).toLowerCase()

    return name && candidateStandardText.includes(name)
  })
  .slice(0, 10)

const filteredStandards = standards
  .filter(standard => {
    const term = standardSearch.toLowerCase().trim()
    const name = String(standard.standard_name || standard.title || '').toLowerCase()
    const reference = String(standard.reference || '').toLowerCase()
    const sector = String(standard.sector || standard.route || '').toLowerCase()

    if (!term) return suggestedStandards.some(item => item.id === standard.id)

    return (
      name.includes(term) ||
      reference.includes(term) ||
      sector.includes(term)
    )
  })
  .slice(0, standardSearch ? 40 : 10)

const selectedStandards = standards.filter(standard =>
  selectedStandardIds.includes(standard.id),
)

function splitCommaList(value: string) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function openEmployerActionForm(
  item: any,
  action: 'note' | 'call' | 'email',
) {
  setShowAddEmployerForm(true)
  setAiOutreachDraft(null)

  setOutreachForm(current => ({
    ...current,
    source_type: item.lead_id ? 'lead' : item.client_id ? 'client' : 'manual',
    linked_record_id: item.lead_id || item.client_id || '',

    employer_name: item.employer_name || '',
    contact_name: item.contact_name || '',
    contact_title: item.contact_title || '',
    contact_email: item.contact_email || item.email || '',
    contact_phone: item.contact_phone || item.phone || '',
    website: item.website || '',
    sector: item.sector || '',
    region: item.region || '',

    outreach_direction: action === 'note' ? 'internal' : 'outbound',
    outreach_type:
      action === 'call'
        ? 'call'
        : action === 'note'
          ? 'internal_note'
          : 'email',
    status:
      action === 'call'
        ? 'called'
        : action === 'email'
          ? 'email_sent'
          : item.status || 'not_contacted',

    reason_for_approach: item.reason_for_approach || '',
    message_sent: action === 'email' ? item.message_sent || '' : '',
    linkedin_message_sent: '',
    call_notes: action === 'call' ? item.call_notes || '' : '',
    response_notes: item.response_notes || '',
    follow_up_date: item.follow_up_date || '',
  }))

  window.setTimeout(() => {
    document
      .getElementById('spec-add-employer-form')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 50)
}

async function draftSpeculativeEmailForEmployer(item: any) {
  if (!item?.employer_name) {
    alert('Employer name is missing.')
    return
  }

  setDraftingEmployerOutreachId(item.id)

  setSpecEmailModal({
    open: true,
    loading: true,
    saving: false,
    outreach: item,
    subject: '',
    body: '',
    linkedin_message: '',
    reason_for_approach: item.reason_for_approach || '',
    fit_summary: '',
    save_email: true,
    save_linkedin: false,
    save_reason: true,
    log_to_employer_activity: Boolean(item.lead_id || item.client_id),
    set_email_sent: false,
  })

  const res = await fetch('/api/crm/speculations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'generate_spec_outreach_message',
      speculation_id: speculation.id,
      outreach_id: item.id,
      opportunity_id: item.opportunity_id || null,
      message_type: 'email',
      tone: 'professional',
      persist_draft: false,

      extra_context: [
        item.reason_for_approach,
        item.call_notes,
        item.response_notes,
      ]
        .filter(Boolean)
        .join('\n\n'),

      employer: {
        company_name: item.employer_name || '',
        contact_name: item.contact_name || '',
        contact_title: item.contact_title || '',
        email: item.contact_email || item.email || '',
        website: item.website || '',
        sector: item.sector || '',
        region: item.region || '',
      },

      reason_for_approach: item.reason_for_approach || '',
    }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    alert(data?.error || 'Could not generate speculative email draft.')

    setSpecEmailModal(current => ({
      ...current,
      loading: false,
    }))

    setDraftingEmployerOutreachId(null)
    return
  }

  setSpecEmailModal(current => ({
    ...current,
    loading: false,
    subject: data.subject || '',
    body: data.body || '',
    linkedin_message: data.linkedin_message || '',
    reason_for_approach:
      data.reason_for_approach ||
      item.reason_for_approach ||
      '',
    fit_summary: data.fit_summary || '',
  }))

  setDraftingEmployerOutreachId(null)
}

async function saveSpecEmailModal() {
  if (!specEmailModal.outreach?.id) return

  setSpecEmailModal(current => ({
    ...current,
    saving: true,
  }))

  const res = await fetch('/api/crm/speculations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'save_generated_spec_outreach',
      speculation_id: speculation.id,
      outreach_id: specEmailModal.outreach.id,

      subject: specEmailModal.subject,
      email_body: specEmailModal.body,
      linkedin_message: specEmailModal.linkedin_message,
      reason_for_approach: specEmailModal.reason_for_approach,
      fit_summary: specEmailModal.fit_summary,

      save_email: specEmailModal.save_email,
      save_linkedin: specEmailModal.save_linkedin,
      save_reason: specEmailModal.save_reason,
      log_to_employer_activity: specEmailModal.log_to_employer_activity,
      set_email_sent: specEmailModal.set_email_sent,
    }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    alert(data?.error || 'Could not save speculative email draft.')

    setSpecEmailModal(current => ({
      ...current,
      saving: false,
    }))

    return
  }

  if (data.outreach) {
    setSpecOutreach((current: any[]) =>
      current.map((item: any) =>
        item.id === data.outreach.id ? data.outreach : item,
      ),
    )
  }

  if (data.note) {
    setSpeculationNotes(current => [data.note, ...current])
  }

  setSpecEmailModal({
    open: false,
    loading: false,
    saving: false,
    outreach: null,
    subject: '',
    body: '',
    linkedin_message: '',
    reason_for_approach: '',
    fit_summary: '',
    save_email: true,
    save_linkedin: false,
    save_reason: true,
    log_to_employer_activity: true,
    set_email_sent: false,
  })
}

function getEmployerLink(item: any) {
  if (item.client_id) return `/crm/clients/${item.client_id}`
  if (item.lead_id) return `/crm/leads/${item.lead_id}`
  return null
}

function toNumber(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const earthRadiusMiles = 3958.8
  const toRad = (value: number) => (value * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return earthRadiusMiles * c
}

function candidateName(candidate: any) {
  return (
    `${candidate?.first_name ?? ''} ${candidate?.last_name ?? ''}`.trim() ||
    'Candidate'
  )
}

function candidatePostcode(candidate: any) {
  return (
    candidate?.postcode ||
    candidate?.home_postcode ||
    candidate?.current_postcode ||
    ''
  )
}

function getCandidateSearchLocation() {
  return (
    candidate?.preferred_location ||
    candidate?.postcode ||
    candidate?.home_postcode ||
    candidate?.current_postcode ||
    ''
  )
}

function getLiveJobLocationPayload() {
  if (jobSearchScope === 'selected_regions') {
    return selectedJobRegions.join(', ')
  }

  if (jobSearchScope === 'candidate_area') {
    return getCandidateSearchLocation()
  }

  return 'United Kingdom'
}

function providerLocationLabel(provider: any) {
  return [
    provider.address_line_1,
    provider.town_city,
    provider.county,
    provider.postcode,
  ]
    .filter(Boolean)
    .join(', ')
}

function toggleSelectedStandard(standardId: string) {
  setSelectedStandardIds(current =>
    current.includes(standardId)
      ? current.filter(id => id !== standardId)
      : [...current, standardId],
  )
}

function getJobKey(job: any) {
  return [
    job.url || '',
    job.employer_name || '',
    job.job_title || '',
    job.location || '',
  ]
    .join('|')
    .toLowerCase()
}

function findSavedOpportunity(job: any) {
  const key = getJobKey(job)

  return savedOpportunities.find((opportunity: any) => {
    const opportunityKey = [
      opportunity.url || '',
      opportunity.employer_name || '',
      opportunity.job_title || '',
      opportunity.location || '',
    ]
      .join('|')
      .toLowerCase()

    return opportunityKey === key
  })
}

function findOutreachForOpportunity(opportunityId?: string | null) {
  if (!opportunityId) return null

  return (
    specOutreach.find(
      (item: any) => item.opportunity_id === opportunityId,
    ) ?? null
  )
}

async function saveLiveJobOpportunity(job: any) {
  const key = getJobKey(job)

  setSavingJobKey(key)

  const res = await fetch('/api/crm/speculations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'save_live_job_opportunity',
      speculation_id: speculation.id,
      job,
    }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    alert(data?.error || 'Could not save opportunity.')
    setSavingJobKey(null)
    return
  }

  if (data.opportunity) {
    setSavedOpportunities((current: any[]) => {
      const exists = current.some(
        (item: any) => item.id === data.opportunity.id,
      )

      return exists
        ? current.map((item: any) =>
            item.id === data.opportunity.id ? data.opportunity : item,
          )
        : [data.opportunity, ...current]
    })
  }
  
  if (data.outreach) {
  setSpecOutreach((current: any[]) => {
    const exists = current.some((item: any) => item.id === data.outreach.id)

    return exists
      ? current.map((item: any) =>
          item.id === data.outreach.id ? data.outreach : item,
        )
      : [data.outreach, ...current]
  })
}

  if (data.note) {
    setSpeculationNotes(current => [data.note, ...current])
  }

  setSavingJobKey(null)
}

async function convertOpportunityToLead(opportunityId: string) {
  setConvertingOpportunityId(opportunityId)

  const res = await fetch('/api/crm/speculations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'convert_opportunity_to_lead',
      speculation_id: speculation.id,
      opportunity_id: opportunityId,
    }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    alert(data?.error || 'Could not convert opportunity.')
    setConvertingOpportunityId(null)
    return
  }

  if (data.opportunity) {
    setSavedOpportunities((current: any[]) =>
      current.map((item: any) =>
        item.id === opportunityId ? data.opportunity : item,
      ),
    )
  }

  if (data.note) {
    setSpeculationNotes(current => [data.note, ...current])
  }

  if (data.client?.id) {
    window.location.href = `/crm/clients/${data.client.id}`
    return
  }

  if (data.lead?.id) {
    window.location.href = `/crm/leads/${data.lead.id}`
    return
  }

  setConvertingOpportunityId(null)
}

  async function generateSpeculationProfile() {
  setGeneratingProfile(true)

  const res = await fetch('/api/crm/speculations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'generate_profile',
      speculation_id: speculation.id,
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    alert(data.error || 'Could not generate speculation profile.')
    setGeneratingProfile(false)
    return
  }

  if (data.speculation) {
    setSpeculation(data.speculation)
  }

  if (data.note) {
    setSpeculationNotes(current => [data.note, ...current])
  }

  setGeneratingProfile(false)
}

  async function addNote() {
  if (!noteContent.trim()) return

  setAddingNote(true)

  const res = await fetch('/api/crm/speculations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'add_note',
      speculation_id: speculation.id,
      note_type: noteType,
      content: noteContent.trim(),
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    alert(data.error || 'Could not add note.')
    setAddingNote(false)
    return
  }

  if (data.note) {
    setSpeculationNotes(current => [data.note, ...current])
    setNoteContent('')
    setNoteType('note')
  }

  setAddingNote(false)
}

async function generateOpportunityOutreachDraft(opportunity: any) {
  if (!opportunity?.id) {
    alert('Save the opportunity first.')
    return
  }

  const existingOutreach = findOutreachForOpportunity(opportunity.id)

  setGeneratingOpportunityDraftId(opportunity.id)

  const res = await fetch('/api/crm/speculations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'generate_spec_outreach_message',
      speculation_id: speculation.id,
      opportunity_id: opportunity.id,
      outreach_id: existingOutreach?.id || null,
      message_type: 'email',
      tone: 'professional',
      persist_draft: true,

      employer: {
        company_name: opportunity.employer_name || '',
        job_title: opportunity.job_title || '',
        website: opportunity.url || '',
        sector: opportunity.job_type || '',
        region: opportunity.region || opportunity.location || '',
      },

      reason_for_approach:
        opportunity.match_summary ||
        opportunity.why_candidate_matches ||
        opportunity.notes ||
        '',
    }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    alert(data?.error || 'Could not generate anonymous email draft.')
    setGeneratingOpportunityDraftId(null)
    return
  }

  if (data.outreach) {
    setSpecOutreach((current: any[]) => {
      const exists = current.some((item: any) => item.id === data.outreach.id)

      return exists
        ? current.map((item: any) =>
            item.id === data.outreach.id ? data.outreach : item,
          )
        : [data.outreach, ...current]
    })
  }

  if (data.opportunity) {
    setSavedOpportunities((current: any[]) =>
      current.map((item: any) =>
        item.id === data.opportunity.id ? data.opportunity : item,
      ),
    )
  }

  if (data.note) {
    setSpeculationNotes(current => [data.note, ...current])
  }

  // Fallback if the saved job does not yet have an outreach row.
  if (!data.outreach) {
    setOutreachForm(current => ({
      ...current,
      source_type: 'manual',
      employer_name: opportunity.employer_name || current.employer_name,
      website: opportunity.url || current.website,
      sector: opportunity.job_type || current.sector,
      region: opportunity.region || opportunity.location || current.region,
      outreach_type: 'email',
      status: 'not_contacted',
      reason_for_approach:
        data.reason_for_approach ||
        opportunity.match_summary ||
        current.reason_for_approach,
      message_sent: [
        data.subject ? `Subject: ${data.subject}` : '',
        data.body || '',
      ]
        .filter(Boolean)
        .join('\n\n'),
    }))

    setAiOutreachDraft({
      subject: data.subject || '',
      body: data.body || '',
      linkedin_message: data.linkedin_message || '',
    })
  }

  setGeneratingOpportunityDraftId(null)
  setActiveTab('targets')
}

function selectedOutreachSource() {
  if (outreachForm.source_type === 'lead') {
    return leads.find((lead: any) => lead.id === outreachForm.linked_record_id)
  }

  if (outreachForm.source_type === 'client') {
    return clients.find((client: any) => client.id === outreachForm.linked_record_id)
  }

  return null
}

async function closeSpeculation() {
  const reason = window.prompt(
    'Close this speculation? Optional reason:',
    '',
  )

  if (reason === null) return

  const confirmed = window.confirm(
    'This will hide the speculation from the active speculation list and daily job-search reminders. Continue?',
  )

  if (!confirmed) return

  setClosingSpeculation(true)

  const res = await fetch('/api/crm/speculations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'close_speculation',
      speculation_id: speculation.id,
      reason: reason.trim(),
    }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    alert(data?.error || 'Could not close speculation.')
    setClosingSpeculation(false)
    return
  }

  if (data.speculation) {
    setSpeculation(data.speculation)
  }

  if (data.note) {
    setSpeculationNotes(current => [data.note, ...current])
  }

  setClosingSpeculation(false)
  window.location.href = '/crm/speculations'
}

async function reopenSpeculation() {
  const confirmed = window.confirm(
    'Reopen this speculation and show it in the active speculation list again?',
  )

  if (!confirmed) return

  setClosingSpeculation(true)

  const res = await fetch('/api/crm/speculations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'reopen_speculation',
      speculation_id: speculation.id,
    }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    alert(data?.error || 'Could not reopen speculation.')
    setClosingSpeculation(false)
    return
  }

  if (data.speculation) {
    setSpeculation(data.speculation)
  }

  if (data.note) {
    setSpeculationNotes(current => [data.note, ...current])
  }

  setClosingSpeculation(false)
}

async function generateOutreachDraft() {
  const linkedRecord = selectedOutreachSource()

  const employerName =
    linkedRecord?.company_name || outreachForm.employer_name.trim()

  if (!employerName) {
    alert('Select or enter an employer first.')
    return
  }

  setGeneratingOutreachDraft(true)
  setAiOutreachDraft(null)

  const res = await fetch('/api/crm/speculations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'generate_spec_outreach_message',
      speculation_id: speculation.id,
      message_type: aiOutreachType,
      tone: aiOutreachTone,
      extra_context: aiOutreachContext,

      employer: {
        company_name: employerName,
        contact_name:
          linkedRecord?.contact_name || outreachForm.contact_name || '',
        contact_title:
          linkedRecord?.contact_title || outreachForm.contact_title || '',
        email: linkedRecord?.email || outreachForm.contact_email || '',
        website: linkedRecord?.website || outreachForm.website || '',
        sector: linkedRecord?.sector || outreachForm.sector || '',
        region: linkedRecord?.region || outreachForm.region || '',
      },

      reason_for_approach: outreachForm.reason_for_approach,
    }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    alert(data?.error || 'Could not generate outreach draft.')
    setGeneratingOutreachDraft(false)
    return
  }

  setAiOutreachDraft({
    subject: data.subject || '',
    body: data.body || '',
    linkedin_message: data.linkedin_message || '',
  })

  setGeneratingOutreachDraft(false)
}

async function addOutreachRecord(e: React.FormEvent) {
  e.preventDefault()

  const linkedRecord = selectedOutreachSource()
  const employerName =
    linkedRecord?.company_name || outreachForm.employer_name.trim()

  if (!employerName) {
    alert('Employer name is required.')
    return
  }

  setAddingOutreach(true)

  const res = await fetch('/api/crm/speculations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'add_outreach',
      speculation_id: speculation.id,
      candidate_id: speculation.candidate_id,

      source_type: outreachForm.source_type,
      linked_record_id: outreachForm.linked_record_id,

      employer_name: employerName,
      contact_name: linkedRecord?.contact_name || outreachForm.contact_name,
      contact_title: linkedRecord?.contact_title || outreachForm.contact_title,
      contact_email: linkedRecord?.email || outreachForm.contact_email,
      contact_phone: linkedRecord?.phone || outreachForm.contact_phone,

      website: linkedRecord?.website || outreachForm.website,
      linkedin_company: linkedRecord?.linkedin_company || null,
      sector: linkedRecord?.sector || outreachForm.sector,
      region: linkedRecord?.region || outreachForm.region,

      address_line_1: linkedRecord?.main_office_address_line_1 || null,
      address_line_2: linkedRecord?.main_office_address_line_2 || null,
      town_city: linkedRecord?.main_office_town_city || null,
      county: linkedRecord?.main_office_county || null,
      postcode: linkedRecord?.main_office_postcode || null,
      lat: linkedRecord?.main_office_lat || null,
      lng: linkedRecord?.main_office_lng || null,

      outreach_direction: outreachForm.outreach_direction,
      outreach_type: outreachForm.outreach_type,
      status: outreachForm.status,

      reason_for_approach: outreachForm.reason_for_approach,
      message_sent: outreachForm.message_sent,
      linkedin_message_sent: outreachForm.linkedin_message_sent,
      call_notes: outreachForm.call_notes,
      response_notes: outreachForm.response_notes,
      contacted_at: new Date().toISOString(),
      follow_up_date: outreachForm.follow_up_date || null,
    }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    alert(data?.error || 'Could not save outreach record.')
    setAddingOutreach(false)
    return
  }

  if (data.outreach) {
    setSpecOutreach((current: any[]) => [data.outreach, ...current])
  }

  if (data.note) {
    setSpeculationNotes(current => [data.note, ...current])
  }

  setOutreachForm({
    source_type: 'manual',
    linked_record_id: '',
    employer_name: '',
    contact_name: '',
    contact_title: '',
    contact_email: '',
    contact_phone: '',
    website: '',
    sector: '',
    region: '',
    outreach_direction: 'outbound',
    outreach_type: 'email',
    status: 'email_sent',
    reason_for_approach: '',
    message_sent: '',
    linkedin_message_sent: '',
    call_notes: '',
    response_notes: '',
    follow_up_date: '',
  })

  setAddingOutreach(false)
}

async function geocodeCandidatePostcode() {
  const postcode = candidatePostcode(candidate)

  if (!postcode) {
    alert('No candidate postcode found.')
    return
  }

  setGeocodingCandidate(true)

  try {
    const clean = postcode.replace(/\s/g, '').toUpperCase()
    const res = await fetch(`https://api.postcodes.io/postcodes/${clean}`)
    const data = await res.json()

    if (data.status === 200 && data.result) {
      setCandidateLocation({
        lat: data.result.latitude ?? null,
        lng: data.result.longitude ?? null,
        postcode,
      })
    } else {
      alert('Could not geocode candidate postcode.')
    }
  } catch {
    alert('Could not geocode candidate postcode.')
  }

  setGeocodingCandidate(false)
}

async function updateOutreachStatus(outreachId: string, status: string) {
  setUpdatingOutreachId(outreachId)

  const res = await fetch('/api/crm/speculations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'update_outreach_status',
      outreach_id: outreachId,
      status,
    }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    alert(data?.error || 'Could not update outreach.')
    setUpdatingOutreachId(null)
    return
  }

  if (data.outreach) {
    setSpecOutreach((current: any[]) =>
      current.map(item => (item.id === outreachId ? data.outreach : item)),
    )
  }

  setUpdatingOutreachId(null)
}

async function addTask() {
  if (!taskTitle.trim()) return

  setAddingTask(true)

  const res = await fetch('/api/crm/speculations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'add_task',
      speculation_id: speculation.id,
      title: taskTitle.trim(),
      description: taskDescription.trim(),
      due_date: taskDueDate || null,
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    alert(data.error || 'Could not add task.')
    setAddingTask(false)
    return
  }

  if (data.task) {
    setSpeculationTasks(current => [...current, data.task])
    setTaskTitle('')
    setTaskDescription('')
    setTaskDueDate('')
  }

  setAddingTask(false)
}

async function toggleTask(taskId: string, completed: boolean) {
  setUpdatingTaskId(taskId)

  const res = await fetch('/api/crm/speculations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'toggle_task',
      task_id: taskId,
      completed,
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    alert(data.error || 'Could not update task.')
    setUpdatingTaskId(null)
    return
  }

  if (data.task) {
    setSpeculationTasks(current =>
      current.map(task => (task.id === taskId ? data.task : task)),
    )
  }

  setUpdatingTaskId(null)
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text)
}

async function generateOutreach(targetId: string) {
  setGeneratingOutreachTargetId(targetId)
  setGeneratedOutreach(null)

  const res = await fetch('/api/crm/speculations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'generate_outreach',
      speculation_id: speculation.id,
      target_id: targetId,
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    alert(data.error || 'Could not generate outreach.')
    setGeneratingOutreachTargetId(null)
    return
  }

  async function createOutreachFollowUpTask() {
  if (!generatedOutreach) return

  setCreatingOutreachTask(true)

  const res = await fetch('/api/crm/speculations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'add_task',
      speculation_id: speculation.id,
      title: `Follow up ${generatedOutreach.employer_name}`,
      description: [
        'Follow up after speculative outreach.',
        generatedOutreach.email_subject
          ? `Email subject: ${generatedOutreach.email_subject}`
          : null,
        generatedOutreach.follow_up_message
          ? `Suggested follow-up: ${generatedOutreach.follow_up_message}`
          : null,
      ]
        .filter(Boolean)
        .join('\n\n'),
      due_date: outreachFollowUpDate || getDefaultFollowUpDate(3),
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    alert(data.error || 'Could not create follow-up task.')
    setCreatingOutreachTask(false)
    return
  }

  if (data.task) {
    setSpeculationTasks(current => [...current, data.task])
  }

  setCreatingOutreachTask(false)
  alert('Follow-up task created.')
}

  if (data.outreach) {
  setGeneratedOutreach(data.outreach)
  setOutreachFollowUpDate(getDefaultFollowUpDate(3))
}

  if (data.target) {
    setSpeculationTargets(current =>
      current.map(target =>
        target.id === targetId ? data.target : target,
      ),
    )
  }

  if (data.note) {
    setSpeculationNotes(current => [data.note, ...current])
  }

  setGeneratingOutreachTargetId(null)
}

async function createOutreachFollowUpTask() {
  if (!generatedOutreach) return

  setCreatingOutreachTask(true)

  const res = await fetch('/api/crm/speculations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'add_task',
      speculation_id: speculation.id,
      title: `Follow up ${generatedOutreach.employer_name}`,
      description: [
        'Follow up after speculative outreach.',
        generatedOutreach.email_subject
          ? `Email subject: ${generatedOutreach.email_subject}`
          : null,
        generatedOutreach.follow_up_message
          ? `Suggested follow-up: ${generatedOutreach.follow_up_message}`
          : null,
      ]
        .filter(Boolean)
        .join('\n\n'),
      due_date: outreachFollowUpDate || getDefaultFollowUpDate(3),
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    alert(data.error || 'Could not create follow-up task.')
    setCreatingOutreachTask(false)
    return
  }

  if (data.task) {
    setSpeculationTasks(current => [...current, data.task])
  }

  setCreatingOutreachTask(false)
  alert('Follow-up task created.')
}

async function generateTargetEmployers() {
  setGeneratingTargets(true)
  setTargetSearchStrategy('')
  setSuggestedSearchQueries([])

  const res = await fetch('/api/crm/speculations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
  action: 'generate_targets',
  speculation_id: speculation.id,
  search_mode: searchMode,
  evidence_level: evidenceLevel,

  target_job_titles: splitCommaList(targetJobTitles),
  job_search_location: jobSearchLocation.trim(),
  job_search_keywords: jobSearchKeywords.trim(),
  job_search_notes: jobSearchNotes.trim(),

  selected_standard_ids: selectedStandardIds,
  selected_standard_names: selectedStandards.map(standard =>
    standard.standard_name || standard.title,
  ),
}),
  })

  const data = await res.json()

  if (!res.ok) {
    alert(data.error || 'Could not generate target employers.')
    setGeneratingTargets(false)
    return
  }

  if (Array.isArray(data.targets) && data.targets.length > 0) {
    setSpeculationTargets(current => [...data.targets, ...current])
  }

  if (data.note) {
    setSpeculationNotes(current => [data.note, ...current])
  }

  if (data.search_strategy) {
    setTargetSearchStrategy(data.search_strategy)
  }

  if (Array.isArray(data.suggested_search_queries)) {
    setSuggestedSearchQueries(data.suggested_search_queries)
  }

  if (!data.targets || data.targets.length === 0) {
    alert(data.message || 'No new target employers found.')
  }

  setGeneratingTargets(false)
}

async function addTargetEmployer() {
  if (!targetForm.employer_name.trim()) return

  setAddingTarget(true)

  const res = await fetch('/api/crm/speculations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'add_target',
      speculation_id: speculation.id,
      employer_name: targetForm.employer_name.trim(),
      website: targetForm.website.trim(),
      linkedin: targetForm.linkedin.trim(),
      sector: targetForm.sector.trim(),
      region: targetForm.region.trim(),
      fit_reason: targetForm.fit_reason.trim(),
      suggested_contact_title: targetForm.suggested_contact_title.trim(),
      approach_status: targetForm.approach_status,
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    alert(data.error || 'Could not add target employer.')
    setAddingTarget(false)
    return
  }

  if (data.target) {
    setSpeculationTargets(current => [data.target, ...current])
    setSpeculationNotes(current => [
      {
        id: `local-target-note-${Date.now()}`,
        note_type: 'note',
        content: `Target employer added: ${data.target.employer_name}.`,
        created_at: new Date().toISOString(),
      },
      ...current,
    ])

    setTargetForm({
      employer_name: '',
      website: '',
      linkedin: '',
      sector: '',
      region: '',
      fit_reason: '',
      suggested_contact_title: '',
      approach_status: 'not_contacted',
    })
  }

  setAddingTarget(false)
}

async function updateTargetStatus(targetId: string, approachStatus: string) {
  setUpdatingTargetId(targetId)

  const res = await fetch('/api/crm/speculations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'update_target_status',
      target_id: targetId,
      approach_status: approachStatus,
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    alert(data.error || 'Could not update target employer.')
    setUpdatingTargetId(null)
    return
  }

  if (data.target) {
    setSpeculationTargets(current =>
      current.map(target => (target.id === targetId ? data.target : target)),
    )
  }

  setUpdatingTargetId(null)
}

async function convertTargetToLead(targetId: string) {
  setConvertingTargetId(targetId)

  const res = await fetch('/api/crm/speculations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'convert_target_to_lead',
      speculation_id: speculation.id,
      target_id: targetId,
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    alert(data.error || 'Could not convert target employer.')
    setConvertingTargetId(null)
    return
  }

  if (data.target) {
    setSpeculationTargets(current =>
      current.map(target =>
        target.id === targetId ? data.target : target,
      ),
    )
  }

  if (data.note) {
    setSpeculationNotes(current => [data.note, ...current])
  }

  if (data.client?.id) {
    window.location.href = `/crm/clients/${data.client.id}`
    return
  }

  if (data.lead?.id) {
    window.location.href = `/crm/leads/${data.lead.id}`
    return
  }

  setConvertingTargetId(null)
}

  return (
    <div className="crm-page">
      <div className="crm-page-header">
        <div>
          <div className="crm-breadcrumb">
            <Link href="/crm/speculations" className="crm-breadcrumb-link">
              Speculation
            </Link>
            <span>/</span>
            <span>{speculation.speculation_ref}</span>
          </div>

          <h1 className="crm-page-title">
            {speculation.speculation_ref || 'Speculation'}
          </h1>

          <p className="crm-page-sub">
            {candidateName(candidate)}
            {candidate?.job_title ? ` · ${candidate.job_title}` : ''}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
  {candidate?.id && (
    <Link href={`/crm/candidates/${candidate.id}`} className="crm-btn-ghost">
      Open candidate
    </Link>
  )}

  {speculation.lifecycle_status === 'closed' ? (
    <button
      type="button"
      className="crm-btn-primary"
      onClick={reopenSpeculation}
      disabled={closingSpeculation}
    >
      {closingSpeculation ? 'Reopening...' : 'Reopen speculation'}
    </button>
  ) : (
    <button
      type="button"
      className="crm-btn-ghost"
      onClick={closeSpeculation}
      disabled={closingSpeculation}
      style={{
        borderColor: '#fecaca',
        color: '#dc2626',
        background: '#fff',
      }}
    >
      {closingSpeculation ? 'Closing...' : 'Close speculation'}
    </button>
  )}

  <span className="crm-badge crm-badge-blue">
    {String(speculation.status || 'draft').replace(/_/g, ' ')}
  </span>

  <span
    className="crm-badge"
    style={{
      background:
        speculation.lifecycle_status === 'closed' ? '#fef2f2' : '#e8f5e8',
      color:
        speculation.lifecycle_status === 'closed' ? '#dc2626' : '#217822',
    }}
  >
    {speculation.lifecycle_status === 'closed' ? 'Closed' : 'Open'}
  </span>
</div>
      </div>

      <div className="crm-tabs">
        {[
  { id: 'overview', label: '◈ Overview' },
  { id: 'profile', label: '📄 Candidate profile' },
  { id: 'targets', label: `Employers contacted (${specOutreach.length})` },
  { id: 'nearby', label: `📍 Nearby providers (${nearbyProviderRows.length})` },
  { id: 'notes', label: `📝 Notes (${speculationNotes.length})` },
  { id: 'tasks', label: `✅ Tasks (${speculationTasks.length})` },
  { id: 'jobs', label: `🔍 Live jobs (${liveJobs.length})` },
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
  <div style={{ display: 'grid', gridTemplateColumns: '430px 1fr', gap: 16 }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="crm-card">
        <h2 className="crm-card-title" style={{ marginBottom: 14 }}>
          Candidate
        </h2>

        <div className="crm-detail-list">
          <DetailRow label="Name">{candidateName(candidate)}</DetailRow>
          <DetailRow label="Current role">{candidate?.job_title || '—'}</DetailRow>
          <DetailRow label="Email">{candidate?.email || '—'}</DetailRow>
          <DetailRow label="Phone">{candidate?.phone || '—'}</DetailRow>
          <DetailRow label="Postcode">{candidate?.postcode || '—'}</DetailRow>
          <DetailRow label="Documents">{documents.length}</DetailRow>
          <DetailRow label="Activity notes">{activities.length}</DetailRow>
        </div>
      </div>

      <CandidateCvPreview
        document={candidateCvDocument}
        fileKind={candidateCvFileKind}
      />
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="crm-card">
        <h2 className="crm-card-title" style={{ marginBottom: 14 }}>
          Speculation summary
        </h2>

        <div className="crm-detail-list">
          <DetailRow label="Status">
            {String(speculation.status || 'draft').replace(/_/g, ' ')}
          </DetailRow>
          <DetailRow label="Target role">{speculation.target_role || '—'}</DetailRow>
          <DetailRow label="Target sector">{speculation.target_sector || '—'}</DetailRow>
          <DetailRow label="Consent confirmed">
            {speculation.consent_confirmed ? 'Yes' : 'No'}
          </DetailRow>
          <DetailRow label="AI generated">
            {speculation.ai_generated ? 'Yes' : 'No'}
          </DetailRow>
          <DetailRow label="Created">{formatDate(speculation.created_at)}</DetailRow>
          <DetailRow label="Updated">{formatDate(speculation.updated_at)}</DetailRow>
        </div>
      </div>

      <div className="crm-card">
        <h2 className="crm-card-title" style={{ marginBottom: 10 }}>
          What this page is for
        </h2>

        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: 'var(--text-muted)',
            lineHeight: 1.7,
          }}
        >
          Use this speculation record to review the candidate, generate a profile,
          search for live matching jobs, save target employers, add notes and
          create follow-up tasks.
        </p>

        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            marginTop: 14,
          }}
        >
          <button
            type="button"
            className="crm-btn-ai crm-btn-sm"
            onClick={generateSpeculationProfile}
            disabled={generatingProfile}
          >
            {generatingProfile ? '✦ Generating...' : '✦ Generate profile'}
          </button>

          <button
            type="button"
            className="crm-btn-primary crm-btn-sm"
            onClick={() => setActiveTab('jobs')}
          >
            Search live jobs →
          </button>

          <button
            type="button"
            className="crm-btn-ghost crm-btn-sm"
            onClick={() => setActiveTab('targets')}
          >
            Target employers
          </button>
        </div>
      </div>

      {speculation.profile_summary && (
        <div className="crm-card">
          <h2 className="crm-card-title" style={{ marginBottom: 10 }}>
            Candidate market summary
          </h2>

          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.7,
              color: 'var(--text-dark)',
            }}
          >
            {speculation.profile_summary}
          </p>
        </div>
      )}
    </div>
  </div>
)}

      {activeTab === 'profile' && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div
      className="crm-card"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 14,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <div>
        <h2 className="crm-card-title">AI speculation profile</h2>
        <p
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            marginTop: 4,
            lineHeight: 1.5,
          }}
        >
          Generate an internal recruitment profile and an anonymous employer-facing profile from the candidate CV, notes and activity.
        </p>
      </div>

      <button
        type="button"
        className="crm-btn-ai"
        onClick={generateSpeculationProfile}
        disabled={generatingProfile}
      >
        {generatingProfile ? '✦ Generating...' : '✦ Generate Spec Profile'}
      </button>
    </div>

    {speculation.profile_summary && (
      <div className="crm-card">
        <h2 className="crm-card-title" style={{ marginBottom: 10 }}>
          Profile summary
        </h2>

        <p
          style={{
            fontSize: 14,
            lineHeight: 1.7,
            color: 'var(--text-dark)',
          }}
        >
          {speculation.profile_summary}
        </p>
      </div>
    )}

    {Array.isArray(speculation.key_selling_points) &&
      speculation.key_selling_points.length > 0 && (
        <div className="crm-card">
          <h2 className="crm-card-title" style={{ marginBottom: 10 }}>
            Key selling points
          </h2>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {speculation.key_selling_points.map((point: string) => (
              <span key={point} className="crm-badge crm-badge-blue">
                {point}
              </span>
            ))}
          </div>
        </div>
      )}

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
          <h2 className="crm-card-title">Internal candidate profile</h2>

          {speculation.ai_generated && (
            <span className="crm-badge crm-badge-blue">AI generated</span>
          )}
        </div>

        <div
          style={{
            whiteSpace: 'pre-wrap',
            fontSize: 13,
            lineHeight: 1.7,
            color: 'var(--text-dark)',
          }}
        >
          {speculation.candidate_profile ||
            'No internal candidate profile generated yet.'}
        </div>
      </div>

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
          <h2 className="crm-card-title">Anonymous employer profile</h2>

          {speculation.ai_generated && (
            <span className="crm-badge" style={{ background: '#e8f5e8', color: '#217822' }}>
              Ready to send
            </span>
          )}
        </div>

        <div
          style={{
            whiteSpace: 'pre-wrap',
            fontSize: 13,
            lineHeight: 1.7,
            color: 'var(--text-dark)',
          }}
        >
          {speculation.anonymous_profile ||
            'No anonymous profile generated yet.'}
        </div>
      </div>
    </div>

    <div className="crm-card">
      <h2 className="crm-card-title" style={{ marginBottom: 10 }}>
        Candidate requirements
      </h2>

      <div
        style={{
          whiteSpace: 'pre-wrap',
          fontSize: 13,
          lineHeight: 1.7,
          color: 'var(--text-dark)',
        }}
      >
        {speculation.candidate_requirements ||
          'No candidate requirements recorded yet.'}
      </div>
    </div>
  </div>
)}

    {activeTab === 'targets' && (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      maxWidth: 1120,
      margin: '0 auto',
    }}
  >
    <div
      className="crm-card"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 14,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <div>
        <h2 className="crm-card-title">Employers contacted</h2>
        <p
          style={{
            margin: 0,
            marginTop: 4,
            fontSize: 12,
            color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}
        >
          Track saved live jobs, employer approaches, messages, calls and follow-ups.
        </p>
      </div>

      <button
        type="button"
        className="crm-btn-primary crm-btn-sm"
        onClick={() => setShowAddEmployerForm(current => !current)}
      >
        {showAddEmployerForm ? 'Hide form' : '+ Add employer contact'}
      </button>
    </div>

    {showAddEmployerForm && (
  <div id="spec-add-employer-form" className="crm-card">
        <h2 className="crm-card-title" style={{ marginBottom: 6 }}>
          Add employer contact
        </h2>

      <p
        style={{
          margin: 0,
          marginBottom: 14,
          fontSize: 12,
          color: 'var(--text-muted)',
          lineHeight: 1.6,
        }}
      >
        Record who you have approached for this candidate, what was sent, the
        response and any follow-up needed.
      </p>

      <form onSubmit={addOutreachRecord}>
        <div className="crm-form-row">
          <div className="crm-field">
            <label className="crm-label">Source</label>
            <select
              className="crm-select"
              value={outreachForm.source_type}
              onChange={event =>
                setOutreachForm(current => ({
                  ...current,
                  source_type: event.target.value,
                  linked_record_id: '',
                  employer_name: '',
                  contact_name: '',
                  contact_title: '',
                  contact_email: '',
                  contact_phone: '',
                  website: '',
                  sector: '',
                  region: '',
                }))
              }
            >
              <option value="manual">Manual employer</option>
              <option value="lead">Existing lead</option>
              <option value="client">Existing client</option>
            </select>
          </div>

          <div className="crm-field">
            <label className="crm-label">Direction</label>
            <select
              className="crm-select"
              value={outreachForm.outreach_direction}
              onChange={event =>
                setOutreachForm(current => ({
                  ...current,
                  outreach_direction: event.target.value,
                }))
              }
            >
              <option value="outbound">Outbound</option>
              <option value="inbound">Inbound</option>
              <option value="internal">Internal note</option>
            </select>
          </div>
        </div>

        {outreachForm.source_type === 'lead' && (
          <div className="crm-field" style={{ marginBottom: 12 }}>
            <label className="crm-label">Select lead</label>
            <select
              className="crm-select"
              value={outreachForm.linked_record_id}
              onChange={event =>
                setOutreachForm(current => ({
                  ...current,
                  linked_record_id: event.target.value,
                }))
              }
            >
              <option value="">Select lead...</option>
              {leads.map((lead: any) => (
                <option key={lead.id} value={lead.id}>
                  {lead.company_name}
                  {lead.region ? ` — ${lead.region}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {outreachForm.source_type === 'client' && (
          <div className="crm-field" style={{ marginBottom: 12 }}>
            <label className="crm-label">Select client</label>
            <select
              className="crm-select"
              value={outreachForm.linked_record_id}
              onChange={event =>
                setOutreachForm(current => ({
                  ...current,
                  linked_record_id: event.target.value,
                }))
              }
            >
              <option value="">Select client...</option>
              {clients.map((client: any) => (
                <option key={client.id} value={client.id}>
                  {client.company_name}
                  {client.region ? ` — ${client.region}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {outreachForm.source_type === 'manual' && (
          <>
            <div className="crm-field" style={{ marginBottom: 12 }}>
              <label className="crm-label">Employer name *</label>
              <input
                className="crm-input"
                value={outreachForm.employer_name}
                onChange={event =>
                  setOutreachForm(current => ({
                    ...current,
                    employer_name: event.target.value,
                  }))
                }
                placeholder="e.g. ABC Training"
              />
            </div>

            <div className="crm-form-row">
              <div className="crm-field">
                <label className="crm-label">Contact name</label>
                <input
                  className="crm-input"
                  value={outreachForm.contact_name}
                  onChange={event =>
                    setOutreachForm(current => ({
                      ...current,
                      contact_name: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="crm-field">
                <label className="crm-label">Contact title</label>
                <input
                  className="crm-input"
                  value={outreachForm.contact_title}
                  onChange={event =>
                    setOutreachForm(current => ({
                      ...current,
                      contact_title: event.target.value,
                    }))
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
                  value={outreachForm.contact_email}
                  onChange={event =>
                    setOutreachForm(current => ({
                      ...current,
                      contact_email: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="crm-field">
                <label className="crm-label">Phone</label>
                <input
                  className="crm-input"
                  value={outreachForm.contact_phone}
                  onChange={event =>
                    setOutreachForm(current => ({
                      ...current,
                      contact_phone: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="crm-form-row">
              <div className="crm-field">
                <label className="crm-label">Website</label>
                <input
                  className="crm-input"
                  value={outreachForm.website}
                  onChange={event =>
                    setOutreachForm(current => ({
                      ...current,
                      website: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="crm-field">
                <label className="crm-label">Region</label>
                <input
                  className="crm-input"
                  value={outreachForm.region}
                  onChange={event =>
                    setOutreachForm(current => ({
                      ...current,
                      region: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="crm-field" style={{ marginBottom: 12 }}>
              <label className="crm-label">Sector</label>
              <input
                className="crm-input"
                value={outreachForm.sector}
                onChange={event =>
                  setOutreachForm(current => ({
                    ...current,
                    sector: event.target.value,
                  }))
                }
              />
            </div>
          </>
        )}

        <div
  style={{
    marginTop: 14,
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    background: 'var(--primary-light)',
    border: '1px solid rgba(53,45,235,0.16)',
  }}
>
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      gap: 10,
      alignItems: 'flex-start',
      marginBottom: 10,
    }}
  >
    <div>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 900,
          color: 'var(--primary)',
        }}
      >
        ✦ AI outreach draft
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
        Draft an email or LinkedIn message using the candidate profile and this
        employer.
      </p>
    </div>
  </div>

  <div className="crm-form-row">
    <div className="crm-field">
      <label className="crm-label">Draft type</label>
      <select
        className="crm-select"
        value={aiOutreachType}
        onChange={event =>
          setAiOutreachType(event.target.value as 'email' | 'linkedin')
        }
      >
        <option value="email">Email</option>
        <option value="linkedin">LinkedIn</option>
      </select>
    </div>

    <div className="crm-field">
      <label className="crm-label">Tone</label>
      <select
        className="crm-select"
        value={aiOutreachTone}
        onChange={event => setAiOutreachTone(event.target.value)}
      >
        <option value="professional">Professional</option>
        <option value="warm">Warm</option>
        <option value="direct">Direct</option>
        <option value="consultative">Consultative</option>
      </select>
    </div>
  </div>

  <div className="crm-field" style={{ marginBottom: 10 }}>
    <label className="crm-label">Extra context</label>
    <textarea
      className="crm-input"
      rows={2}
      value={aiOutreachContext}
      onChange={event => setAiOutreachContext(event.target.value)}
      placeholder="e.g. Mention they are local, immediate start, strong apprenticeship background..."
    />
  </div>

  <button
    type="button"
    className="crm-btn-ai crm-btn-sm"
    onClick={generateOutreachDraft}
    disabled={generatingOutreachDraft}
    style={{ width: '100%', justifyContent: 'center' }}
  >
    {generatingOutreachDraft
      ? '✦ Drafting...'
      : `✦ Draft ${aiOutreachType === 'email' ? 'email' : 'LinkedIn message'}`}
  </button>

  {aiOutreachDraft && (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        borderRadius: 12,
        background: '#fff',
        border: '1px solid var(--border-light)',
      }}
    >
      {aiOutreachType === 'email' && aiOutreachDraft.subject && (
        <div style={{ marginBottom: 10 }}>
          <p className="crm-label">Subject</p>
          <input
            className="crm-input"
            value={aiOutreachDraft.subject}
            onChange={event =>
              setAiOutreachDraft(current =>
                current
                  ? { ...current, subject: event.target.value }
                  : current,
              )
            }
          />
        </div>
      )}

      <div className="crm-field">
        <label className="crm-label">
          {aiOutreachType === 'email' ? 'Email draft' : 'LinkedIn draft'}
        </label>
        <textarea
          className="crm-input"
          rows={aiOutreachType === 'email' ? 8 : 5}
          value={
            aiOutreachType === 'email'
              ? aiOutreachDraft.body
              : aiOutreachDraft.linkedin_message
          }
          onChange={event =>
            setAiOutreachDraft(current => {
              if (!current) return current

              return aiOutreachType === 'email'
                ? { ...current, body: event.target.value }
                : { ...current, linkedin_message: event.target.value }
            })
          }
        />
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'flex-end',
          marginTop: 10,
          flexWrap: 'wrap',
        }}
      >
        {aiOutreachType === 'email' && (
          <button
            type="button"
            className="crm-btn-primary crm-btn-sm"
            onClick={() =>
              setOutreachForm(current => ({
                ...current,
                outreach_type: 'email',
                status: 'email_sent',
                message_sent: [
                  aiOutreachDraft.subject
                    ? `Subject: ${aiOutreachDraft.subject}`
                    : '',
                  aiOutreachDraft.body,
                ]
                  .filter(Boolean)
                  .join('\n\n'),
              }))
            }
          >
            Use email draft
          </button>
        )}

        {aiOutreachType === 'linkedin' && (
          <button
            type="button"
            className="crm-btn-primary crm-btn-sm"
            onClick={() =>
              setOutreachForm(current => ({
                ...current,
                outreach_type: 'linkedin',
                status: 'linkedin_sent',
                linkedin_message_sent: aiOutreachDraft.linkedin_message,
              }))
            }
          >
            Use LinkedIn draft
          </button>
        )}
      </div>
    </div>
  )}
</div>
        
        <div className="crm-form-row">
          <div className="crm-field">
            <label className="crm-label">Method</label>
            <select
              className="crm-select"
              value={outreachForm.outreach_type}
              onChange={event =>
                setOutreachForm(current => ({
                  ...current,
                  outreach_type: event.target.value,
                }))
              }
            >
              {OUTREACH_TYPES.map(type => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="crm-field">
            <label className="crm-label">Status</label>
            <select
              className="crm-select"
              value={outreachForm.status}
              onChange={event =>
                setOutreachForm(current => ({
                  ...current,
                  status: event.target.value,
                }))
              }
            >
              {OUTREACH_STATUSES.map(status => (
                <option key={status.id} value={status.id}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="crm-field" style={{ marginBottom: 12 }}>
          <label className="crm-label">Reason for approach</label>
          <textarea
            className="crm-input"
            rows={3}
            value={outreachForm.reason_for_approach}
            onChange={event =>
              setOutreachForm(current => ({
                ...current,
                reason_for_approach: event.target.value,
              }))
            }
            placeholder="Why are we approaching this employer for this candidate?"
          />
        </div>

        <div className="crm-field" style={{ marginBottom: 12 }}>
          <label className="crm-label">Email / message sent</label>
          <textarea
            className="crm-input"
            rows={4}
            value={outreachForm.message_sent}
            onChange={event =>
              setOutreachForm(current => ({
                ...current,
                message_sent: event.target.value,
              }))
            }
            placeholder="Paste the email, SMS or message sent..."
          />
        </div>

        <div className="crm-field" style={{ marginBottom: 12 }}>
          <label className="crm-label">LinkedIn message sent</label>
          <textarea
            className="crm-input"
            rows={3}
            value={outreachForm.linkedin_message_sent}
            onChange={event =>
              setOutreachForm(current => ({
                ...current,
                linkedin_message_sent: event.target.value,
              }))
            }
            placeholder="Paste LinkedIn message if used..."
          />
        </div>

        <div className="crm-field" style={{ marginBottom: 12 }}>
          <label className="crm-label">Call / discussion notes</label>
          <textarea
            className="crm-input"
            rows={3}
            value={outreachForm.call_notes}
            onChange={event =>
              setOutreachForm(current => ({
                ...current,
                call_notes: event.target.value,
              }))
            }
            placeholder="What was discussed?"
          />
        </div>

        <div className="crm-field" style={{ marginBottom: 12 }}>
          <label className="crm-label">Response / outcome notes</label>
          <textarea
            className="crm-input"
            rows={3}
            value={outreachForm.response_notes}
            onChange={event =>
              setOutreachForm(current => ({
                ...current,
                response_notes: event.target.value,
              }))
            }
            placeholder="What came back? Interested, no roles, follow-up later..."
          />
        </div>

        <div className="crm-field" style={{ marginBottom: 14 }}>
          <label className="crm-label">Follow-up date</label>
          <input
            className="crm-input"
            type="date"
            value={outreachForm.follow_up_date}
            onChange={event =>
              setOutreachForm(current => ({
                ...current,
                follow_up_date: event.target.value,
              }))
            }
          />
        </div>

                <button
          type="submit"
          className="crm-btn-primary"
          disabled={
            addingOutreach ||
            (outreachForm.source_type === 'manual' &&
              !outreachForm.employer_name.trim()) ||
            (outreachForm.source_type !== 'manual' &&
              !outreachForm.linked_record_id)
          }
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {addingOutreach ? 'Saving...' : '+ Log employer contact'}
        </button>
      </form>
    </div>
    )}

    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
            <h2 className="crm-card-title">Employers contacted</h2>
            <p
              style={{
                margin: 0,
                marginTop: 3,
                fontSize: 12,
                color: 'var(--text-muted)',
              }}
            >
              Full record of who has been approached for this candidate.
            </p>
          </div>

          <span className="crm-badge crm-badge-blue">
            {specOutreach.length}
          </span>
        </div>

        {specOutreach.length === 0 && (
          <p className="crm-empty">
            No employers contacted yet. Log your first approach on the left.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {specOutreach.map((item: any) => {
            const statusLabel =
              OUTREACH_STATUSES.find(status => status.id === item.status)?.label ||
              String(item.status || 'not contacted').replace(/_/g, ' ')

            const typeLabel =
              OUTREACH_TYPES.find(type => type.id === item.outreach_type)?.label ||
              String(item.outreach_type || 'email').replace(/_/g, ' ')
            
            const employerLink = getEmployerLink(item)

            return (
              <article
                key={item.id}
                style={{
                  border: '1px solid var(--border-light)',
                  borderRadius: 16,
                  padding: 16,
                  background: '#fff',
                  boxShadow: '0 10px 24px rgba(15,23,42,0.05)',
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
                  <div>
                   {employerLink ? (
  <Link
    href={employerLink}
    style={{
      display: 'inline-flex',
      margin: 0,
      fontSize: 16,
      fontWeight: 900,
      color: 'var(--primary)',
      textDecoration: 'none',
    }}
  >
    {item.employer_name} →
  </Link>
) : (
  <button
    type="button"
    onClick={() => {
      setShowAddEmployerForm(true)
      setOutreachForm(current => ({
        ...current,
        source_type: 'manual',
        linked_record_id: '',
        employer_name: item.employer_name || '',
        contact_name: item.contact_name || '',
        contact_title: item.contact_title || '',
        contact_email: item.contact_email || '',
        contact_phone: item.contact_phone || '',
        website: item.website || '',
        sector: item.sector || '',
        region: item.region || '',
        outreach_direction: item.outreach_direction || 'outbound',
        outreach_type: item.outreach_type || 'email',
        status: item.status || 'not_contacted',
        reason_for_approach: item.reason_for_approach || '',
        message_sent: item.message_sent || '',
        linkedin_message_sent: item.linkedin_message_sent || '',
        call_notes: item.call_notes || '',
        response_notes: item.response_notes || '',
        follow_up_date: item.follow_up_date || '',
      }))
    }}
    style={{
      display: 'inline-flex',
      margin: 0,
      padding: 0,
      border: 0,
      background: 'transparent',
      fontSize: 16,
      fontWeight: 900,
      color: 'var(--text-dark)',
      cursor: 'pointer',
      textAlign: 'left',
    }}
  >
    {item.employer_name}
  </button>
)}

                    <p
                      style={{
                        margin: 0,
                        marginTop: 4,
                        fontSize: 12,
                        color: 'var(--text-muted)',
                        lineHeight: 1.5,
                      }}
                    >
                      {[
                        item.contact_name,
                        item.contact_title,
                        item.region,
                        item.postcode,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'No contact/location details recorded'}
                    </p>
                  </div>

                  <select
                    className="crm-select crm-select-sm"
                    value={item.status || 'not_contacted'}
                    onChange={event =>
                      updateOutreachStatus(item.id, event.target.value)
                    }
                    disabled={updatingOutreachId === item.id}
                    style={{ minWidth: 170 }}
                  >
                    {OUTREACH_STATUSES.map(status => (
                      <option key={status.id} value={status.id}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    flexWrap: 'wrap',
                    marginTop: 10,
                  }}
                >
                  <div
  style={{
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 12,
  }}
>
  <button
    type="button"
    className="crm-btn-ghost crm-btn-sm"
    onClick={() => openEmployerActionForm(item, 'call')}
  >
    Log call
  </button>

  <button
    type="button"
    className="crm-btn-ghost crm-btn-sm"
    onClick={() => openEmployerActionForm(item, 'note')}
  >
    Add note
  </button>

  <button
    type="button"
    className="crm-btn-ai crm-btn-sm"
    onClick={() => draftSpeculativeEmailForEmployer(item)}
    disabled={draftingEmployerOutreachId === item.id}
  >
    {draftingEmployerOutreachId === item.id
      ? 'Drafting...'
      : 'Draft spec email'}
  </button>
</div>
                  <span
                    className="crm-badge"
                    style={{
                      background:
                        item.outreach_direction === 'inbound'
                          ? '#e0f0fb'
                          : item.outreach_direction === 'internal'
                            ? '#f0f0f2'
                            : '#e8f5e8',
                      color:
                        item.outreach_direction === 'inbound'
                          ? '#0B72B8'
                          : item.outreach_direction === 'internal'
                            ? '#737373'
                            : '#217822',
                    }}
                  >
                    {String(item.outreach_direction || 'outbound').replace(
                      /_/g,
                      ' ',
                    )}
                  </span>

                  <span
                    className="crm-badge"
                    style={{ background: '#f3f0ff', color: '#7c3aed' }}
                  >
                    {typeLabel}
                  </span>

                  <span
                    className="crm-badge"
                    style={{ background: '#fffbeb', color: '#d97706' }}
                  >
                    {statusLabel}
                  </span>

                  {item.follow_up_date && (
                    <span className="crm-badge crm-badge-blue">
                      Follow-up {formatDate(item.follow_up_date)}
                    </span>
                  )}

                  {item.lead_id && (
                    <Link
                      href={`/crm/leads/${item.lead_id}`}
                      className="crm-badge"
                      style={{
                        background: 'var(--primary-light)',
                        color: 'var(--primary)',
                        textDecoration: 'none',
                      }}
                    >
                      Open lead →
                    </Link>
                  )}

                  {item.client_id && (
                    <Link
                      href={`/crm/clients/${item.client_id}`}
                      className="crm-badge"
                      style={{
                        background: 'var(--primary-light)',
                        color: 'var(--primary)',
                        textDecoration: 'none',
                      }}
                    >
                      Open client →
                    </Link>
                  )}

                  {item.website && (
                    <a
                      href={item.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="crm-badge"
                      style={{
                        background: '#f0f0f2',
                        color: '#737373',
                        textDecoration: 'none',
                      }}
                    >
                      Website ↗
                    </a>
                  )}
                </div>

                {item.reason_for_approach && (
                  <div style={{ marginTop: 12 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        fontWeight: 900,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      Reason for approach
                    </p>
                    <p
                      style={{
                        margin: 0,
                        marginTop: 4,
                        fontSize: 13,
                        color: 'var(--text-dark)',
                        lineHeight: 1.6,
                      }}
                    >
                      {item.reason_for_approach}
                    </p>
                  </div>
                )}

                {item.message_sent && (
                  <details style={{ marginTop: 12 }}>
                    <summary
                      style={{
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 900,
                        color: 'var(--primary)',
                      }}
                    >
                      View message sent
                    </summary>
                    <pre
                      style={{
                        marginTop: 8,
                        whiteSpace: 'pre-wrap',
                        background: 'var(--light-bg)',
                        border: '1px solid var(--border-light)',
                        borderRadius: 12,
                        padding: 12,
                        fontSize: 12,
                        lineHeight: 1.6,
                        color: 'var(--text-dark)',
                        fontFamily: 'inherit',
                      }}
                    >
                      {item.message_sent}
                    </pre>
                  </details>
                )}

                {item.linkedin_message_sent && (
                  <details style={{ marginTop: 12 }}>
                    <summary
                      style={{
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 900,
                        color: 'var(--primary)',
                      }}
                    >
                      View LinkedIn message
                    </summary>
                    <pre
                      style={{
                        marginTop: 8,
                        whiteSpace: 'pre-wrap',
                        background: 'var(--light-bg)',
                        border: '1px solid var(--border-light)',
                        borderRadius: 12,
                        padding: 12,
                        fontSize: 12,
                        lineHeight: 1.6,
                        color: 'var(--text-dark)',
                        fontFamily: 'inherit',
                      }}
                    >
                      {item.linkedin_message_sent}
                    </pre>
                  </details>
                )}

                {(item.call_notes || item.response_notes || item.outcome_notes) && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 12,
                      background: 'var(--light-bg)',
                      border: '1px solid var(--border-light)',
                    }}
                  >
                    {item.call_notes && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          color: 'var(--text-dark)',
                          lineHeight: 1.6,
                        }}
                      >
                        <strong>Discussion:</strong> {item.call_notes}
                      </p>
                    )}

                    {item.response_notes && (
                      <p
                        style={{
                          margin: item.call_notes ? '8px 0 0' : 0,
                          fontSize: 13,
                          color: 'var(--text-dark)',
                          lineHeight: 1.6,
                        }}
                      >
                        <strong>Response:</strong> {item.response_notes}
                      </p>
                    )}

                    {item.outcome_notes && (
                      <p
                        style={{
                          margin:
                            item.call_notes || item.response_notes
                              ? '8px 0 0'
                              : 0,
                          fontSize: 13,
                          color: 'var(--text-dark)',
                          lineHeight: 1.6,
                        }}
                      >
                        <strong>Outcome:</strong> {item.outcome_notes}
                      </p>
                    )}
                  </div>
                )}

                <p
                  style={{
                    margin: 0,
                    marginTop: 12,
                    fontSize: 11,
                    color: 'var(--text-muted)',
                  }}
                >
                  Logged {formatDate(item.created_at)}
                  {item.contacted_at ? ` · Contacted ${formatDate(item.contacted_at)}` : ''}
                </p>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  </div>
)}

{activeTab === 'nearby' && (
  <div className="crm-card">
    <div
      style={{
        display: 'flex',
        gap: 12,
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 14,
      }}
    >
      <div>
        <h2 className="crm-card-title">Nearby providers</h2>
        <p
          style={{
            margin: 0,
            marginTop: 3,
            fontSize: 12,
            color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}
        >
          Finds leads, clients and provider sites within range of{' '}
          {candidateName(candidate)}.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          className="crm-select crm-select-sm"
          value={providerRadius}
          onChange={event => setProviderRadius(event.target.value)}
        >
          <option value="10">10 miles</option>
          <option value="25">25 miles</option>
          <option value="50">50 miles</option>
          <option value="75">75 miles</option>
          <option value="100">100 miles</option>
        </select>

        <button
          type="button"
          className="crm-btn-primary crm-btn-sm"
          onClick={geocodeCandidatePostcode}
          disabled={geocodingCandidate}
        >
          {geocodingCandidate ? 'Checking...' : 'Use candidate postcode'}
        </button>
      </div>
    </div>

    <div
      style={{
        padding: 12,
        borderRadius: 14,
        background: 'var(--light-bg)',
        border: '1px solid var(--border-light)',
        marginBottom: 14,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 900,
          color: 'var(--text-dark)',
        }}
      >
        Candidate location
      </p>

      <p
        style={{
          margin: 0,
          marginTop: 4,
          fontSize: 12,
          color: 'var(--text-muted)',
        }}
      >
        Postcode: {candidateLocation.postcode || 'Not recorded'} ·{' '}
        {candidateLocation.lat && candidateLocation.lng
          ? 'Location ready'
          : 'Click “Use candidate postcode” to calculate distance'}
      </p>
    </div>

    {!candidateLocation.lat || !candidateLocation.lng ? (
      <p className="crm-empty">
        Candidate location is needed before nearby providers can be calculated.
      </p>
    ) : nearbyProviderRows.length === 0 ? (
      <p className="crm-empty">
        No providers found within {providerRadius} miles. Try increasing the
        radius or adding more postcodes to leads/clients.
      </p>
    ) : (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 12,
        }}
      >
        {nearbyProviderRows.map((provider: any) => (
          <article
            key={provider.id}
            style={{
              border: '1px solid var(--border-light)',
              borderRadius: 16,
              padding: 16,
              background: '#fff',
              boxShadow: '0 10px 24px rgba(15,23,42,0.05)',
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
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 900,
                    color: 'var(--text-dark)',
                  }}
                >
                  {provider.company_name}
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
                  {provider.site_name} · {providerLocationLabel(provider) || 'Address not recorded'}
                </p>
              </div>

              <span
                className="crm-badge"
                style={{
                  background: '#e8f5e8',
                  color: '#217822',
                  whiteSpace: 'nowrap',
                }}
              >
                {provider.distance_miles.toFixed(1)} miles
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                marginTop: 10,
              }}
            >
              <span
                className="crm-badge"
                style={{
                  background:
                    provider.record_type === 'client' ? '#e8f5e8' : '#e0f0fb',
                  color:
                    provider.record_type === 'client' ? '#217822' : '#0B72B8',
                }}
              >
                {provider.record_type}
              </span>

              {provider.region && (
                <span
                  className="crm-badge"
                  style={{ background: '#f3f0ff', color: '#7c3aed' }}
                >
                  {provider.region}
                </span>
              )}

              {provider.sector && (
                <span
                  className="crm-badge"
                  style={{ background: '#f0f0f2', color: '#737373' }}
                >
                  {provider.sector}
                </span>
              )}
            </div>

            <div
              style={{
                marginTop: 12,
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              {provider.record_type === 'client' ? (
                <Link
                  href={`/crm/clients/${provider.record_id}`}
                  className="crm-btn-ghost crm-btn-sm"
                  style={{ textDecoration: 'none' }}
                >
                  Open client →
                </Link>
              ) : (
                <Link
                  href={`/crm/leads/${provider.record_id}`}
                  className="crm-btn-ghost crm-btn-sm"
                  style={{ textDecoration: 'none' }}
                >
                  Open lead →
                </Link>
              )}

              {provider.website && (
                <a
                  href={provider.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="crm-btn-ghost crm-btn-sm"
                  style={{ textDecoration: 'none' }}
                >
                  Website ↗
                </a>
              )}

              <button
                type="button"
                className="crm-btn-primary crm-btn-sm"
                onClick={() => {
                  setActiveTab('targets')
                  setOutreachForm(current => ({
                    ...current,
                    source_type: provider.record_type,
                    linked_record_id: provider.record_id,
                    employer_name: provider.company_name,
                    contact_name: provider.contact_name || '',
                    contact_title: provider.contact_title || '',
                    contact_email: provider.email || '',
                    contact_phone: provider.phone || '',
                    website: provider.website || '',
                    sector: provider.sector || '',
                    region: provider.region || '',
                    reason_for_approach: `Provider is ${provider.distance_miles.toFixed(
                      1,
                    )} miles from the candidate and may be a good local fit.`,
                  }))
                }}
              >
                Add to outreach
              </button>
            </div>
          </article>
        ))}
      </div>
    )}
  </div>
)}

      {activeTab === 'notes' && (
  <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16 }}>
    <div className="crm-card">
      <h2 className="crm-card-title" style={{ marginBottom: 14 }}>
        Add note
      </h2>

      <div className="crm-field" style={{ marginBottom: 12 }}>
        <label className="crm-label">Type</label>
        <select
          className="crm-select"
          value={noteType}
          onChange={event => setNoteType(event.target.value)}
        >
          <option value="note">Note</option>
          <option value="call">Call</option>
          <option value="email">Email</option>
          <option value="linkedin">LinkedIn</option>
          <option value="meeting">Meeting</option>
          <option value="employer_feedback">Employer feedback</option>
          <option value="candidate_update">Candidate update</option>
        </select>
      </div>

      <div className="crm-field" style={{ marginBottom: 12 }}>
        <label className="crm-label">Content</label>
        <textarea
          className="crm-input"
          rows={6}
          value={noteContent}
          onChange={event => setNoteContent(event.target.value)}
          placeholder="Log calls, emails, employer reactions, candidate updates or next steps..."
        />
      </div>

      <button
        type="button"
        className="crm-btn-primary"
        onClick={addNote}
        disabled={addingNote || !noteContent.trim()}
        style={{ width: '100%', justifyContent: 'center' }}
      >
        {addingNote ? 'Adding...' : '+ Add note'}
      </button>
    </div>

    <div className="crm-card">
      <h2 className="crm-card-title" style={{ marginBottom: 14 }}>
        Notes
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {speculationNotes.map(note => (
          <div
            key={note.id}
            style={{
              border: '1px solid var(--border-light)',
              borderRadius: 10,
              padding: 12,
              background: '#fff',
            }}
          >
            <p style={{ fontSize: 13, lineHeight: 1.6 }}>{note.content}</p>

            <p
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                marginTop: 6,
              }}
            >
              {String(note.note_type || 'note').replace(/_/g, ' ')} ·{' '}
              {formatDate(note.created_at)}
            </p>
          </div>
        ))}

        {speculationNotes.length === 0 && (
          <p className="crm-empty">No speculation notes yet.</p>
        )}
      </div>
    </div>
  </div>
)}

      {activeTab === 'tasks' && (
  <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16 }}>
    <div className="crm-card">
      <h2 className="crm-card-title" style={{ marginBottom: 14 }}>
        Add task
      </h2>

      <div className="crm-field" style={{ marginBottom: 12 }}>
        <label className="crm-label">Task title</label>
        <input
          className="crm-input"
          value={taskTitle}
          onChange={event => setTaskTitle(event.target.value)}
          placeholder="e.g. Call employer, send profile, follow up next week"
        />
      </div>

      <div className="crm-field" style={{ marginBottom: 12 }}>
        <label className="crm-label">Description</label>
        <textarea
          className="crm-input"
          rows={4}
          value={taskDescription}
          onChange={event => setTaskDescription(event.target.value)}
          placeholder="Optional extra detail..."
        />
      </div>

      <div className="crm-field" style={{ marginBottom: 12 }}>
        <label className="crm-label">Due date</label>
        <input
          className="crm-input"
          type="date"
          value={taskDueDate}
          onChange={event => setTaskDueDate(event.target.value)}
        />
      </div>

      <button
        type="button"
        className="crm-btn-primary"
        onClick={addTask}
        disabled={addingTask || !taskTitle.trim()}
        style={{ width: '100%', justifyContent: 'center' }}
      >
        {addingTask ? 'Adding...' : '+ Add task'}
      </button>
    </div>

    <div className="crm-card crm-table-card">
      <table className="crm-table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Due</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>

        <tbody>
          {speculationTasks.map(task => (
            <tr key={task.id}>
              <td>
                <p className="crm-table-main">{task.title}</p>
                <p className="crm-table-sub">{task.description || '—'}</p>
              </td>

              <td>{formatDate(task.due_date)}</td>

              <td>
                <span
                  className="crm-badge"
                  style={{
                    background: task.completed ? '#e8f5e8' : '#fffbeb',
                    color: task.completed ? '#217822' : '#d97706',
                  }}
                >
                  {task.completed ? 'Completed' : 'Open'}
                </span>
              </td>

              <td>
                <button
                  type="button"
                  className="crm-btn-ghost crm-btn-sm"
                  onClick={() => toggleTask(task.id, !task.completed)}
                  disabled={updatingTaskId === task.id}
                >
                  {updatingTaskId === task.id
                    ? 'Updating...'
                    : task.completed
                      ? 'Reopen'
                      : 'Mark done'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {speculationTasks.length === 0 && (
        <p className="crm-empty crm-empty-table">No speculation tasks yet.</p>
      )}
    </div>
  </div>
)}

{activeTab === 'jobs' && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

    {/* ── Search controls ── */}
    <div className="crm-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h2 className="crm-card-title">Live job search</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>
            Searches Reed, Indeed, LinkedIn, TES Jobs and Totaljobs. Jobs are filtered and scored against{' '}
            <strong>{candidateName(candidate)}&apos;s</strong> actual CV, qualifications and delivery evidence — only relevant matches are returned.
          </p>
          {jobsLastSearched && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              Last searched: {new Date(jobsLastSearched).toLocaleString('en-GB')}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="crm-select crm-select-sm"
            value={jobMaxDays}
            onChange={e => setJobMaxDays(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>

          <button
            type="button"
            className="crm-btn-ai"
            disabled={searchingJobs || selectedJobRoles.length === 0}
            onClick={async () => {
              setSearchingJobs(true)
              setJobSearchError(null)
              setLiveJobs([])
              setJobSearchSummary('')
              try {
                const isDelivery = selectedJobRoles.some(r =>
                  /tutor|assessor|skills coach|trainer|training officer|iqv|curriculum|quality/i.test(r)
                )
                const res = await fetch('/api/crm/speculations', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'search_live_jobs',
                    speculation_id: speculation.id,
                    target_role: selectedJobRoles.join(', '),
                    is_delivery_role: isDelivery,
                    standard_names: selectedStandards.map(s => s.standard_name || s.title).filter(Boolean),
                    search_scope: jobSearchScope,
candidate_location: getLiveJobLocationPayload(),
candidate_area: getCandidateSearchLocation(),
selected_regions: selectedJobRegions,
include_remote_hybrid: includeRemoteHybrid,
include_uk_wide: includeUkWide,
max_days_ago: jobMaxDays,
extra_keywords: jobExtraKeywords.trim(),
search_notes: [
  jobSearchNotesFreetext.trim(),
  includeRemoteHybrid
    ? 'Include remote, hybrid, home-based and field-based roles where relevant.'
    : '',
  includeUkWide
    ? 'Include UK-wide, national and remote-first roles where relevant.'
    : '',
  jobSearchScope === 'uk_wide_remote'
    ? 'Do not restrict the search to the candidate postcode or local area unless the job itself is remote, hybrid, UK-wide or clearly relevant.'
    : '',
]
  .filter(Boolean)
  .join('\n'),

                    // ── Full candidate profile for targeted matching ──
                    candidate_profile: {
                      job_title:         candidate?.job_title         || '',
                      can_deliver:       candidate?.can_deliver        || '',
                      qualifications:    candidate?.qualifications     || '',
                      notes:             candidate?.notes              || '',
                      seeking_role:      candidate?.seeking_role_type  || '',
                      sub_role:          candidate?.sub_role_type      || '',
                      formatted_cv:      candidate?.formatted_cv       || '',
                      looking_for_roles: candidate?.looking_for_roles  || [],
                    },
                    speculation_profile:      speculation.candidate_profile       || '',
                    speculation_requirements: speculation.candidate_requirements  || '',
                    key_selling_points:       speculation.key_selling_points      || [],
                    selected_standard_names:  selectedStandards.map(s =>
                      s.standard_name || s.title,
                    ).filter(Boolean),
                  }),
                })
                const data = await res.json()
                if (!res.ok) {
                  setJobSearchError(data.error || 'Job search failed.')
                } else {
                  setLiveJobs(data.jobs || [])
                  setJobSearchSummary(data.summary || '')
                  setJobsLastSearched(new Date().toISOString())
                }
              } catch (err: any) {
                setJobSearchError(err.message || 'Unexpected error.')
              }
              setSearchingJobs(false)
            }}
          >
            {searchingJobs ? '✦ Searching & matching...' : '✦ Search Live Jobs'}
          </button>
        </div>
      </div>

      {/* ── Candidate profile signal ── */}
      {(candidate?.can_deliver || candidate?.qualifications || speculation.candidate_profile) && (
        <div
          style={{
            background: 'var(--primary-light)',
            border: '1px solid rgba(53,45,235,0.14)',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 16,
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>✦</span>
          <div>
            <p style={{ fontSize: 12, fontWeight: 900, color: 'var(--primary)', marginBottom: 4 }}>
              Matching against candidate profile
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-dark)', lineHeight: 1.5, margin: 0 }}>
              {[
                candidate?.can_deliver   ? `Delivers: ${candidate.can_deliver.slice(0, 120)}` : null,
                candidate?.qualifications ? `Quals: ${candidate.qualifications.slice(0, 80)}`  : null,
              ].filter(Boolean).join(' · ') || 'Profile and CV will be used to score each job found.'}
            </p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* ── Role selector ── */}
        <div>
          <label className="crm-label">Job roles to search</label>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
            Select one or more roles. Only roles matching the candidate&apos;s background will score highly.
          </p>

          {selectedJobRoles.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {selectedJobRoles.map(role => (
                <button
                  key={role}
                  type="button"
                  className="crm-badge crm-badge-blue"
                  style={{ border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={() => setSelectedJobRoles(current => current.filter(r => r !== role))}
                >
                  {role} <span style={{ fontWeight: 900 }}>×</span>
                </button>
              ))}
            </div>
          )}

          <input
            className="crm-input"
            placeholder="Search roles..."
            value={jobRoleSearch}
            onChange={e => setJobRoleSearch(e.target.value)}
            style={{ marginBottom: 8 }}
          />

          <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: 10, background: '#fff' }}>
            {ALL_SYSTEM_ROLES
              .filter(role =>
                !jobRoleSearch || role.toLowerCase().includes(jobRoleSearch.toLowerCase())
              )
              .map(role => {
                const selected = selectedJobRoles.includes(role)
                return (
                  <label
                    key={role}
                    style={{
                      display: 'flex', gap: 10, padding: '8px 12px',
                      borderBottom: '1px solid var(--border-light)',
                      cursor: 'pointer',
                      background: selected ? 'var(--primary-light)' : '#fff',
                      fontSize: 13,
                      fontWeight: selected ? 800 : 400,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() =>
                        setSelectedJobRoles(current =>
                          selected
                            ? current.filter(r => r !== role)
                            : [...current, role]
                        )
                      }
                    />
                    {role}
                  </label>
                )
              })
            }
          </div>
        </div>

        {/* ── Search scope ── */}
<div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 12,
    marginBottom: 4,
  }}
>
  <div className="crm-field">
    <label className="crm-label">Search area</label>
    <select
      className="crm-select"
      value={jobSearchScope}
      onChange={event =>
        setJobSearchScope(
          event.target.value as
            | 'uk_wide_remote'
            | 'selected_regions'
            | 'candidate_area',
        )
      }
    >
      <option value="uk_wide_remote">UK-wide + remote/hybrid</option>
      <option value="selected_regions">Selected regions only</option>
      <option value="candidate_area">Candidate area only</option>
    </select>
  </div>

  <div className="crm-field">
    <label className="crm-label">Remote / hybrid</label>
    <select
      className="crm-select"
      value={includeRemoteHybrid ? 'yes' : 'no'}
      onChange={event => setIncludeRemoteHybrid(event.target.value === 'yes')}
    >
      <option value="yes">Include remote, hybrid and home-based</option>
      <option value="no">Do not specifically search remote/hybrid</option>
    </select>
  </div>

  <div className="crm-field">
    <label className="crm-label">UK-wide roles</label>
    <select
      className="crm-select"
      value={includeUkWide ? 'yes' : 'no'}
      onChange={event => setIncludeUkWide(event.target.value === 'yes')}
    >
      <option value="yes">Include UK-wide / national roles</option>
      <option value="no">Do not specifically search UK-wide</option>
    </select>
  </div>
</div>
        
        {/* ── Region + extras ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="crm-label">Regions to search</label>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
              Used only when Search area is set to "Selected regions only".
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {UK_REGIONS_LIST.map(region => {
                const selected = selectedJobRegions.includes(region)
                return (
                  <button
                    key={region}
                    type="button"
                    className="crm-badge"
                    style={{
                      border: `1.5px solid ${selected ? 'var(--primary)' : 'var(--border-light)'}`,
                      background: selected ? 'var(--primary-light)' : '#fff',
                      color: selected ? 'var(--primary)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontWeight: selected ? 800 : 400,
                    }}
                    onClick={() =>
                      setSelectedJobRegions(current =>
                        selected
                          ? current.filter(r => r !== region)
                          : [...current, region]
                      )
                    }
                  >
                    {region}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="crm-label">Extra keywords (optional)</label>
            <input
              className="crm-input"
              placeholder="e.g. apprenticeships, FE college, remote"
              value={jobExtraKeywords}
              onChange={e => setJobExtraKeywords(e.target.value)}
            />
          </div>

          <div>
            <label className="crm-label">Search notes (optional)</label>
            <textarea
              className="crm-input"
              rows={3}
              placeholder="Any specific instructions, e.g. only providers actively delivering electrical, not general colleges"
              value={jobSearchNotesFreetext}
              onChange={e => setJobSearchNotesFreetext(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>

    {/* ── Error ── */}
    {jobSearchError && (
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 12, fontSize: 13, color: '#e53e3e' }}>
        {jobSearchError}
      </div>
    )}

    {/* ── Summary ── */}
    {jobSearchSummary && (
      <div className="crm-card">
        <h3 className="crm-card-title" style={{ marginBottom: 8 }}>Search summary</h3>
        <p style={{ fontSize: 13, color: 'var(--text-dark)', lineHeight: 1.6 }}>{jobSearchSummary}</p>
      </div>
    )}

    {/* ── Results ── */}
    {liveJobs.length > 0 && (
      <div className="crm-card">
        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            marginBottom: 14,
            flexWrap: 'wrap',
          }}
        >
          <h2 className="crm-card-title" style={{ flex: 1 }}>
            {
              [...liveJobs]
                .filter(job => jobRegionFilter === 'all' || job.region === jobRegionFilter)
                .length
            }{' '}
            matched job(s)
          </h2>

          <select
            className="crm-select crm-select-sm"
            value={jobRegionFilter}
            onChange={event => setJobRegionFilter(event.target.value)}
          >
            <option value="all">All regions</option>
            {Array.from(
              new Set(liveJobs.map(job => job.region).filter(Boolean)),
            )
              .sort()
              .map(region => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
          </select>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: 14,
          }}
        >
          {[...liveJobs]
            .filter(job => jobRegionFilter === 'all' || job.region === jobRegionFilter)
            // Sort by match score descending
            .sort((a, b) => (Number(b.match_score) || 0) - (Number(a.match_score) || 0))
            .map((job, index) => {
              const savedOpportunity = findSavedOpportunity(job)
const savedOpportunityOutreach = savedOpportunity
  ? findOutreachForOpportunity(savedOpportunity.id)
  : null

const isSaved = Boolean(savedOpportunity)
const jobKey = getJobKey(job)
const isSaving = savingJobKey === jobKey
const isDraftingOpportunity =
  Boolean(savedOpportunity?.id) &&
  generatingOpportunityDraftId === savedOpportunity.id

              const isRecent =
                job.posted_days_ago !== null &&
                job.posted_days_ago !== undefined &&
                Number(job.posted_days_ago) <= 7

              const postedLabel =
                job.posted_days_ago === 0
                  ? 'Today'
                  : job.posted_days_ago === 1
                    ? 'Yesterday'
                    : job.posted_days_ago !== null && job.posted_days_ago !== undefined
                      ? `${job.posted_days_ago}d ago`
                      : 'Date unclear'

              const matchScore = Number(job.match_score) || 0
              const matchColour =
                matchScore >= 80
                  ? { bg: '#e8f5e8', text: '#217822' }
                  : matchScore >= 60
                    ? { bg: '#fffbeb', text: '#d97706' }
                    : { bg: '#fef2f2', text: '#e53e3e' }

              return (
                <article
                  key={`${job.url || job.job_title}-${index}`}
                  style={{
                    border: `1px solid ${matchScore >= 80 ? 'rgba(33,120,34,0.25)' : 'var(--border)'}`,
                    borderRadius: 18,
                    padding: 18,
                    background: '#fff',
                    boxShadow: '0 12px 30px rgba(15,23,42,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
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
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 18,
                          lineHeight: 1.2,
                          fontWeight: 900,
                          color: 'var(--text-dark)',
                        }}
                      >
                        {job.job_title || 'Untitled job'}
                      </p>

                      <p
                        style={{
                          margin: 0,
                          marginTop: 6,
                          fontSize: 13,
                          fontWeight: 800,
                          color: 'var(--primary)',
                        }}
                      >
                        {job.employer_name || 'Employer not shown'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                      {matchScore > 0 && (
                        <span
                          className="crm-badge"
                          style={{
                            background: matchColour.bg,
                            color: matchColour.text,
                            fontWeight: 900,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {matchScore}% match
                        </span>
                      )}
                      <span
                        className="crm-badge"
                        style={{
                          background: isSaved ? '#e8f5e8' : '#e0f0fb',
                          color: isSaved ? '#217822' : '#0B72B8',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isSaved ? 'Saved' : 'Live job'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <span className="crm-badge crm-badge-blue">
                      {job.location || 'Location unclear'}
                    </span>

                    {job.region && (
                      <span className="crm-badge" style={{ background: '#f3f0ff', color: '#7c3aed' }}>
                        {job.region}
                      </span>
                    )}

                    {job.salary && (
                      <span className="crm-badge" style={{ background: '#e8f5e8', color: '#217822' }}>
                        {job.salary}
                      </span>
                    )}

                    <span
                      className="crm-badge"
                      style={{
                        background: isRecent ? '#e8f5e8' : '#fffbeb',
                        color: isRecent ? '#217822' : '#d97706',
                      }}
                    >
                      {postedLabel}
                    </span>

                    {job.source && (
                      <span className="crm-badge" style={{ background: '#f0f0f2', color: '#737373' }}>
                        {job.source}
                      </span>
                    )}
                  </div>

                  {job.matched_standard && (
                    <div
                      style={{
                        padding: 10,
                        borderRadius: 12,
                        background: 'var(--primary-light)',
                        border: '1px solid rgba(53,45,235,0.16)',
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: 11,
                          fontWeight: 900,
                          color: 'var(--primary)',
                          textTransform: 'uppercase',
                          letterSpacing: 0.8,
                        }}
                      >
                        Matched standard
                      </p>

                      <p
                        style={{
                          margin: 0,
                          marginTop: 4,
                          fontSize: 13,
                          color: 'var(--text-dark)',
                          fontWeight: 800,
                        }}
                      >
                        {job.matched_standard}
                      </p>
                    </div>
                  )}

                  {/* ── Match evidence — the key improvement ── */}
                  {job.match_summary && (
                    <div
                      style={{
                        padding: 10,
                        borderRadius: 10,
                        background: matchScore >= 80 ? '#f0faf0' : matchScore >= 60 ? '#fffdf0' : '#fff8f8',
                        border: `1px solid ${matchScore >= 80 ? 'rgba(33,120,34,0.2)' : matchScore >= 60 ? 'rgba(217,119,6,0.2)' : 'rgba(229,62,62,0.2)'}`,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: 11,
                          fontWeight: 900,
                          color: matchColour.text,
                          textTransform: 'uppercase',
                          letterSpacing: 0.7,
                          marginBottom: 5,
                        }}
                      >
                        Why this matches
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          color: 'var(--text-dark)',
                          lineHeight: 1.6,
                        }}
                      >
                        {job.match_summary}
                      </p>
                    </div>
                  )}

                  <div
                    style={{
                      borderTop: '1px solid var(--border-light)',
                      paddingTop: 12,
                      display: 'flex',
                      gap: 8,
                      flexWrap: 'wrap',
                      alignItems: 'center',
                    }}
                  >
                    {job.url && (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="crm-btn-ghost crm-btn-sm"
                        style={{ textDecoration: 'none' }}
                      >
                        View job ↗
                      </a>
                    )}

                    <button
                      type="button"
                      className={isSaved ? 'crm-btn-ghost crm-btn-sm' : 'crm-btn-primary crm-btn-sm'}
                      onClick={() => saveLiveJobOpportunity(job)}
                      disabled={isSaving || isSaved}
                    >
                      {isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Save opportunity'}
                    </button>

                    {savedOpportunity && (
  <>
    {savedOpportunity.client_id ? (
      <Link
        href={`/crm/clients/${savedOpportunity.client_id}`}
        className="crm-btn-ghost crm-btn-sm"
        style={{ textDecoration: 'none' }}
      >
        Open client →
      </Link>
    ) : savedOpportunity.lead_id ? (
      <Link
        href={`/crm/leads/${savedOpportunity.lead_id}`}
        className="crm-btn-ghost crm-btn-sm"
        style={{ textDecoration: 'none' }}
      >
        Open lead →
      </Link>
    ) : (
      <button
        type="button"
        className="crm-btn-ai crm-btn-sm"
        onClick={() =>
          convertOpportunityToLead(savedOpportunity.id)
        }
        disabled={convertingOpportunityId === savedOpportunity.id}
      >
        {convertingOpportunityId === savedOpportunity.id
          ? 'Checking...'
          : 'Add as lead'}
      </button>
    )}

    <button
      type="button"
      className="crm-btn-ai crm-btn-sm"
      onClick={() => generateOpportunityOutreachDraft(savedOpportunity)}
      disabled={isDraftingOpportunity}
    >
      {isDraftingOpportunity
        ? 'Drafting...'
        : savedOpportunityOutreach?.message_sent
          ? 'Redraft anonymous email'
          : 'Draft anonymous email'}
    </button>
  </>
)}
                  </div>
                </article>
              )
            })}
        </div>
      </div>
    )}
  </div>
)}

          {/* ── Results ── */}
{liveJobs.length > 0 && (
  <div className="crm-card">
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        marginBottom: 14,
        flexWrap: 'wrap',
      }}
    >
      <h2 className="crm-card-title" style={{ flex: 1 }}>
        {
          liveJobs.filter(
            job => jobRegionFilter === 'all' || job.region === jobRegionFilter,
          ).length
        }{' '}
        job(s) found
      </h2>

      <select
        className="crm-select crm-select-sm"
        value={jobRegionFilter}
        onChange={event => setJobRegionFilter(event.target.value)}
      >
        <option value="all">All regions</option>

        {Array.from(
          new Set(liveJobs.map(job => job.region).filter(Boolean)),
        )
          .sort()
          .map(region => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
      </select>
    </div>

    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: 14,
      }}
    >
      {liveJobs
        .filter(job => jobRegionFilter === 'all' || job.region === jobRegionFilter)
        .map((job, index) => {
          const savedOpportunity = findSavedOpportunity(job)
          const isSaved = Boolean(savedOpportunity)
          const jobKey = getJobKey(job)
          const isSaving = savingJobKey === jobKey

          const isRecent =
            job.posted_days_ago !== null &&
            job.posted_days_ago !== undefined &&
            Number(job.posted_days_ago) <= 7

          const postedLabel =
            job.posted_days_ago === 0
              ? 'Today'
              : job.posted_days_ago === 1
                ? 'Yesterday'
                : job.posted_days_ago !== null &&
                    job.posted_days_ago !== undefined
                  ? `${job.posted_days_ago}d ago`
                  : 'Date unclear'

          return (
            <article
              key={`${job.url || job.job_title}-${index}`}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 18,
                padding: 18,
                background: '#fff',
                boxShadow: '0 12px 30px rgba(15,23,42,0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
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
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 18,
                      lineHeight: 1.2,
                      fontWeight: 900,
                      color: 'var(--text-dark)',
                    }}
                  >
                    {job.job_title || 'Untitled job'}
                  </p>

                  <p
                    style={{
                      margin: 0,
                      marginTop: 6,
                      fontSize: 13,
                      fontWeight: 800,
                      color: 'var(--primary)',
                    }}
                  >
                    {job.employer_name || 'Employer not shown'}
                  </p>
                </div>

                <span
                  className="crm-badge"
                  style={{
                    background: isSaved ? '#e8f5e8' : '#e0f0fb',
                    color: isSaved ? '#217822' : '#0B72B8',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isSaved ? 'Saved' : 'Live job'}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                }}
              >
                <span className="crm-badge crm-badge-blue">
                  {job.location || 'Location unclear'}
                </span>

                {job.region && (
                  <span
                    className="crm-badge"
                    style={{ background: '#f3f0ff', color: '#7c3aed' }}
                  >
                    {job.region}
                  </span>
                )}

                {job.salary && (
                  <span
                    className="crm-badge"
                    style={{ background: '#e8f5e8', color: '#217822' }}
                  >
                    {job.salary}
                  </span>
                )}

                <span
                  className="crm-badge"
                  style={{
                    background: isRecent ? '#e8f5e8' : '#fffbeb',
                    color: isRecent ? '#217822' : '#d97706',
                  }}
                >
                  {postedLabel}
                </span>

                {job.source && (
                  <span
                    className="crm-badge"
                    style={{ background: '#f0f0f2', color: '#737373' }}
                  >
                    {job.source}
                  </span>
                )}
              </div>

              {job.matched_standard && (
                <div
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    background: 'var(--primary-light)',
                    border: '1px solid rgba(53,45,235,0.16)',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      fontWeight: 900,
                      color: 'var(--primary)',
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                    }}
                  >
                    Matched standard
                  </p>

                  <p
                    style={{
                      margin: 0,
                      marginTop: 4,
                      fontSize: 13,
                      color: 'var(--text-dark)',
                      fontWeight: 800,
                    }}
                  >
                    {job.matched_standard}
                  </p>
                </div>
              )}

              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: 'var(--text-muted)',
                  lineHeight: 1.7,
                }}
              >
                {job.match_summary ||
                  job.why_candidate_matches ||
                  job.notes ||
                  'No match summary returned yet.'}
              </p>

              <div
                style={{
                  borderTop: '1px solid var(--border-light)',
                  paddingTop: 12,
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                {job.url && (
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="crm-btn-ghost crm-btn-sm"
                    style={{ textDecoration: 'none' }}
                  >
                    View job ↗
                  </a>
                )}

                <button
                  type="button"
                  className={
                    isSaved
                      ? 'crm-btn-ghost crm-btn-sm'
                      : 'crm-btn-primary crm-btn-sm'
                  }
                  onClick={() => saveLiveJobOpportunity(job)}
                  disabled={isSaving || isSaved}
                >
                  {isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Save opportunity'}
                </button>

                {savedOpportunity && (
                  <>
                    {savedOpportunity.client_id ? (
                      <Link
                        href={`/crm/clients/${savedOpportunity.client_id}`}
                        className="crm-btn-ghost crm-btn-sm"
                        style={{ textDecoration: 'none' }}
                      >
                        Open client →
                      </Link>
                    ) : savedOpportunity.lead_id ? (
                      <Link
                        href={`/crm/leads/${savedOpportunity.lead_id}`}
                        className="crm-btn-ghost crm-btn-sm"
                        style={{ textDecoration: 'none' }}
                      >
                        Open lead →
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="crm-btn-ai crm-btn-sm"
                        onClick={() =>
                          convertOpportunityToLead(savedOpportunity.id)
                        }
                        disabled={convertingOpportunityId === savedOpportunity.id}
                      >
                        {convertingOpportunityId === savedOpportunity.id
                          ? 'Checking...'
                          : 'Add as lead'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </article>
          )
        })}
    </div>
  </div>
)}

      {specEmailModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            className="crm-card"
            style={{
              width: 'min(980px, 100%)',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 24px 70px rgba(15,23,42,0.28)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 14,
                alignItems: 'flex-start',
                marginBottom: 16,
              }}
            >
              <div>
                <h2 className="crm-card-title">AI speculative email draft</h2>
                <p
                  style={{
                    margin: 0,
                    marginTop: 4,
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                  }}
                >
                  {specEmailModal.outreach?.employer_name || 'Employer'} · Review,
                  edit and choose what to save.
                </p>
              </div>

              <button
                type="button"
                className="crm-btn-ghost crm-btn-sm"
                onClick={() =>
                  setSpecEmailModal(current => ({
                    ...current,
                    open: false,
                  }))
                }
                disabled={specEmailModal.saving}
              >
                Close
              </button>
            </div>

            {specEmailModal.loading ? (
              <div
                style={{
                  padding: 24,
                  borderRadius: 14,
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  fontWeight: 900,
                }}
              >
                ✦ Drafting against the saved job, candidate CV, notes and activity...
              </div>
            ) : (
              <>
                <div className="crm-field" style={{ marginBottom: 12 }}>
                  <label className="crm-label">Subject</label>
                  <input
                    className="crm-input"
                    value={specEmailModal.subject}
                    onChange={event =>
                      setSpecEmailModal(current => ({
                        ...current,
                        subject: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="crm-field" style={{ marginBottom: 12 }}>
                  <label className="crm-label">Email draft</label>
                  <textarea
                    className="crm-input"
                    rows={12}
                    value={specEmailModal.body}
                    onChange={event =>
                      setSpecEmailModal(current => ({
                        ...current,
                        body: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="crm-field" style={{ marginBottom: 12 }}>
                  <label className="crm-label">LinkedIn version</label>
                  <textarea
                    className="crm-input"
                    rows={5}
                    value={specEmailModal.linkedin_message}
                    onChange={event =>
                      setSpecEmailModal(current => ({
                        ...current,
                        linkedin_message: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="crm-form-row">
                  <div className="crm-field">
                    <label className="crm-label">Reason for approach</label>
                    <textarea
                      className="crm-input"
                      rows={4}
                      value={specEmailModal.reason_for_approach}
                      onChange={event =>
                        setSpecEmailModal(current => ({
                          ...current,
                          reason_for_approach: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="crm-field">
                    <label className="crm-label">Candidate/job fit summary</label>
                    <textarea
                      className="crm-input"
                      rows={4}
                      value={specEmailModal.fit_summary}
                      onChange={event =>
                        setSpecEmailModal(current => ({
                          ...current,
                          fit_summary: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 14,
                    padding: 14,
                    borderRadius: 14,
                    background: '#f8fafc',
                    border: '1px solid var(--border-light)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10,
                  }}
                >
                  {[
                    ['save_email', 'Save email to employer record'],
                    ['save_linkedin', 'Save LinkedIn message'],
                    ['save_reason', 'Save reason for approach'],
                    ['log_to_employer_activity', 'Log to lead/client activity notes'],
                    ['set_email_sent', 'Set status to Email sent'],
                  ].map(([key, label]) => (
                    <label
                      key={key}
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                        fontSize: 12,
                        fontWeight: 800,
                        color: 'var(--text-dark)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean((specEmailModal as any)[key])}
                        onChange={event =>
                          setSpecEmailModal(current => ({
                            ...current,
                            [key]: event.target.checked,
                          }))
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    justifyContent: 'flex-end',
                    marginTop: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    type="button"
                    className="crm-btn-ghost"
                    onClick={() =>
                      navigator.clipboard.writeText(
                        [
                          specEmailModal.subject
                            ? `Subject: ${specEmailModal.subject}`
                            : '',
                          specEmailModal.body,
                        ]
                          .filter(Boolean)
                          .join('\n\n'),
                      )
                    }
                  >
                    Copy email
                  </button>

                  <button
                    type="button"
                    className="crm-btn-primary"
                    onClick={saveSpecEmailModal}
                    disabled={specEmailModal.saving}
                  >
                    {specEmailModal.saving ? 'Saving...' : 'Save draft'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function OutreachBox({
  title,
  content,
  onCopy,
  large = false,
}: {
  title: string
  content: string
  onCopy: () => void
  large?: boolean
}) {
  return (
    <div
      style={{
        border: '1px solid var(--border-light)',
        borderRadius: 12,
        padding: 12,
        background: 'var(--light-bg)',
        gridColumn: large ? 'span 1' : undefined,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 10,
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <p
          style={{
            fontSize: 12,
            fontWeight: 900,
            color: 'var(--text-dark)',
          }}
        >
          {title}
        </p>

        <button
          type="button"
          className="crm-btn-ghost crm-btn-sm"
          onClick={onCopy}
        >
          Copy
        </button>
      </div>

      <div
        style={{
          whiteSpace: 'pre-wrap',
          fontSize: 12,
          lineHeight: 1.6,
          color: 'var(--text-dark)',
          minHeight: large ? 150 : 52,
        }}
      >
        {content || '—'}
      </div>
    </div>
  )
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="crm-detail-row">
      <span className="crm-detail-label">{label}</span>
      <span className="crm-detail-value">{children}</span>
    </div>
  )
}

function CandidateCvPreview({
  document,
  fileKind,
}: {
  document: any
  fileKind: string
}) {
  return (
    <div className="crm-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          padding: 14,
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <div>
          <h2 className="crm-card-title">Candidate CV preview</h2>
          <p
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              marginTop: 3,
            }}
          >
            {document?.name || 'No CV selected'}
          </p>
        </div>

        {document?.file_url && (
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

      {!document?.file_url ? (
        <div style={{ padding: 28, textAlign: 'center' }}>
          <p style={{ fontSize: 34, marginBottom: 8 }}>📄</p>
          <p
            style={{
              fontSize: 14,
              fontWeight: 900,
              color: 'var(--text-dark)',
            }}
          >
            No CV file available
          </p>
          <p
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              marginTop: 4,
              lineHeight: 1.5,
            }}
          >
            Upload a CV or formatted CV on the Candidate ID documents tab.
          </p>
        </div>
      ) : fileKind === 'pdf' ? (
        <iframe
          src={document.file_url}
          title={document.name || 'Candidate CV'}
          style={{
            width: '100%',
            height: 640,
            border: 0,
            background: '#fff',
          }}
        />
      ) : fileKind === 'image' ? (
        <div
          style={{
            minHeight: 540,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 12,
            background: '#fff',
          }}
        >
          <img
            src={document.file_url}
            alt={document.name || 'Candidate CV'}
            style={{
              maxWidth: '100%',
              maxHeight: 620,
              objectFit: 'contain',
            }}
          />
        </div>
      ) : (
        <div style={{ padding: 28, textAlign: 'center' }}>
          <p style={{ fontSize: 34, marginBottom: 8 }}>📄</p>
          <p
            style={{
              fontSize: 14,
              fontWeight: 900,
              color: 'var(--text-dark)',
            }}
          >
            Preview not available
          </p>
          <p
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              marginTop: 4,
              lineHeight: 1.5,
            }}
          >
            Word documents usually need to be opened directly.
          </p>

          <a
            href={document.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="crm-btn-primary crm-btn-sm"
            style={{
              display: 'inline-flex',
              marginTop: 12,
              textDecoration: 'none',
            }}
          >
            Open CV
          </a>
        </div>
      )}
    </div>
  )
}