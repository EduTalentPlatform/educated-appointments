import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AudienceSource = 'clients' | 'leads' | 'all'

type AudienceRow = {
  source_type: 'client_contact' | 'lead_contact'
  source_contact_id: string
  company_id: string
  company_name: string
  company_status: string | null
  contact_name: string
  contact_title: string | null
  role_type: string | null
  is_primary: boolean | null
  email: string | null
  email_normalised: string | null
  phone: string | null
  linkedin: string | null
  sector: string | null
  region: string | null
  marketing_status: string | null
  marketing_consent_status: string | null
  marketing_consent_source: string | null
  marketing_consent_date: string | null
  unsubscribed_at: string | null
  bounced_at: string | null
  do_not_email: boolean | null
  last_marketing_email_sent_at: string | null
  marketing_notes: string | null
}

type PreviewRow = AudienceRow & {
  eligible: boolean
  excluded_reason: string | null
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function clean(value: unknown) {
  return String(value ?? '').trim()
}

function nullableFilter(value: unknown) {
  const text = clean(value)
  return text && text !== 'all' ? text : null
}

function parseSource(value: unknown): AudienceSource {
  const text = clean(value)
  if (text === 'leads' || text === 'all') return text
  return 'clients'
}

function boolParam(value: unknown, fallback = false) {
  const text = clean(value).toLowerCase()
  if (!text) return fallback
  return text === 'true' || text === '1' || text === 'yes'
}

function normaliseEmail(value: unknown) {
  const text = clean(value).toLowerCase()
  return text || null
}

function isValidEmail(value: string | null) {
  if (!value) return false
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)
}

function exclusionReason(
  row: AudienceRow,
  suppressedEmails: Set<string>,
  seenEmails: Set<string>,
  includeUnknownConsent: boolean,
) {
  const email = normaliseEmail(row.email_normalised || row.email)

  if (!email || !isValidEmail(email)) {
    return 'Missing or invalid email'
  }

  if (seenEmails.has(email)) {
    return 'Duplicate email'
  }

  if (suppressedEmails.has(email)) {
    return 'Suppressed'
  }

  if (row.do_not_email) {
    return 'Do not email'
  }

  if (row.unsubscribed_at || row.marketing_status === 'unsubscribed') {
    return 'Unsubscribed'
  }

  if (row.bounced_at || row.marketing_status === 'bounced') {
    return 'Bounced'
  }

  if (row.marketing_status === 'suppressed') {
    return 'Suppressed'
  }

  if (row.marketing_consent_status === 'not_consented') {
    return 'Not consented'
  }

  if (!includeUnknownConsent && row.marketing_consent_status === 'unknown') {
    return 'Unknown consent'
  }

  if (row.source_type === 'client_contact') {
    if (row.company_status === 'do_not_contact') {
      return 'Client marked do not contact'
    }

    if (row.company_status === 'lost') {
      return 'Client marked lost'
    }
  }

  if (row.source_type === 'lead_contact') {
    if (row.company_status === 'lost') {
      return 'Lead marked lost'
    }

    if (row.company_status === 'converted') {
      return 'Lead already converted'
    }
  }

  return null
}

