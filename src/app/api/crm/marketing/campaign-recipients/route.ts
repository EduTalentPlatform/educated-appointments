import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SourceFilter = 'clients' | 'leads' | 'all'

type AudienceContact = {
  source_type: 'client_contact' | 'lead_contact'
  source_contact_id: string
  client_id: string | null
  lead_id: string | null
  company_name: string | null
  company_status: string | null
  contact_name: string | null
  contact_title: string | null
  role_type: string | null
  email: string | null
  email_normalised: string | null
  is_primary: boolean
  marketing_status: string | null
  marketing_consent_status: string | null
  unsubscribed_at: string | null
  bounced_at: string | null
  do_not_email: boolean
}

const BLOCKED_MARKETING_STATUSES = new Set([
  'suppressed',
  'bounced',
  'unsubscribed',
])

const BLOCKED_CONSENT_STATUSES = new Set([
  'not_consented',
])

const BLOCKED_CLIENT_STATUSES = new Set([
  'lost',
  'do_not_contact',
])

const BLOCKED_LEAD_STATUSES = new Set([
  'lost',
  'converted',
  'do_not_contact',
])

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function clean(value: unknown) {
  return String(value ?? '').trim()
}

function bool(value: unknown) {
  return value === true || value === 'true' || value === '1' || value === 1
}

function normaliseEmail(value: unknown) {
  return clean(value).toLowerCase()
}

function isValidEmail(value: string) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)
}

function safeSource(value: unknown): SourceFilter {
  const source = clean(value)

  if (source === 'clients' || source === 'leads' || source === 'all') {
    return source
  }

  return 'clients'
}

function sourceFromCampaignAudienceType(audienceType: unknown): SourceFilter {
  const value = clean(audienceType)

  if (value === 'lead_contacts') return 'leads'
  if (value === 'mixed') return 'all'

  return 'clients'
}

