'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import MeetingRecorder from './MeetingRecorder'

// ── Types ─────────────────────────────────────────────────────────────────────
type Lead = {
  id: string
  company_name: string
  contact_name: string | null
  contact_title: string | null
  email: string | null
  phone: string | null
  website: string | null
  main_office_address_line_1: string | null
  main_office_address_line_2: string | null
  main_office_town_city: string | null
  main_office_county: string | null
  main_office_postcode: string | null
  main_office_lat: number | null
  main_office_lng: number | null
  linkedin: string | null
  linkedin_company: string | null
  status: string
  region: string | null
  sector: string | null
  source: string | null
  ukprn: string | null
  ofsted_grade: string | null
  ofsted_date: string | null
  esfa_funding: number | null
  frameworks: string | null
  current_agencies: string | null
  fee_agreed: string | null
  decision_timeline: string | null
  warm_cold: string | null
  notes: string | null
  client_id?: string | null
  converted_at?: string | null
}

type Contact = {
  id: string
  name: string
  title: string | null
  email: string | null
  phone: string | null
  linkedin: string | null
  role_type: string
  is_primary: boolean
}

type Activity = {
  id: string
  activity_type: string
  direction: 'inbound' | 'outbound' | 'internal' | null
  contact_id: string | null
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
  lead_contacts?: {
    id: string
    name: string
    title: string | null
    email: string | null
    phone: string | null
  } | null
}

