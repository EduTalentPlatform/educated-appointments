'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useCrmRoleSettings } from '@/hooks/useCrmRoleSettings'
import StandardsSelector from '@/components/crm/StandardsSelector'
import ClientPortalAccessPanel from './ClientPortalAccessPanel'

type Client = {
  id: string; company_name: string; contact_name: string | null; contact_title: string | null
  email: string | null; phone: string | null; website: string | null; sector: string | null
  main_office_address_line_1: string | null
  main_office_address_line_2: string | null
  main_office_town_city: string | null
  main_office_county: string | null
  main_office_postcode: string | null
  main_office_lat: number | null
  main_office_lng: number | null
  region: string | null; portal_email: string | null; notes: string | null; status: string
  fee_percentage: number | null; payment_terms_days: number | null; rebate_weeks: number | null
  psl_status: string | null; tob_signed: boolean | null; tob_url: string | null
  dbs_policy_url: string | null; relationship_health: string | null; retention_risk: boolean | null
  next_review_date: string | null; contract_renewal: string | null; linkedin_company: string | null
  ukprn: string | null; ofsted_grade: string | null; esfa_funding: number | null
  frameworks: string | null; total_placements: number | null; total_fees_earned: number | null
}
type Contact = { id: string; name: string; title: string | null; email: string | null; phone: string | null; linkedin: string | null; role_type: string; is_primary: boolean }
type Activity = {
  id: string
  client_id: string
  client_contact_id: string | null
  activity_type: string
  direction: 'inbound' | 'outbound' | 'internal' | null
  content: string | null
  attendees: string | null
  pain_points: string | null
  roles_to_fill: string | null
  psl_agencies: string | null
  salary_notes: string | null
  retention_notes: string | null
  fee_agreed: string | null
  decision_maker: string | null
  next_steps: string | null
  follow_up_date: string | null
  created_at: string
  updated_at?: string | null
  client_contacts?: {
    id: string
    name: string
    title: string | null
    email: string | null
    phone: string | null
  } | null
}
type Vacancy = { id: string; title: string; status: string; sector: string | null; salary_min: number | null; salary_max: number | null; salary_display: string | null; location: string | null; created_at: string; applications?: any[] }
type Placement = {
  id: string
  placement_ref?: string | null
  status?: string | null
  start_date?: string | null
  salary?: number | string | null
  fee_amount?: number | string | null
  fee_percentage?: number | string | null
  invoice_status?: string | null
  final_documents_released?: boolean | null
  created_at?: string | null
  candidates?: {
    id?: string
    first_name?: string | null
    last_name?: string | null
    email?: string | null
    phone?: string | null
    job_title?: string | null
  } | null
  vacancies?: {
    id?: string
    title?: string | null
    location?: string | null
    region?: string | null
  } | null
  placement_tasks?: Array<{
    id: string
    completed?: boolean | null
  }> | null
}

type ProviderSite = {
  id: string
  lead_id: string | null
  client_id: string | null
  site_name: string
  site_type: string | null
  address_line_1: string | null
  address_line_2: string | null
  town_city: string | null
  county: string | null
  postcode: string | null
  lat: number | null
  lng: number | null
  phone: string | null
  email: string | null
  notes: string | null
  is_primary: boolean | null
  is_active: boolean | null
}

type PortalUser = {
  id: string
  client_id: string
  client_contact_id: string | null
  auth_user_id: string | null
  name: string
  email: string
  role: string
  active: boolean
  created_at: string
}

const VACANCY_REGIONS = ['','East of England','East Midlands','West Midlands','North West','North East','Yorkshire & Humber','South East','South West','London','Wales','Scotland','Northern Ireland','National (Multi-site)']
const ROLE_TYPES = ['Decision Maker','Influencer','Day-to-day','Finance','HR']