async function loadClientContacts(params: {
  supabase: ReturnType<typeof getServiceClient>
  region: string | null
  sector: string | null
  roleType: string | null
  primaryOnly: boolean
  status: string | null
}) {
  const { supabase, region, sector, roleType, primaryOnly, status } = params

  let contactsQuery = supabase
    .from('client_contacts')
    .select('*')
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false })

  if (roleType) contactsQuery = contactsQuery.eq('role_type', roleType)
  if (primaryOnly) contactsQuery = contactsQuery.eq('is_primary', true)

  const { data: contacts, error: contactsError } = await contactsQuery

  if (contactsError) throw contactsError

  const clientIds = Array.from(
    new Set((contacts ?? []).map(contact => contact.client_id).filter(Boolean)),
  )

  if (clientIds.length === 0) return []

  let clientsQuery = supabase
    .from('clients')
    .select('id, company_name, status, sector, region')
    .in('id', clientIds)

  if (region) clientsQuery = clientsQuery.eq('region', region)
  if (sector) clientsQuery = clientsQuery.eq('sector', sector)
  if (status) clientsQuery = clientsQuery.eq('status', status)

  const { data: clients, error: clientsError } = await clientsQuery

  if (clientsError) throw clientsError

  const clientMap = new Map((clients ?? []).map(client => [client.id, client]))

  return (contacts ?? [])
    .filter(contact => clientMap.has(contact.client_id))
    .map(contact => {
      const client = clientMap.get(contact.client_id)

      return {
        source_type: 'client_contact' as const,
        source_contact_id: contact.id,
        company_id: contact.client_id,
        company_name: client?.company_name ?? 'Unknown client',
        company_status: client?.status ?? null,
        contact_name: contact.name,
        contact_title: contact.title ?? null,
        role_type: contact.role_type ?? null,
        is_primary: contact.is_primary ?? false,
        email: contact.email ?? null,
        email_normalised: contact.email_normalised ?? normaliseEmail(contact.email),
        phone: contact.phone ?? null,
        linkedin: contact.linkedin ?? null,
        sector: client?.sector ?? null,
        region: client?.region ?? null,
        marketing_status: contact.marketing_status ?? 'unknown',
        marketing_consent_status: contact.marketing_consent_status ?? 'unknown',
        marketing_consent_source: contact.marketing_consent_source ?? null,
        marketing_consent_date: contact.marketing_consent_date ?? null,
        unsubscribed_at: contact.unsubscribed_at ?? null,
        bounced_at: contact.bounced_at ?? null,
        do_not_email: contact.do_not_email ?? false,
        last_marketing_email_sent_at:
          contact.last_marketing_email_sent_at ?? null,
        marketing_notes: contact.marketing_notes ?? null,
      }
    })
}