function chunkArray<T>(items: T[], size = 500) {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

function exclusionReason(
  contact: AudienceContact,
  options: {
    roleType: string
    search: string
    primaryOnly: boolean
    includeUnknownConsent: boolean
    suppressedEmails: Set<string>
    seenEmails: Set<string>
  },
) {
  const emailNormalised =
    contact.email_normalised || normaliseEmail(contact.email)

  const haystack = [
    contact.company_name,
    contact.contact_name,
    contact.contact_title,
    contact.role_type,
    contact.email,
    contact.company_status,
    contact.marketing_status,
    contact.marketing_consent_status,
  ]
    .map(value => clean(value).toLowerCase())
    .join(' ')

  if (!contact.email || !emailNormalised) return 'missing_email'
  if (!isValidEmail(emailNormalised)) return 'invalid_email'
  if (options.seenEmails.has(emailNormalised)) return 'duplicate_email'
  if (options.suppressedEmails.has(emailNormalised)) return 'suppressed'
  if (contact.do_not_email) return 'do_not_email'
  if (contact.unsubscribed_at) return 'unsubscribed'
  if (contact.bounced_at) return 'bounced'

  if (BLOCKED_MARKETING_STATUSES.has(clean(contact.marketing_status))) {
    return clean(contact.marketing_status)
  }

  if (BLOCKED_CONSENT_STATUSES.has(clean(contact.marketing_consent_status))) {
    return 'not_consented'
  }

  if (
    !options.includeUnknownConsent &&
    clean(contact.marketing_consent_status) === 'unknown'
  ) {
    return 'unknown_consent'
  }

  if (contact.source_type === 'client_contact') {
    if (BLOCKED_CLIENT_STATUSES.has(clean(contact.company_status))) {
      return 'client_status_blocked'
    }
  }

  if (contact.source_type === 'lead_contact') {
    if (BLOCKED_LEAD_STATUSES.has(clean(contact.company_status))) {
      return 'lead_status_blocked'
    }
  }

  if (options.primaryOnly && !contact.is_primary) {
    return 'not_primary'
  }

  if (options.roleType && clean(contact.role_type) !== options.roleType) {
    return 'role_type_mismatch'
  }

  if (options.search && !haystack.includes(options.search)) {
    return 'search_mismatch'
  }

  return null
}

async function loadSuppressedEmails(supabase: ReturnType<typeof getServiceClient>) {
  const { data, error } = await supabase
    .from('marketing_suppression_list')
    .select('email_normalised')
    .range(0, 9999)

  if (error) throw new Error(error.message)

  return new Set(
    (Array.isArray(data) ? data : [])
      .map(row => normaliseEmail(row.email_normalised))
      .filter(Boolean),
  )
}

async function loadClientContacts(supabase: ReturnType<typeof getServiceClient>) {
  const { data: contacts, error: contactsError } = await supabase
    .from('client_contacts')
    .select('*')
    .order('created_at', { ascending: false })
    .range(0, 9999)

  if (contactsError) throw new Error(contactsError.message)

  const safeContacts = Array.isArray(contacts) ? contacts : []
  const clientIds = Array.from(
    new Set(
      safeContacts
        .map(contact => clean(contact.client_id))
        .filter(Boolean),
    ),
  )

  let clientsById = new Map<string, any>()

  if (clientIds.length > 0) {
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, company_name, status, sector, region')
      .in('id', clientIds)

    if (clientsError) throw new Error(clientsError.message)

    clientsById = new Map(
      (Array.isArray(clients) ? clients : []).map(client => [client.id, client]),
    )
  }

  return safeContacts.map(contact => {
    const client = clientsById.get(contact.client_id)

    return {
      source_type: 'client_contact' as const,
      source_contact_id: contact.id,
      client_id: contact.client_id ?? null,
      lead_id: null,
      company_name: client?.company_name ?? null,
      company_status: client?.status ?? null,
      contact_name: contact.name ?? null,
      contact_title: contact.title ?? null,
      role_type: contact.role_type ?? null,
      email: contact.email ?? null,
      email_normalised: contact.email_normalised ?? normaliseEmail(contact.email),
      is_primary: Boolean(contact.is_primary),
      marketing_status: contact.marketing_status ?? null,
      marketing_consent_status: contact.marketing_consent_status ?? null,
      unsubscribed_at: contact.unsubscribed_at ?? null,
      bounced_at: contact.bounced_at ?? null,
      do_not_email: Boolean(contact.do_not_email),
    }
  })
}

async function loadLeadContacts(supabase: ReturnType<typeof getServiceClient>) {
  const { data: contacts, error: contactsError } = await supabase
    .from('lead_contacts')
    .select('*')
    .order('created_at', { ascending: false })
    .range(0, 9999)

  if (contactsError) throw new Error(contactsError.message)

  const safeContacts = Array.isArray(contacts) ? contacts : []
  const leadIds = Array.from(
    new Set(
      safeContacts
        .map(contact => clean(contact.lead_id))
        .filter(Boolean),
    ),
  )

  let leadsById = new Map<string, any>()

  if (leadIds.length > 0) {
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, company_name, status, sector, region')
      .in('id', leadIds)

    if (leadsError) throw new Error(leadsError.message)

    leadsById = new Map(
      (Array.isArray(leads) ? leads : []).map(lead => [lead.id, lead]),
    )
  }

  return safeContacts.map(contact => {
    const lead = leadsById.get(contact.lead_id)

    return {
      source_type: 'lead_contact' as const,
      source_contact_id: contact.id,
      client_id: null,
      lead_id: contact.lead_id ?? null,
      company_name: lead?.company_name ?? null,
      company_status: lead?.status ?? null,
      contact_name: contact.name ?? null,
      contact_title: contact.title ?? null,
      role_type: contact.role_type ?? null,
      email: contact.email ?? null,
      email_normalised: contact.email_normalised ?? normaliseEmail(contact.email),
      is_primary: Boolean(contact.is_primary),
      marketing_status: contact.marketing_status ?? null,
      marketing_consent_status: contact.marketing_consent_status ?? null,
      unsubscribed_at: contact.unsubscribed_at ?? null,
      bounced_at: contact.bounced_at ?? null,
      do_not_email: Boolean(contact.do_not_email),
    }
  })
}

async function buildEligibleAudience(
  supabase: ReturnType<typeof getServiceClient>,
  options: {
    source: SourceFilter
    roleType: string
    search: string
    primaryOnly: boolean
    includeUnknownConsent: boolean
  },
) {
  const suppressedEmails = await loadSuppressedEmails(supabase)

  const allContacts: AudienceContact[] = []

  if (options.source === 'clients' || options.source === 'all') {
    allContacts.push(...await loadClientContacts(supabase))
  }

  if (options.source === 'leads' || options.source === 'all') {
    allContacts.push(...await loadLeadContacts(supabase))
  }

  const seenEmails = new Set<string>()
  const exclusionCounts: Record<string, number> = {}
  const eligible: AudienceContact[] = []
  const excluded: Array<AudienceContact & { exclusion_reason: string }> = []

  for (const contact of allContacts) {
    const reason = exclusionReason(contact, {
      roleType: options.roleType,
      search: options.search,
      primaryOnly: options.primaryOnly,
      includeUnknownConsent: options.includeUnknownConsent,
      suppressedEmails,
      seenEmails,
    })

    const emailNormalised =
      contact.email_normalised || normaliseEmail(contact.email)

    if (reason) {
      exclusionCounts[reason] = (exclusionCounts[reason] || 0) + 1
      excluded.push({ ...contact, exclusion_reason: reason })
      continue
    }

    seenEmails.add(emailNormalised)

    eligible.push({
      ...contact,
      email_normalised: emailNormalised,
    })
  }

  return {
    total_checked: allContacts.length,
    eligible,
    excluded,
    exclusion_counts: exclusionCounts,
  }
}

function recipientSummary(rows: any[]) {
  return rows.reduce<Record<string, number>>(
    (acc, row) => {
      const status = clean(row.status) || 'pending'
      acc.total = (acc.total || 0) + 1
      acc[status] = (acc[status] || 0) + 1
      return acc
    },
    { total: 0 },
  )
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    const { searchParams } = new URL(request.url)

    const campaignId = clean(searchParams.get('campaign_id'))

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required.' },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from('marketing_campaign_recipients')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const rows = Array.isArray(data) ? data : []

    return NextResponse.json({
      data: rows,
      summary: recipientSummary(rows),
    })
  } catch (error: any) {
    console.error('Campaign recipients GET error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not load campaign recipients.' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    const campaignId = clean(body.campaign_id)

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required.' },
        { status: 400 },
      )
    }

    const { data: campaign, error: campaignError } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('id', campaignId)
      .maybeSingle()

    if (campaignError) {
      return NextResponse.json({ error: campaignError.message }, { status: 400 })
    }

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found.' },
        { status: 404 },
      )
    }

    const { data: existingRecipients, error: existingError } = await supabase
      .from('marketing_campaign_recipients')
      .select('id, status')
      .eq('campaign_id', campaignId)

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 400 })
    }

    const existing = Array.isArray(existingRecipients)
      ? existingRecipients
      : []

    const lockedRecipients = existing.filter(
      recipient => clean(recipient.status) !== 'pending',
    )

    if (lockedRecipients.length > 0) {
      return NextResponse.json(
        {
          error:
            'This campaign already has recipients that are no longer pending. Create a new campaign if you need a fresh audience.',
        },
        { status: 400 },
      )
    }

    if (existing.length > 0) {
      const { error: deleteError } = await supabase
        .from('marketing_campaign_recipients')
        .delete()
        .eq('campaign_id', campaignId)
        .eq('status', 'pending')

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 400 })
      }
    }

    const source = body.source
      ? safeSource(body.source)
      : sourceFromCampaignAudienceType(campaign.audience_type)

    const audience = await buildEligibleAudience(supabase, {
      source,
      roleType: clean(body.role_type),
      search: clean(body.search).toLowerCase(),
      primaryOnly: bool(body.primary_only),
      includeUnknownConsent: body.include_unknown_consent !== false,
    })

    const rowsToInsert = audience.eligible.map(contact => ({
      campaign_id: campaignId,
      source_type: contact.source_type,
      source_contact_id: contact.source_contact_id,
      client_id: contact.client_id,
      lead_id: contact.lead_id,
      company_name: contact.company_name,
      contact_name: contact.contact_name,
      contact_title: contact.contact_title,
      role_type: contact.role_type,
      email: contact.email,
      email_normalised: contact.email_normalised,
      status: 'pending',
    }))

    const insertedRows: any[] = []

    for (const chunk of chunkArray(rowsToInsert, 500)) {
      if (chunk.length === 0) continue

      const { data: inserted, error: insertError } = await supabase
        .from('marketing_campaign_recipients')
        .insert(chunk)
        .select('*')

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 400 })
      }

      insertedRows.push(...(Array.isArray(inserted) ? inserted : []))
    }

    if (insertedRows.length > 0 && clean(campaign.status) === 'draft') {
      await supabase
        .from('marketing_campaigns')
        .update({ status: 'ready' })
        .eq('id', campaignId)
    }

    return NextResponse.json({
      data: insertedRows,
      summary: {
        campaign_id: campaignId,
        source,
        total_checked: audience.total_checked,
        eligible_count: audience.eligible.length,
        inserted_count: insertedRows.length,
        excluded_count: audience.excluded.length,
        exclusion_counts: audience.exclusion_counts,
      },
    })
  } catch (error: any) {
    console.error('Campaign recipients POST error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not generate campaign recipients.' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    const campaignId = clean(body.campaign_id)

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required.' },
        { status: 400 },
      )
    }

    const { data: existingRecipients, error: existingError } = await supabase
      .from('marketing_campaign_recipients')
      .select('id, status')
      .eq('campaign_id', campaignId)

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 400 })
    }

    const existing = Array.isArray(existingRecipients)
      ? existingRecipients
      : []

    const lockedRecipients = existing.filter(
      recipient => clean(recipient.status) !== 'pending',
    )

    if (lockedRecipients.length > 0) {
      return NextResponse.json(
        {
          error:
            'This campaign has recipients that are no longer pending, so the snapshot cannot be cleared.',
        },
        { status: 400 },
      )
    }

    const { error } = await supabase
      .from('marketing_campaign_recipients')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      deleted_count: existing.length,
    })
  } catch (error: any) {
    console.error('Campaign recipients DELETE error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not clear campaign recipients.' },
      { status: 500 },
    )
  }
}