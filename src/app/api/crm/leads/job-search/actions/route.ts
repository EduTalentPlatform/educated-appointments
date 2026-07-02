import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai-client'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type JobSearchResult = {
  job_title?: string
  employer_name?: string
  employer_sector?: string | null
  location?: string
  region?: string
  salary?: string | null
  job_type?: string | null
  posted_days_ago?: number | null
  url?: string | null
  source?: string | null
  notes?: string | null
}

type CrmRecordType = 'lead' | 'client'

type CrmMatch = {
  type: CrmRecordType
  id: string
  company_name: string
  status?: string | null
  sector?: string | null
  region?: string | null
  website?: string | null
  contact_name?: string | null
  contact_title?: string | null
  email?: string | null
  phone?: string | null
  confidence: number
}

const COMPANY_SUFFIX_WORDS = new Set([
  'ltd',
  'limited',
  'llp',
  'plc',
  'cic',
  'uk',
  'group',
  'holdings',
  'company',
  'companies',
  'the',
])

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function clean(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function nullable(value: unknown) {
  const text = clean(value)
  return text || null
}

function normaliseCompanyName(value: unknown) {
  return clean(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(token => token && !COMPANY_SUFFIX_WORDS.has(token))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normaliseWebsiteHost(value: unknown) {
  const raw = clean(value)
  if (!raw) return ''

  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    return url.hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    return ''
  }
}

function stripCodeFences(text: string) {
  return text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()
}

function extractFirstJsonObject(text: string) {
  const cleaned = stripCodeFences(text)
  const start = cleaned.indexOf('{')

  if (start === -1) {
    throw new Error('No JSON object found in AI response.')
  }

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < cleaned.length; i += 1) {
    const char = cleaned[i]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (!inString) {
      if (char === '{') depth += 1
      if (char === '}') depth -= 1

      if (depth === 0) {
        return cleaned.slice(start, i + 1)
      }
    }
  }

  throw new Error('Incomplete JSON object in AI response.')
}

function parseJsonFromAi(text: string) {
  const json = extractFirstJsonObject(text)

  try {
    return JSON.parse(json)
  } catch {
    return JSON.parse(
      json
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/}\s*{/g, '},{')
        .replace(/]\s*"/g, '],"')
        .replace(/}\s*"/g, '},"'),
    )
  }
}

function jobLines(jobs: JobSearchResult[]) {
  return jobs
    .map((job, index) => {
      const bits = [
        `${index + 1}. ${clean(job.job_title) || 'Role unknown'}`,
        clean(job.location),
        clean(job.salary),
        clean(job.url),
      ].filter(Boolean)

      return bits.join(' | ')
    })
    .join('\n')
}

function buildJobSearchNote(jobs: JobSearchResult[]) {
  if (!jobs.length) return ''

  return [
    'BD Job Search roles found:',
    jobLines(jobs),
  ].join('\n')
}

function getCompanyScore(record: any, employerName: string, jobUrl?: string | null) {
  const employer = normaliseCompanyName(employerName)
  const company = normaliseCompanyName(record?.company_name)

  if (!employer || !company) return 0

  if (employer === company) return 100

  const jobHost = normaliseWebsiteHost(jobUrl)
  const recordHost = normaliseWebsiteHost(record?.website)

  if (jobHost && recordHost && jobHost === recordHost) return 98

  if (employer.length >= 6 && company.includes(employer)) return 88
  if (company.length >= 6 && employer.includes(company)) return 86

  const employerTokens = employer.split(' ').filter(Boolean)
  const companyTokens = company.split(' ').filter(Boolean)

  if (!employerTokens.length || !companyTokens.length) return 0

  const shared = employerTokens.filter(token => companyTokens.includes(token))
  const overlap = shared.length / Math.min(employerTokens.length, companyTokens.length)

  if (shared.length >= 2 && overlap >= 0.66) return Math.round(overlap * 82)
  if (shared.length >= 1 && employerTokens.length === 1 && companyTokens.length === 1) return 70

  return 0
}

function toMatch(record: any, type: CrmRecordType, confidence: number): CrmMatch {
  return {
    type,
    id: record.id,
    company_name: record.company_name,
    status: record.status ?? null,
    sector: record.sector ?? null,
    region: record.region ?? null,
    website: record.website ?? null,
    contact_name: record.contact_name ?? null,
    contact_title: record.contact_title ?? null,
    email: record.email ?? null,
    phone: record.phone ?? null,
    confidence,
  }
}