type Task = {
  id: string
  title: string
  due_date: string | null
  completed: boolean
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

const ACTIVITY_TYPES = [
  { id: 'call', label: 'Call', icon: '📞' },
  { id: 'email', label: 'Email', icon: '✉️' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { id: 'sms', label: 'SMS', icon: '💬' },
  { id: 'meeting', label: 'Meeting', icon: '🤝' },
  { id: 'bd_meeting', label: 'BD Meeting', icon: '📋' },
  { id: 'note', label: 'Note', icon: '📝' },
]

const STATUS_OPTS = [
  'new',
  'contacted',
  'meeting_booked',
  'proposal_sent',
  'follow_up',
  'converted',
  'lost',
]

const ROLE_TYPES = [
  'Decision Maker',
  'Influencer',
  'Day-to-day',
  'Finance',
  'HR',
]

const SECTORS = [
  'Independent Training Provider',
  'Further Education College',
  'Sixth Form College',
  'University / Higher Education',
  'School / Academy',
  'Local Authority Provider',
  'Third Sector / Charity Provider',
  'Employer Provider (Levy Payer)',
  'Pre-Employment / Employability Provider',
  'End-Point Assessment Organisation (EPAO)',
  'Awarding Organisation',
  'Apprenticeship Aggregator',
  'Other',
]

const REGIONS = [
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
  'National (Multi-site)',
]

const STATUS_COLOURS: Record<string, { bg: string; text: string }> = {
  new: { bg: '#f0f0f2', text: '#737373' },
  contacted: { bg: '#e0f0fb', text: '#0B72B8' },
  meeting_booked: { bg: '#f3f0ff', text: '#7c3aed' },
  proposal_sent: { bg: '#fffbeb', text: '#d97706' },
  follow_up: { bg: '#fffbeb', text: '#d97706' },
  converted: { bg: '#e8f5e8', text: '#217822' },
  lost: { bg: '#fef2f2', text: '#e53e3e' },
}

const OFSTED_COLOURS: Record<string, string> = {
  Outstanding: '#217822',
  Good: '#0B72B8',
  'Requires Improvement': '#d97706',
  Inadequate: '#e53e3e',
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
  lead: Lead
  initialContacts: Contact[]
  initialActivities: Activity[]
  initialTasks: Task[]
  initialSites: ProviderSite[]
}

export default function LeadDetail({
  lead: initialLead,
  initialContacts,
  initialActivities,
  initialTasks,
  initialSites,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [lead, setLead] = useState(initialLead)
  const [contacts, setContacts] = useState(initialContacts)
  const [activities, setActivities] = useState(initialActivities)
  const [tasks, setTasks] = useState(initialTasks)
  const [sites, setSites] = useState(initialSites)

  const [activeTab, setActiveTab] = useState<
    'activity' | 'tasks' | 'vacancies' | 'record'
  >('activity')

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

  // Edit activity state
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [editActivityForm, setEditActivityForm] = useState({
    activity_type: 'call',
    direction: 'outbound' as 'inbound' | 'outbound' | 'internal',
    contact_id: '',
    content: '',
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
  const [savingActivityEdit, setSavingActivityEdit] = useState(false)

  // Contact state
  const [showContactForm, setShowContactForm] = useState(false)
  const [contactForm, setContactForm] = useState({
    name: '',
    title: '',
    email: '',
    phone: '',
    linkedin: '',
    role_type: 'Day-to-day',
    is_primary: false,
  })
  const [addingContact, setAddingContact] = useState(false)

  // Provider sites state
  const [showSiteForm, setShowSiteForm] = useState(false)
  const [addingSite, setAddingSite] = useState(false)
  const [deletingSiteId, setDeletingSiteId] = useState<string | null>(null)
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

  // Task state
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDue, setTaskDue] = useState('')

  // AI state
  const [aiMode, setAiMode] = useState<'activity' | 'search'>('activity')
  const [aiDraftType, setAiDraftType] = useState<
  'email' | 'linkedin' | 'sms' | 'call' | 'follow_up' | 'note'
>('email')
  const [aiContext, setAiContext] = useState('')
  const [aiTone, setAiTone] = useState('professional')
  const [aiResult, setAiResult] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Edit lead state
  const [editingLead, setEditingLead] = useState(false)
  const [leadForm, setLeadForm] = useState<Lead>(lead)
  const [savingLead, setSavingLead] = useState(false)
  const [deletingLead, setDeletingLead] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const openTasks = tasks.filter(task => !task.completed)
  const overdueTasks = openTasks.filter(
    task => task.due_date && task.due_date < today,
  )
  const primaryContact = contacts.find(contact => contact.is_primary) ?? contacts[0]

const leadLevelContact =
  lead.contact_name || lead.contact_title || lead.email || lead.phone || lead.linkedin
    ? {
        name: lead.contact_name || 'Main lead contact',
        title: lead.contact_title,
        email: lead.email,
        phone: lead.phone,
        linkedin: lead.linkedin,
        role_type: 'Lead record',
      }
    : null

const hasVisibleContactInfo = Boolean(leadLevelContact) || contacts.length > 0

  const actIcon = (type: string) =>
    ACTIVITY_TYPES.find(activity => activity.id === type)?.icon ?? '📝'

  const actLabel = (type: string) =>
    ACTIVITY_TYPES.find(activity => activity.id === type)?.label ?? type

  function activityTypeForAiDraft(
  type: 'email' | 'linkedin' | 'sms' | 'call' | 'follow_up' | 'note',
) {
  if (type === 'linkedin') return 'linkedin'
  if (type === 'sms') return 'sms'
  if (type === 'call') return 'call'
  if (type === 'note') return 'note'
  return 'email'
}

  function aiDraftLabel(
  type: 'email' | 'linkedin' | 'sms' | 'call' | 'follow_up' | 'note',
) {
  if (type === 'linkedin') return 'LinkedIn message'
  if (type === 'sms') return 'SMS'
  if (type === 'call') return 'call opener'
  if (type === 'follow_up') return 'follow-up'
  if (type === 'note') return 'note'
  return 'email'
}

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

  function copyResult() {
    navigator.clipboard.writeText(aiResult)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function updateStatus(status: string) {
  const now = new Date().toISOString()

  if (status !== 'converted') {
    const { error } = await supabase
      .from('leads')
      .update({ status, updated_at: now })
      .eq('id', lead.id)

    if (error) {
      alert(error.message || 'Could not update status.')
      return
    }

    setLead(current => ({ ...current, status }))
    return
  }

  if (lead.status === 'converted' || Boolean((lead as any).client_id)) {
    alert('This lead has already been converted to a client.')
    return
  }

  const postcodeLookup = await lookupPostcode(lead.main_office_postcode)

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      lead_id: lead.id,
      company_name: lead.company_name,
      contact_name: primaryContact?.name ?? lead.contact_name,
      contact_title: primaryContact?.title ?? lead.contact_title,
      email: primaryContact?.email ?? lead.email,
      phone: primaryContact?.phone ?? lead.phone,
      website: lead.website,
      sector: lead.sector,
      region: lead.region || postcodeLookup.region || null,
      linkedin_company: lead.linkedin_company,
      ukprn: lead.ukprn,
      ofsted_grade: lead.ofsted_grade,
      esfa_funding: lead.esfa_funding,
      frameworks: lead.frameworks,
      main_office_address_line_1: lead.main_office_address_line_1,
      main_office_address_line_2: lead.main_office_address_line_2,
      main_office_town_city:
        lead.main_office_town_city || postcodeLookup.district || null,
      main_office_county: lead.main_office_county,
      main_office_postcode: lead.main_office_postcode,
      main_office_lat: lead.main_office_lat ?? postcodeLookup.lat ?? null,
      main_office_lng: lead.main_office_lng ?? postcodeLookup.lng ?? null,
      notes: lead.notes,
      status: 'active',
    })
    .select()
    .single()

  if (clientError) {
    alert(clientError.message || 'Client was not created.')
    return
  }

  if (!client) {
    alert('Client was not created.')
    return
  }

  const hasPrimaryContact = contacts.some(contact => contact.is_primary)

  const contactsToCopy =
    contacts.length > 0
      ? contacts.map((contact, index) => ({
          client_id: client.id,
          name: contact.name,
          title: contact.title,
          email: contact.email,
          phone: contact.phone,
          linkedin: contact.linkedin,
          role_type: contact.role_type || 'Day-to-day',
          is_primary: contact.is_primary || (!hasPrimaryContact && index === 0),
        }))
      : lead.contact_name
        ? [
            {
              client_id: client.id,
              name: lead.contact_name,
              title: lead.contact_title,
              email: lead.email,
              phone: lead.phone,
              linkedin: lead.linkedin,
              role_type: 'Day-to-day',
              is_primary: true,
            },
          ]
        : []

  if (contactsToCopy.length > 0) {
    const { error: contactsError } = await supabase
      .from('client_contacts')
      .insert(contactsToCopy)

    if (contactsError) {
      alert(
        contactsError.message ||
          'Client was created, but the lead contacts were not copied across.',
      )
      return
    }
  }

  if (sites.length > 0) {
    const { error: sitesError } = await supabase
      .from('provider_sites')
      .update({ client_id: client.id })
      .eq('lead_id', lead.id)

    if (sitesError) {
      alert(
        sitesError.message ||
          'Client was created, but the provider locations were not linked to the client.',
      )
      return
    }
  }

  const { error: leadUpdateError } = await supabase
    .from('leads')
    .update({
      status: 'converted',
      client_id: client.id,
      converted_at: now,
      updated_at: now,
    })
    .eq('id', lead.id)

  if (leadUpdateError) {
    alert(
      leadUpdateError.message ||
        'Client was created, but the lead was not marked as converted.',
    )
    return
  }

  setLead(current => ({
    ...current,
    status: 'converted',
    client_id: client.id,
    converted_at: now,
  }))

  router.push(`/crm/clients/${client.id}`)
}

  async function saveLead() {
    if (!leadForm.company_name.trim()) {
      alert('Company name is required.')
      return
    }

    setSavingLead(true)

    const postcodeLookup = await lookupPostcode(leadForm.main_office_postcode)

    const payload = {
      company_name: leadForm.company_name.trim(),
      contact_name: leadForm.contact_name || null,
      contact_title: leadForm.contact_title || null,
      email: leadForm.email || null,
      phone: leadForm.phone || null,
      website: leadForm.website || null,
      linkedin: leadForm.linkedin || null,
      linkedin_company: leadForm.linkedin_company || null,
      status: leadForm.status || lead.status || 'new',
      region: leadForm.region || postcodeLookup.region || null,
      sector: leadForm.sector || null,
      source: leadForm.source || null,
      ukprn: leadForm.ukprn || null,
      ofsted_grade: leadForm.ofsted_grade || null,
      ofsted_date: leadForm.ofsted_date || null,
      esfa_funding: leadForm.esfa_funding || null,
      frameworks: leadForm.frameworks || null,
      current_agencies: leadForm.current_agencies || null,
      fee_agreed: leadForm.fee_agreed || null,
      decision_timeline: leadForm.decision_timeline || null,
      warm_cold: leadForm.warm_cold || null,
      notes: leadForm.notes || null,
      main_office_address_line_1: leadForm.main_office_address_line_1 || null,
      main_office_address_line_2: leadForm.main_office_address_line_2 || null,
      main_office_town_city:
        leadForm.main_office_town_city || postcodeLookup.district || null,
      main_office_county: leadForm.main_office_county || null,
      main_office_postcode: leadForm.main_office_postcode || null,
      main_office_lat: postcodeLookup.lat ?? leadForm.main_office_lat ?? null,
      main_office_lng: postcodeLookup.lng ?? leadForm.main_office_lng ?? null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('leads')
      .update(payload)
      .eq('id', lead.id)
      .select('*')
      .single()

    if (error) {
      alert(error.message || 'Could not save lead.')
      setSavingLead(false)
      return
    }

    if (data) {
      setLead(data)
      setLeadForm(data)
    }

    setEditingLead(false)
    setSavingLead(false)
    router.refresh()
  }

  async function deleteLead() {
    const hasBeenConverted =
      lead.status === 'converted' || Boolean((lead as any).client_id)

    if (hasBeenConverted) {
      alert(
        'This lead has already been converted to a client. Open the client record instead of deleting the lead.',
      )
      return
    }

    const confirmed = window.confirm(
      `Delete ${lead.company_name}? This will permanently delete the lead, its contacts, activities, tasks and sites. This cannot be undone.`,
    )

    if (!confirmed) return

    setDeletingLead(true)

    const [tasksDelete, activitiesDelete, contactsDelete, sitesDelete] =
      await Promise.all([
        supabase.from('lead_tasks').delete().eq('lead_id', lead.id),
        supabase.from('lead_activities').delete().eq('lead_id', lead.id),
        supabase.from('lead_contacts').delete().eq('lead_id', lead.id),
        supabase.from('provider_sites').delete().eq('lead_id', lead.id),
      ])

    const childError =
      tasksDelete.error ||
      activitiesDelete.error ||
      contactsDelete.error ||
      sitesDelete.error

    if (childError) {
      alert(childError.message || 'Could not delete related lead records.')
      setDeletingLead(false)
      return
    }

    const { error } = await supabase.from('leads').delete().eq('id', lead.id)

    if (error) {
      alert(error.message || 'Could not delete lead.')
      setDeletingLead(false)
      return
    }

    router.push('/crm/leads')
    router.refresh()
  }

  async function addContact(e: FormEvent) {
    e.preventDefault()
    if (!contactForm.name.trim()) return

    setAddingContact(true)

    const { data, error } = await supabase
      .from('lead_contacts')
      .insert({
        ...contactForm,
        name: contactForm.name.trim(),
        lead_id: lead.id,
      })
      .select()
      .single()

    if (error) {
      alert(error.message || 'Could not add contact.')
      setAddingContact(false)
      return
    }

    if (data) {
      setContacts(current => [...current, data])
      setShowContactForm(false)
      setContactForm({
        name: '',
        title: '',
        email: '',
        phone: '',
        linkedin: '',
        role_type: 'Day-to-day',
        is_primary: false,
      })
    }

    setAddingContact(false)
  }

  async function deleteContact(id: string) {
    const confirmed = window.confirm('Delete this contact?')
    if (!confirmed) return

    const { error } = await supabase.from('lead_contacts').delete().eq('id', id)

    if (error) {
      alert(error.message || 'Could not delete contact.')
      return
    }

    setContacts(current => current.filter(contact => contact.id !== id))
  }

  async function setPrimaryContact(id: string) {
    await supabase
      .from('lead_contacts')
      .update({ is_primary: false })
      .eq('lead_id', lead.id)

    await supabase
      .from('lead_contacts')
      .update({ is_primary: true })
      .eq('id', id)

    setContacts(current =>
      current.map(contact => ({ ...contact, is_primary: contact.id === id })),
    )
  }

  async function addSite(e: FormEvent) {
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
        lead_id: lead.id,
        client_id: null,
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
    const confirmed = window.confirm('Delete this site? This cannot be undone.')
    if (!confirmed) return

    setDeletingSiteId(id)

    const { error } = await supabase
      .from('provider_sites')
      .delete()
      .eq('id', id)
      .eq('lead_id', lead.id)

    if (error) {
      alert(error.message || 'Could not delete site.')
      setDeletingSiteId(null)
      return
    }

    setSites(current => current.filter(site => site.id !== id))
    setDeletingSiteId(null)
  }

  async function addActivity(e: FormEvent) {
    e.preventDefault()

    setAddingActivity(true)

    const payload: any = {
      lead_id: lead.id,
      activity_type: actType,
      direction: actDirection,
      contact_id: actContactId || null,
      content: actContent || null,
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
        follow_up_date: bdForm.follow_up_date || null,
      })
    }

    const { data, error } = await supabase
      .from('lead_activities')
      .insert(payload)
      .select(
        `
        *,
        lead_contacts (
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

    const { error } = await supabase.from('lead_activities').delete().eq('id', id)

    if (error) {
      alert(error.message || 'Could not delete activity.')
      return
    }

    setActivities(current => current.filter(activity => activity.id !== id))
  }

  function startEditActivity(activity: Activity) {
    setEditingActivity(activity)

    setEditActivityForm({
      activity_type: activity.activity_type || 'call',
      direction: activity.direction || 'outbound',
      contact_id: activity.contact_id || '',
      content: activity.content || '',
      attendees: activity.attendees || '',
      pain_points: activity.pain_points || '',
      roles_to_fill: activity.roles_to_fill || '',
      psl_agencies: activity.psl_agencies || '',
      salary_notes: activity.salary_notes || '',
      retention_notes: activity.retention_notes || '',
      fee_agreed: activity.fee_agreed || '',
      decision_maker: activity.decision_maker || '',
      next_steps: activity.next_steps || '',
      follow_up_date: activity.follow_up_date || '',
    })
  }

  async function saveEditedActivity(e: FormEvent) {
    e.preventDefault()
    if (!editingActivity) return

    setSavingActivityEdit(true)

    const payload: any = {
      activity_type: editActivityForm.activity_type,
      direction: editActivityForm.direction,
      contact_id: editActivityForm.contact_id || null,
      content: editActivityForm.content || null,
      updated_at: new Date().toISOString(),
      attendees: null,
      pain_points: null,
      roles_to_fill: null,
      psl_agencies: null,
      salary_notes: null,
      retention_notes: null,
      fee_agreed: null,
      decision_maker: null,
      next_steps: null,
      follow_up_date: null,
    }

    if (editActivityForm.activity_type === 'bd_meeting') {
      Object.assign(payload, {
        attendees: editActivityForm.attendees || null,
        pain_points: editActivityForm.pain_points || null,
        roles_to_fill: editActivityForm.roles_to_fill || null,
        psl_agencies: editActivityForm.psl_agencies || null,
        salary_notes: editActivityForm.salary_notes || null,
        retention_notes: editActivityForm.retention_notes || null,
        fee_agreed: editActivityForm.fee_agreed || null,
        decision_maker: editActivityForm.decision_maker || null,
        next_steps: editActivityForm.next_steps || null,
        follow_up_date: editActivityForm.follow_up_date || null,
      })
    }

    const { data, error } = await supabase
      .from('lead_activities')
      .update(payload)
      .eq('id', editingActivity.id)
      .select(
        `
        *,
        lead_contacts (
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
      alert(error.message || 'Could not save activity.')
      setSavingActivityEdit(false)
      return
    }

    if (data) {
      setActivities(current =>
        current.map(activity =>
          activity.id === editingActivity.id ? data : activity,
        ),
      )
      setEditingActivity(null)
    }

    setSavingActivityEdit(false)
  }

  async function addTask(e: FormEvent) {
    e.preventDefault()
    if (!taskTitle.trim()) return

    const { data, error } = await supabase
      .from('lead_tasks')
      .insert({
        lead_id: lead.id,
        title: taskTitle.trim(),
        due_date: taskDue || null,
        completed: false,
      })
      .select()
      .single()

    if (error) {
      alert(error.message || 'Could not add task.')
      return
    }

    if (data) {
      setTasks(current => [...current, data])
      setTaskTitle('')
      setTaskDue('')
    }
  }

  async function toggleTask(id: string, completed: boolean) {
    const { error } = await supabase
      .from('lead_tasks')
      .update({
        completed: !completed,
        completed_at: !completed ? new Date().toISOString() : null,
      })
      .eq('id', id)

    if (error) {
      alert(error.message || 'Could not update task.')
      return
    }

    setTasks(current =>
      current.map(task =>
        task.id === id ? { ...task, completed: !completed } : task,
      ),
    )
  }

  async function deleteTask(id: string) {
    const { error } = await supabase.from('lead_tasks').delete().eq('id', id)

    if (error) {
      alert(error.message || 'Could not delete task.')
      return
    }

    setTasks(current => current.filter(task => task.id !== id))
  }

  async function runAI(modeOverride?: 'activity' | 'search') {
  const mode = modeOverride || aiMode

  setAiMode(mode)
  setAiLoading(true)
  setAiResult('')

  const endpoint =
    mode === 'activity'
      ? '/api/crm/ai-activity-message'
      : '/api/crm/ai-search'

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lead: {
        company_name: lead.company_name,
        contact_name: primaryContact?.name,
        contact_title: primaryContact?.title,
        contact_email: primaryContact?.email ?? lead.email,
        sector: lead.sector,
        region: lead.region,
        website: lead.website,
        status: lead.status,
      },
      context: aiContext,
      tone: aiTone,
      messageType: aiDraftType,
    }),
  })

  const data = await res.json()

  setAiResult(data.result ?? data.error ?? '')
  setAiLoading(false)
}

  return (
    <div className="crm-page">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="crm-page-header">
        <div>
          <div className="crm-breadcrumb">
            <Link href="/crm/leads" className="crm-breadcrumb-link">
              Leads
            </Link>
            <span>/</span>
            <span>{lead.company_name}</span>
          </div>

          <div className="crm-lead-header-title">
            <h1 className="crm-page-title">{lead.company_name}</h1>

            <span
              className="crm-badge"
              style={{
                background: STATUS_COLOURS[lead.status]?.bg,
                color: STATUS_COLOURS[lead.status]?.text,
              }}
            >
              {lead.status.replace(/_/g, ' ')}
            </span>

            {overdueTasks.length > 0 && (
              <span
                className="crm-badge"
                style={{ background: '#fef2f2', color: '#e53e3e' }}
              >
                {overdueTasks.length} overdue
              </span>
            )}
          </div>
        </div>

        <div
  className="crm-lead-header-actions"
  style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    flexWrap: 'wrap',
    maxWidth: 620,
  }}