const ACTIVITY_TYPES = [
  { id: 'call', label: 'Call', icon: '📞' },
  { id: 'email', label: 'Email', icon: '✉️' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { id: 'sms', label: 'SMS', icon: '💬' },
  { id: 'meeting', label: 'Meeting', icon: '🤝' },
  { id: 'bd_meeting', label: 'BD Meeting', icon: '📋' },
  { id: 'note', label: 'Note', icon: '📝' },
]
const HEALTH_COLOURS: Record<string, { bg: string; text: string; dot: string }> = {
  hot:  { bg: '#fef2f2', text: '#e53e3e', dot: '#e53e3e' },
  warm: { bg: '#fffbeb', text: '#d97706', dot: '#d97706' },
  cold: { bg: '#f0f0f2', text: '#737373', dot: '#737373' },
}
const OFSTED_COLOURS: Record<string, string> = {
  'Outstanding': '#217822', 'Good': '#0B72B8',
  'Requires Improvement': '#d97706', 'Inadequate': '#e53e3e',
}

async function lookupPostcode(postcode?: string | null) {
  if (!postcode) {
    return {
      lat: null,
      lng: null,
      district: null,
      region: null,
    }
  }

  try {
    const clean = postcode.replace(/\s/g, '').toUpperCase()
    const res = await fetch(`https://api.postcodes.io/postcodes/${clean}`)
    const data = await res.json()

    if (data.status === 200 && data.result) {
      return {
        lat: data.result.latitude ?? null,
        lng: data.result.longitude ?? null,
        district: data.result.admin_district ?? null,
        region: data.result.region ?? null,
      }
    }
  } catch {}

  return {
    lat: null,
    lng: null,
    district: null,
    region: null,
  }
}

interface Props {
  client: Client
  vacancies: Vacancy[]
  contacts: Contact[]
  placements?: Placement[]
  portalUsers?: PortalUser[]
  initialSites?: ProviderSite[]
  initialActivities?: Activity[]
}

export default function ClientDetail({

  client: initialClient,
  vacancies: initialVacancies,
  contacts: initialContacts,
  placements = [],
  portalUsers = [],
  initialSites = [],
  initialActivities = [],
}: Props) {
  const { roleTypeHierarchy: crmRoleTypeHierarchy, mainRoleTypes: crmMainRoleTypes } = useCrmRoleSettings()

  const router = useRouter()
  const supabase = createClient()

  const [client, setClient] = useState(initialClient)
const [editingClientName, setEditingClientName] = useState(false)
const [clientNameForm, setClientNameForm] = useState(
  initialClient.company_name ?? '',
)
const [savingClientName, setSavingClientName] = useState(false)

const [vacancies, setVacancies] = useState(initialVacancies)
  const [contacts, setContacts] = useState(initialContacts)
  const [sites, setSites] = useState(initialSites)
const [activities, setActivities] = useState(initialActivities)
const [activeTab, setActiveTab] = useState<
  | 'overview'
  | 'terms'
  | 'vacancies'
  | 'placements'
  | 'documents'
  | 'portal'
  | 'activity'
>('overview')

  // Activity state
const [actType, setActType] = useState('call')
const [actDirection, setActDirection] = useState<
  'inbound' | 'outbound' | 'internal'
>('outbound')
const [actContactId, setActContactId] = useState('')
const [actContent, setActContent] = useState('')
const [bdForm, setBdForm] = useState({
  attendees: '',
  pain_points: '',
  roles_to_fill: '',
  psl_agencies: '',
  salary_notes: '',
  retention_notes: '',
  fee_agreed: '',
  decision_maker: '',
  next_steps: '',
  follow_up_date: '',
})
const [addingActivity, setAddingActivity] = useState(false)

// Contact state
  const emptyContactForm = {
    name: '',
    title: '',
    email: '',
    phone: '',
    linkedin: '',
    role_type: 'Day-to-day',
    is_primary: false,
  }

  const [showContactForm, setShowContactForm] = useState(false)
  const [contactForm, setContactForm] = useState(emptyContactForm)
  const [editingContactId, setEditingContactId] = useState<string | null>(null)
  const [addingContact, setAddingContact] = useState(false)

  // Provider location state
const [savingMainOffice, setSavingMainOffice] = useState(false)
const [showSiteForm, setShowSiteForm] = useState(false)
const [addingSite, setAddingSite] = useState(false)
const [deletingSiteId, setDeletingSiteId] = useState<string | null>(null)

const [mainOfficeForm, setMainOfficeForm] = useState({
  main_office_address_line_1: client.main_office_address_line_1 ?? '',
  main_office_address_line_2: client.main_office_address_line_2 ?? '',
  main_office_town_city: client.main_office_town_city ?? '',
  main_office_county: client.main_office_county ?? '',
  main_office_postcode: client.main_office_postcode ?? '',
})

const [siteForm, setSiteForm] = useState({
  site_name: '',
  site_type: 'branch',
  address_line_1: '',
  address_line_2: '',
  town_city: '',
  county: '',
  postcode: '',
  phone: '',
  email: '',
  notes: '',
})

  // Vacancy state
  const [showVacForm, setShowVacForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [vacError, setVacError] = useState<string|null>(null)
  const [mainRoleType, setMainRoleType] = useState('')
  const [standards, setStandards] = useState<string[]>([])
  const [vacForm, setVacForm] = useState({ title: '', sector: '', type: 'Permanent', location: '', region: '', salary_min: '', salary_max: '', salary_display: '', description: '', slug: '' })

  // Terms state
  const [terms, setTerms] = useState({
    fee_percentage: client.fee_percentage ?? 15,
    payment_terms_days: client.payment_terms_days ?? 30,
    rebate_weeks: client.rebate_weeks ?? 12,
    psl_status: client.psl_status ?? 'adhoc',
    tob_signed: client.tob_signed ?? false,
    exclusivity: false,
    notes: '',
    company_number: '',
    trading_as: '',
    address: '',
  })
  const [savingTerms, setSavingTerms] = useState(false)
  const [termsSaved, setTermsSaved] = useState(false)
  const [generatingTob, setGeneratingTob] = useState(false)
const [generatedTob, setGeneratedTob] = useState<string | null>(null)
const [tobError, setTobError] = useState<string | null>(null)
const [sendingTobDocusign, setSendingTobDocusign] = useState(false)
const [tobDocusignMessage, setTobDocusignMessage] = useState<string | null>(null)
const [selectedTobContactId, setSelectedTobContactId] = useState(() => {
  return (
    initialContacts.find(contact => contact.is_primary && contact.email)?.id ||
    initialContacts.find(contact => contact.email)?.id ||
    ''
  )
})

  // Relationship
  const [health, setHealth] = useState(client.relationship_health ?? 'warm')
  const [retentionRisk, setRetentionRisk] = useState(client.retention_risk ?? false)
  const [nextReview, setNextReview] = useState(client.next_review_date ?? '')

  const primaryContact = contacts.find(c => c.is_primary) ?? contacts[0]
  const selectedTobContact =
  contacts.find(contact => contact.id === selectedTobContactId) ||
  contacts.find(contact => contact.is_primary && contact.email) ||
  contacts.find(contact => contact.email) ||
  null
  const actIcon = (type: string) =>
  ACTIVITY_TYPES.find(activity => activity.id === type)?.icon ?? '📝'

const actLabel = (type: string) =>
  ACTIVITY_TYPES.find(activity => activity.id === type)?.label ?? type

function resetBdForm() {
  setBdForm({
    attendees: '',
    pain_points: '',
    roles_to_fill: '',
    psl_agencies: '',
    salary_notes: '',
    retention_notes: '',
    fee_agreed: '',
    decision_maker: '',
    next_steps: '',
    follow_up_date: '',
  })
}
  const liveVacs = vacancies.filter(v => v.status === 'live')
  const totalApps = vacancies.reduce(
  (sum, v) => sum + (v.applications?.length ?? 0),
  0,
)

const placedCount = placements.length

async function saveClientName(event?: React.FormEvent) {
  event?.preventDefault()

  const nextName = clientNameForm.trim()

  if (!nextName) {
    alert('Client name is required.')
    return
  }

  setSavingClientName(true)

  const { data, error } = await supabase
    .from('clients')
    .update({
      company_name: nextName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', client.id)
    .select('*')
    .single()

  if (error) {
    alert(error.message || 'Could not update client name.')
    setSavingClientName(false)
    return
  }

  if (data) {
    setClient(data)
    setClientNameForm(data.company_name ?? nextName)
  } else {
    setClient(current => ({
      ...current,
      company_name: nextName,
    }))
  }

  setEditingClientName(false)
  setSavingClientName(false)
  router.refresh()
}

  // Fee calculation
  function calcFee(v: Vacancy) {
    const feeP = terms.fee_percentage
    if (!feeP) return null
    const salary = v.salary_min && v.salary_max ? (v.salary_min + v.salary_max) / 2 : v.salary_min || v.salary_max
    if (!salary) return null
    return Math.round(salary * feeP / 100)
  }

  const pipelineValue = vacancies
    .filter(v => v.status !== 'closed')
    .reduce((sum, v) => sum + (calcFee(v) ?? 0), 0)

  async function addActivity(e: React.FormEvent) {
  e.preventDefault()

  setAddingActivity(true)

  const payload: any = {
    client_id: client.id,
    activity_type: actType,
    direction: actDirection,
    client_contact_id: actContactId || null,
    content: actContent || null,
    follow_up_date:
      actType === 'bd_meeting' ? bdForm.follow_up_date || null : null,
  }

  if (actType === 'bd_meeting') {
    Object.assign(payload, {
      attendees: bdForm.attendees || null,
      pain_points: bdForm.pain_points || null,
      roles_to_fill: bdForm.roles_to_fill || null,
      psl_agencies: bdForm.psl_agencies || null,
      salary_notes: bdForm.salary_notes || null,
      retention_notes: bdForm.retention_notes || null,
      fee_agreed: bdForm.fee_agreed || null,
      decision_maker: bdForm.decision_maker || null,
      next_steps: bdForm.next_steps || null,
    })
  }

  const { data, error } = await supabase
    .from('client_activities')
    .insert(payload)
    .select(
      `
      *,
      client_contacts (
        id,
        name,
        title,
        email,
        phone
      )
    `,
    )
    .single()

  if (error) {
    alert(error.message || 'Could not log activity.')
    setAddingActivity(false)
    return
  }

  if (data) {
    setActivities(current => [data, ...current])
    setActContent('')
    setActDirection('outbound')
    setActContactId('')
    resetBdForm()
  }

  setAddingActivity(false)
}

async function deleteActivity(id: string) {
  const confirmed = window.confirm('Delete this activity?')
  if (!confirmed) return

  const { error } = await supabase
    .from('client_activities')
    .delete()
    .eq('id', id)

  if (error) {
    alert(error.message || 'Could not delete activity.')
    return
  }

  setActivities(current => current.filter(activity => activity.id !== id))
}
  
    // ── Contacts ──────────────────────────────────────────────────────────────
  function resetContactForm() {
    setContactForm(emptyContactForm)
    setEditingContactId(null)
    setShowContactForm(false)
  }

  function openAddContactForm() {
    setContactForm(emptyContactForm)
    setEditingContactId(null)
    setShowContactForm(true)
  }

  function openEditContactForm(contact: Contact) {
    setContactForm({
      name: contact.name ?? '',
      title: contact.title ?? '',
      email: contact.email ?? '',
      phone: contact.phone ?? '',
      linkedin: contact.linkedin ?? '',
      role_type: contact.role_type || 'Day-to-day',
      is_primary: contact.is_primary ?? false,
    })
    setEditingContactId(contact.id)
    setShowContactForm(true)
  }

  async function saveContact(e: React.FormEvent) {
    e.preventDefault()

    if (!contactForm.name.trim()) {
      alert('Contact name is required.')
      return
    }

    setAddingContact(true)

    const payload = {
      name: contactForm.name.trim(),
      title: contactForm.title || null,
      email: contactForm.email || null,
      phone: contactForm.phone || null,
      linkedin: contactForm.linkedin || null,
      role_type: contactForm.role_type || 'Day-to-day',
      is_primary: contactForm.is_primary,
    }

    if (contactForm.is_primary) {
      await supabase
        .from('client_contacts')
        .update({ is_primary: false })
        .eq('client_id', client.id)
    }

    if (editingContactId) {
      const { data, error } = await supabase
        .from('client_contacts')
        .update(payload)
        .eq('id', editingContactId)
        .eq('client_id', client.id)
        .select()
        .single()

      if (error) {
        alert(error.message || 'Could not update contact.')
        setAddingContact(false)
        return
      }

      if (data) {
        setContacts(current =>
          current.map(contact =>
            contact.id === data.id
              ? data
              : {
                  ...contact,
                  is_primary: contactForm.is_primary
                    ? false
                    : contact.is_primary,
                },
          ),
        )
        resetContactForm()
      }

      setAddingContact(false)
      return
    }

    const { data, error } = await supabase
      .from('client_contacts')
      .insert({ ...payload, client_id: client.id })
      .select()
      .single()

    if (error) {
      alert(error.message || 'Could not add contact.')
      setAddingContact(false)
      return
    }

    if (data) {
      setContacts(current =>
        contactForm.is_primary
          ? [...current.map(contact => ({ ...contact, is_primary: false })), data]
          : [...current, data],
      )
      resetContactForm()
    }

    setAddingContact(false)
  }

  async function deleteContact(id: string) {
    const confirmed = window.confirm('Delete this contact?')
    if (!confirmed) return

    const { error } = await supabase
      .from('client_contacts')
      .delete()
      .eq('id', id)
      .eq('client_id', client.id)

    if (error) {
      alert(error.message || 'Could not delete contact.')
      return
    }

    setContacts(c => c.filter(x => x.id !== id))
  }

  async function setPrimary(id: string) {
    await supabase.from('client_contacts').update({ is_primary: false }).eq('client_id', client.id)
    await supabase.from('client_contacts').update({ is_primary: true }).eq('id', id)
    setContacts(c => c.map(x => ({ ...x, is_primary: x.id === id })))
  }

  async function saveMainOffice() {
  setSavingMainOffice(true)

  const postcodeLookup = await lookupPostcode(
    mainOfficeForm.main_office_postcode,
  )

  const payload = {
    main_office_address_line_1:
      mainOfficeForm.main_office_address_line_1 || null,
    main_office_address_line_2:
      mainOfficeForm.main_office_address_line_2 || null,
    main_office_town_city:
      mainOfficeForm.main_office_town_city || postcodeLookup.district || null,
    main_office_county:
      mainOfficeForm.main_office_county || null,
    main_office_postcode:
      mainOfficeForm.main_office_postcode || null,
    main_office_lat: postcodeLookup.lat ?? client.main_office_lat ?? null,
    main_office_lng: postcodeLookup.lng ?? client.main_office_lng ?? null,
    region: client.region || postcodeLookup.region || null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('clients')
    .update(payload)
    .eq('id', client.id)
    .select('*')
    .single()

  if (error) {
    alert(error.message || 'Could not save main office.')
    setSavingMainOffice(false)
    return
  }

  if (data) {
    setClient(data)
    setMainOfficeForm({
      main_office_address_line_1: data.main_office_address_line_1 ?? '',
      main_office_address_line_2: data.main_office_address_line_2 ?? '',
      main_office_town_city: data.main_office_town_city ?? '',
      main_office_county: data.main_office_county ?? '',
      main_office_postcode: data.main_office_postcode ?? '',
    })
  }

  setSavingMainOffice(false)
  router.refresh()
}

async function addSite(e: React.FormEvent) {
  e.preventDefault()

  if (!siteForm.site_name.trim()) {
    alert('Site name is required.')
    return
  }

  setAddingSite(true)

  const postcodeLookup = await lookupPostcode(siteForm.postcode)

  const { data, error } = await supabase
    .from('provider_sites')
    .insert({
      lead_id: null,
      client_id: client.id,
      site_name: siteForm.site_name.trim(),
      site_type: siteForm.site_type || 'branch',
      address_line_1: siteForm.address_line_1 || null,
      address_line_2: siteForm.address_line_2 || null,
      town_city: siteForm.town_city || postcodeLookup.district || null,
      county: siteForm.county || null,
      postcode: siteForm.postcode || null,
      lat: postcodeLookup.lat,
      lng: postcodeLookup.lng,
      phone: siteForm.phone || null,
      email: siteForm.email || null,
      notes: siteForm.notes || null,
      is_primary: false,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    alert(error.message || 'Could not add site.')
    setAddingSite(false)
    return
  }

  if (data) {
    setSites(current => [...current, data])
    setShowSiteForm(false)
    setSiteForm({
      site_name: '',
      site_type: 'branch',
      address_line_1: '',
      address_line_2: '',
      town_city: '',
      county: '',
      postcode: '',
      phone: '',
      email: '',
      notes: '',
    })
  }

  setAddingSite(false)
}

async function deleteSite(id: string) {
  const confirmed = window.confirm(
    'Delete this site? This cannot be undone.',
  )

  if (!confirmed) return

  setDeletingSiteId(id)

  const { error } = await supabase
    .from('provider_sites')
    .delete()
    .eq('id', id)
    .eq('client_id', client.id)

  if (error) {
    alert(error.message || 'Could not delete site.')
    setDeletingSiteId(null)
    return
  }

  setSites(current => current.filter(site => site.id !== id))
  setDeletingSiteId(null)
}

  // ── Vacancies ──────────────────────────────────────────────────────────────
  async function createVacancy(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setVacError(null)
    const salaryMin = parseInt(vacForm.salary_min) || null
    const salaryMax = parseInt(vacForm.salary_max) || null
    const salaryDisplay = salaryMin && salaryMax ? `£${salaryMin.toLocaleString()} – £${salaryMax.toLocaleString()}` : salaryMin ? `From £${salaryMin.toLocaleString()}` : null
    const slug = `${vacForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now()}`
    const res = await fetch('/api/crm/vacancies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: vacForm.title, sector: vacForm.sector || null, type: vacForm.type, location: vacForm.location || null, region: vacForm.region || null, salary_min: salaryMin, salary_max: salaryMax, salary_display: salaryDisplay, description: null, slug, client_id: client.id, status: 'draft', subject_area: standards.length > 0 ? standards.join(', ') : null }),
    })
    const result = await res.json()
    if (result.error) { setVacError('Failed to create vacancy: ' + result.error) }
    else if (result.data) { setVacancies(v => [result.data, ...v]); setShowVacForm(false); setVacForm({ title: '', sector: '', type: 'Permanent', location: '', region: '', salary_min: '', salary_max: '', salary_display: '', description: '', slug: '' }); setMainRoleType(''); setStandards([]) }
    setSaving(false)
  }

  // ── Terms ──────────────────────────────────────────────────────────────────
  async function saveTerms() {
    setSavingTerms(true)
    await supabase.from('clients').update({
      fee_percentage: terms.fee_percentage,
      payment_terms_days: terms.payment_terms_days,
      rebate_weeks: terms.rebate_weeks,
      psl_status: terms.psl_status,
      tob_signed: terms.tob_signed,
      relationship_health: health,
      retention_risk: retentionRisk,
      next_review_date: nextReview || null,
    }).eq('id', client.id)
    setClient(c => ({ ...c, fee_percentage: terms.fee_percentage, payment_terms_days: terms.payment_terms_days, rebate_weeks: terms.rebate_weeks, psl_status: terms.psl_status, tob_signed: terms.tob_signed, relationship_health: health }))
    setTermsSaved(true)
    setTimeout(() => setTermsSaved(false), 3000)
    setSavingTerms(false)
  }

  async function generateTob() {
    setGeneratingTob(true); setTobError(null); setGeneratedTob(null)
    const res = await fetch('/api/crm/generate-tob', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client: { company_name: client.company_name, company_number: terms.company_number, trading_as: terms.trading_as, address: terms.address }, terms }),
    })
    const data = await res.json()
    if (data.tob) setGeneratedTob(data.tob)
    else setTobError(data.error ?? 'Generation failed.')
    setGeneratingTob(false)
  }

  function downloadTob() {
    if (!generatedTob) return
    const blob = new Blob([generatedTob], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `TOB_${client.company_name.replace(/\s/g, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function sendTobViaDocusign() {
  if (!generatedTob) {
    setTobError('Generate the Terms of Business before sending via DocuSign.')
    return
  }

  if (!selectedTobContact?.email) {
    setTobError('Choose a client contact with an email address before sending.')
    return
  }

  setSendingTobDocusign(true)
  setTobError(null)
  setTobDocusignMessage(null)

  const res = await fetch('/api/crm/docusign/send-tob', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: client.id,
      signer_name: selectedTobContact.name,
      signer_email: selectedTobContact.email,
      tob_text: generatedTob,
    }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    setTobError(data?.error || 'Could not send Terms of Business via DocuSign.')
    setSendingTobDocusign(false)
    return
  }

  setTobDocusignMessage(
    data?.message ||
      `Terms of Business sent to ${selectedTobContact.email} via DocuSign.`,
  )

  setClient(current => ({
  ...current,
  tob_url: data?.tobUrl ?? current.tob_url,
  docusign_tob_envelope_id: data?.envelopeId ?? null,
  docusign_tob_status: data?.status ?? 'sent',
  docusign_tob_sent_at: new Date().toISOString(),
  tob_signed: false,
} as any))

  setTerms(current => ({
    ...current,
    tob_signed: false,
  }))

  setSendingTobDocusign(false)
}

  const statusBadge: Record<string, { bg: string; text: string }> = {
    live: { bg: '#e8f5e8', text: '#217822' },
    draft: { bg: '#f0f0f2', text: '#737373' },
    closed: { bg: '#fef2f2', text: '#e53e3e' },
  }

  return (
    <div className="crm-page">
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="crm-page-header">
        <div>
          <div className="crm-breadcrumb">
            <Link href="/crm/clients" className="crm-breadcrumb-link">Clients</Link>
            <span>/</span><span>{client.company_name}</span>
          </div>
          <div className="crm-lead-header-title">
            {editingClientName ? (
  <form
    onSubmit={saveClientName}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    }}
  >
    <input
      className="crm-input"
      value={clientNameForm}
      onChange={event => setClientNameForm(event.target.value)}
      autoFocus
      style={{
        minWidth: 280,
        maxWidth: 420,
        height: 38,
        fontSize: 18,
        fontWeight: 900,
      }}
    />

    <button
      type="submit"
      className="crm-btn-primary crm-btn-sm"
      disabled={savingClientName}
    >
      {savingClientName ? 'Saving...' : 'Save'}
    </button>

    <button
      type="button"
      className="crm-btn-ghost crm-btn-sm"
      onClick={() => {
        setClientNameForm(client.company_name ?? '')
        setEditingClientName(false)
      }}
      disabled={savingClientName}
    >
      Cancel
    </button>
  </form>
) : (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    }}
  >
    <h1 className="crm-page-title">{client.company_name}</h1>

    <button
      type="button"
      className="crm-btn-ghost crm-btn-sm"
      onClick={() => {
        setClientNameForm(client.company_name ?? '')
        setEditingClientName(true)
      }}
    >
      Edit name
    </button>
  </div>
)}
            {health && (
              <span className="crm-badge" style={{ background: HEALTH_COLOURS[health]?.bg, color: HEALTH_COLOURS[health]?.text }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: HEALTH_COLOURS[health]?.dot, display: 'inline-block', marginRight: 5 }} />
                {health.charAt(0).toUpperCase() + health.slice(1)}
              </span>
            )}
            {retentionRisk && <span className="crm-badge" style={{ background: '#fef2f2', color: '#e53e3e' }}>⚠ Retention risk</span>}
            {client.ofsted_grade && (
              <span className="crm-badge" style={{ background: `${OFSTED_COLOURS[client.ofsted_grade] ?? '#737373'}18`, color: OFSTED_COLOURS[client.ofsted_grade] ?? '#737373' }}>
                Ofsted: {client.ofsted_grade}
              </span>
            )}
          </div>
        </div>
        <button className="crm-btn-primary" onClick={() => setShowVacForm(true)}>+ New Vacancy</button>
      </div>

      {/* ── TABS ────────────────────────────────────────────────────────────── */}
      <div className="crm-tabs">
 {[
  { id: 'overview', label: '◉ Overview' },
  { id: 'terms', label: '📋 Terms & Fees' },
  { id: 'vacancies', label: `◫ Vacancies (${vacancies.length})` },
  { id: 'placements', label: `✓ Placements (${placements.length})` },
  { id: 'documents', label: '📄 Documents' },
  { id: 'portal', label: '🔑 Portal Access' },
  { id: 'activity', label: `☰ Activity (${activities.length})` },
].map(t => (
    <button
      key={t.id}
      className={`crm-tab${activeTab === t.id ? ' active' : ''}`}
      onClick={() => setActiveTab(t.id as any)}
    >
      {t.label}
    </button>
  ))}
</div>

      {/* ══ ACTIVITY TAB ══════════════════════════════════════════════════════ */}
{activeTab === 'activity' && (
  <div className="crm-lead-layout">
    <div className="crm-lead-sidebar">
      <div className="crm-card">
        <h3 className="crm-card-title" style={{ marginBottom: 14 }}>
          Log activity
        </h3>

        <form onSubmit={addActivity}>
          <div className="crm-field">
            <label className="crm-label">Activity type</label>
            <select
              className="crm-select"
              value={actType}
              onChange={event => {
                setActType(event.target.value)
                if (event.target.value !== 'bd_meeting') resetBdForm()
              }}
            >
              {ACTIVITY_TYPES.map(type => (
                <option key={type.id} value={type.id}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="crm-form-row">
            <div className="crm-field">
              <label className="crm-label">Direction</label>
              <select
                className="crm-select"
                value={actDirection}
                onChange={event =>
                  setActDirection(
                    event.target.value as 'inbound' | 'outbound' | 'internal',
                  )
                }
              >
                <option value="outbound">Outbound</option>
                <option value="inbound">Inbound</option>
                <option value="internal">Internal</option>
              </select>
            </div>

            <div className="crm-field">
              <label className="crm-label">Contact</label>
              <select
                className="crm-select"
                value={actContactId}
                onChange={event => setActContactId(event.target.value)}
              >
                <option value="">No specific contact</option>
                {contacts.map(contact => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="crm-field">
            <label className="crm-label">Notes</label>
            <textarea
              className="crm-input"
              rows={4}
              placeholder={
                actType === 'bd_meeting'
                  ? 'Summary of the meeting...'
                  : `Log a ${actLabel(actType).toLowerCase()}...`
              }
              value={actContent}
              onChange={event => setActContent(event.target.value)}
              style={{
                lineHeight: 1.6,
                resize: 'vertical',
                minHeight: 96,
              }}
            />
          </div>

          {actType === 'bd_meeting' && (
            <div
              className="crm-card"
              style={{
                marginTop: 14,
                marginBottom: 14,
                background: 'var(--light-bg)',
                boxShadow: 'none',
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 900,
                  color: 'var(--primary)',
                  marginBottom: 12,
                }}
              >
                BD meeting notes
              </p>

              <div className="crm-field">
                <label className="crm-label">Attendees</label>
                <input
                  className="crm-input"
                  value={bdForm.attendees}
                  onChange={event =>
                    setBdForm(form => ({
                      ...form,
                      attendees: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="crm-field">
                <label className="crm-label">Pain points</label>
                <textarea
                  className="crm-input"
                  rows={2}
                  value={bdForm.pain_points}
                  onChange={event =>
                    setBdForm(form => ({
                      ...form,
                      pain_points: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="crm-field">
                <label className="crm-label">Roles to fill</label>
                <textarea
                  className="crm-input"
                  rows={2}
                  value={bdForm.roles_to_fill}
                  onChange={event =>
                    setBdForm(form => ({
                      ...form,
                      roles_to_fill: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="crm-field">
                <label className="crm-label">PSL / agencies</label>
                <textarea
                  className="crm-input"
                  rows={2}
                  value={bdForm.psl_agencies}
                  onChange={event =>
                    setBdForm(form => ({
                      ...form,
                      psl_agencies: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="crm-form-row">
                <div className="crm-field">
                  <label className="crm-label">Salary notes</label>
                  <textarea
                    className="crm-input"
                    rows={2}
                    value={bdForm.salary_notes}
                    onChange={event =>
                      setBdForm(form => ({
                        ...form,
                        salary_notes: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="crm-field">
                  <label className="crm-label">Retention notes</label>
                  <textarea
                    className="crm-input"
                    rows={2}
                    value={bdForm.retention_notes}
                    onChange={event =>
                      setBdForm(form => ({
                        ...form,
                        retention_notes: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="crm-form-row">
                <div className="crm-field">
                  <label className="crm-label">Fee agreed</label>
                  <input
                    className="crm-input"
                    value={bdForm.fee_agreed}
                    onChange={event =>
                      setBdForm(form => ({
                        ...form,
                        fee_agreed: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="crm-field">
                  <label className="crm-label">Decision maker</label>
                  <input
                    className="crm-input"
                    value={bdForm.decision_maker}
                    onChange={event =>
                      setBdForm(form => ({
                        ...form,
                        decision_maker: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="crm-field">
                <label className="crm-label">Next steps</label>
                <textarea
                  className="crm-input"
                  rows={2}
                  value={bdForm.next_steps}
                  onChange={event =>
                    setBdForm(form => ({
                      ...form,
                      next_steps: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="crm-field">
                <label className="crm-label">Follow-up date</label>
                <input
                  type="date"
                  className="crm-input"
                  value={bdForm.follow_up_date}
                  onChange={event =>
                    setBdForm(form => ({
                      ...form,
                      follow_up_date: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="crm-btn-primary"
            disabled={addingActivity}
            style={{ width: '100%' }}
          >
            {addingActivity ? 'Saving...' : `Log ${actLabel(actType)}`}
          </button>
        </form>
      </div>
    </div>

    <div className="crm-lead-content">
      <div className="crm-section-block">
        <div className="crm-section-block-header">
          <h2 className="crm-section-heading">Activity</h2>
          <span className="crm-badge crm-badge-blue">
            {activities.length}
          </span>
        </div>

        {activities.length === 0 && (
          <p className="crm-empty">No client activity logged yet.</p>
        )}

        <div style={{ display: 'grid', gap: 12 }}>
          {activities.map(activity => (
            <div key={activity.id} className="crm-card">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      className="crm-badge"
                      style={{
                        background: 'var(--primary-light)',
                        color: 'var(--primary)',
                      }}
                    >
                      {actIcon(activity.activity_type)}{' '}
                      {actLabel(activity.activity_type)}
                    </span>

                    {activity.direction && (
                      <span className="crm-badge crm-badge-blue">
                        {activity.direction}
                      </span>
                    )}

                    {activity.client_contacts?.name && (
                      <span
                        className="crm-badge"
                        style={{
                          background: '#f8fafc',
                          color: '#475569',
                        }}
                      >
                        {activity.client_contacts.name}
                      </span>
                    )}

                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        fontWeight: 700,
                      }}
                    >
                      {new Date(activity.created_at).toLocaleString('en-GB')}
                    </span>
                  </div>

                  {activity.content && (
                    <p
                      style={{
                        fontSize: 13,
                        color: 'var(--text-dark)',
                        lineHeight: 1.65,
                        whiteSpace: 'pre-wrap',
                        marginBottom:
                          activity.activity_type === 'bd_meeting' ? 12 : 0,
                      }}
                    >
                      {activity.content}
                    </p>
                  )}

                  {activity.activity_type === 'bd_meeting' && (
                    <div
                      style={{
                        display: 'grid',
                        gap: 8,
                        padding: 12,
                        borderRadius: 12,
                        background: 'var(--light-bg)',
                        border: '1px solid var(--border-light)',
                      }}
                    >
                      {activity.attendees && (
                        <p style={{ fontSize: 12, margin: 0 }}>
                          <strong>Attendees:</strong> {activity.attendees}
                        </p>
                      )}
                      {activity.pain_points && (
                        <p style={{ fontSize: 12, margin: 0 }}>
                          <strong>Pain points:</strong> {activity.pain_points}
                        </p>
                      )}
                      {activity.roles_to_fill && (
                        <p style={{ fontSize: 12, margin: 0 }}>
                          <strong>Roles to fill:</strong>{' '}
                          {activity.roles_to_fill}
                        </p>
                      )}
                      {activity.psl_agencies && (
                        <p style={{ fontSize: 12, margin: 0 }}>
                          <strong>PSL / agencies:</strong>{' '}
                          {activity.psl_agencies}
                        </p>
                      )}
                      {activity.salary_notes && (
                        <p style={{ fontSize: 12, margin: 0 }}>
                          <strong>Salary notes:</strong>{' '}
                          {activity.salary_notes}
                        </p>
                      )}
                      {activity.retention_notes && (
                        <p style={{ fontSize: 12, margin: 0 }}>
                          <strong>Retention notes:</strong>{' '}
                          {activity.retention_notes}
                        </p>
                      )}
                      {activity.fee_agreed && (
                        <p style={{ fontSize: 12, margin: 0 }}>
                          <strong>Fee agreed:</strong> {activity.fee_agreed}
                        </p>
                      )}
                      {activity.decision_maker && (
                        <p style={{ fontSize: 12, margin: 0 }}>
                          <strong>Decision maker:</strong>{' '}
                          {activity.decision_maker}
                        </p>
                      )}
                      {activity.next_steps && (
                        <p style={{ fontSize: 12, margin: 0 }}>
                          <strong>Next steps:</strong> {activity.next_steps}
                        </p>
                      )}
                      {activity.follow_up_date && (
                        <p style={{ fontSize: 12, margin: 0 }}>
                          <strong>Follow-up:</strong>{' '}
                          {new Date(
                            activity.follow_up_date,
                          ).toLocaleDateString('en-GB')}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="crm-icon-btn crm-icon-btn-danger"
                  onClick={() => deleteActivity(activity.id)}
                  title="Delete activity"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
)}
      
      {/* ══ OVERVIEW TAB ══════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="crm-lead-layout">
          {/* Left sidebar */}
          <div className="crm-lead-sidebar">
            {/* Company intel */}
            <div className="crm-card">
              <h3 className="crm-card-title" style={{ marginBottom: 14 }}>Company</h3>
              <div className="crm-detail-list">
                {client.sector && <div className="crm-detail-row"><span className="crm-detail-label">Sector</span><span className="crm-detail-value" style={{ fontSize: 12, textAlign: 'right' }}>{client.sector}</span></div>}
                {client.region && <div className="crm-detail-row"><span className="crm-detail-label">Region</span><span className="crm-detail-value">{client.region}</span></div>}
                {client.ukprn && <div className="crm-detail-row"><span className="crm-detail-label">UKPRN</span><span className="crm-detail-value" style={{ fontFamily: 'monospace' }}>{client.ukprn}</span></div>}
                {client.esfa_funding && <div className="crm-detail-row"><span className="crm-detail-label">ESFA funding</span><span className="crm-detail-value">£{(client.esfa_funding / 1000000).toFixed(1)}m</span></div>}
                {client.website && <div className="crm-detail-row"><span className="crm-detail-label">Website</span><a href={client.website} target="_blank" rel="noopener noreferrer" className="crm-detail-link">Visit ↗</a></div>}
                {client.email && <div className="crm-detail-row"><span className="crm-detail-label">Email</span><a href={`mailto:${client.email}`} className="crm-detail-link" style={{ fontSize: 12 }}>{client.email}</a></div>}
                {client.phone && <div className="crm-detail-row"><span className="crm-detail-label">Phone</span><a href={`tel:${client.phone}`} className="crm-detail-link">{client.phone}</a></div>}
                {client.portal_email && <div className="crm-detail-row"><span className="crm-detail-label">Portal login</span><span className="crm-detail-value" style={{ fontSize: 11 }}>{client.portal_email}</span></div>}
              </div>
              {client.frameworks && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-light)' }}>
                  <p className="crm-detail-label" style={{ marginBottom: 8 }}>Frameworks delivered</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {client.frameworks.split(',').map(f => f.trim()).filter(Boolean).map(f => (
                      <span key={f} className="crm-badge crm-badge-blue" style={{ fontSize: 10 }}>{f}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Provider locations */}
<div className="crm-card">
  <div className="crm-card-header">
    <h3 className="crm-card-title">Provider locations</h3>
    <button
      type="button"
      className="crm-btn-primary crm-btn-sm"
      onClick={() => setShowSiteForm(true)}
    >
      + Add site
    </button>
  </div>

  <div
    style={{
      padding: 12,
      borderRadius: 12,
      background: 'var(--light-bg)',
      border: '1px solid var(--border-light)',
      marginBottom: 12,
    }}
  >
    <p
      style={{
        margin: 0,
        marginBottom: 10,
        fontSize: 13,
        fontWeight: 900,
        color: 'var(--text-dark)',
      }}
    >
      Main office
    </p>

    <div className="crm-field">
      <label className="crm-label">Address line 1</label>
      <input
        className="crm-input"
        value={mainOfficeForm.main_office_address_line_1}
        onChange={e =>
          setMainOfficeForm(form => ({
            ...form,
            main_office_address_line_1: e.target.value,
          }))
        }
      />
    </div>

    <div className="crm-field">
      <label className="crm-label">Address line 2</label>
      <input
        className="crm-input"
        value={mainOfficeForm.main_office_address_line_2}
        onChange={e =>
          setMainOfficeForm(form => ({
            ...form,
            main_office_address_line_2: e.target.value,
          }))
        }
      />
    </div>

    <div className="crm-form-row">
      <div className="crm-field">
        <label className="crm-label">Town / city</label>
        <input
          className="crm-input"
          value={mainOfficeForm.main_office_town_city}
          onChange={e =>
            setMainOfficeForm(form => ({
              ...form,
              main_office_town_city: e.target.value,
            }))
          }
        />
      </div>

      <div className="crm-field">
        <label className="crm-label">County</label>
        <input
          className="crm-input"
          value={mainOfficeForm.main_office_county}
          onChange={e =>
            setMainOfficeForm(form => ({
              ...form,
              main_office_county: e.target.value,
            }))
          }
        />
      </div>
    </div>

    <div className="crm-field">
      <label className="crm-label">Postcode</label>
      <input
        className="crm-input"
        value={mainOfficeForm.main_office_postcode}
        onChange={e =>
          setMainOfficeForm(form => ({
            ...form,
            main_office_postcode: e.target.value,
          }))
        }
        placeholder="e.g. B1 1AA"
      />
    </div>

    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        marginTop: 10,
      }}
    >
      <span
        className="crm-badge"
        style={{
          background:
            client.main_office_lat && client.main_office_lng
              ? '#e8f5e8'
              : '#fffbeb',
          color:
            client.main_office_lat && client.main_office_lng
              ? '#217822'
              : '#d97706',
        }}
      >
        {client.main_office_lat && client.main_office_lng
          ? 'Geocoded'
          : 'Will geocode on save'}
      </span>

      <button
        type="button"
        className="crm-btn-primary crm-btn-sm"
        onClick={saveMainOffice}
        disabled={savingMainOffice}
      >
        {savingMainOffice ? 'Saving...' : 'Save office'}
      </button>
    </div>
  </div>

  {sites.length === 0 && (
    <p className="crm-empty">No additional provider sites added yet.</p>
  )}

  {sites.map(site => (
    <div key={site.id} className="ld-contact-card">
      <div className="ld-contact-top">
        <div className="ld-contact-avatar">
          {site.site_name
            .split(' ')
            .map(part => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()}
        </div>

        <div className="ld-contact-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <p className="ld-contact-name">{site.site_name}</p>

            <span
              className="crm-badge"
              style={{
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                fontSize: 9,
              }}
            >
              {site.site_type || 'branch'}
            </span>
          </div>

          <p className="ld-contact-title">
            {[
              site.address_line_1,
              site.town_city,
              site.county,
              site.postcode,
            ]
              .filter(Boolean)
              .join(', ') || 'Address not recorded'}
          </p>

          {site.notes && (
            <p
              style={{
                marginTop: 5,
                fontSize: 11,
                color: 'var(--text-muted)',
                lineHeight: 1.5,
              }}
            >
              {site.notes}
            </p>
          )}
        </div>

        <div className="ld-contact-actions">
          <button
            type="button"
            className="crm-icon-btn crm-icon-btn-danger"
            onClick={() => deleteSite(site.id)}
            disabled={deletingSiteId === site.id}
            title="Delete site"
          >
            {deletingSiteId === site.id ? '…' : '✕'}
          </button>
        </div>
      </div>

      <div className="ld-contact-links">
        {site.email && (
          <a href={`mailto:${site.email}`} className="ld-contact-link">
            ✉️ {site.email}
          </a>
        )}

        {site.phone && (
          <a href={`tel:${site.phone}`} className="ld-contact-link">
            📞 {site.phone}
          </a>
        )}

        {site.lat && site.lng && (
          <span className="ld-contact-link">📍 Geocoded</span>
        )}
      </div>
    </div>
  ))}

  {showSiteForm && (
    <form onSubmit={addSite} className="ld-contact-form">
      <div className="crm-form-row">
        <div className="crm-field">
          <label className="crm-label">Site name *</label>
          <input
            className="crm-input"
            required
            value={siteForm.site_name}
            onChange={e =>
              setSiteForm(form => ({
                ...form,
                site_name: e.target.value,
              }))
            }
            placeholder="e.g. Birmingham Campus"
          />
        </div>

        <div className="crm-field">
          <label className="crm-label">Site type</label>
          <select
            className="crm-select"
            value={siteForm.site_type}
            onChange={e =>
              setSiteForm(form => ({
                ...form,
                site_type: e.target.value,
              }))
            }
          >
            <option value="branch">Branch</option>
            <option value="campus">Campus</option>
            <option value="delivery_site">Delivery site</option>
            <option value="head_office">Head office</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="crm-form-row">
        <div className="crm-field">
          <label className="crm-label">Address line 1</label>
          <input
            className="crm-input"
            value={siteForm.address_line_1}
            onChange={e =>
              setSiteForm(form => ({
                ...form,
                address_line_1: e.target.value,
              }))
            }
          />
        </div>

        <div className="crm-field">
          <label className="crm-label">Address line 2</label>
          <input
            className="crm-input"
            value={siteForm.address_line_2}
            onChange={e =>
              setSiteForm(form => ({
                ...form,
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
            value={siteForm.town_city}
            onChange={e =>
              setSiteForm(form => ({
                ...form,
                town_city: e.target.value,
              }))
            }
          />
        </div>

        <div className="crm-field">
          <label className="crm-label">County</label>
          <input
            className="crm-input"
            value={siteForm.county}
            onChange={e =>
              setSiteForm(form => ({
                ...form,
                county: e.target.value,
              }))
            }
          />
        </div>
      </div>

      <div className="crm-form-row">
        <div className="crm-field">
          <label className="crm-label">Postcode</label>
          <input
            className="crm-input"
            value={siteForm.postcode}
            onChange={e =>
              setSiteForm(form => ({
                ...form,
                postcode: e.target.value,
              }))
            }
            placeholder="e.g. B1 1AA"
          />
        </div>

        <div className="crm-field">
          <label className="crm-label">Phone</label>
          <input
            className="crm-input"
            value={siteForm.phone}
            onChange={e =>
              setSiteForm(form => ({
                ...form,
                phone: e.target.value,
              }))
            }
          />
        </div>
      </div>

      <div className="crm-field">
        <label className="crm-label">Email</label>
        <input
          className="crm-input"
          type="email"
          value={siteForm.email}
          onChange={e =>
            setSiteForm(form => ({
              ...form,
              email: e.target.value,
            }))
          }
        />
      </div>

      <div className="crm-field">
        <label className="crm-label">Notes</label>
        <textarea
          className="crm-input"
          rows={2}
          value={siteForm.notes}
          onChange={e =>
            setSiteForm(form => ({
              ...form,
              notes: e.target.value,
            }))
          }
          placeholder="Anything useful about this site..."
        />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="crm-btn-ghost crm-btn-sm"
          onClick={() => setShowSiteForm(false)}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="crm-btn-primary crm-btn-sm"
          disabled={addingSite}
        >
          {addingSite ? 'Adding...' : 'Add site'}
        </button>
      </div>
    </form>
  )}
</div>

            {/* Relationship health */}
            <div className="crm-card">
              <h3 className="crm-card-title" style={{ marginBottom: 14 }}>Relationship</h3>
              <div className="crm-field" style={{ marginBottom: 12 }}>
                <label className="crm-label">Temperature</label>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  {['hot','warm','cold'].map(h => (
                    <button key={h} onClick={() => setHealth(h)}
                      className="crm-btn-ghost crm-btn-sm"
                      style={{ flex: 1, background: health === h ? HEALTH_COLOURS[h].bg : undefined, color: health === h ? HEALTH_COLOURS[h].text : undefined, borderColor: health === h ? HEALTH_COLOURS[h].dot : undefined, textTransform: 'capitalize' }}
                    >
                      {h === 'hot' ? '🔥' : h === 'warm' ? '☀️' : '🧊'} {h}
                    </button>
                  ))}
                </div>
              </div>
              <div className="crm-field" style={{ marginBottom: 12 }}>
                <label className="crm-label">Next review</label>
                <input className="crm-input" type="date" value={nextReview} onChange={e => setNextReview(e.target.value)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <input type="checkbox" id="retention" checked={retentionRisk} onChange={e => setRetentionRisk(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                <label htmlFor="retention" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', cursor: 'pointer' }}>Flag retention risk</label>
              </div>
              <button className="crm-btn-primary crm-btn-sm" style={{ width: '100%' }} onClick={saveTerms} disabled={savingTerms}>
                {savingTerms ? 'Saving...' : 'Save'}
              </button>
            </div>

            {/* Stats */}
<div className="crm-card crm-lead-stats-card">
  <div className="crm-lead-stat">
    <span className="crm-lead-stat-num">{liveVacs.length}</span>
    <span className="crm-lead-stat-label">Live roles</span>
  </div>

  <div className="crm-lead-stat-divider" />

  <div className="crm-lead-stat">
    <span className="crm-lead-stat-num">{totalApps}</span>
    <span className="crm-lead-stat-label">Applications</span>
  </div>

  <div className="crm-lead-stat-divider" />

  <div className="crm-lead-stat">
    <span className="crm-lead-stat-num">{placedCount}</span>
    <span className="crm-lead-stat-label">Placed</span>
  </div>
</div>
</div>

{/* Right — contacts */}
<div className="crm-lead-content">
            <div className="crm-section-block">
              <div className="crm-section-block-header">
                <h2 className="crm-section-heading">Contacts</h2>
                <button
                  type="button"
                  className="crm-btn-primary crm-btn-sm"
                  onClick={openAddContactForm}
                >
                  + Add contact
                </button>
              </div>

              {contacts.length === 0 && !showContactForm && <p className="crm-empty">No contacts yet.</p>}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {contacts.map(contact => (
                  <div key={contact.id} className="ld-contact-card">
                    <div className="ld-contact-top">
                      <div className="ld-contact-avatar">{contact.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</div>
                      <div className="ld-contact-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <p className="ld-contact-name">{contact.name}</p>
                          {contact.is_primary && <span className="crm-badge" style={{ background: '#e8f5e8', color: '#217822', fontSize: 9 }}>Primary</span>}
                        </div>
                        <p className="ld-contact-title">{contact.title || 'No title recorded'}</p>
                        <span className="crm-badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontSize: 9, marginTop: 3 }}>{contact.role_type}</span>
                      </div>
                      <div className="ld-contact-actions">
                        <button
                          type="button"
                          className="crm-icon-btn"
                          onClick={() => openEditContactForm(contact)}
                          title="Edit contact"
                        >
                          ✎
                        </button>
                        {!contact.is_primary && (
                          <button
                            type="button"
                            className="crm-icon-btn"
                            onClick={() => setPrimary(contact.id)}
                            title="Set primary"
                          >
                            ★
                          </button>
                        )}
                        <button
                          type="button"
                          className="crm-icon-btn crm-icon-btn-danger"
                          onClick={() => deleteContact(contact.id)}
                          title="Delete contact"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <div className="ld-contact-links">
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} className="ld-contact-link">✉️ {contact.email}</a>
                      ) : (
                        <span className="ld-contact-link">✉️ No email</span>
                      )}

                      {contact.phone ? (
                        <a href={`tel:${contact.phone}`} className="ld-contact-link">📞 {contact.phone}</a>
                      ) : (
                        <span className="ld-contact-link">📞 No phone</span>
                      )}

                      {contact.linkedin && <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="ld-contact-link">💼 LinkedIn</a>}
                    </div>
                  </div>
                ))}
              </div>

              {showContactForm && (
                <form onSubmit={saveContact} className="ld-contact-form" style={{ marginTop: 12 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 12,
                    }}
                  >
                    <h3 className="crm-card-title">
                      {editingContactId ? 'Edit contact' : 'Add contact'}
                    </h3>

                    {editingContactId && (
                      <span className="crm-badge crm-badge-blue">
                        Updating existing contact
                      </span>
                    )}
                  </div>

                  <div className="crm-form-row">
                    <div className="crm-field"><label className="crm-label">Name *</label><input className="crm-input" required value={contactForm.name} onChange={e => setContactForm(f => ({...f, name: e.target.value}))} /></div>
                    <div className="crm-field"><label className="crm-label">Title</label><input className="crm-input" value={contactForm.title} onChange={e => setContactForm(f => ({...f, title: e.target.value}))} /></div>
                  </div>
                  <div className="crm-form-row">
                    <div className="crm-field"><label className="crm-label">Email</label><input className="crm-input" type="email" value={contactForm.email} onChange={e => setContactForm(f => ({...f, email: e.target.value}))} /></div>
                    <div className="crm-field"><label className="crm-label">Phone</label><input className="crm-input" value={contactForm.phone} onChange={e => setContactForm(f => ({...f, phone: e.target.value}))} /></div>
                  </div>
                  <div className="crm-form-row">
                    <div className="crm-field"><label className="crm-label">LinkedIn</label><input className="crm-input" value={contactForm.linkedin} onChange={e => setContactForm(f => ({...f, linkedin: e.target.value}))} /></div>
                    <div className="crm-field"><label className="crm-label">Role type</label>
                      <select className="crm-select" value={contactForm.role_type} onChange={e => setContactForm(f => ({...f, role_type: e.target.value}))}>
                        {ROLE_TYPES.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <input
                      type="checkbox"
                      id="contact-primary"
                      checked={contactForm.is_primary}
                      onChange={e => setContactForm(f => ({...f, is_primary: e.target.checked}))}
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                    <label
                      htmlFor="contact-primary"
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text-dark)',
                        cursor: 'pointer',
                      }}
                    >
                      Set as primary contact
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button type="button" className="crm-btn-ghost crm-btn-sm" onClick={resetContactForm}>Cancel</button>
                    <button type="submit" className="crm-btn-primary crm-btn-sm" disabled={addingContact}>
                      {addingContact
                        ? 'Saving...'
                        : editingContactId
                          ? 'Save changes'
                          : 'Add contact'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ TERMS & FEES TAB ══════════════════════════════════════════════════ */}
      {activeTab === 'terms' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Agreed commercial terms */}
          <div className="crm-card">
            <h3 className="crm-card-title" style={{ marginBottom: 16 }}>Agreed commercial terms</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div className="crm-field">
                <label className="crm-label">Fee %</label>
                <div style={{ position: 'relative' }}>
                  <input className="crm-input" type="number" min={0} max={30} step={0.5} value={terms.fee_percentage} onChange={e => setTerms(f => ({...f, fee_percentage: parseFloat(e.target.value)}))} style={{ paddingRight: 28 }} />
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>%</span>
                </div>
              </div>
              <div className="crm-field">
                <label className="crm-label">Payment terms</label>
                <div style={{ position: 'relative' }}>
                  <input className="crm-input" type="number" value={terms.payment_terms_days} onChange={e => setTerms(f => ({...f, payment_terms_days: parseInt(e.target.value)}))} style={{ paddingRight: 40 }} />
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>days</span>
                </div>
              </div>
              <div className="crm-field">
                <label className="crm-label">Rebate period</label>
                <div style={{ position: 'relative' }}>
                  <input className="crm-input" type="number" value={terms.rebate_weeks} onChange={e => setTerms(f => ({...f, rebate_weeks: parseInt(e.target.value)}))} style={{ paddingRight: 48 }} />
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>weeks</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div className="crm-field">
                <label className="crm-label">PSL status</label>
                <select className="crm-select" value={terms.psl_status} onChange={e => setTerms(f => ({...f, psl_status: e.target.value}))}>
                  <option value="exclusive">Exclusive</option>
                  <option value="preferred">Preferred Supplier (PSL)</option>
                  <option value="adhoc">Ad hoc</option>
                </select>
              </div>
              <div className="crm-field">
                <label className="crm-label">TOB status</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                  <input type="checkbox" id="tobsigned" checked={terms.tob_signed} onChange={e => setTerms(f => ({...f, tob_signed: e.target.checked}))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                  <label htmlFor="tobsigned" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', cursor: 'pointer' }}>
                    {terms.tob_signed ? '✓ Signed and returned' : 'Not yet signed'}
                  </label>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <input type="checkbox" id="exclusivity" checked={terms.exclusivity} onChange={e => setTerms(f => ({...f, exclusivity: e.target.checked}))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
              <label htmlFor="exclusivity" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', cursor: 'pointer' }}>Exclusivity clause included</label>
            </div>
            <button className="crm-btn-primary" onClick={saveTerms} disabled={savingTerms}>{savingTerms ? 'Saving...' : 'Save terms'}</button>
            {termsSaved && <span style={{ fontSize: 12, color: '#217822', fontWeight: 700, marginLeft: 12 }}>✓ Saved</span>}
          </div>

          {/* Fee calculator */}
          <div className="crm-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 className="crm-card-title">Fee calculator</h3>
              {pipelineValue > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total pipeline value</p>
                  <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--primary)', letterSpacing: -1 }}>£{pipelineValue.toLocaleString()}</p>
                </div>
              )}
            </div>
            {vacancies.length === 0 ? (
              <p className="crm-empty">No vacancies yet — add a vacancy to see estimated fees.</p>
            ) : (
              <table className="crm-table">
                <thead><tr><th>Role</th><th>Salary</th><th>Est. fee ({terms.fee_percentage}%)</th><th>Status</th></tr></thead>
                <tbody>
                  {vacancies.map(v => {
                    const fee = calcFee(v)
                    return (
                      <tr key={v.id} onClick={() => router.push(`/crm/vacancies/${v.id}`)} className="crm-table-row-clickable">
                        <td><p className="crm-table-main">{v.title}</p></td>
                        <td>{v.salary_display || '—'}</td>
                        <td>
                          {fee ? <span style={{ fontWeight: 700, color: '#217822' }}>£{fee.toLocaleString()}</span> : <span style={{ color: 'var(--text-muted)' }}>Add salary</span>}
                        </td>
                        <td><span className="crm-badge" style={{ background: statusBadge[v.status]?.bg, color: statusBadge[v.status]?.text }}>{v.status}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* TOB creator */}
          <div className="crm-card">
            <h3 className="crm-card-title" style={{ marginBottom: 4 }}>✦ Terms of Business Creator</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
              Generate a customised TOB based on Educated Appointments' standard terms with this client's details and agreed fee filled in.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="crm-field">
                <label className="crm-label">Client company number</label>
                <input className="crm-input" placeholder="e.g. 12345678" value={terms.company_number} onChange={e => setTerms(f => ({...f, company_number: e.target.value}))} />
              </div>
              <div className="crm-field">
                <label className="crm-label">Trading as (if different)</label>
                <input className="crm-input" placeholder={client.company_name} value={terms.trading_as} onChange={e => setTerms(f => ({...f, trading_as: e.target.value}))} />
              </div>
            </div>
            <div className="crm-field" style={{ marginBottom: 14 }}>
              <label className="crm-label">Client registered address</label>
              <input className="crm-input" placeholder="Full registered address" value={terms.address} onChange={e => setTerms(f => ({...f, address: e.target.value}))} />
            </div>
            <div className="crm-field" style={{ marginBottom: 16 }}>
              <label className="crm-label">Any additional agreed terms</label>
              <textarea className="crm-input" rows={3} placeholder="e.g. 3 free replacement within 6 months, volume discount above 5 placements per year..." value={terms.notes} onChange={e => setTerms(f => ({...f, notes: e.target.value}))} />
            </div>
            {tobError && <p style={{ fontSize: 12, color: '#e53e3e', fontWeight: 600, marginBottom: 10 }}>{tobError}</p>}
            <button className="crm-btn-ai" onClick={generateTob} disabled={generatingTob} style={{ width: '100%', justifyContent: 'center' }}>
              {generatingTob ? '✦ Generating TOB...' : '✦ Generate Terms of Business'}
            </button>

            {generatedTob && (
  <div style={{ marginTop: 20 }}>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 12,
        flexWrap: 'wrap',
      }}
    >
      <p
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: 'var(--primary)',
        }}
      >
        ✦ Generated TOB — review before sending
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="crm-btn-ghost crm-btn-sm"
          onClick={downloadTob}
        >
          ↓ Download
        </button>

        <button
          type="button"
          className="crm-btn-primary crm-btn-sm"
          onClick={sendTobViaDocusign}
          disabled={sendingTobDocusign}
        >
          {sendingTobDocusign ? 'Sending...' : 'Send via DocuSign'}
        </button>
      </div>
    </div>

    <div className="crm-field" style={{ marginBottom: 12 }}>
      <label className="crm-label">Send DocuSign to</label>
      <select
        className="crm-select"
        value={selectedTobContactId}
        onChange={event => setSelectedTobContactId(event.target.value)}
      >
        <option value="">Select signer...</option>
        {contacts
          .filter(contact => contact.email)
          .map(contact => (
            <option key={contact.id} value={contact.id}>
              {contact.name} — {contact.email}
            </option>
          ))}
      </select>
    </div>

    {tobDocusignMessage && (
      <p
        style={{
          fontSize: 12,
          color: '#217822',
          fontWeight: 700,
          marginBottom: 10,
        }}
      >
        ✓ {tobDocusignMessage}
      </p>
    )}

    <textarea
      className="crm-input"
      rows={24}
      value={generatedTob}
      onChange={e => setGeneratedTob(e.target.value)}
      style={{
        lineHeight: 1.7,
        fontFamily: 'inherit',
        fontSize: 12,
      }}
    />

    <p
      style={{
        fontSize: 11,
        color: 'var(--text-muted)',
        marginTop: 8,
        lineHeight: 1.6,
      }}
    >
      Review carefully before sending. This will send the current version of the Terms of Business to the selected contact via DocuSign.
    </p>
  </div>
)}
          </div>
        </div>
      )}

      {/* ══ VACANCIES TAB ═════════════════════════════════════════════════════ */}
      {activeTab === 'vacancies' && (
        <div className="crm-vacancies-list">
          {vacancies.map(v => {
            const fee = calcFee(v)
            return (
              <div key={v.id} className="crm-vacancy-row" onClick={() => router.push(`/crm/vacancies/${v.id}`)}>
                <div className="crm-vacancy-row-info">
                  <p className="crm-vacancy-row-title">{v.title}</p>
                  <p className="crm-vacancy-row-sub">{v.location} · {v.salary_display}</p>
                </div>
                <div className="crm-vacancy-row-right">
                  <span className="crm-badge" style={{ background: statusBadge[v.status]?.bg, color: statusBadge[v.status]?.text }}>{v.status}</span>
                  <span className="crm-badge crm-badge-blue">{v.applications?.length ?? 0} applicants</span>
                  {fee && <span style={{ fontSize: 12, fontWeight: 700, color: '#217822' }}>Est. £{fee.toLocaleString()}</span>}
                </div>
              </div>
            )
          })}
          {vacancies.length === 0 && <p className="crm-empty">No vacancies yet.</p>}
        </div>
      )}

      {activeTab === 'portal' && (
  <ClientPortalAccessPanel
    clientId={client.id}
    contacts={contacts}
    initialPortalUsers={portalUsers}
  />
)}
      
      {/* ══ PLACEMENTS TAB ════════════════════════════════════════════════════ */}
      {activeTab === 'placements' && (
       <ClientPlacementsTab placements={placements} />
      )}
      
      {/* ══ DOCUMENTS TAB ═════════════════════════════════════════════════════ */}
      {activeTab === 'documents' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { label: 'Terms of Business', url: client.tob_url, icon: '📋', colour: '#352DEB', note: terms.tob_signed ? 'Signed ✓' : 'Not yet signed' },
            { label: 'DBS Policy', url: client.dbs_policy_url, icon: '🔒', colour: '#217822', note: 'Client DBS checking policy' },
          ].map(doc => (
            <div key={doc.label} className="crm-card" style={{ display: 'flex', flex: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${doc.colour}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{doc.icon}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-dark)' }}>{doc.label}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{doc.note}</p>
                </div>
              </div>
              {doc.url ? (
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="crm-btn-ghost crm-btn-sm" style={{ marginTop: 10, display: 'inline-flex' }}>↓ Download</a>
              ) : (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>Not uploaded yet. Use the Terms & Fees tab to generate or upload.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── New Vacancy Modal ────────────────────────────────────────────────── */}
      {showVacForm && (
        <>
          <div className="crm-modal-backdrop" onClick={() => setShowVacForm(false)} />
          <div className="crm-modal crm-modal-wide">
            <div className="crm-modal-header"><h2 className="crm-modal-title">New Vacancy — {client.company_name}</h2><button className="crm-modal-close" onClick={() => setShowVacForm(false)}>✕</button></div>
            <form onSubmit={createVacancy} className="crm-modal-form">
              <div className="crm-field"><label className="crm-label">Job title *</label><input className="crm-input" required value={vacForm.title} onChange={e => setVacForm(f => ({...f, title: e.target.value}))} /></div>
              <div className="crm-form-row">
                <div className="crm-field">
                  <label className="crm-label">Main role type</label>
                  <select className="crm-select" value={mainRoleType} onChange={e => { setMainRoleType(e.target.value); setVacForm(f => ({...f, sector: ''})); setStandards([]) }}>
                    <option value="">Select type...</option>
                    {crmMainRoleTypes.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="crm-field">
                  <label className="crm-label">Specific role</label>
                  <select className="crm-select" value={vacForm.sector} onChange={e => setVacForm(f => ({...f, sector: e.target.value}))} disabled={!mainRoleType}>
                    <option value="">{mainRoleType ? 'Select role...' : 'Select type first'}</option>
                    {mainRoleType && crmRoleTypeHierarchy[mainRoleType]?.subTypes.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              {mainRoleType && crmRoleTypeHierarchy[mainRoleType]?.hasStandards && (
                <div className="crm-field">
                  <label className="crm-label">Apprenticeship standards required</label>
                  <StandardsSelector selected={standards} onChange={setStandards} />
                </div>
              )}
              <div className="crm-form-row">
                <div className="crm-field"><label className="crm-label">Contract type</label>
                  <select className="crm-select" value={vacForm.type} onChange={e => setVacForm(f => ({...f, type: e.target.value}))}><option>Permanent</option><option>Contract</option><option>Freelance</option></select>
                </div>
                <div className="crm-field"><label className="crm-label">Location</label><input className="crm-input" placeholder="e.g. Birmingham" value={vacForm.location} onChange={e => setVacForm(f => ({...f, location: e.target.value}))} /></div>
              </div>
              <div className="crm-form-row">
                <div className="crm-field"><label className="crm-label">Region</label>
                  <select className="crm-select" value={vacForm.region} onChange={e => setVacForm(f => ({...f, region: e.target.value}))}>
                    {VACANCY_REGIONS.map(r => <option key={r} value={r}>{r || 'Select region...'}</option>)}
                  </select>
                </div>
                <div className="crm-field"><label className="crm-label">Salary min</label><input className="crm-input" type="number" placeholder="35000" value={vacForm.salary_min} onChange={e => setVacForm(f => ({...f, salary_min: e.target.value}))} /></div>
              </div>
              <div className="crm-field"><label className="crm-label">Salary max</label><input className="crm-input" type="number" placeholder="45000" value={vacForm.salary_max} onChange={e => setVacForm(f => ({...f, salary_max: e.target.value}))} /></div>
              {vacError && <p style={{ fontSize: 12, color: '#e53e3e', fontWeight: 600 }}>{vacError}</p>}
              <div className="crm-modal-footer">
                <button type="button" className="crm-btn-ghost" onClick={() => setShowVacForm(false)}>Cancel</button>
                <button type="submit" className="crm-btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create vacancy'}</button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
function ClientPlacementsTab({
  placements,
}: {
  placements: Placement[]
}) {
  function formatDate(value?: string | null) {
    if (!value) return '—'

    return new Date(value).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  function formatMoney(value?: number | string | null) {
    if (value === null || value === undefined || value === '') return '—'

    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      maximumFractionDigits: 0,
    }).format(Number(value))
  }

  function candidateName(candidate: Placement['candidates']) {
    return (
      `${candidate?.first_name ?? ''} ${candidate?.last_name ?? ''}`.trim() ||
      'Unknown candidate'
    )
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
            Confirmed placements linked to this client.
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
            <th>Candidate</th>
            <th>Vacancy</th>
            <th>Start date</th>
            <th>Salary</th>
            <th>Fee</th>
            <th>Invoice</th>
            <th>Docs</th>
            <th>Aftercare</th>
            <th />
          </tr>
        </thead>

        <tbody>
          {placements.map(placement => {
            const tasks = Array.isArray(placement.placement_tasks)
              ? placement.placement_tasks
              : []

            const completedTasks = tasks.filter(task => task.completed).length

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
                    {candidateName(placement.candidates)}
                  </p>
                  <p className="crm-table-sub">
                    {placement.candidates?.job_title ||
                      placement.candidates?.email ||
                      placement.candidates?.phone ||
                      '—'}
                  </p>
                </td>

                <td>
                  <p className="crm-table-main">
                    {placement.vacancies?.title || 'No vacancy'}
                  </p>
                  <p className="crm-table-sub">
                    {placement.vacancies?.location ||
                      placement.vacancies?.region ||
                      '—'}
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
                  <span className="crm-badge crm-badge-blue">
                    {String(placement.invoice_status || 'not_invoiced').replace(
                      /_/g,
                      ' ',
                    )}
                  </span>
                </td>

                <td>
                  <span
                    className="crm-badge"
                    style={{
                      background: placement.final_documents_released
                        ? '#e8f5e8'
                        : '#fffbeb',
                      color: placement.final_documents_released
                        ? '#217822'
                        : '#d97706',
                    }}
                  >
                    {placement.final_documents_released ? 'Released' : 'Pending'}
                  </span>
                </td>

                <td>
                  <span className="crm-badge crm-badge-blue">
                    {completedTasks}/{tasks.length}
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
          No placements linked to this client yet.
        </p>
      )}
    </div>
  )
}