function findBestCompanyMatch(
  employerName: string,
  jobUrl: string | null | undefined,
  clients: any[],
  leads: any[],
): CrmMatch | null {
  const clientMatches = clients
    .map(record => ({
      record,
      score: getCompanyScore(record, employerName, jobUrl),
    }))
    .filter(item => item.score >= 70)
    .sort((a, b) => b.score - a.score)

  if (clientMatches[0]) {
    return toMatch(clientMatches[0].record, 'client', clientMatches[0].score)
  }

  const leadMatches = leads
    .filter(record => record.status !== 'converted')
    .map(record => ({
      record,
      score: getCompanyScore(record, employerName, jobUrl),
    }))
    .filter(item => item.score >= 70)
    .sort((a, b) => b.score - a.score)

  if (leadMatches[0]) {
    return toMatch(leadMatches[0].record, 'lead', leadMatches[0].score)
  }

  return null
}

async function callOpenAI(prompt: string, useWebSearch = false) {
  const model =
    (useWebSearch
      ? process.env.OPENAI_WEB_SEARCH_MODEL
      : process.env.OPENAI_LOW_COST_MODEL) ||
    process.env.OPENAI_MODEL ||
    'gpt-4.1-mini'

  const result = await callAI(prompt, {
    provider: 'openai',
    model,
    useWebSearch,
    webSearchContextSize: useWebSearch ? 'medium' : 'low',
    taskType: useWebSearch ? 'web_search' : 'outreach',
    route: useWebSearch
      ? 'crm/leads/job-search/find-contacts'
      : 'crm/leads/job-search/generate-email',
    maxTokens: useWebSearch ? 6000 : 3000,
    temperature: useWebSearch ? 0.2 : 0.7,
    autoContinue: false,
    metadata: {
      use_web_search: useWebSearch,
    },
  })

  const text = result.text?.trim()

  if (!text) {
    throw new Error('No AI response returned.')
  }

  return text
}

async function matchCompanies(body: any) {
  const jobs: JobSearchResult[] = Array.isArray(body.jobs) ? body.jobs : []
  const supabase = getServiceClient()

  const [{ data: clients, error: clientsError }, { data: leads, error: leadsError }] =
    await Promise.all([
      supabase
        .from('clients')
        .select('id, company_name, status, sector, region, website, contact_name, contact_title, email, phone')
        .limit(5000),
      supabase
        .from('leads')
        .select('id, company_name, status, sector, region, website, contact_name, contact_title, email, phone')
        .limit(5000),
    ])

  if (clientsError) {
    return NextResponse.json({ error: clientsError.message }, { status: 400 })
  }

  if (leadsError) {
    return NextResponse.json({ error: leadsError.message }, { status: 400 })
  }

  const matchesByEmployer: Record<string, CrmMatch | null> = {}

  jobs.forEach(job => {
    const employerName = clean(job.employer_name)
    const key = normaliseCompanyName(employerName)

    if (!key || Object.prototype.hasOwnProperty.call(matchesByEmployer, key)) return

    matchesByEmployer[key] = findBestCompanyMatch(
      employerName,
      job.url,
      clients ?? [],
      leads ?? [],
    )
  })

  const matchedJobs = jobs.map(job => ({
    ...job,
    crm_match: matchesByEmployer[normaliseCompanyName(job.employer_name)] ?? null,
  }))

  return NextResponse.json({
    jobs: matchedJobs,
    matches_by_employer: matchesByEmployer,
  })
}