>
          <select
  className="crm-select crm-select-sm"
  value={lead.status}
  onChange={event => updateStatus(event.target.value)}
  style={{
    width: 190,
    minWidth: 190,
    textTransform: 'capitalize',
  }}
>
            {STATUS_OPTS.map(status => (
              <option key={status} value={status}>
                {status.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="crm-btn-ghost"
            onClick={() => {
              setLeadForm(lead)
              setEditingLead(true)
            }}
            disabled={savingLead || deletingLead}
          >
            Edit
          </button>

          {lead.status !== 'converted' && !(lead as any).client_id && (
            <button
              type="button"
              className="crm-btn-ghost"
              onClick={deleteLead}
              disabled={deletingLead}
              style={{
                borderColor: '#fecaca',
                color: '#dc2626',
                background: '#fff',
              }}
            >
              {deletingLead ? 'Deleting...' : 'Delete'}
            </button>
          )}

          {lead.status !== 'converted' && !(lead as any).client_id && (
            <button
              type="button"
              className="crm-btn-primary"
              onClick={() => updateStatus('converted')}
              disabled={deletingLead}
            >
              Convert to Client →
            </button>
          )}
        </div>
      </div>

      <div
  className="crm-lead-layout"
  style={{
    display: 'grid',
    gridTemplateColumns: 'minmax(320px, 380px) minmax(0, 1fr)',
    gap: 20,
    alignItems: 'start',
  }}
>
        {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
        <div
  className="crm-lead-sidebar"
  style={{
    minWidth: 0,
    display: 'grid',
    gap: 14,
  }}
>
          {/* Company intel */}
          <div className="crm-card">
            <h3 className="crm-card-title" style={{ marginBottom: 16 }}>
              Company
            </h3>

            <div className="crm-detail-list">
              {lead.sector && (
                <div className="crm-detail-row">
                  <span className="crm-detail-label">Sector</span>
                  <span
                    className="crm-detail-value"
                    style={{
  textAlign: 'right',
  fontSize: 12,
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
  minWidth: 0,
}}
                  >
                    {lead.sector}
                  </span>
                </div>
              )}

              {lead.region && (
                <div className="crm-detail-row">
                  <span className="crm-detail-label">Region</span>
                  <span className="crm-detail-value">{lead.region}</span>
                </div>
              )}

              {lead.main_office_postcode && (
                <div className="crm-detail-row">
                  <span className="crm-detail-label">Main office</span>
                  <span
                    className="crm-detail-value"
                    style={{
  textAlign: 'right',
  fontSize: 12,
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
  minWidth: 0,
}}
                  >
                    {[
                      lead.main_office_town_city,
                      lead.main_office_county,
                      lead.main_office_postcode,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}

              {lead.ukprn && (
                <div className="crm-detail-row">
                  <span className="crm-detail-label">UKPRN</span>
                  <span
                    className="crm-detail-value"
                    style={{ fontFamily: 'monospace', fontSize: 13 }}
                  >
                    {lead.ukprn}
                  </span>
                </div>
              )}

              {lead.ofsted_grade && (
                <div className="crm-detail-row">
                  <span className="crm-detail-label">Ofsted</span>
                  <span
                    className="crm-detail-value"
                    style={{
                      color: OFSTED_COLOURS[lead.ofsted_grade] ?? 'inherit',
                      fontWeight: 700,
                    }}
                  >
                    {lead.ofsted_grade}
                    {lead.ofsted_date
                      ? ` (${new Date(lead.ofsted_date).getFullYear()})`
                      : ''}
                  </span>
                </div>
              )}

              {lead.esfa_funding && (
                <div className="crm-detail-row">
                  <span className="crm-detail-label">ESFA funding</span>
                  <span className="crm-detail-value">
                    £{(lead.esfa_funding / 1000000).toFixed(1)}m
                  </span>
                </div>
              )}

              {lead.website && (
                <div className="crm-detail-row">
                  <span className="crm-detail-label">Website</span>
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="crm-detail-link"
                    style={{ fontSize: 12 }}
                  >
                    Visit ↗
                  </a>
                </div>
              )}

              {lead.linkedin_company && (
                <div className="crm-detail-row">
                  <span className="crm-detail-label">LinkedIn</span>
                  <a
                    href={lead.linkedin_company}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="crm-detail-link"
                  >
                    Company ↗
                  </a>
                </div>
              )}

              {lead.source && (
                <div className="crm-detail-row">
                  <span className="crm-detail-label">Source</span>
                  <span className="crm-detail-value">{lead.source}</span>
                </div>
              )}

              {lead.current_agencies && (
                <div className="crm-detail-row">
                  <span className="crm-detail-label">Agencies</span>
                  <span
                    className="crm-detail-value"
                    style={{ fontSize: 12, textAlign: 'right' }}
                  >
                    {lead.current_agencies}
                  </span>
                </div>
              )}

              {lead.fee_agreed && (
                <div className="crm-detail-row">
                  <span className="crm-detail-label">Fee agreed</span>
                  <span
                    className="crm-detail-value"
                    style={{ color: '#217822', fontWeight: 700 }}
                  >
                    {lead.fee_agreed}
                  </span>
                </div>
              )}
            </div>

            {lead.frameworks && (
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: '1px solid var(--border-light)',
                }}
              >
                <p className="crm-detail-label" style={{ marginBottom: 8 }}>
                  Frameworks delivered
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {lead.frameworks
                    .split(',')
                    .map(framework => framework.trim())
                    .filter(Boolean)
                    .map(framework => (
                      <span
                        key={framework}
                        className="crm-badge crm-badge-blue"
                        style={{ fontSize: 10 }}
                      >
                        {framework}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {lead.notes && (
  <p
    style={{
      fontSize: 12,
      color: 'var(--text-muted)',
      lineHeight: 1.65,
      marginTop: 12,
      paddingTop: 12,
      borderTop: '1px solid var(--border-light)',
      whiteSpace: 'pre-wrap',
      overflowWrap: 'anywhere',
      wordBreak: 'break-word',
    }}
  >
    {lead.notes}
  </p>
)}
          </div>

          {/* Provider sites */}
          <div className="crm-card">
            <div className="crm-card-header">
              <h3 className="crm-card-title">Provider sites</h3>

              <button
                type="button"
                className="crm-btn-primary crm-btn-sm"
                onClick={() => setShowSiteForm(true)}
              >
                + Add site
              </button>
            </div>

            {lead.main_office_postcode && (
              <div
                className="ld-contact-card"
                style={{ borderColor: 'rgba(53,45,235,0.22)' }}
              >
                <div className="ld-contact-top">
                  <div className="ld-contact-avatar">HQ</div>

                  <div className="ld-contact-info">
                    <p className="ld-contact-name">Main office</p>

                    <p className="ld-contact-title">
                      {[
                        lead.main_office_address_line_1,
                        lead.main_office_town_city,
                        lead.main_office_county,
                        lead.main_office_postcode,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </p>

                    {lead.main_office_lat && lead.main_office_lng && (
                      <span
                        className="crm-badge"
                        style={{
                          background: '#e8f5e8',
                          color: '#217822',
                          fontSize: 9,
                          marginTop: 3,
                        }}
                      >
                        Geocoded
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {sites.length === 0 && !lead.main_office_postcode && (
              <p className="crm-empty">No provider sites added yet.</p>
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
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
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
                      onChange={event =>
                        setSiteForm(form => ({
                          ...form,
                          site_name: event.target.value,
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
                      onChange={event =>
                        setSiteForm(form => ({
                          ...form,
                          site_type: event.target.value,
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
                      onChange={event =>
                        setSiteForm(form => ({
                          ...form,
                          address_line_1: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="crm-field">
                    <label className="crm-label">Address line 2</label>
                    <input
                      className="crm-input"
                      value={siteForm.address_line_2}
                      onChange={event =>
                        setSiteForm(form => ({
                          ...form,
                          address_line_2: event.target.value,
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
                      onChange={event =>
                        setSiteForm(form => ({
                          ...form,
                          town_city: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="crm-field">
                    <label className="crm-label">County</label>
                    <input
                      className="crm-input"
                      value={siteForm.county}
                      onChange={event =>
                        setSiteForm(form => ({
                          ...form,
                          county: event.target.value,
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
                      onChange={event =>
                        setSiteForm(form => ({
                          ...form,
                          postcode: event.target.value,
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
                      onChange={event =>
                        setSiteForm(form => ({
                          ...form,
                          phone: event.target.value,
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
                    onChange={event =>
                      setSiteForm(form => ({
                        ...form,
                        email: event.target.value,
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
                    onChange={event =>
                      setSiteForm(form => ({
                        ...form,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="Anything useful about this site..."
                  />
                </div>

                <div
                  style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}
                >
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

          {/* Contacts */}
<div className="crm-card">
  <div className="crm-card-header">
    <h3 className="crm-card-title">Contacts</h3>

    <button
      type="button"
      className="crm-btn-primary crm-btn-sm"
      onClick={() => setShowContactForm(true)}
    >
      + Add
    </button>
  </div>

  {!hasVisibleContactInfo && (
    <p className="crm-empty">
      No contact details recorded yet. Add a contact or update the lead details.
    </p>
  )}

  {leadLevelContact && (
    <div
      className="ld-contact-card"
      style={{
        borderColor: 'rgba(53,45,235,0.28)',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8f7ff 100%)',
      }}
    >
      <div className="ld-contact-top">
        <div className="ld-contact-avatar">
          {leadLevelContact.name
            .split(' ')
            .map(part => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()}
        </div>

        <div className="ld-contact-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <p className="ld-contact-name">{leadLevelContact.name}</p>

            <span
              className="crm-badge"
              style={{
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                fontSize: 9,
              }}
            >
              Main lead contact
            </span>
          </div>

          <p className="ld-contact-title">
            {leadLevelContact.title || 'Contact title not recorded'}
          </p>
        </div>
      </div>

      <div className="ld-contact-links" style={{ marginTop: 12 }}>
        {leadLevelContact.phone ? (
          <a
            href={`tel:${leadLevelContact.phone}`}
            className="ld-contact-link"
            style={{ fontWeight: 800 }}
          >
            📞 {leadLevelContact.phone}
          </a>
        ) : (
          <span className="ld-contact-link" style={{ color: 'var(--text-muted)' }}>
            📞 No phone recorded
          </span>
        )}

        {leadLevelContact.email ? (
          <a
            href={`mailto:${leadLevelContact.email}`}
            className="ld-contact-link"
            style={{ fontWeight: 800 }}
          >
            ✉️ {leadLevelContact.email}
          </a>
        ) : (
          <span className="ld-contact-link" style={{ color: 'var(--text-muted)' }}>
            ✉️ No email recorded
          </span>
        )}

        {leadLevelContact.linkedin && (
          <a
            href={leadLevelContact.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="ld-contact-link"
          >
            💼 LinkedIn
          </a>
        )}
      </div>
    </div>
  )}

  {contacts.map(contact => (
    <div key={contact.id} className="ld-contact-card">
      <div className="ld-contact-top">
        <div className="ld-contact-avatar">
          {contact.name
            .split(' ')
            .map(part => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()}
        </div>

        <div className="ld-contact-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <p className="ld-contact-name">{contact.name}</p>

            {contact.is_primary && (
              <span
                className="crm-badge"
                style={{
                  background: '#e8f5e8',
                  color: '#217822',
                  fontSize: 9,
                }}
              >
                Primary
              </span>
            )}
          </div>

          <p className="ld-contact-title">
            {contact.title || 'Contact title not recorded'}
          </p>

          <span
            className="crm-badge"
            style={{
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              fontSize: 9,
              marginTop: 3,
            }}
          >
            {contact.role_type}
          </span>
        </div>

        <div className="ld-contact-actions">
          {!contact.is_primary && (
            <button
              type="button"
              className="crm-icon-btn"
              onClick={() => setPrimaryContact(contact.id)}
              title="Set as primary"
            >
              ★
            </button>
          )}

          <button
            type="button"
            className="crm-icon-btn crm-icon-btn-danger"
            onClick={() => deleteContact(contact.id)}
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="ld-contact-links" style={{ marginTop: 12 }}>
        {contact.phone ? (
          <a
            href={`tel:${contact.phone}`}
            className="ld-contact-link"
            style={{ fontWeight: 800 }}
          >
            📞 {contact.phone}
          </a>
        ) : (
          <span className="ld-contact-link" style={{ color: 'var(--text-muted)' }}>
            📞 No phone recorded
          </span>
        )}

        {contact.email ? (
          <a
            href={`mailto:${contact.email}`}
            className="ld-contact-link"
            style={{ fontWeight: 800 }}
          >
            ✉️ {contact.email}
          </a>
        ) : (
          <span className="ld-contact-link" style={{ color: 'var(--text-muted)' }}>
            ✉️ No email recorded
          </span>
        )}

        {contact.linkedin && (
          <a
            href={contact.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="ld-contact-link"
          >
            💼 LinkedIn
          </a>
        )}
      </div>
    </div>
  ))}

            {showContactForm && (
              <form onSubmit={addContact} className="ld-contact-form">
                <div className="crm-form-row">
                  <div className="crm-field">
                    <label className="crm-label">Name *</label>
                    <input
                      className="crm-input"
                      required
                      value={contactForm.name}
                      onChange={event =>
                        setContactForm(form => ({
                          ...form,
                          name: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="crm-field">
                    <label className="crm-label">Title</label>
                    <input
                      className="crm-input"
                      value={contactForm.title}
                      onChange={event =>
                        setContactForm(form => ({
                          ...form,
                          title: event.target.value,
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
                      value={contactForm.email}
                      onChange={event =>
                        setContactForm(form => ({
                          ...form,
                          email: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="crm-field">
                    <label className="crm-label">Phone</label>
                    <input
                      className="crm-input"
                      value={contactForm.phone}
                      onChange={event =>
                        setContactForm(form => ({
                          ...form,
                          phone: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="crm-form-row">
                  <div className="crm-field">
                    <label className="crm-label">LinkedIn</label>
                    <input
                      className="crm-input"
                      value={contactForm.linkedin}
                      onChange={event =>
                        setContactForm(form => ({
                          ...form,
                          linkedin: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="crm-field">
                    <label className="crm-label">Role type</label>
                    <select
                      className="crm-select"
                      value={contactForm.role_type}
                      onChange={event =>
                        setContactForm(form => ({
                          ...form,
                          role_type: event.target.value,
                        }))
                      }
                    >
                      {ROLE_TYPES.map(role => (
                        <option key={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    marginBottom: 10,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={contactForm.is_primary}
                    onChange={event =>
                      setContactForm(form => ({
                        ...form,
                        is_primary: event.target.checked,
                      }))
                    }
                  />
                  Primary contact
                </label>

                <div
                  style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}
                >
                  <button
                    type="button"
                    className="crm-btn-ghost crm-btn-sm"
                    onClick={() => setShowContactForm(false)}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="crm-btn-primary crm-btn-sm"
                    disabled={addingContact}
                  >
                    {addingContact ? 'Adding...' : 'Add contact'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Stats */}
          <div className="crm-card crm-lead-stats-card">
            <div className="crm-lead-stat">
              <span className="crm-lead-stat-num">{activities.length}</span>
              <span className="crm-lead-stat-label">Activities</span>
            </div>

            <div className="crm-lead-stat-divider" />

            <div className="crm-lead-stat">
              <span className="crm-lead-stat-num">{openTasks.length}</span>
              <span className="crm-lead-stat-label">Open tasks</span>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
        <div
  className="crm-lead-content"
  style={{
    minWidth: 0,
  }}
>
          <div className="crm-tabs">
            {[
              { id: 'activity', label: 'Activity', badge: activities.length },
              { id: 'tasks', label: 'Tasks', badge: openTasks.length },
              { id: 'vacancies', label: '🔍 Vacancy Finder', badge: 0 },
              { id: 'record', label: '🎙 Record', badge: 0 },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`crm-tab${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.id as any)}
              >
                {tab.label}
                {tab.badge > 0 && (
                  <span className="crm-tab-badge">{tab.badge}</span>
                )}
              </button>
            ))}
          </div>

                    {/* ACTIVITY TAB */}
          {activeTab === 'activity' && (
            <div className="crm-tab-content">

              {/* AI Activity Assistant */}
<div
  className="crm-card"
  style={{
    marginBottom: 18,
    background: 'var(--primary-light)',
    border: '1px solid rgba(53,45,235,0.16)',
    padding: 20,
    overflow: 'hidden',
  }}
>
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
      <p
        className="crm-card-title"
        style={{ color: 'var(--primary)' }}
      >
        ✦ AI activity assistant
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
        Draft emails, LinkedIn messages, SMS, call openers,
        follow-ups or internal notes, then drop them straight into
        the activity box.
      </p>
    </div>
  </div>

  <div className="crm-form-row">
    <div className="crm-field">
      <label className="crm-label">Draft type</label>
      <select
        className="crm-select"
        value={aiDraftType}
        onChange={event =>
          setAiDraftType(
            event.target.value as
              | 'email'
              | 'linkedin'
              | 'sms'
              | 'call'
              | 'follow_up'
              | 'note',
          )
        }
      >
        <option value="email">Email</option>
        <option value="linkedin">LinkedIn message</option>
        <option value="sms">SMS</option>
        <option value="call">Call opener</option>
        <option value="follow_up">Follow-up message</option>
        <option value="note">Internal note</option>
      </select>
    </div>

    <div className="crm-field">
      <label className="crm-label">Tone</label>
      <select
        className="crm-select"
        value={aiTone}
        onChange={event => setAiTone(event.target.value)}
      >
        <option value="professional">Professional</option>
        <option value="friendly">Friendly</option>
        <option value="direct">Direct</option>
        <option value="warm">Warm</option>
        <option value="follow-up">Follow-up</option>
      </select>
    </div>
  </div>

  <div className="crm-field">
    <label className="crm-label">What should it say?</label>
    <textarea
      className="crm-input"
      rows={4}
      placeholder="e.g. LinkedIn connection follow-up, BD intro, chasing a response, quick SMS after a call..."
      value={aiContext}
      onChange={event => setAiContext(event.target.value)}
      style={{
        lineHeight: 1.6,
        resize: 'vertical',
        minHeight: 96,
      }}
    />
  </div>

  <div
    style={{
      display: 'flex',
      justifyContent: 'flex-start',
      marginTop: 12,
    }}
  >
    <button
      type="button"
      className="crm-btn-ai"
      onClick={() => runAI('activity')}
      disabled={aiLoading}
      style={{
        position: 'static',
        transform: 'none',
        width: 'auto',
        minWidth: 190,
        justifyContent: 'center',
      }}
    >
      {aiLoading && aiMode === 'activity'
        ? '✦ Writing...'
        : `✦ Generate ${aiDraftLabel(aiDraftType)}`}
    </button>
  </div>

  {aiResult && aiMode === 'activity' && (
    <div className="crm-ai-result" style={{ marginTop: 12 }}>
      <div className="crm-ai-result-header">
        <p className="crm-ai-result-label">
          ✦ Draft activity content
        </p>

        <div className="crm-ai-result-actions">
          <button
            type="button"
            className="crm-btn-ghost crm-btn-sm"
            onClick={copyResult}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>

          <button
            type="button"
            className="crm-btn-primary crm-btn-sm"
            onClick={() => {
              setActType(activityTypeForAiDraft(aiDraftType))
              setActDirection(
                aiDraftType === 'note' ? 'internal' : 'outbound',
              )
              setActContent(aiResult)
            }}
          >
            Use as activity
          </button>

          {aiDraftType === 'email' &&
            (primaryContact?.email ?? lead.email) && (
              <a
                href={`mailto:${
                  primaryContact?.email ?? lead.email
                }?body=${encodeURIComponent(aiResult)}`}
                className="crm-btn-primary crm-btn-sm"
              >
                Open in Outlook
              </a>
            )}

          {aiDraftType === 'linkedin' &&
            primaryContact?.linkedin && (
              <a
                href={primaryContact.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="crm-btn-primary crm-btn-sm"
              >
                Open LinkedIn ↗
              </a>
            )}
        </div>
      </div>

      <pre className="crm-ai-result-text">{aiResult}</pre>
    </div>
  )}
</div>

              {/* Log activity */}
              <form
  onSubmit={addActivity}
  className="ld-activity-form"
  style={{
    padding: 18,
    display: 'grid',
    gap: 12,
    overflow: 'hidden',
  }}
>
                <div className="ld-type-selector">
                  {ACTIVITY_TYPES.map(type => (
                    <button
                      key={type.id}
                      type="button"
                      className={`ld-type-btn${
                        actType === type.id ? ' active' : ''
                      }`}
                      onClick={() => setActType(type.id)}
                    >
                      {type.icon} {type.label}
                    </button>
                  ))}
                </div>

                <div className="crm-form-row">
                  <div className="crm-field">
                    <label className="crm-label">Direction</label>
                    <select
                      className="crm-select"
                      value={actDirection}
                      onChange={event =>
                        setActDirection(
                          event.target.value as
                            | 'inbound'
                            | 'outbound'
                            | 'internal',
                        )
                      }
                    >
                      <option value="outbound">Outbound</option>
                      <option value="inbound">Inbound</option>
                      <option value="internal">Internal note</option>
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
                          {contact.title ? ` — ${contact.title}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {(actType === 'meeting' || actType === 'bd_meeting') && (
  <div style={{ marginBottom: 14 }}>
    <MeetingRecorder
      lead={lead}
      activityType={actType as 'meeting' | 'bd_meeting'}
      embedded
      onActivitySaved={activity =>
        setActivities(current => [activity, ...current])
      }
      onDraftGenerated={draft => {
        setActContent(draft.content)

        if (actType === 'bd_meeting') {
          setBdForm(current => ({
            ...current,
            attendees: draft.bdForm.attendees || current.attendees,
            pain_points: draft.bdForm.pain_points,
            roles_to_fill: draft.bdForm.roles_to_fill,
            psl_agencies: draft.bdForm.psl_agencies,
            salary_notes: draft.bdForm.salary_notes,
            retention_notes: draft.bdForm.retention_notes,
            fee_agreed: draft.bdForm.fee_agreed,
            decision_maker: draft.bdForm.decision_maker,
            next_steps: draft.bdForm.next_steps,
            follow_up_date: draft.bdForm.follow_up_date,
          }))
        }
      }}
    />
  </div>
)}

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

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    className="crm-btn-primary"
                    disabled={addingActivity}
                  >
                    {addingActivity ? 'Saving...' : `Log ${actLabel(actType)}`}
                  </button>
                </div>
              </form>

              {/* Activity feed */}
              <div className="ld-activity-feed">
                {activities.map(activity => (
                  <div key={activity.id} className="ld-activity-item">
                    <div className="ld-activity-icon">
                      {actIcon(activity.activity_type)}
                    </div>

                    <div className="ld-activity-body">
                      <div className="ld-activity-header">
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          <span className="ld-activity-type">
                            {actLabel(activity.activity_type)}
                          </span>

                          <span
                            className="crm-badge"
                            style={{
                              background:
                                activity.direction === 'inbound'
                                  ? '#e0f0fb'
                                  : activity.direction === 'internal'
                                    ? '#f0f0f2'
                                    : '#e8f5e8',
                              color:
                                activity.direction === 'inbound'
                                  ? '#0B72B8'
                                  : activity.direction === 'internal'
                                    ? '#737373'
                                    : '#217822',
                              fontSize: 10,
                              textTransform: 'capitalize',
                            }}
                          >
                            {activity.direction || 'outbound'}
                          </span>

                          {activity.lead_contacts?.name && (
                            <span
                              className="crm-badge"
                              style={{
                                background: 'var(--primary-light)',
                                color: 'var(--primary)',
                                fontSize: 10,
                              }}
                            >
                              {activity.direction === 'inbound'
                                ? 'From'
                                : activity.direction === 'internal'
                                  ? 'About'
                                  : 'To'}{' '}
                              {activity.lead_contacts.name}
                            </span>
                          )}
                        </div>

                        <span className="ld-activity-date">
                          {new Date(activity.created_at).toLocaleDateString(
                            'en-GB',
                            {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            },
                          )}
                        </span>

                        <button
                          type="button"
                          className="crm-icon-btn"
                          onClick={() => startEditActivity(activity)}
                          title="Edit"
                        >
                          ✎
                        </button>

                        <button
                          type="button"
                          className="crm-icon-btn crm-icon-btn-danger"
                          onClick={() => deleteActivity(activity.id)}
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>

                      {activity.content && (
                        <p className="ld-activity-content">
                          {activity.content}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {activities.length === 0 && (
                  <p className="crm-empty">
                    No activity yet. Log your first interaction above.
                  </p>
                )}
              </div>
            </div>
          )}
                  
          {/* TASKS TAB */}
          {activeTab === 'tasks' && (
            <div className="crm-tab-content">
              <form onSubmit={addTask} className="crm-task-form">
                <input
                  className="crm-input crm-task-input"
                  placeholder="Task title..."
                  value={taskTitle}
                  onChange={event => setTaskTitle(event.target.value)}
                  required
                />

                <input
                  className="crm-input crm-task-date"
                  type="date"
                  value={taskDue}
                  onChange={event => setTaskDue(event.target.value)}
                />

                <button
                  type="submit"
                  className="crm-btn-primary"
                  disabled={!taskTitle.trim()}
                >
                  Add
                </button>
              </form>

              <div className="crm-tasks-list">
                {tasks
                  .filter(task => !task.completed)
                  .map(task => {
                    const isOverdue = task.due_date && task.due_date < today

                    return (
                      <div
                        key={task.id}
                        className={`crm-task-item${
                          isOverdue ? ' crm-task-overdue-item' : ''
                        }`}
                      >
                        <button
                          type="button"
                          className="crm-task-check"
                          onClick={() => toggleTask(task.id, task.completed)}
                        />

                        <div className="crm-task-item-content">
                          <p className="crm-task-item-title">{task.title}</p>

                          {task.due_date && (
                            <p
                              className={`crm-task-item-due${
                                isOverdue ? ' overdue' : ''
                              }`}
                            >
                              {isOverdue ? '⚠ ' : ''}Due {task.due_date}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          className="crm-icon-btn crm-icon-btn-danger"
                          onClick={() => deleteTask(task.id)}
                        >
                          ✕
                        </button>
                      </div>
                    )
                  })}

                {tasks.filter(task => task.completed).length > 0 && (
                  <>
                    <p
                      className="crm-tasks-group-label"
                      style={{ marginTop: 16 }}
                    >
                      Completed
                    </p>

                    {tasks
                      .filter(task => task.completed)
                      .map(task => (
                        <div
                          key={task.id}
                          className="crm-task-item crm-task-done"
                        >
                          <button
                            type="button"
                            className="crm-task-check checked"
                            onClick={() => toggleTask(task.id, task.completed)}
                          >
                            ✓
                          </button>

                          <p className="crm-task-item-title">{task.title}</p>

                          <button
                            type="button"
                            className="crm-icon-btn crm-icon-btn-danger"
                            onClick={() => deleteTask(task.id)}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                  </>
                )}

                {tasks.length === 0 && <p className="crm-empty">No tasks yet.</p>}
              </div>
            </div>
          )}

          {/* VACANCY FINDER TAB */}
          {activeTab === 'vacancies' && (
            <div className="crm-tab-content">
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
                    <p className="crm-card-title">🔍 Vacancy Finder</p>

                    <p
                      style={{
                        margin: 0,
                        marginTop: 4,
                        fontSize: 12,
                        color: 'var(--text-muted)',
                        lineHeight: 1.5,
                      }}
                    >
                      Search for possible vacancies or hiring signals connected
                      to <strong>{lead.company_name}</strong>.
                    </p>
                  </div>
                </div>

                <div className="crm-field">
                  <label className="crm-label">Additional context</label>
                  <textarea
                    className="crm-input"
                    rows={3}
                    placeholder="e.g. They're growing rapidly, recently won funding, expanding apprenticeships, lost their Ofsted grade..."
                    value={aiContext}
                    onChange={event => setAiContext(event.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className="crm-btn-ai"
                  onClick={() => runAI('search')}
                  disabled={aiLoading}
                >
                  {aiLoading && aiMode === 'search'
                    ? '✦ Searching...'
                    : '✦ Find vacancies'}
                </button>

                {aiResult && aiMode === 'search' && (
                  <div className="crm-ai-result" style={{ marginTop: 12 }}>
                    <div className="crm-ai-result-header">
                      <p className="crm-ai-result-label">
                        ✦ Vacancy search result
                      </p>

                      <div className="crm-ai-result-actions">
                        <button
                          type="button"
                          className="crm-btn-ghost crm-btn-sm"
                          onClick={copyResult}
                        >
                          {copied ? '✓ Copied' : 'Copy'}
                        </button>

                        <button
                          type="button"
                          className="crm-btn-primary crm-btn-sm"
                          onClick={() => {
                            setActType('note')
                            setActDirection('internal')
                            setActContent(`Vacancy Finder result:\n\n${aiResult}`)
                            setActiveTab('activity')
                          }}
                        >
                          Add to activity
                        </button>
                      </div>
                    </div>

                    <pre className="crm-ai-result-text">{aiResult}</pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RECORD TAB */}
          {activeTab === 'record' && (
            <MeetingRecorder
              lead={lead}
              onActivitySaved={activity =>
                setActivities(current => [activity, ...current])
              }
            />
          )}
        </div>
      </div>

      {/* EDIT ACTIVITY MODAL */}
      {editingActivity && (
        <>
          <div
            className="crm-modal-backdrop"
            onClick={() => setEditingActivity(null)}
          />

          <div className="crm-modal crm-modal-wide">
            <div className="crm-modal-header">
              <h2 className="crm-modal-title">Edit activity</h2>

              <button
                type="button"
                className="crm-modal-close"
                onClick={() => setEditingActivity(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={saveEditedActivity} className="crm-modal-form">
              <div className="crm-form-row">
                <div className="crm-field">
                  <label className="crm-label">Type</label>
                  <select
                    className="crm-select"
                    value={editActivityForm.activity_type}
                    onChange={event =>
                      setEditActivityForm(form => ({
                        ...form,
                        activity_type: event.target.value,
                      }))
                    }
                  >
                    {ACTIVITY_TYPES.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="crm-field">
                  <label className="crm-label">Direction</label>
                  <select
                    className="crm-select"
                    value={editActivityForm.direction}
                    onChange={event =>
                      setEditActivityForm(form => ({
                        ...form,
                        direction: event.target.value as
                          | 'inbound'
                          | 'outbound'
                          | 'internal',
                      }))
                    }
                  >
                    <option value="outbound">Outbound</option>
                    <option value="inbound">Inbound</option>
                    <option value="internal">Internal note</option>
                  </select>
                </div>
              </div>

              <div className="crm-field">
                <label className="crm-label">Contact</label>
                <select
                  className="crm-select"
                  value={editActivityForm.contact_id}
                  onChange={event =>
                    setEditActivityForm(form => ({
                      ...form,
                      contact_id: event.target.value,
                    }))
                  }
                >
                  <option value="">No specific contact</option>
                  {contacts.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name}
                      {contact.title ? ` — ${contact.title}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="crm-field">
                <label className="crm-label">Content</label>
                <textarea
                  className="crm-input"
                  rows={4}
                  value={editActivityForm.content}
                  onChange={event =>
                    setEditActivityForm(form => ({
                      ...form,
                      content: event.target.value,
                    }))
                  }
                />
              </div>

              {editActivityForm.activity_type === 'bd_meeting' && (
                <div className="ld-bd-fields">
                  <p className="ld-bd-fields-label">BD Meeting details</p>

                  <div className="crm-form-row">
                    <div className="crm-field">
                      <label className="crm-label">Attendees</label>
                      <input
                        className="crm-input"
                        value={editActivityForm.attendees}
                        onChange={event =>
                          setEditActivityForm(form => ({
                            ...form,
                            attendees: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="crm-field">
                      <label className="crm-label">Decision maker</label>
                      <input
                        className="crm-input"
                        value={editActivityForm.decision_maker}
                        onChange={event =>
                          setEditActivityForm(form => ({
                            ...form,
                            decision_maker: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="crm-field">
                    <label className="crm-label">Pain points</label>
                    <textarea
                      className="crm-input"
                      rows={2}
                      value={editActivityForm.pain_points}
                      onChange={event =>
                        setEditActivityForm(form => ({
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
                      value={editActivityForm.roles_to_fill}
                      onChange={event =>
                        setEditActivityForm(form => ({
                          ...form,
                          roles_to_fill: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="crm-form-row">
                    <div className="crm-field">
                      <label className="crm-label">PSL / agencies</label>
                      <input
                        className="crm-input"
                        value={editActivityForm.psl_agencies}
                        onChange={event =>
                          setEditActivityForm(form => ({
                            ...form,
                            psl_agencies: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="crm-field">
                      <label className="crm-label">Fee agreed</label>
                      <input
                        className="crm-input"
                        value={editActivityForm.fee_agreed}
                        onChange={event =>
                          setEditActivityForm(form => ({
                            ...form,
                            fee_agreed: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="crm-form-row">
                    <div className="crm-field">
                      <label className="crm-label">Salary notes</label>
                      <input
                        className="crm-input"
                        value={editActivityForm.salary_notes}
                        onChange={event =>
                          setEditActivityForm(form => ({
                            ...form,
                            salary_notes: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="crm-field">
                      <label className="crm-label">Retention notes</label>
                      <input
                        className="crm-input"
                        value={editActivityForm.retention_notes}
                        onChange={event =>
                          setEditActivityForm(form => ({
                            ...form,
                            retention_notes: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="crm-form-row">
                    <div className="crm-field">
                      <label className="crm-label">Next steps</label>
                      <input
                        className="crm-input"
                        value={editActivityForm.next_steps}
                        onChange={event =>
                          setEditActivityForm(form => ({
                            ...form,
                            next_steps: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="crm-field">
                      <label className="crm-label">Follow-up date</label>
                      <input
                        className="crm-input"
                        type="date"
                        value={editActivityForm.follow_up_date}
                        onChange={event =>
                          setEditActivityForm(form => ({
                            ...form,
                            follow_up_date: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  className="crm-btn-ghost"
                  onClick={() => setEditingActivity(null)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="crm-btn-primary"
                  disabled={savingActivityEdit}
                >
                  {savingActivityEdit ? 'Saving...' : 'Save activity'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* EDIT LEAD MODAL */}
      {editingLead && (
        <>
          <div
            className="crm-modal-backdrop"
            onClick={() => setEditingLead(false)}
          />

          <div className="crm-modal crm-modal-wide">
            <div className="crm-modal-header">
              <h2 className="crm-modal-title">Edit Lead</h2>

              <button
                type="button"
                className="crm-modal-close"
                onClick={() => setEditingLead(false)}
              >
                ✕
              </button>
            </div>

            <div className="crm-modal-form">
              <div className="crm-form-row">
                <div className="crm-field">
                  <label className="crm-label">Company name</label>
                  <input
                    className="crm-input"
                    value={leadForm.company_name}
                    onChange={event =>
                      setLeadForm(form => ({
                        ...form,
                        company_name: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="crm-field">
                  <label className="crm-label">Website</label>
                  <input
                    className="crm-input"
                    value={leadForm.website ?? ''}
                    onChange={event =>
                      setLeadForm(form => ({
                        ...form,
                        website: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="crm-form-row">
                <div className="crm-field">
                  <label className="crm-label">Sector</label>
                  <select
                    className="crm-select"
                    value={leadForm.sector ?? ''}
                    onChange={event =>
                      setLeadForm(form => ({
                        ...form,
                        sector: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select...</option>
                    {SECTORS.map(sector => (
                      <option key={sector}>{sector}</option>
                    ))}
                  </select>
                </div>

                <div className="crm-field">
                  <label className="crm-label">Region</label>
                  <select
                    className="crm-select"
                    value={leadForm.region ?? ''}
                    onChange={event =>
                      setLeadForm(form => ({
                        ...form,
                        region: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select...</option>
                    {REGIONS.map(region => (
                      <option key={region}>{region}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                style={{
                  marginTop: 6,
                  marginBottom: 14,
                  padding: 12,
                  borderRadius: 12,
                  background: 'var(--light-bg)',
                  border: '1px solid var(--border-light)',
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
                  Main office address
                </p>

                <div className="crm-form-row">
                  <div className="crm-field">
                    <label className="crm-label">Address line 1</label>
                    <input
                      className="crm-input"
                      value={leadForm.main_office_address_line_1 ?? ''}
                      onChange={event =>
                        setLeadForm(form => ({
                          ...form,
                          main_office_address_line_1: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="crm-field">
                    <label className="crm-label">Address line 2</label>
                    <input
                      className="crm-input"
                      value={leadForm.main_office_address_line_2 ?? ''}
                      onChange={event =>
                        setLeadForm(form => ({
                          ...form,
                          main_office_address_line_2: event.target.value,
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
                      value={leadForm.main_office_town_city ?? ''}
                      onChange={event =>
                        setLeadForm(form => ({
                          ...form,
                          main_office_town_city: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="crm-field">
                    <label className="crm-label">County</label>
                    <input
                      className="crm-input"
                      value={leadForm.main_office_county ?? ''}
                      onChange={event =>
                        setLeadForm(form => ({
                          ...form,
                          main_office_county: event.target.value,
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
                      placeholder="e.g. B1 1AA"
                      value={leadForm.main_office_postcode ?? ''}
                      onChange={event =>
                        setLeadForm(form => ({
                          ...form,
                          main_office_postcode: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="crm-field">
                    <label className="crm-label">Geocode</label>
                    <input
                      className="crm-input"
                      disabled
                      value={
                        leadForm.main_office_lat && leadForm.main_office_lng
                          ? `${leadForm.main_office_lat}, ${leadForm.main_office_lng}`
                          : 'Will geocode on save'
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="crm-form-row">
                <div className="crm-field">
                  <label className="crm-label">UKPRN</label>
                  <input
                    className="crm-input"
                    placeholder="8-digit UKPRN"
                    value={leadForm.ukprn ?? ''}
                    onChange={event =>
                      setLeadForm(form => ({
                        ...form,
                        ukprn: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="crm-field">
                  <label className="crm-label">Ofsted grade</label>
                  <select
                    className="crm-select"
                    value={leadForm.ofsted_grade ?? ''}
                    onChange={event =>
                      setLeadForm(form => ({
                        ...form,
                        ofsted_grade: event.target.value,
                      }))
                    }
                  >
                    <option value="">Not known</option>
                    {[
                      'Outstanding',
                      'Good',
                      'Requires Improvement',
                      'Inadequate',
                    ].map(grade => (
                      <option key={grade}>{grade}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="crm-form-row">
                <div className="crm-field">
                  <label className="crm-label">Ofsted date</label>
                  <input
                    className="crm-input"
                    type="date"
                    value={leadForm.ofsted_date ?? ''}
                    onChange={event =>
                      setLeadForm(form => ({
                        ...form,
                        ofsted_date: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="crm-field">
                  <label className="crm-label">ESFA funding</label>
                  <input
                    className="crm-input"
                    type="number"
                    value={leadForm.esfa_funding ?? ''}
                    onChange={event =>
                      setLeadForm(form => ({
                        ...form,
                        esfa_funding: event.target.value
                          ? Number(event.target.value)
                          : null,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="crm-form-row">
                <div className="crm-field">
                  <label className="crm-label">Contact name</label>
                  <input
                    className="crm-input"
                    value={leadForm.contact_name ?? ''}
                    onChange={event =>
                      setLeadForm(form => ({
                        ...form,
                        contact_name: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="crm-field">
                  <label className="crm-label">Contact title</label>
                  <input
                    className="crm-input"
                    value={leadForm.contact_title ?? ''}
                    onChange={event =>
                      setLeadForm(form => ({
                        ...form,
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
                    value={leadForm.email ?? ''}
                    onChange={event =>
                      setLeadForm(form => ({
                        ...form,
                        email: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="crm-field">
                  <label className="crm-label">Phone</label>
                  <input
                    className="crm-input"
                    value={leadForm.phone ?? ''}
                    onChange={event =>
                      setLeadForm(form => ({
                        ...form,
                        phone: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="crm-form-row">
                <div className="crm-field">
                  <label className="crm-label">LinkedIn person</label>
                  <input
                    className="crm-input"
                    value={leadForm.linkedin ?? ''}
                    onChange={event =>
                      setLeadForm(form => ({
                        ...form,
                        linkedin: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="crm-field">
                  <label className="crm-label">LinkedIn company</label>
                  <input
                    className="crm-input"
                    value={leadForm.linkedin_company ?? ''}
                    onChange={event =>
                      setLeadForm(form => ({
                        ...form,
                        linkedin_company: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="crm-form-row">
                <div className="crm-field">
                  <label className="crm-label">Source</label>
                  <input
                    className="crm-input"
                    value={leadForm.source ?? ''}
                    onChange={event =>
                      setLeadForm(form => ({
                        ...form,
                        source: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="crm-field">
                  <label className="crm-label">Warm / cold</label>
                  <input
                    className="crm-input"
                    value={leadForm.warm_cold ?? ''}
                    onChange={event =>
                      setLeadForm(form => ({
                        ...form,
                        warm_cold: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="crm-form-row">
                <div className="crm-field">
                  <label className="crm-label">Current agencies</label>
                  <input
                    className="crm-input"
                    value={leadForm.current_agencies ?? ''}
                    onChange={event =>
                      setLeadForm(form => ({
                        ...form,
                        current_agencies: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="crm-field">
                  <label className="crm-label">Fee agreed</label>
                  <input
                    className="crm-input"
                    value={leadForm.fee_agreed ?? ''}
                    onChange={event =>
                      setLeadForm(form => ({
                        ...form,
                        fee_agreed: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="crm-form-row">
                <div className="crm-field">
                  <label className="crm-label">Decision timeline</label>
                  <input
                    className="crm-input"
                    value={leadForm.decision_timeline ?? ''}
                    onChange={event =>
                      setLeadForm(form => ({
                        ...form,
                        decision_timeline: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="crm-field">
                  <label className="crm-label">Frameworks</label>
                  <input
                    className="crm-input"
                    value={leadForm.frameworks ?? ''}
                    onChange={event =>
                      setLeadForm(form => ({
                        ...form,
                        frameworks: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="crm-field">
                <label className="crm-label">Notes</label>
                <textarea
                  className="crm-input"
                  rows={4}
                  value={leadForm.notes ?? ''}
                  onChange={event =>
                    setLeadForm(form => ({
                      ...form,
                      notes: event.target.value,
                    }))
                  }
                />
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="crm-btn-ghost"
                  onClick={() => setEditingLead(false)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="crm-btn-primary"
                  onClick={saveLead}
                  disabled={savingLead}
                >
                  {savingLead ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}