async function loadLeadContacts(params: {
  supabase: ReturnType<typeof getServiceClient>
  region: string | null
  sector: string | null
  roleType: string | null
  primaryOnly: boolean
  status: string | null
}) {
  const { supabase, region, sector, roleType, primaryOnly, status } = params

  let contactsQuery = supabase
    .from('lead_contacts')
    .select('*')
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false })

  if (roleType) contactsQuery = contactsQuery.eq('role_type', roleType)
  if (primaryOnly) contactsQuery = contactsQuery.eq('is_primary', true)

  const { data: contacts, error: contactsError } = await contactsQuery

  if (contactsError) throw contactsError

  const leadIds = Array.from(
    new Set((contacts ?? []).map(contact => contact.lead_id).filter(Boolean)),
  )

  if (leadIds.length === 0) return []

  let leadsQuery = supabase
    .from('leads')
    .select('id, company_name, status, sector, region')
    .in('id', leadIds)

  if (region) leadsQuery = leadsQuery.eq('region', region)
  if (sector) leadsQuery = leadsQuery.eq('sector', sector)
  if (status) leadsQuery = leadsQuery.eq('status', status)

  const { data: leads, error: leadsError } = await leadsQuery

  if (leadsError) throw leadsError

  const leadMap = new Map((leads ?? []).map(lead => [lead.id, lead]))

  return (contacts ?? [])
    .filter(contact => leadMap.has(contact.lead_id))
    .map(contact => {
      const lead = leadMap.get(contact.lead_id)

      return {
        source_type: 'lead_contact' as const,
        source_contact_id: contact.id,
        company_id: contact.lead_id,
        company_name: lead?.company_name ?? 'Unknown lead',
        company_status: lead?.status ?? null,
        contact_name: contact.name,
        contact_title: contact.title ?? null,
        role_type: contact.role_type ?? null,
        is_primary: contact.is_primary ?? false,
        email: contact.email ?? null,
        email_normalised: contact.email_normalised ?? normaliseEmail(contact.email),
        phone: contact.phone ?? null,
        linkedin: contact.linkedin ?? null,
        sector: lead?.sector ?? null,
        region: lead?.region ?? null,
        marketing_status: contact.marketing_status ?? 'unknown',
        marketing_consent_status: contact.marketing_consent_status ?? 'unknown',
        marketing_consent_source: contact.marketing_consent_source ?? null,
        marketing_consent_date: contact.marketing_consent_date ?? null,
        unsubscribed_at: contact.unsubscribed_at ?? null,
        bounced_at: contact.bounced_at ?? null,
        do_not_email: contact.do_not_email ?? false,
        last_marketing_email_sent_at:
          contact.last_marketing_email_sent_at ?? null,
        marketing_notes: contact.marketing_notes ?? null,
      }
    })
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    const { searchParams } = new URL(request.url)

    const source = parseSource(searchParams.get('source'))
    const region = nullableFilter(searchParams.get('region'))
    const sector = nullableFilter(searchParams.get('sector'))
    const roleType = nullableFilter(searchParams.get('role_type'))
    const status = nullableFilter(searchParams.get('status'))
    const primaryOnly = boolParam(searchParams.get('primary_only'))
    const includeUnknownConsent = boolParam(
      searchParams.get('include_unknown_consent'),
      true,
    )

    const [{ data: suppressionRows, error: suppressionError }] =
      await Promise.all([
        supabase
          .from('marketing_suppression_list')
          .select('email_normalised'),
      ])

    if (suppressionError) throw suppressionError

    const suppressedEmails = new Set(
      (suppressionRows ?? [])
        .map(row => normaliseEmail(row.email_normalised))
        .filter(Boolean) as string[],
    )

    const rows: AudienceRow[] = []

    if (source === 'clients' || source === 'all') {
      rows.push(
        ...(await loadClientContacts({
          supabase,
          region,
          sector,
          roleType,
          primaryOnly,
          status,
        })),
      )
    }

    if (source === 'leads' || source === 'all') {
      rows.push(
        ...(await loadLeadContacts({
          supabase,
          region,
          sector,
          roleType,
          primaryOnly,
          status,
        })),
      )
    }

    const search = clean(searchParams.get('search')).toLowerCase()

    const filteredRows = search
      ? rows.filter(row => {
          return (
            row.company_name.toLowerCase().includes(search) ||
            row.contact_name.toLowerCase().includes(search) ||
            (row.email ?? '').toLowerCase().includes(search) ||
            (row.role_type ?? '').toLowerCase().includes(search) ||
            (row.sector ?? '').toLowerCase().includes(search) ||
            (row.region ?? '').toLowerCase().includes(search)
          )
        })
      : rows

    const seenEmails = new Set<string>()

    const previewRows: PreviewRow[] = filteredRows.map(row => {
      const email = normaliseEmail(row.email_normalised || row.email)
      const reason = exclusionReason(
        row,
        suppressedEmails,
        seenEmails,
        includeUnknownConsent,
      )

      if (!reason && email) {
        seenEmails.add(email)
      }

      return {
        ...row,
        email_normalised: email,
        eligible: !reason,
        excluded_reason: reason,
      }
    })

    const eligible = previewRows.filter(row => row.eligible)
    const excluded = previewRows.filter(row => !row.eligible)

    const exclusionCounts = excluded.reduce<Record<string, number>>(
      (acc, row) => {
        const reason = row.excluded_reason || 'Excluded'
        acc[reason] = (acc[reason] || 0) + 1
        return acc
      },
      {},
    )

    return NextResponse.json({
      data: {
        summary: {
          total: previewRows.length,
          eligible: eligible.length,
          excluded: excluded.length,
          exclusion_counts: exclusionCounts,
        },
        rows: previewRows.slice(0, 500),
      },
    })
  } catch (error: any) {
    console.error('Marketing audience preview error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not build marketing audience preview.' },
      { status: 500 },
    )
  }
}