async function createLead(body: any) {
  const supabase = getServiceClient()
  const lead = body.lead || {}
  const jobs: JobSearchResult[] = Array.isArray(body.jobs) ? body.jobs : []

  const companyName = clean(lead.company_name || body.employer_name)

  if (!companyName) {
    return NextResponse.json({ error: 'Company name is required.' }, { status: 400 })
  }

  const jobNote = buildJobSearchNote(jobs)
  const notes = [clean(lead.notes), jobNote].filter(Boolean).join('\n\n')

  const payload = {
    company_name: companyName,
    contact_name: nullable(lead.contact_name),
    contact_title: nullable(lead.contact_title),
    email: nullable(lead.email),
    phone: nullable(lead.phone),
    website: nullable(lead.website),
    region: nullable(lead.region),
    sector: nullable(lead.sector),
    status: clean(lead.status) || 'new',
    priority: clean(lead.priority) || 'medium',
    source: clean(lead.source) || 'BD Job Search',
    notes: notes || null,
  }

  const { data, error } = await supabase
    .from('leads')
    .insert(payload)
    .select('id, company_name, status, sector, region, website, contact_name, contact_title, email, phone')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (jobNote) {
    await supabase.from('lead_activities').insert({
      lead_id: data.id,
      activity_type: 'note',
      direction: 'internal',
      content: `Lead created from BD Job Search.\n\n${jobNote}`,
    })
  }

  return NextResponse.json({
    lead: data,
    match: toMatch(data, 'lead', 100),
  })
}

async function generateEmail(body: any) {
  const record = body.record || {}
  const jobs: JobSearchResult[] = Array.isArray(body.jobs) ? body.jobs : []
  const extraContext = clean(body.extra_context)
  const companyName = clean(record.company_name || body.employer_name)

  if (!companyName) {
    return NextResponse.json({ error: 'Company name is required.' }, { status: 400 })
  }

  if (!jobs.length) {
    return NextResponse.json({ error: 'At least one job is required.' }, { status: 400 })
  }

  const relationship =
    record.type === 'client'
      ? 'This company is already a client of Educated Appointments. Write warmly and do not over-introduce us.'
      : 'This company is a lead/prospect. Briefly introduce Educated Appointments, but keep it human and direct.'

  const prompt = `You are writing a business development email for Educated Appointments, a UK recruitment agency specialising in Further Education, Skills, Apprenticeships and Training Providers.

Company: ${companyName}
CRM relationship: ${relationship}

Roles found online:
${jobLines(jobs)}

${extraContext ? `Extra context from Joseph:\n${extraContext}` : ''}

Write a natural, human email from Joseph at Educated Appointments.

Rules:
- UK English.
- Warm, consultative and not pushy.
- Mention that we noticed they are currently advertising for the role or roles.
- If multiple roles are listed, group them neatly rather than sounding robotic.
- Offer help with candidates across FE, Skills, Apprenticeships or relevant delivery/quality/commercial roles.
- Keep it concise.
- Do not invent names, fees, candidate details or availability.
- Return JSON only.
- Do not include markdown.

Return exactly:
{
  "subject": "Email subject here",
  "body": "Email body here"
}`

  const text = await callOpenAI(prompt, false)
  const parsed = parseJsonFromAi(text)

  return NextResponse.json({
    subject: clean(parsed.subject) || `Support with ${companyName} vacancies`,
    body: clean(parsed.body),
  })
}

async function saveEmailActivity(body: any) {
  const supabase = getServiceClient()
  const record = body.record || {}
  const jobs: JobSearchResult[] = Array.isArray(body.jobs) ? body.jobs : []

  const recordType = record.type === 'client' ? 'client' : 'lead'
  const recordId = clean(record.id)
  const subject = clean(body.subject)
  const emailBody = clean(body.body)

  if (!recordId) {
    return NextResponse.json({ error: 'CRM record ID is required.' }, { status: 400 })
  }

  if (!emailBody) {
    return NextResponse.json({ error: 'Email body is required.' }, { status: 400 })
  }

  const table = recordType === 'client' ? 'client_activities' : 'lead_activities'
  const foreignKey = recordType === 'client' ? 'client_id' : 'lead_id'

  const content = [
    subject ? `Subject: ${subject}` : '',
    emailBody,
    jobs.length ? `---\nSaved from BD Job Search.\n\n${buildJobSearchNote(jobs)}` : '',
  ].filter(Boolean).join('\n\n')

  const { data, error } = await supabase
    .from(table)
    .insert({
      [foreignKey]: recordId,
      activity_type: 'email',
      direction: 'outbound',
      content,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ activity: data })
}

async function findContacts(body: any) {
  const companyName = clean(body.company_name)
  const website = clean(body.website)
  const sector = clean(body.sector)
  const jobs: JobSearchResult[] = Array.isArray(body.jobs) ? body.jobs : []

  if (!companyName) {
    return NextResponse.json({ error: 'Company name is required.' }, { status: 400 })
  }

  const prompt = `Search the web now for publicly available people who are likely to be good business development contacts at this organisation.

Organisation: ${companyName}
Website if known: ${website || 'Unknown'}
Sector if known: ${sector || 'Unknown'}

Live roles found:
${jobs.length ? jobLines(jobs) : 'No roles supplied.'}

We are Educated Appointments, a UK recruitment agency specialising in FE, Skills, Apprenticeships and Training Providers.

Find likely contacts for recruitment, apprenticeships, curriculum, delivery, quality, HR, talent, operations or senior leadership.

Rules:
- Use only publicly available information.
- Do not guess email addresses.
- Only include an email if it appears publicly available in search results.
- LinkedIn/profile URLs are useful.
- Prefer people with titles like Head of Apprenticeships, Director of Curriculum, Head of Quality, Operations Director, HR Manager, People Partner, Talent Acquisition, Commercial Director, CEO/MD, Principal.
- Return a maximum of 8 contacts.
- Return valid JSON only.
- Do not include markdown.

Return exactly:
{
  "contacts": [
    {
      "name": "Full name",
      "title": "Job title",
      "email": null,
      "phone": null,
      "linkedin": "https://...",
      "source_url": "https://...",
      "reason": "Why they are relevant",
      "confidence": "high"
    }
  ]
}`

  const text = await callOpenAI(prompt, true)
  const parsed = parseJsonFromAi(text)

  const contacts = Array.isArray(parsed.contacts)
    ? parsed.contacts.slice(0, 8).map((contact: any) => ({
        name: clean(contact.name),
        title: clean(contact.title) || null,
        email: clean(contact.email) || null,
        phone: clean(contact.phone) || null,
        linkedin: clean(contact.linkedin) || null,
        source_url: clean(contact.source_url) || null,
        reason: clean(contact.reason) || null,
        confidence: clean(contact.confidence) || 'medium',
      })).filter((contact: any) => contact.name)
    : []

  return NextResponse.json({ contacts })
}

async function saveContact(body: any) {
  const supabase = getServiceClient()
  const record = body.record || {}
  const contact = body.contact || {}

  const recordType = record.type === 'client' ? 'client' : 'lead'
  const recordId = clean(record.id)
  const name = clean(contact.name)

  if (!recordId) {
    return NextResponse.json({ error: 'CRM record ID is required.' }, { status: 400 })
  }

  if (!name) {
    return NextResponse.json({ error: 'Contact name is required.' }, { status: 400 })
  }

  const table = recordType === 'client' ? 'client_contacts' : 'lead_contacts'
  const foreignKey = recordType === 'client' ? 'client_id' : 'lead_id'

  const payload = {
    [foreignKey]: recordId,
    name,
    title: nullable(contact.title),
    email: nullable(contact.email),
    phone: nullable(contact.phone),
    linkedin: nullable(contact.linkedin || contact.source_url),
    role_type: 'Decision Maker',
    is_primary: false,
  }

  const { data, error } = await supabase
    .from(table)
    .insert(payload)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const activityTable = recordType === 'client' ? 'client_activities' : 'lead_activities'

  await supabase.from(activityTable).insert({
    [foreignKey]: recordId,
    activity_type: 'note',
    direction: 'internal',
    content: [
      `Contact added from BD Job Search contact finder: ${name}`,
      contact.title ? `Title: ${contact.title}` : '',
      contact.email ? `Email: ${contact.email}` : '',
      contact.phone ? `Phone: ${contact.phone}` : '',
      contact.linkedin ? `LinkedIn: ${contact.linkedin}` : '',
      contact.source_url ? `Source: ${contact.source_url}` : '',
      contact.reason ? `Reason: ${contact.reason}` : '',
    ].filter(Boolean).join('\n'),
  })

  return NextResponse.json({ contact: data })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = clean(body.action)

    if (action === 'match_companies') return matchCompanies(body)
    if (action === 'create_lead') return createLead(body)
    if (action === 'generate_email') return generateEmail(body)
    if (action === 'save_email_activity') return saveEmailActivity(body)
    if (action === 'find_contacts') return findContacts(body)
    if (action === 'save_contact') return saveContact(body)

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  } catch (error: any) {
    console.error('BD job search action error:', error)

    return NextResponse.json(
      { error: error?.message || 'Something went wrong.' },
      { status: 500 },
    )
  }
}
