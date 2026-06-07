import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callAI } from '@/lib/ai-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function cleanString(value: unknown) {
  const text = String(value ?? '').trim()
  return text || null
}

function normaliseCompanyName(value: unknown) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\b(ltd|limited|llp|plc|cic|inc|company|co|the)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

function extractDomain(value: unknown) {
  const text = String(value ?? '').trim().toLowerCase()
  if (!text) return null

  try {
    const url = text.startsWith('http') ? new URL(text) : new URL(`https://${text}`)
    return url.hostname.replace(/^www\./, '')
  } catch {
    return text
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .trim() || null
  }
}

function findMatchingCompany<T extends { company_name?: string | null; website?: string | null }>(
  rows: T[] | null | undefined,
  employerName: string,
  website?: string | null,
) {
  const targetName = normaliseCompanyName(employerName)
  const targetDomain = extractDomain(website)

  return (
    (rows ?? []).find(row => {
      const rowName = normaliseCompanyName(row.company_name)
      const rowDomain = extractDomain(row.website)

      const nameMatches = targetName && rowName && rowName === targetName
      const domainMatches = targetDomain && rowDomain && rowDomain === targetDomain

      return nameMatches || domainMatches
    }) ?? null
  )
}

function cleanStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(item => String(item ?? '').trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  }

  return []
}

function buildTargetRole(candidate: any) {
  return (
    candidate?.seeking_role_type ||
    candidate?.sub_role_type ||
    candidate?.main_role_type ||
    candidate?.job_title ||
    null
  )
}

function safeText(value: unknown, maxLength = 8000) {
  const text = String(value ?? '').trim()
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

function parseJsonFromClaude(text: string) {
  const cleaned = text
    .replace(/^```json/i, '')
    .replace(/^```/i, '')
    .replace(/```$/i, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch {}

  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1))
  }

  throw new Error('Claude returned a response that was not valid JSON.')
}

async function runClaudeForSpeculationProfile(prompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is missing.')
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 3500,
      temperature: 0.3,
      system:
        'You are an expert UK recruitment consultant in Further Education, Skills, Apprenticeships and Work-Based Learning. Write commercially useful candidate profiles for employer speculation. Return valid JSON only.',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error?.message || 'Claude profile generation failed.')
  }

  const text = (data.content || [])
    .map((part: any) => (part.type === 'text' ? part.text : ''))
    .join('\n')
    .trim()

  return parseJsonFromClaude(text)
}

async function runClaudeWithWebSearch(prompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is missing.')
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'web-search-2025-03-05',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
        },
      ],
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error?.message || 'Claude web search failed.')
  }

  const text = (data.content || [])
    .map((part: any) => (part.type === 'text' ? part.text : ''))
    .join('\n')
    .trim()

  return parseJsonFromClaude(text)
}

// ── Google Custom Search helpers ──────────────────────────────────────────────

interface GoogleSearchResult {
  title: string
  link: string
  snippet: string
  displayLink: string
  date?: string | null
}

function getSerperDateFilter(maxDaysAgo: number) {
  if (maxDaysAgo <= 1) return 'qdr:d'
  if (maxDaysAgo <= 7) return 'qdr:w'
  return 'qdr:m'
}

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
}

function parseLooseDateFromText(value: unknown): Date | null {
  const text = String(value ?? '').trim()
  if (!text) return null

  const lower = text.toLowerCase()
  const now = new Date()

  if (/\btoday\b/.test(lower)) return now

  if (/\byesterday\b/.test(lower)) {
    const date = new Date()
    date.setDate(date.getDate() - 1)
    return date
  }

  const relativeMatch = lower.match(
    /\b(\d+)\s*(day|days|week|weeks|month|months|year|years)\s+ago\b/,
  )

  if (relativeMatch) {
    const amount = Number(relativeMatch[1])
    const unit = relativeMatch[2]
    const date = new Date()

    if (unit.startsWith('day')) date.setDate(date.getDate() - amount)
    if (unit.startsWith('week')) date.setDate(date.getDate() - amount * 7)
    if (unit.startsWith('month')) date.setDate(date.getDate() - amount * 31)
    if (unit.startsWith('year')) date.setDate(date.getDate() - amount * 365)

    return date
  }

  const monthPattern =
    'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?'

  const dayMonthYear = new RegExp(
    `\\b(\\d{1,2})\\s+(${monthPattern})\\s*,?\\s*(\\d{4})\\b`,
    'i',
  )

  const monthDayYear = new RegExp(
    `\\b(${monthPattern})\\s+(\\d{1,2})\\s*,?\\s*(\\d{4})\\b`,
    'i',
  )

  const monthYear = new RegExp(
    `\\b(${monthPattern})\\s+(\\d{4})\\b`,
    'i',
  )

  const dmy = text.match(dayMonthYear)

  if (dmy) {
    const day = Number(dmy[1])
    const month = MONTH_INDEX[dmy[2].slice(0, 3).toLowerCase()]
    const year = Number(dmy[3])

    if (Number.isFinite(day) && month !== undefined && Number.isFinite(year)) {
      return new Date(year, month, day)
    }
  }

  const mdy = text.match(monthDayYear)

  if (mdy) {
    const month = MONTH_INDEX[mdy[1].slice(0, 3).toLowerCase()]
    const day = Number(mdy[2])
    const year = Number(mdy[3])

    if (month !== undefined && Number.isFinite(day) && Number.isFinite(year)) {
      return new Date(year, month, day)
    }
  }

  const my = text.match(monthYear)

  if (my) {
    const month = MONTH_INDEX[my[1].slice(0, 3).toLowerCase()]
    const year = Number(my[2])

    if (month !== undefined && Number.isFinite(year)) {
      return new Date(year, month, 1)
    }
  }

  return null
}

function isTextClearlyOlderThanMaxDays(value: unknown, maxDaysAgo: number) {
  const date = parseLooseDateFromText(value)
  if (!date) return false

  const now = new Date()
  const ageDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  )

  return ageDays > maxDaysAgo
}

function isSearchResultClearlyTooOld(
  result: GoogleSearchResult,
  maxDaysAgo: number,
) {
  return isTextClearlyOlderThanMaxDays(
    [result.date, result.title, result.snippet].filter(Boolean).join(' '),
    maxDaysAgo,
  )
}

function isScoredJobClearlyTooOld(job: any, maxDaysAgo: number) {
  const days = Number(job.posted_days_ago)

  if (Number.isFinite(days)) {
    return days > maxDaysAgo
  }

  return isTextClearlyOlderThanMaxDays(
    [
      job.job_title,
      job.location,
      job.region,
      job.match_summary,
      job.notes,
      job.url,
    ]
      .filter(Boolean)
      .join(' '),
    maxDaysAgo,
  )
}

async function runGoogleSearch(
  query: string,
  maxDaysAgo = 30,
): Promise<GoogleSearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY

  if (!apiKey) {
    throw new Error('SERPER_API_KEY is missing.')
  }

  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: query,
      gl: 'uk',
      hl: 'en',
      num: 10,
      tbs: getSerperDateFilter(maxDaysAgo),
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('Serper API error:', err)
    return []
  }

  const data = await res.json()

  const organic = data.organic || []

  return organic.map((item: any) => ({
    title: String(item.title || '').trim(),
    link: String(item.link || '').trim(),
    snippet: String(item.snippet || '').trim(),
    displayLink: String(item.displayLink || '').trim(),
    date: String(item.date || '').trim() || null,
  }))
}

function buildJobSearchQueries({
  targetRole,
  standardNames,
  candidateLocation,
  candidateArea,
  selectedRegions,
  extraKeywords,
  isDeliveryRole,
  searchScope,
  includeRemoteHybrid,
  includeUkWide,
}: {
  targetRole: string
  standardNames: string[]
  candidateLocation: string
  candidateArea: string
  selectedRegions: string[]
  extraKeywords: string
  isDeliveryRole: boolean
  searchScope: string
  includeRemoteHybrid: boolean
  includeUkWide: boolean
}): string[] {
  const queries: string[] = []
  const extra = extraKeywords ? ` ${extraKeywords}` : ''

  const remoteHybridTerms = [
    '"remote"',
    '"hybrid"',
    '"home based"',
    '"home-based"',
    '"field based"',
    '"field-based"',
  ]

  const ukWideTerms = [
    '"UK wide"',
    '"UK-wide"',
    '"national"',
    '"United Kingdom"',
  ]

  const searchLocations: string[] = []

  if (searchScope === 'selected_regions' && selectedRegions.length > 0) {
    searchLocations.push(...selectedRegions)
  }

  if (searchScope === 'candidate_area') {
    const area = candidateArea || candidateLocation
    if (area) searchLocations.push(area)
  }

  if (searchScope === 'uk_wide_remote') {
    if (includeRemoteHybrid) {
      searchLocations.push(remoteHybridTerms.join(' OR '))
    }

    if (includeUkWide) {
      searchLocations.push(ukWideTerms.join(' OR '))
    }

    searchLocations.push('')
  }

  if (searchScope !== 'uk_wide_remote' && includeRemoteHybrid) {
    searchLocations.push(remoteHybridTerms.join(' OR '))
  }

  if (searchScope !== 'uk_wide_remote' && includeUkWide) {
    searchLocations.push(ukWideTerms.join(' OR '))
  }

  if (searchLocations.length === 0) {
    searchLocations.push('')
  }

  const uniqueSearchLocations = Array.from(new Set(searchLocations))

  const standardsQuery = standardNames
    .slice(0, 3)
    .map(s => `"${s}"`)
    .join(' OR ')

  for (const locationValue of uniqueSearchLocations) {
    const location = locationValue ? ` ${locationValue}` : ''

    queries.push(`site:reed.co.uk "${targetRole}"${location}${extra} -agency`)
    queries.push(`site:tes.com "${targetRole}"${location}${extra}`)
    queries.push(`site:cv-library.co.uk "${targetRole}"${location}${extra}`)
    queries.push(`site:totaljobs.com "${targetRole}"${location}${extra}`)
    queries.push(`site:jobs.ac.uk "${targetRole}"${location}${extra}`)
    queries.push(`site:linkedin.com/jobs "${targetRole}"${location}${extra}`)

    queries.push(
      `"${targetRole}" "apprenticeship" "training provider" vacancy OR job${location}${extra} -recruitment -staffing`,
    )

    queries.push(
      `"${targetRole}" "further education" vacancy OR job${location}${extra} -recruitment -staffing`,
    )

    if (isDeliveryRole && standardsQuery) {
      queries.push(`(${standardsQuery}) "${targetRole}" vacancy OR job${location}`)
      queries.push(`(${standardsQuery}) "training provider" "${targetRole}" hiring OR vacancy${location}`)
      queries.push(`(${standardsQuery}) "ITP" "${targetRole}" hiring OR vacancy${location}`)
    }
  }

  return Array.from(new Set(queries)).slice(0, 40)
}

function deduplicateByUrl(results: GoogleSearchResult[]): GoogleSearchResult[] {
  const seen = new Set<string>()
  return results.filter(result => {
    const key = result.link.toLowerCase().split('?')[0]
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function inferSourceFromUrl(url: string): string {
  const lower = url.toLowerCase()
  if (lower.includes('reed.co.uk')) return 'Reed'
  if (lower.includes('tes.com')) return 'TES'
  if (lower.includes('cv-library.co.uk')) return 'CV-Library'
  if (lower.includes('totaljobs.com')) return 'Totaljobs'
  if (lower.includes('jobs.ac.uk')) return 'jobs.ac.uk'
  if (lower.includes('linkedin.com')) return 'LinkedIn'
  if (lower.includes('indeed.co.uk') || lower.includes('indeed.com')) return 'Indeed'
  if (lower.includes('guardian.com') || lower.includes('theguardian.com')) return 'Guardian Jobs'
  if (lower.includes('charityjob.co.uk')) return 'CharityJob'
  if (lower.includes('feweek.co.uk')) return 'FE Week'
  if (lower.includes('aoc.co.uk')) return 'AoC Jobs'
  if (lower.includes('findapprenticeship') || lower.includes('apprenticeships.gov.uk')) return 'Find an Apprenticeship'
  return 'Provider site'
}

async function runClaudeForJobScoring(
  searchResults: GoogleSearchResult[],
  candidateContext: string,
  targetRole: string,
  isDeliveryRole: boolean,
  maxDaysAgo: number,
  standardNames: string[],
): Promise<any> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is missing.')

  const resultsBlock = searchResults
    .map((r, i) =>
      `[${i + 1}] Title: ${r.title}\nURL: ${r.link}\nSource: ${inferSourceFromUrl(r.link)}\nSnippet: ${r.snippet}`,
    )
    .join('\n\n')

  const systemPrompt = `
You are a specialist UK further education and apprenticeship sector recruiter.

Your task: review these Google search results for "${targetRole}" vacancies and extract genuine live job postings. Then score each one against the candidate profile and return only those that are a real match.

CANDIDATE PROFILE
${candidateContext || `Seeking: ${targetRole}`}

EXTRACTION RULES
1. Only extract results that are actual job vacancy pages — not blog posts, news articles, agency directories or general career advice pages.
2. Extract the job title, employer name, location, salary and any other details visible in the title or snippet.
3. If a result is clearly a list page (e.g. "50 Assessor jobs on Reed") rather than a single vacancy, skip it.
4. Estimate posted_days_ago from any date information in the snippet. If no date is visible set it to null.
5. Only include jobs posted within the last ${maxDaysAgo} days. If the date suggests it is older, exclude it.

MATCHING RULES
1. Score each extracted job 0-100 for candidate fit against the profile above.
2. Only return jobs scoring 60 or above.
3. ${isDeliveryRole
    ? 'This is a delivery role. The subject area MUST match what the candidate can deliver. Exclude any job in a different subject area.'
    : "Match the candidate's seniority. Exclude roles clearly above or below their level."}
4. Exclude agency postings where the actual employer is not named.
5. Write a match_summary citing SPECIFIC evidence from the candidate profile for every job returned.
${standardNames.length > 0 ? `6. Flag if the employer is known to deliver these standards: ${standardNames.join(', ')}` : ''}

OUTPUT - JSON only, no markdown, no preamble:
{
  "jobs": [
    {
      "job_title": "string",
      "employer_name": "string",
      "location": "string",
      "region": "string",
      "salary": "string or null",
      "url": "string",
      "source": "string",
      "posted_days_ago": null,
      "match_score": 0,
      "match_summary": "string",
      "matched_standard": "string or null",
      "notes": "string or null"
    }
  ],
  "summary": "string",
  "excluded_reasons": ["string"]
}`.trim()

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0.1,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Here are ${searchResults.length} Google search results. Extract genuine job vacancies, score them against the candidate profile, and return only those scoring 60 or above.\n\n${resultsBlock}`,
        },
      ],
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error?.message || 'Claude scoring failed.')
  }

  const text = (data.content || [])
    .map((part: any) => (part.type === 'text' ? part.text : ''))
    .join('\n')
    .trim()

  return parseJsonFromClaude(text)
}

function buildTargetRoles(candidate: any) {
  const lookingForRoles = cleanStringArray(candidate?.looking_for_roles)

  if (lookingForRoles.length > 0) return lookingForRoles

  return cleanStringArray([
    candidate?.seeking_role_type,
    candidate?.sub_role_type,
    candidate?.main_role_type,
    candidate?.job_title,
  ])
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    const candidateId = cleanString(body.candidate_id || body.candidateId)

    if (!candidateId) {
      return NextResponse.json(
        { error: 'Candidate ID is required.' },
        { status: 400 },
      )
    }

    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        job_title,
        main_role_type,
        sub_role_type,
        seeking_role_type,
        looking_for_roles,
        preferred_location,
        postcode,
        notes,
        formatted_cv,
        can_deliver,
        qualifications
      `)
      .eq('id', candidateId)
      .single()

    if (candidateError || !candidate) {
      return NextResponse.json(
        { error: candidateError?.message || 'Candidate not found.' },
        { status: 404 },
      )
    }

    const targetRole = cleanString(body.target_role) || buildTargetRole(candidate)
    const targetRoles =
      cleanStringArray(body.target_roles).length > 0
        ? cleanStringArray(body.target_roles)
        : buildTargetRoles(candidate)

    const targetRegions =
      cleanStringArray(body.target_regions).length > 0
        ? cleanStringArray(body.target_regions)
        : cleanStringArray([
            candidate.preferred_location,
            candidate.postcode,
          ])

    const { data: speculation, error: speculationError } = await supabase
      .from('candidate_speculations')
      .insert({
        candidate_id: candidateId,
        status: 'open',
        target_role: targetRole,
        target_roles: targetRoles,
        target_sector: cleanString(body.target_sector) || candidate.main_role_type || null,
        target_regions: targetRegions,
        profile_summary: cleanString(body.profile_summary),
        candidate_requirements: cleanString(body.candidate_requirements),
        cv_used: Boolean(candidate.formatted_cv),
        interview_notes_used: Boolean(candidate.notes),
        consent_confirmed: Boolean(body.consent_confirmed),
      })
      .select()
      .single()

    if (speculationError) {
      return NextResponse.json(
        { error: speculationError.message },
        { status: 400 },
      )
    }

    await supabase
      .from('speculation_notes')
      .insert({
        speculation_id: speculation.id,
        note_type: 'note',
        content: 'Speculation record created from candidate profile.',
      })

    return NextResponse.json({ speculation })
  } catch (error: any) {
    console.error('Speculation POST error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not create speculation.' },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    const action = cleanString(body.action)

    if (action === 'generate_profile') {
      const speculationId = cleanString(body.speculation_id || body.speculationId)

      if (!speculationId) {
        return NextResponse.json(
          { error: 'Speculation ID is required.' },
          { status: 400 },
        )
      }

      const { data: speculation, error: speculationError } = await supabase
        .from('candidate_speculations')
        .select(`
          *,
          candidates (
            id,
            first_name,
            last_name,
            email,
            phone,
            job_title,
            postcode,
            formatted_cv,
            notes,
            qualifications,
            can_deliver,
            seeking_role_type,
            main_role_type,
            sub_role_type,
            looking_for_roles
          )
        `)
        .eq('id', speculationId)
        .single()

      if (speculationError || !speculation) {
        return NextResponse.json(
          { error: speculationError?.message || 'Speculation not found.' },
          { status: 404 },
        )
      }

      const candidate = Array.isArray(speculation.candidates)
        ? speculation.candidates[0] ?? null
        : speculation.candidates ?? null

      if (!candidate) {
        return NextResponse.json(
          { error: 'Candidate not found for this speculation.' },
          { status: 404 },
        )
      }

      const [
        { data: documents },
        { data: activities },
        { data: notes },
      ] = await Promise.all([
        supabase
          .from('candidate_documents')
          .select(`id, name, doc_type, summary, details, created_at`)
          .eq('candidate_id', candidate.id)
          .order('created_at', { ascending: false })
          .limit(20),

        supabase
          .from('candidate_activities')
          .select(`id, activity_type, content, created_at`)
          .eq('candidate_id', candidate.id)
          .order('created_at', { ascending: false })
          .limit(30),

        supabase
          .from('speculation_notes')
          .select(`id, note_type, content, created_at`)
          .eq('speculation_id', speculationId)
          .order('created_at', { ascending: false })
          .limit(30),
      ])

      const candidateName = `${candidate.first_name ?? ''} ${candidate.last_name ?? ''}`.trim()

      const prompt = `
Create a speculation profile for this candidate.

Important rules:
- Return valid JSON only.
- Do not include the candidate's name, email, phone number or exact postcode in the anonymous_profile.
- The anonymous profile should be employer-facing and sell the candidate professionally.
- The internal profile can mention useful recruitment context but should still be professional.
- Keep it UK recruitment focused.
- Focus on FE, Skills, Apprenticeships, training provider and work-based learning relevance where appropriate.
- Do not invent qualifications or experience. If something is unclear, say it is unclear.
- Make it useful for approaching employers speculatively.

Return JSON with exactly these keys:
{
  "profile_summary": "short one paragraph summary",
  "candidate_profile": "internal detailed profile",
  "anonymous_profile": "anonymous employer-facing profile",
  "key_selling_points": ["point 1", "point 2", "point 3"],
  "candidate_requirements": "salary/location/work type/role preferences and any caveats"
}

Candidate:
${safeText(JSON.stringify({
  name: candidateName,
  job_title: candidate.job_title,
  seeking_role_type: candidate.seeking_role_type,
  main_role_type: candidate.main_role_type,
  sub_role_type: candidate.sub_role_type,
  looking_for_roles: candidate.looking_for_roles,
  qualifications: candidate.qualifications,
  can_deliver: candidate.can_deliver,
  notes: candidate.notes,
}, null, 2), 6000)}

Formatted CV:
${safeText(candidate.formatted_cv, 12000)}

Candidate documents:
${safeText(JSON.stringify(documents ?? [], null, 2), 6000)}

Candidate activities / interview notes:
${safeText(JSON.stringify(activities ?? [], null, 2), 8000)}

Speculation notes:
${safeText(JSON.stringify(notes ?? [], null, 2), 6000)}

Speculation target:
${safeText(JSON.stringify({
  target_role: speculation.target_role,
  target_roles: speculation.target_roles,
  target_sector: speculation.target_sector,
  target_regions: speculation.target_regions,
  candidate_requirements: speculation.candidate_requirements,
}, null, 2), 4000)}
`

      const generated = await runClaudeForSpeculationProfile(prompt)

      const keySellingPoints = Array.isArray(generated.key_selling_points)
        ? generated.key_selling_points.map((point: unknown) => String(point)).filter(Boolean)
        : []

      const { data: updatedSpeculation, error: updateError } = await supabase
        .from('candidate_speculations')
        .update({
          profile_summary: cleanString(generated.profile_summary),
          candidate_profile: cleanString(generated.candidate_profile),
          anonymous_profile: cleanString(generated.anonymous_profile),
          key_selling_points: keySellingPoints,
          candidate_requirements: cleanString(generated.candidate_requirements),
          ai_generated: true,
          ai_generated_at: new Date().toISOString(),
          status: 'profile_generated',
          updated_at: new Date().toISOString(),
        })
        .eq('id', speculationId)
        .select(`
          *,
          candidates (
            id, first_name, last_name, email, phone, job_title, postcode,
            formatted_cv, notes, qualifications, can_deliver,
            seeking_role_type, main_role_type, sub_role_type
          )
        `)
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 })
      }

      const { data: note } = await supabase
        .from('speculation_notes')
        .insert({
          speculation_id: speculationId,
          note_type: 'note',
          content: 'AI speculation profile generated.',
        })
        .select()
        .single()

      return NextResponse.json({ speculation: updatedSpeculation, note })
    }

    if (action === 'generate_targets') {
      const speculationId = cleanString(body.speculation_id || body.speculationId)
      const searchMode = cleanString(body.search_mode) || 'auto'
      const evidenceLevel = cleanString(body.evidence_level) || 'strict'
      const selectedStandardIds = cleanStringArray(body.selected_standard_ids)
      const selectedStandardNames = cleanStringArray(body.selected_standard_names)

      if (!speculationId) {
        return NextResponse.json(
          { error: 'Speculation ID is required.' },
          { status: 400 },
        )
      }

      const { data: speculation, error: speculationError } = await supabase
        .from('candidate_speculations')
        .select(`
          *,
          candidates (
            id, first_name, last_name, email, phone, job_title, postcode,
            formatted_cv, notes, qualifications, can_deliver,
            seeking_role_type, main_role_type, sub_role_type, looking_for_roles
          )
        `)
        .eq('id', speculationId)
        .single()

      if (speculationError || !speculation) {
        return NextResponse.json(
          { error: speculationError?.message || 'Speculation not found.' },
          { status: 404 },
        )
      }

      const candidate = Array.isArray(speculation.candidates)
        ? speculation.candidates[0] ?? null
        : speculation.candidates ?? null

      if (!candidate) {
        return NextResponse.json(
          { error: 'Candidate not found for this speculation.' },
          { status: 404 },
        )
      }

      const [
        { data: clients },
        { data: leads },
        { data: vacancies },
        { data: providerStandardDelivery },
        { data: existingTargets },
      ] = await Promise.all([
        supabase
          .from('clients')
          .select(`id, company_name, website, sector, region, status, notes`)
          .order('updated_at', { ascending: false })
          .limit(200),

        supabase
          .from('leads')
          .select(`id, company_name, website, sector, region, status, notes`)
          .order('updated_at', { ascending: false })
          .limit(300),

        supabase
          .from('vacancies')
          .select(`
            id, title, sector, role_type, location, region, status, description,
            clients ( id, company_name, website, sector, region )
          `)
          .in('status', ['live', 'draft'])
          .order('updated_at', { ascending: false })
          .limit(200),

        selectedStandardIds.length > 0
          ? supabase
              .from('provider_standard_delivery')
              .select(`
                id, provider_name, ukprn, website, standard_id, standard_name,
                standard_reference, sector, route, regions, delivery_modes,
                source, source_url, is_active
              `)
              .in('standard_id', selectedStandardIds)
              .eq('is_active', true)
              .limit(500)
          : selectedStandardNames.length > 0
            ? supabase
                .from('provider_standard_delivery')
                .select(`
                  id, provider_name, ukprn, website, standard_id, standard_name,
                  standard_reference, sector, route, regions, delivery_modes,
                  source, source_url, is_active
                `)
                .in('standard_name', selectedStandardNames)
                .eq('is_active', true)
                .limit(500)
            : Promise.resolve({ data: [] }),

        supabase
          .from('speculation_target_employers')
          .select('employer_name')
          .eq('speculation_id', speculationId),
      ])

      const existingNames = new Set(
        (existingTargets ?? [])
          .map((target: any) => String(target.employer_name || '').trim().toLowerCase())
          .filter(Boolean),
      )

      const prompt = `
Find target employers for this candidate speculation.

Important:
- Return valid JSON only.
- Search mode: ${searchMode}.
- Evidence level: ${evidenceLevel}.
- If search mode is standard_led or combined, prioritise provider_standard_delivery evidence first.
- For tutor, assessor, trainer or skills coach candidates, only recommend providers with evidence they deliver the selected standard unless evidence level is expansion.
- Do not invent company names outside the data provided.
- Use provider_standard_delivery, CRM clients, CRM leads and vacancies provided.
- If evidence level is strict, only include evidence-backed employers.
- If evidence level is related, you may include employers with related standards or clearly related vacancies.
- If evidence level is expansion, you may include softer expansion prospects, but label them clearly.
- Do not recommend employers merely because they might want to expand.
- Avoid duplicate employers.

Return JSON with exactly this shape:
{
  "target_employers": [
    {
      "employer_name": "Company name",
      "website": "website if known",
      "linkedin": "",
      "sector": "sector",
      "region": "region",
      "source": "client, lead or vacancy",
      "fit_reason": "why this employer may be a fit",
      "suggested_contact_title": "job title to approach",
      "approach_status": "not_contacted",
      "evidence_type": "standard_delivery, live_vacancy, existing_client, existing_lead, related_provision or expansion_prospect",
      "matched_standard_name": "matched apprenticeship standard if relevant",
      "matched_standard_reference": "standard reference if known",
      "confidence_score": 0,
      "evidence_summary": "short explanation of the evidence"
    }
  ],
  "search_strategy": "short summary of the targeting logic",
  "suggested_search_queries": [
    "Google/LinkedIn search query 1",
    "Google/LinkedIn search query 2"
  ]
}

Candidate:
${safeText(JSON.stringify({
  job_title: candidate.job_title,
  seeking_role_type: candidate.seeking_role_type,
  main_role_type: candidate.main_role_type,
  sub_role_type: candidate.sub_role_type,
  looking_for_roles: candidate.looking_for_roles,
  qualifications: candidate.qualifications,
  can_deliver: candidate.can_deliver,
  notes: candidate.notes,
}, null, 2), 7000)}

Speculation:
${safeText(JSON.stringify({
  target_role: speculation.target_role,
  target_roles: speculation.target_roles,
  target_sector: speculation.target_sector,
  target_regions: speculation.target_regions,
  profile_summary: speculation.profile_summary,
  key_selling_points: speculation.key_selling_points,
  candidate_requirements: speculation.candidate_requirements,
  anonymous_profile: speculation.anonymous_profile,
}, null, 2), 10000)}

Selected standards:
${safeText(JSON.stringify({ selected_standard_ids: selectedStandardIds, selected_standard_names: selectedStandardNames }, null, 2), 4000)}

Provider standard delivery evidence:
${safeText(JSON.stringify(providerStandardDelivery ?? [], null, 2), 18000)}

CRM clients:
${safeText(JSON.stringify(clients ?? [], null, 2), 14000)}

CRM leads:
${safeText(JSON.stringify(leads ?? [], null, 2), 14000)}

Live/draft vacancies:
${safeText(JSON.stringify(vacancies ?? [], null, 2), 14000)}

Existing target employers already added:
${safeText(JSON.stringify(Array.from(existingNames), null, 2), 3000)}
`

      const generated = await runClaudeForSpeculationProfile(prompt)

      const generatedTargets = Array.isArray(generated.target_employers)
        ? generated.target_employers
        : []

      const rowsToInsert = generatedTargets
        .map((target: any) => ({
          speculation_id: speculationId,
          employer_name: cleanString(target.employer_name),
          website: cleanString(target.website),
          linkedin: cleanString(target.linkedin),
          sector: cleanString(target.sector),
          region: cleanString(target.region),
          source: cleanString(target.source) || 'ai_crm_match',
          fit_reason: cleanString(target.fit_reason),
          suggested_contact_title: cleanString(target.suggested_contact_title),
          approach_status: cleanString(target.approach_status) || 'not_contacted',
          evidence_type: cleanString(target.evidence_type),
          matched_standard_name: cleanString(target.matched_standard_name),
          matched_standard_reference: cleanString(target.matched_standard_reference),
          confidence_score:
            Number.isFinite(Number(target.confidence_score))
              ? Math.max(0, Math.min(100, Number(target.confidence_score)))
              : null,
          evidence_summary: cleanString(target.evidence_summary),
        }))
        .filter((target: any) => {
          if (!target.employer_name) return false
          const normalised = String(target.employer_name).trim().toLowerCase()
          if (existingNames.has(normalised)) return false
          existingNames.add(normalised)
          return true
        })
        .slice(0, 15)

      if (rowsToInsert.length === 0) {
        return NextResponse.json({
          targets: [],
          message: 'No new target employers found.',
          search_strategy: generated.search_strategy || null,
          suggested_search_queries: generated.suggested_search_queries || [],
        })
      }

      const { data: insertedTargets, error: insertError } = await supabase
        .from('speculation_target_employers')
        .insert(rowsToInsert)
        .select()

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 400 })
      }

      const { data: note } = await supabase
        .from('speculation_notes')
        .insert({
          speculation_id: speculationId,
          note_type: 'note',
          content: `AI target employer search completed. ${insertedTargets?.length ?? 0} target employer(s) added.`,
        })
        .select()
        .single()

      await supabase
        .from('candidate_speculations')
        .update({
          status:
            speculation.status === 'draft' || speculation.status === 'profile_generated'
              ? 'ready_to_approach'
              : speculation.status,
          search_mode: searchMode,
          evidence_level: evidenceLevel,
          selected_standard_ids: selectedStandardIds,
          selected_standard_names: selectedStandardNames,
          include_expansion_prospects: evidenceLevel === 'expansion',
          updated_at: new Date().toISOString(),
        })
        .eq('id', speculationId)

      return NextResponse.json({
        targets: insertedTargets ?? [],
        note,
        search_strategy: generated.search_strategy || null,
        suggested_search_queries: Array.isArray(generated.suggested_search_queries)
          ? generated.suggested_search_queries
          : [],
      })
    }

    if (action === 'generate_outreach') {
      const speculationId = cleanString(body.speculation_id || body.speculationId)
      const targetId = cleanString(body.target_id || body.targetId)

      if (!speculationId || !targetId) {
        return NextResponse.json(
          { error: 'Speculation ID and target employer ID are required.' },
          { status: 400 },
        )
      }

      const [
        { data: speculation, error: speculationError },
        { data: target, error: targetError },
      ] = await Promise.all([
        supabase
          .from('candidate_speculations')
          .select(`
            *,
            candidates (
              id, first_name, last_name, email, phone, job_title, postcode,
              seeking_role_type, main_role_type, sub_role_type, looking_for_roles,
              notes, qualifications, can_deliver
            )
          `)
          .eq('id', speculationId)
          .single(),

        supabase
          .from('speculation_target_employers')
          .select('*')
          .eq('id', targetId)
          .single(),
      ])

      if (speculationError || !speculation) {
        return NextResponse.json(
          { error: speculationError?.message || 'Speculation not found.' },
          { status: 404 },
        )
      }

      if (targetError || !target) {
        return NextResponse.json(
          { error: targetError?.message || 'Target employer not found.' },
          { status: 404 },
        )
      }

      const candidate = Array.isArray(speculation.candidates)
        ? speculation.candidates[0] ?? null
        : speculation.candidates ?? null

      const prompt = `
Create speculative recruitment outreach for this target employer.

Important rules:
- Return valid JSON only.
- Do not include the candidate's name, email, phone number or exact postcode.
- The candidate must remain anonymous.
- Keep the tone professional, warm and recruitment-led.
- This is for a UK recruitment agency working in FE, Skills, Apprenticeships and training provider recruitment.
- The message should not sound spammy.
- Do not say the candidate is perfect. Use credible language such as "could be worth a conversation".
- Mention that further details can be shared if there is interest.
- Keep the email concise but persuasive.
- LinkedIn message should be shorter than the email.
- Call script should sound natural.
- Follow-up message should be short and polite.

Return JSON with exactly these keys:
{
  "email_subject": "subject line",
  "email_body": "email body",
  "linkedin_message": "short LinkedIn message",
  "call_script": "short call opener/script",
  "follow_up_message": "short follow up message"
}

Speculation:
${safeText(JSON.stringify({
  speculation_ref: speculation.speculation_ref,
  target_role: speculation.target_role,
  target_roles: speculation.target_roles,
  target_sector: speculation.target_sector,
  target_regions: speculation.target_regions,
  profile_summary: speculation.profile_summary,
  candidate_profile: speculation.candidate_profile,
  anonymous_profile: speculation.anonymous_profile,
  key_selling_points: speculation.key_selling_points,
  candidate_requirements: speculation.candidate_requirements,
}, null, 2), 14000)}

Candidate context:
${safeText(JSON.stringify({
  job_title: candidate?.job_title,
  seeking_role_type: candidate?.seeking_role_type,
  main_role_type: candidate?.main_role_type,
  sub_role_type: candidate?.sub_role_type,
  looking_for_roles: candidate?.looking_for_roles,
  qualifications: candidate?.qualifications,
  can_deliver: candidate?.can_deliver,
}, null, 2), 6000)}

Target employer:
${safeText(JSON.stringify({
  employer_name: target.employer_name,
  website: target.website,
  linkedin: target.linkedin,
  sector: target.sector,
  region: target.region,
  source: target.source,
  fit_reason: target.fit_reason,
  suggested_contact_title: target.suggested_contact_title,
  approach_status: target.approach_status,
}, null, 2), 7000)}
`

      const generated = await runClaudeForSpeculationProfile(prompt)

      const outreach = {
        target_id: target.id,
        employer_name: target.employer_name,
        email_subject: cleanString(generated.email_subject) || 'Candidate introduction',
        email_body: cleanString(generated.email_body) || '',
        linkedin_message: cleanString(generated.linkedin_message) || '',
        call_script: cleanString(generated.call_script) || '',
        follow_up_message: cleanString(generated.follow_up_message) || '',
      }

      const { data: note } = await supabase
        .from('speculation_notes')
        .insert({
          speculation_id: speculationId,
          note_type: 'note',
          content: `Outreach generated for ${target.employer_name}.`,
        })
        .select()
        .single()

      const nextStatus =
        target.approach_status === 'not_contacted'
          ? 'outreach_generated'
          : target.approach_status

      const { data: updatedTarget } = await supabase
        .from('speculation_target_employers')
        .update({ approach_status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', targetId)
        .select()
        .single()

      return NextResponse.json({ outreach, target: updatedTarget, note })
    }

    if (action === 'add_note') {
      const speculationId = cleanString(body.speculation_id || body.speculationId)
      const content = cleanString(body.content)

      if (!speculationId || !content) {
        return NextResponse.json(
          { error: 'Speculation ID and note content are required.' },
          { status: 400 },
        )
      }

      const { data, error } = await supabase
        .from('speculation_notes')
        .insert({
          speculation_id: speculationId,
          note_type: cleanString(body.note_type) || 'note',
          content,
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ note: data })
    }

    if (action === 'add_task') {
      const speculationId = cleanString(body.speculation_id || body.speculationId)
      const title = cleanString(body.title)

      if (!speculationId || !title) {
        return NextResponse.json(
          { error: 'Speculation ID and task title are required.' },
          { status: 400 },
        )
      }

      const { data, error } = await supabase
        .from('speculation_tasks')
        .insert({
          speculation_id: speculationId,
          title,
          description: cleanString(body.description),
          due_date: cleanString(body.due_date),
          completed: false,
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ task: data })
    }

    if (action === 'toggle_task') {
      const taskId = cleanString(body.task_id || body.taskId)

      if (!taskId) {
        return NextResponse.json(
          { error: 'Task ID is required.' },
          { status: 400 },
        )
      }

      const completed = Boolean(body.completed)

      const { data, error } = await supabase
        .from('speculation_tasks')
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ task: data })
    }

    if (action === 'add_target') {
      const speculationId = cleanString(body.speculation_id || body.speculationId)
      const employerName = cleanString(body.employer_name || body.employerName)

      if (!speculationId || !employerName) {
        return NextResponse.json(
          { error: 'Speculation ID and employer name are required.' },
          { status: 400 },
        )
      }

      const { data, error } = await supabase
        .from('speculation_target_employers')
        .insert({
          speculation_id: speculationId,
          employer_name: employerName,
          website: cleanString(body.website),
          linkedin: cleanString(body.linkedin),
          sector: cleanString(body.sector),
          region: cleanString(body.region),
          source: cleanString(body.source) || 'manual',
          fit_reason: cleanString(body.fit_reason || body.fitReason),
          suggested_contact_title: cleanString(
            body.suggested_contact_title || body.suggestedContactTitle,
          ),
          approach_status: cleanString(body.approach_status) || 'not_contacted',
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      await supabase.from('speculation_notes').insert({
        speculation_id: speculationId,
        note_type: 'note',
        content: `Target employer added: ${employerName}.`,
      })

      return NextResponse.json({ target: data })
    }

    if (action === 'update_target_status') {
      const targetId = cleanString(body.target_id || body.targetId)
      const approachStatus = cleanString(body.approach_status || body.approachStatus)

      if (!targetId || !approachStatus) {
        return NextResponse.json(
          { error: 'Target ID and approach status are required.' },
          { status: 400 },
        )
      }

      const { data, error } = await supabase
        .from('speculation_target_employers')
        .update({ approach_status: approachStatus, updated_at: new Date().toISOString() })
        .eq('id', targetId)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ target: data })
    }

    if (action === 'convert_target_to_lead') {
      const speculationId = cleanString(body.speculation_id || body.speculationId)
      const targetId = cleanString(body.target_id || body.targetId)

      if (!speculationId || !targetId) {
        return NextResponse.json(
          { error: 'Speculation ID and target employer ID are required.' },
          { status: 400 },
        )
      }

      const [
        { data: speculation, error: speculationError },
        { data: target, error: targetError },
      ] = await Promise.all([
        supabase
          .from('candidate_speculations')
          .select(`*, candidates ( id, first_name, last_name, job_title, email, phone )`)
          .eq('id', speculationId)
          .single(),

        supabase
          .from('speculation_target_employers')
          .select('*')
          .eq('id', targetId)
          .single(),
      ])

      if (speculationError || !speculation) {
        return NextResponse.json(
          { error: speculationError?.message || 'Speculation not found.' },
          { status: 404 },
        )
      }

      if (targetError || !target) {
        return NextResponse.json(
          { error: targetError?.message || 'Target employer not found.' },
          { status: 404 },
        )
      }

      if (target.client_id) {
        return NextResponse.json({
          client: { id: target.client_id },
          target,
          message: 'Target employer is already linked to a client.',
        })
      }

      if (target.lead_id) {
        return NextResponse.json({
          lead: { id: target.lead_id },
          target,
          message: 'Target employer is already linked to a lead.',
        })
      }

      const employerName = String(target.employer_name || '').trim()

      if (!employerName) {
        return NextResponse.json(
          { error: 'Target employer name is missing.' },
          { status: 400 },
        )
      }

      const employerDomain = extractDomain(target.website)

      const [{ data: possibleClients }, { data: possibleLeads }] = await Promise.all([
        supabase.from('clients').select('id, company_name, website').limit(1000),
        supabase.from('leads').select('id, company_name, website').limit(1000),
      ])

      const existingClient = findMatchingCompany(possibleClients, employerName, target.website)

      if (existingClient) {
        const { data: updatedTarget, error: targetUpdateError } = await supabase
          .from('speculation_target_employers')
          .update({ client_id: existingClient.id, approach_status: 'linked_existing_client', updated_at: new Date().toISOString() })
          .eq('id', targetId)
          .select()
          .single()

        if (targetUpdateError) {
          return NextResponse.json({ error: targetUpdateError.message }, { status: 400 })
        }

        const { data: note } = await supabase
          .from('speculation_notes')
          .insert({ speculation_id: speculationId, note_type: 'note', content: `Target employer matched to existing client: ${existingClient.company_name}.` })
          .select()
          .single()

        return NextResponse.json({ client: existingClient, target: updatedTarget, note, message: 'Matched to existing client.' })
      }

      const existingLead = findMatchingCompany(possibleLeads, employerName, target.website)

      if (existingLead) {
        const { data: updatedTarget, error: targetUpdateError } = await supabase
          .from('speculation_target_employers')
          .update({ lead_id: existingLead.id, approach_status: 'linked_existing_lead', updated_at: new Date().toISOString() })
          .eq('id', targetId)
          .select()
          .single()

        if (targetUpdateError) {
          return NextResponse.json({ error: targetUpdateError.message }, { status: 400 })
        }

        const { data: note } = await supabase
          .from('speculation_notes')
          .insert({ speculation_id: speculationId, note_type: 'note', content: `Target employer matched to existing lead: ${existingLead.company_name}.` })
          .select()
          .single()

        return NextResponse.json({ lead: existingLead, target: updatedTarget, note, message: 'Matched to existing lead.' })
      }

      const candidate = Array.isArray(speculation.candidates)
        ? speculation.candidates[0] ?? null
        : speculation.candidates ?? null

      const candidateName = `${candidate?.first_name ?? ''} ${candidate?.last_name ?? ''}`.trim()

      const leadNotes = [
        `Created from speculation ${speculation.speculation_ref || speculation.id}.`,
        candidateName ? `Candidate: ${candidateName}${candidate?.job_title ? ` — ${candidate.job_title}` : ''}.` : null,
        speculation.target_role ? `Target role: ${speculation.target_role}.` : null,
        target.fit_reason ? `Fit reason: ${target.fit_reason}` : null,
        speculation.profile_summary ? `Candidate summary: ${speculation.profile_summary}` : null,
        employerDomain ? `Matched website/domain checked: ${employerDomain}.` : null,
      ].filter(Boolean).join('\n\n')

      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({ company_name: employerName, website: target.website, sector: target.sector, region: target.region, status: 'new', source: 'Speculation', priority: 'warm', notes: leadNotes })
        .select()
        .single()

      if (leadError) {
        return NextResponse.json({ error: leadError.message }, { status: 400 })
      }

      const { data: updatedTarget, error: targetUpdateError } = await supabase
        .from('speculation_target_employers')
        .update({ lead_id: lead.id, approach_status: 'converted_to_lead', updated_at: new Date().toISOString() })
        .eq('id', targetId)
        .select()
        .single()

      if (targetUpdateError) {
        return NextResponse.json({ error: targetUpdateError.message }, { status: 400 })
      }

      const { data: note } = await supabase
        .from('speculation_notes')
        .insert({ speculation_id: speculationId, note_type: 'note', content: `Target employer converted to new lead: ${employerName}.` })
        .select()
        .single()

      return NextResponse.json({ lead, target: updatedTarget, note, message: 'Created new lead.' })
    }

    if (action === 'save_live_job_opportunity') {
      const speculationId = cleanString(body.speculation_id || body.speculationId)
      const job = body.job || {}

      if (!speculationId) {
        return NextResponse.json({ error: 'Speculation ID is required.' }, { status: 400 })
      }

      const { data: speculation, error: speculationError } = await supabase
        .from('candidate_speculations')
        .select('id, candidate_id')
        .eq('id', speculationId)
        .single()

      if (speculationError || !speculation) {
        return NextResponse.json({ error: speculationError?.message || 'Speculation not found.' }, { status: 404 })
      }

      const jobTitle = cleanString(job.job_title)
      const employerName = cleanString(job.employer_name)
      const url = cleanString(job.url)

      if (!jobTitle || !employerName) {
        return NextResponse.json({ error: 'Job title and employer name are required.' }, { status: 400 })
      }

      const [{ data: possibleClients }, { data: possibleLeads }] = await Promise.all([
        supabase.from('clients').select('id, company_name, website').limit(1000),
        supabase.from('leads').select('id, company_name, website').limit(1000),
      ])

      const existingClient = findMatchingCompany(possibleClients, employerName, url)
      const existingLead = findMatchingCompany(possibleLeads, employerName, url)

      const { data: existingOpportunity } = await supabase
        .from('candidate_speculation_opportunities')
        .select('*')
        .eq('speculation_id', speculationId)
        .eq('employer_name', employerName)
        .eq('job_title', jobTitle)
        .maybeSingle()

      if (existingOpportunity) {
  const { data: existingOutreach } = await supabase
    .from('speculation_outreach')
    .select('*')
    .eq('opportunity_id', existingOpportunity.id)
    .maybeSingle()

  return NextResponse.json({
    opportunity: existingOpportunity,
    outreach: existingOutreach || null,
    message: 'Opportunity already saved.',
  })
}

      const { data: opportunity, error: insertError } = await supabase
        .from('candidate_speculation_opportunities')
        .insert({
          speculation_id: speculationId,
          candidate_id: speculation.candidate_id,
          job_title: jobTitle,
          employer_name: employerName,
          location: cleanString(job.location),
          region: cleanString(job.region),
          salary: cleanString(job.salary),
          job_type: cleanString(job.job_type),
          source: cleanString(job.source),
          url,
          posted_days_ago: Number.isFinite(Number(job.posted_days_ago)) ? Number(job.posted_days_ago) : null,
          matched_standard: cleanString(job.matched_standard),
          match_summary: cleanString(job.match_summary) || cleanString(job.why_candidate_matches) || cleanString(job.notes),
          match_score: Number.isFinite(Number(job.match_score)) ? Math.max(0, Math.min(100, Number(job.match_score))) : null,
          concerns: cleanString(job.concerns),
          notes: cleanString(job.notes),
          client_id: existingClient?.id || null,
          lead_id: existingLead?.id || null,
          status: existingClient ? 'linked_existing_client' : existingLead ? 'linked_existing_lead' : 'saved',
        })
        .select()
        .single()

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 400 })
      }

      const outreachDetails = [
  `Live job opportunity saved from speculation search.`,
  `Employer: ${employerName}`,
  `Job title: ${jobTitle}`,
  cleanString(job.location) ? `Location: ${cleanString(job.location)}` : null,
  cleanString(job.region) ? `Region: ${cleanString(job.region)}` : null,
  cleanString(job.salary) ? `Salary: ${cleanString(job.salary)}` : null,
  cleanString(job.source) ? `Source: ${cleanString(job.source)}` : null,
  url ? `Job link: ${url}` : null,
  cleanString(job.matched_standard)
    ? `Matched standard: ${cleanString(job.matched_standard)}`
    : null,
  cleanString(job.match_summary) || cleanString(job.why_candidate_matches) || cleanString(job.notes)
    ? `Match summary: ${cleanString(job.match_summary) || cleanString(job.why_candidate_matches) || cleanString(job.notes)}`
    : null,
]
  .filter(Boolean)
  .join('\n')

const { data: outreach, error: outreachError } = await supabase
  .from('speculation_outreach')
  .insert({
    speculation_id: speculationId,
    candidate_id: speculation.candidate_id,

    lead_id: existingLead?.id || null,
    client_id: existingClient?.id || null,
    opportunity_id: opportunity.id,

    employer_name: employerName,
    contact_name: null,
    contact_title: null,
    contact_email: null,
    contact_phone: null,
    contact_linkedin: null,

    website: url,
    linkedin_company: null,
    sector: cleanString(job.job_type),
    region: cleanString(job.region) || cleanString(job.location),

    address_line_1: null,
    address_line_2: null,
    town_city: null,
    county: null,
    postcode: null,
    lat: null,
    lng: null,

    outreach_direction: 'internal',
    outreach_type: 'internal_note',
    status: 'not_contacted',

    reason_for_approach: outreachDetails,
    message_sent: null,
    linkedin_message_sent: null,
    call_notes: cleanString(job.match_summary) || cleanString(job.why_candidate_matches) || cleanString(job.notes),
    response_notes: null,
    outcome_notes: null,
    follow_up_date: null,
  })
  .select()
  .single()

if (outreachError) {
  return NextResponse.json(
    { error: outreachError.message },
    { status: 400 },
  )
}

const { data: note } = await supabase
  .from('speculation_notes')
  .insert({
    speculation_id: speculationId,
    note_type: 'note',
    content: `Live job opportunity saved and copied to Employers Contacted: ${jobTitle} at ${employerName}.`,
  })
  .select()
  .single()

return NextResponse.json({ opportunity, outreach, note })
    }

    if (action === 'convert_opportunity_to_lead') {
      const speculationId = cleanString(body.speculation_id || body.speculationId)
      const opportunityId = cleanString(body.opportunity_id || body.opportunityId)

      if (!speculationId || !opportunityId) {
        return NextResponse.json({ error: 'Speculation ID and opportunity ID are required.' }, { status: 400 })
      }

      const [
        { data: speculation, error: speculationError },
        { data: opportunity, error: opportunityError },
      ] = await Promise.all([
        supabase
          .from('candidate_speculations')
          .select(`*, candidates ( id, first_name, last_name, job_title, email, phone )`)
          .eq('id', speculationId)
          .single(),

        supabase
          .from('candidate_speculation_opportunities')
          .select('*')
          .eq('id', opportunityId)
          .single(),
      ])

      if (speculationError || !speculation) {
        return NextResponse.json({ error: speculationError?.message || 'Speculation not found.' }, { status: 404 })
      }

      if (opportunityError || !opportunity) {
        return NextResponse.json({ error: opportunityError?.message || 'Opportunity not found.' }, { status: 404 })
      }

      if (opportunity.client_id) {
        return NextResponse.json({ client: { id: opportunity.client_id }, opportunity, message: 'Opportunity is already linked to a client.' })
      }

      if (opportunity.lead_id) {
        return NextResponse.json({ lead: { id: opportunity.lead_id }, opportunity, message: 'Opportunity is already linked to a lead.' })
      }

      const employerName = String(opportunity.employer_name || '').trim()

      if (!employerName) {
        return NextResponse.json({ error: 'Employer name is missing.' }, { status: 400 })
      }

      const [{ data: possibleClients }, { data: possibleLeads }] = await Promise.all([
        supabase.from('clients').select('id, company_name, website').limit(1000),
        supabase.from('leads').select('id, company_name, website').limit(1000),
      ])

      const existingClient = findMatchingCompany(possibleClients, employerName, opportunity.url)

      if (existingClient) {
        const { data: updatedOpportunity, error: updateError } = await supabase
          .from('candidate_speculation_opportunities')
          .update({ client_id: existingClient.id, status: 'linked_existing_client', updated_at: new Date().toISOString() })
          .eq('id', opportunityId)
          .select()
          .single()

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 400 })
        }

        const { data: note } = await supabase
          .from('speculation_notes')
          .insert({ speculation_id: speculationId, note_type: 'note', content: `Live job opportunity linked to existing client: ${employerName}.` })
          .select()
          .single()

        return NextResponse.json({ client: existingClient, opportunity: updatedOpportunity, note, message: 'Linked to existing client.' })
      }

      const existingLead = findMatchingCompany(possibleLeads, employerName, opportunity.url)

      if (existingLead) {
        const { data: updatedOpportunity, error: updateError } = await supabase
          .from('candidate_speculation_opportunities')
          .update({ lead_id: existingLead.id, status: 'linked_existing_lead', updated_at: new Date().toISOString() })
          .eq('id', opportunityId)
          .select()
          .single()

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 400 })
        }

        const { data: note } = await supabase
          .from('speculation_notes')
          .insert({ speculation_id: speculationId, note_type: 'note', content: `Live job opportunity linked to existing lead: ${employerName}.` })
          .select()
          .single()

        return NextResponse.json({ lead: existingLead, opportunity: updatedOpportunity, note, message: 'Linked to existing lead.' })
      }

      const candidate = Array.isArray(speculation.candidates)
        ? speculation.candidates[0] ?? null
        : speculation.candidates ?? null

      const candidateName = `${candidate?.first_name ?? ''} ${candidate?.last_name ?? ''}`.trim()

      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
          company_name: employerName,
          website: cleanString(opportunity.url),
          sector: cleanString(opportunity.job_type) || cleanString(speculation.target_sector),
          region: cleanString(opportunity.region) || cleanString(opportunity.location),
          status: 'new',
          source: 'Speculation',
          priority: 'warm',
          notes: [
            `Created from live job opportunity in speculation ${speculation.speculation_ref || speculation.id}.`,
            opportunity.job_title ? `Job title: ${opportunity.job_title}` : '',
            opportunity.salary ? `Salary: ${opportunity.salary}` : '',
            opportunity.url ? `Job link: ${opportunity.url}` : '',
            candidateName ? `Candidate: ${candidateName}` : '',
            opportunity.match_summary ? `Match summary: ${opportunity.match_summary}` : '',
          ].filter(Boolean).join('\n'),
        })
        .select()
        .single()

      if (leadError) {
        return NextResponse.json({ error: leadError.message }, { status: 400 })
      }

      const { data: updatedOpportunity, error: updateError } = await supabase
        .from('candidate_speculation_opportunities')
        .update({ lead_id: lead.id, status: 'converted_to_lead', updated_at: new Date().toISOString() })
        .eq('id', opportunityId)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 })
      }

      const { data: note } = await supabase
        .from('speculation_notes')
        .insert({ speculation_id: speculationId, note_type: 'note', content: `Live job opportunity converted to new lead: ${employerName}.` })
        .select()
        .single()

      return NextResponse.json({ lead, opportunity: updatedOpportunity, note, message: 'Created new lead.' })
    }

    if (action === 'generate_spec_outreach_message') {
  const speculationId = cleanString(body.speculation_id || body.speculationId)
  const messageType = cleanString(body.message_type || body.messageType) || 'email'
  const tone = cleanString(body.tone) || 'professional'
  const extraContext = cleanString(body.extra_context || body.extraContext)
  const employer = body.employer || {}
  const reasonForApproach = cleanString(body.reason_for_approach)

  if (!speculationId) {
    return NextResponse.json(
      { error: 'Speculation ID is required.' },
      { status: 400 },
    )
  }

  const { data: speculation, error: speculationError } = await supabase
    .from('candidate_speculations')
    .select(`
      *,
      candidates (
        id,
        first_name,
        last_name,
        job_title,
        postcode,
        preferred_location,
        town_city,
        county,
        salary_expected,
        notice_period,
        qualifications,
        can_deliver,
        seeking_role_type,
        main_role_type,
        sub_role_type,
        notes
      )
    `)
    .eq('id', speculationId)
    .single()

  if (speculationError || !speculation) {
    return NextResponse.json(
      { error: speculationError?.message || 'Speculation not found.' },
      { status: 404 },
    )
  }

  const candidate = Array.isArray(speculation.candidates)
    ? speculation.candidates[0] ?? null
    : speculation.candidates ?? null

  const prompt = `
You are writing recruitment outreach for Educated Appointments, a specialist FE & Skills recruitment agency.

Task:
Draft a ${messageType === 'linkedin' ? 'LinkedIn message' : 'speculative candidate outreach email'} to an employer about a candidate.

Important rules:
- Do not invent facts.
- Use only the candidate/speculation data provided.
- If something is unknown, omit it.
- Do not claim the candidate has experience in a sector unless the data says so.
- If relevant experience is transferable rather than direct, say that clearly.
- Keep the candidate anonymous unless the data specifically requires naming them.
- Sound professional, warm and credible.
- The aim is to make the employer want to speak with Educated Appointments about the candidate.
- Do not overdo it. No cheesy sales language.

Tone: ${tone}

Employer:
${JSON.stringify(employer, null, 2)}

Reason for approach:
${reasonForApproach || 'Not specified'}

Extra context from recruiter:
${extraContext || 'None'}

Candidate record:
${JSON.stringify(candidate, null, 2)}

Speculation/profile data:
${JSON.stringify(
  {
    target_role: speculation.target_role,
    target_sector: speculation.target_sector,
    profile_summary: speculation.profile_summary,
    key_strengths: speculation.key_strengths,
    selling_points: speculation.selling_points,
    salary_expectation: speculation.salary_expectation,
    availability: speculation.availability,
    location: speculation.location,
    notes: speculation.notes,
  },
  null,
  2,
)}

Return ONLY valid JSON in this exact shape:
{
  "subject": "email subject line, or empty string for LinkedIn",
  "body": "email body, or empty string for LinkedIn",
  "linkedin_message": "LinkedIn message, or empty string for email"
}
`

  const { text } = await callAI(prompt, { maxTokens: 1800 })

  const clean = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  const match = clean.match(/\{[\s\S]*\}/)

  if (!match) {
    return NextResponse.json(
      { error: 'Could not generate outreach draft.' },
      { status: 422 },
    )
  }

  let result: any

  try {
    result = JSON.parse(match[0])
  } catch {
    return NextResponse.json(
      { error: 'Could not parse outreach draft.' },
      { status: 422 },
    )
  }

  return NextResponse.json({
    subject: result.subject || '',
    body: result.body || '',
    linkedin_message: result.linkedin_message || '',
  })
}
    
    if (action === 'add_outreach') {
  const speculationId = cleanString(body.speculation_id || body.speculationId)
  const candidateId = cleanString(body.candidate_id || body.candidateId)
  const sourceType = cleanString(body.source_type || body.sourceType)
  const linkedRecordId = cleanString(body.linked_record_id || body.linkedRecordId)

  if (!speculationId || !candidateId) {
    return NextResponse.json(
      { error: 'Speculation ID and candidate ID are required.' },
      { status: 400 },
    )
  }

  const employerName = cleanString(body.employer_name)

  if (!employerName) {
    return NextResponse.json(
      { error: 'Employer name is required.' },
      { status: 400 },
    )
  }

  const leadId = sourceType === 'lead' ? linkedRecordId || null : null
  const clientId = sourceType === 'client' ? linkedRecordId || null : null

  const { data: outreach, error } = await supabase
    .from('speculation_outreach')
    .insert({
      speculation_id: speculationId,
      candidate_id: candidateId,

      lead_id: leadId,
      client_id: clientId,
      opportunity_id: cleanString(body.opportunity_id || body.opportunityId) || null,

      employer_name: employerName,
      contact_name: cleanString(body.contact_name) || null,
      contact_title: cleanString(body.contact_title) || null,
      contact_email: cleanString(body.contact_email) || null,
      contact_phone: cleanString(body.contact_phone) || null,
      contact_linkedin: cleanString(body.contact_linkedin) || null,

      website: cleanString(body.website) || null,
      linkedin_company: cleanString(body.linkedin_company) || null,
      sector: cleanString(body.sector) || null,
      region: cleanString(body.region) || null,

      address_line_1: cleanString(body.address_line_1) || null,
      address_line_2: cleanString(body.address_line_2) || null,
      town_city: cleanString(body.town_city) || null,
      county: cleanString(body.county) || null,
      postcode: cleanString(body.postcode) || null,
      lat: Number.isFinite(Number(body.lat)) ? Number(body.lat) : null,
      lng: Number.isFinite(Number(body.lng)) ? Number(body.lng) : null,

      outreach_direction:
        cleanString(body.outreach_direction) || 'outbound',
      outreach_type:
        cleanString(body.outreach_type) || 'email',
      status:
        cleanString(body.status) || 'email_sent',

      reason_for_approach:
        cleanString(body.reason_for_approach) || null,
      message_sent:
        cleanString(body.message_sent) || null,
      linkedin_message_sent:
        cleanString(body.linkedin_message_sent) || null,
      call_notes:
        cleanString(body.call_notes) || null,
      response_notes:
        cleanString(body.response_notes) || null,
      outcome_notes:
        cleanString(body.outcome_notes) || null,

      contacted_at:
        cleanString(body.contacted_at) || new Date().toISOString(),
      follow_up_date:
        cleanString(body.follow_up_date) || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

    const activityType =
    outreach.outreach_type === 'linkedin'
      ? 'linkedin'
      : outreach.outreach_type === 'call'
        ? 'call'
        : outreach.outreach_type === 'meeting'
          ? 'meeting'
          : outreach.outreach_type === 'inbound'
            ? 'note'
            : outreach.outreach_type === 'internal_note'
              ? 'note'
              : 'email'

  const activityDirection =
    outreach.outreach_direction === 'inbound'
      ? 'inbound'
      : outreach.outreach_direction === 'internal'
        ? 'internal'
        : 'outbound'

  const activityContent = [
    `Spec outreach logged from candidate speculation.`,
    employerName ? `Employer: ${employerName}` : '',
    outreach.contact_name ? `Contact: ${outreach.contact_name}` : '',
    outreach.contact_title ? `Contact title: ${outreach.contact_title}` : '',
    outreach.status
      ? `Status: ${String(outreach.status).replace(/_/g, ' ')}`
      : '',
    outreach.reason_for_approach
      ? `Reason for approach:\n${outreach.reason_for_approach}`
      : '',
    outreach.message_sent
      ? `Email / message sent:\n${outreach.message_sent}`
      : '',
    outreach.linkedin_message_sent
      ? `LinkedIn message sent:\n${outreach.linkedin_message_sent}`
      : '',
    outreach.call_notes
      ? `Call / discussion notes:\n${outreach.call_notes}`
      : '',
    outreach.response_notes
      ? `Response / outcome notes:\n${outreach.response_notes}`
      : '',
    outreach.follow_up_date
      ? `Follow-up date: ${outreach.follow_up_date}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  let linkedEmployerActivity: any = null

  if (outreach.lead_id) {
    const { data: leadActivity } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: outreach.lead_id,
        activity_type: activityType,
        direction: activityDirection,
        contact_id: null,
        content: activityContent,
        follow_up_date: outreach.follow_up_date || null,
      })
      .select()
      .single()

    linkedEmployerActivity = leadActivity
  }

  if (outreach.client_id) {
    const { data: clientActivity } = await supabase
      .from('client_activities')
      .insert({
        client_id: outreach.client_id,
        activity_type: activityType,
        direction: activityDirection,
        content: activityContent,
        follow_up_date: outreach.follow_up_date || null,
      })
      .select()
      .single()

    linkedEmployerActivity = clientActivity
  }

  const { data: note } = await supabase
    .from('speculation_notes')
    .insert({
      speculation_id: speculationId,
      note_type: 'note',
      content: `Spec outreach logged: ${employerName} — ${String(outreach.status || '').replace(/_/g, ' ')}.`,
    })
    .select()
    .single()

    return NextResponse.json({
    outreach,
    note,
    linkedEmployerActivity,
  })
}

if (action === 'close_speculation') {
  const speculationId = cleanString(body.speculation_id || body.speculationId)
  const reason = cleanString(body.reason)

  if (!speculationId) {
    return NextResponse.json(
      { error: 'Speculation ID is required.' },
      { status: 400 },
    )
  }

  const { data: speculation, error } = await supabase
    .from('candidate_speculations')
    .update({
      lifecycle_status: 'closed',
      closed_at: new Date().toISOString(),
      closed_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', speculationId)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const { data: note } = await supabase
    .from('speculation_notes')
    .insert({
      speculation_id: speculationId,
      note_type: 'note',
      content: reason
        ? `Speculation closed. Reason: ${reason}`
        : 'Speculation closed.',
    })
    .select()
    .single()

  return NextResponse.json({ speculation, note })
}

if (action === 'reopen_speculation') {
  const speculationId = cleanString(body.speculation_id || body.speculationId)

  if (!speculationId) {
    return NextResponse.json(
      { error: 'Speculation ID is required.' },
      { status: 400 },
    )
  }

  const { data: speculation, error } = await supabase
    .from('candidate_speculations')
    .update({
      lifecycle_status: 'open',
      closed_at: null,
      closed_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', speculationId)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const { data: note } = await supabase
    .from('speculation_notes')
    .insert({
      speculation_id: speculationId,
      note_type: 'note',
      content: 'Speculation reopened.',
    })
    .select()
    .single()

  return NextResponse.json({ speculation, note })
}

if (action === 'update_outreach_status') {
  const outreachId = cleanString(body.outreach_id || body.outreachId)
  const status = cleanString(body.status)

  if (!outreachId || !status) {
    return NextResponse.json(
      { error: 'Outreach ID and status are required.' },
      { status: 400 },
    )
  }

  const { data: outreach, error } = await supabase
    .from('speculation_outreach')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', outreachId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ outreach })
}
    
    if (action === 'search_live_jobs') {
  const speculationId = cleanString(body.speculation_id || body.speculationId)
  const targetRole = cleanString(body.target_role)
  const isDeliveryRole = Boolean(body.is_delivery_role)
  const standardNames = cleanStringArray(body.standard_names)

  const searchScope = cleanString(body.search_scope) || 'uk_wide_remote'
  const candidateLocation = cleanString(body.candidate_location) || ''
  const candidateArea = cleanString(body.candidate_area) || ''
  const selectedRegions = cleanStringArray(body.selected_regions)
  const includeRemoteHybrid = body.include_remote_hybrid !== false
  const includeUkWide = body.include_uk_wide !== false

  const maxDaysAgo = Number(body.max_days_ago) || 30
  const extraKeywords = cleanString(body.extra_keywords) || ''
  const searchNotes = cleanString(body.search_notes) || ''
  const candidateProfile = body.candidate_profile || {}
  const speculationProfile = cleanString(body.speculation_profile) || ''
  const speculationRequirements = cleanString(body.speculation_requirements) || ''
  const keySellingPoints = cleanStringArray(body.key_selling_points)
  const selectedStandardNames = cleanStringArray(body.selected_standard_names)

      if (!speculationId) {
        return NextResponse.json({ error: 'Speculation ID is required.' }, { status: 400 })
      }

      if (!targetRole) {
        return NextResponse.json({ error: 'Target role is required.' }, { status: 400 })
      }

      const candidateContext = [
        candidateProfile.job_title ? `Current job title: ${candidateProfile.job_title}` : null,
        candidateProfile.seeking_role ? `Seeking: ${candidateProfile.seeking_role}` : null,
        candidateProfile.sub_role ? `Sub-role type: ${candidateProfile.sub_role}` : null,
        candidateProfile.can_deliver ? `Can deliver / subject specialism:\n${candidateProfile.can_deliver}` : null,
        candidateProfile.qualifications ? `Qualifications and assessor awards:\n${candidateProfile.qualifications}` : null,
        Array.isArray(candidateProfile.looking_for_roles) && candidateProfile.looking_for_roles.length
          ? `Open to roles: ${candidateProfile.looking_for_roles.join(', ')}` : null,
        candidateProfile.notes ? `Recruiter notes:\n${candidateProfile.notes}` : null,
        speculationProfile ? `Speculation internal profile:\n${speculationProfile}` : null,
        speculationRequirements ? `Candidate requirements:\n${speculationRequirements}` : null,
        keySellingPoints.length ? `Key selling points: ${keySellingPoints.join(', ')}` : null,
        selectedStandardNames.length ? `Evidenced apprenticeship standards:\n${selectedStandardNames.join('\n')}` : null,
        candidateProfile.formatted_cv ? `CV excerpt:\n${String(candidateProfile.formatted_cv).slice(0, 3000)}` : null,
        `Search scope: ${searchScope}.`,
candidateLocation ? `Search location payload: ${candidateLocation}.` : null,
candidateArea ? `Candidate area: ${candidateArea}.` : null,
selectedRegions.length ? `Selected regions: ${selectedRegions.join(', ')}.` : null,
includeRemoteHybrid ? 'Include remote, hybrid, home-based and field-based jobs where relevant.' : null,
includeUkWide ? 'Include UK-wide, national and remote-first jobs where relevant.' : null,
searchNotes ? `Recruiter search instructions: ${searchNotes}` : null,
      ].filter(Boolean).join('\n\n')

      const queries = buildJobSearchQueries({
  targetRole,
  standardNames: selectedStandardNames.length > 0 ? selectedStandardNames : standardNames,
  candidateLocation,
  candidateArea,
  selectedRegions,
  extraKeywords,
  isDeliveryRole,
  searchScope,
  includeRemoteHybrid,
  includeUkWide,
})

      let allResults: GoogleSearchResult[] = []

      try {
        const searchBatches = await Promise.allSettled(
  queries.map(query => runGoogleSearch(query, maxDaysAgo))
)

        for (const batch of searchBatches) {
          if (batch.status === 'fulfilled') {
            allResults = allResults.concat(batch.value)
          } else {
            console.error('Google search query failed:', batch.reason)
          }
        }
      } catch (err: any) {
        console.error('Google search error:', err)
        return NextResponse.json({ error: `Google search failed: ${err.message}` }, { status: 500 })
      }

      const deduplicated = deduplicateByUrl(allResults)

const freshDeduplicated = deduplicated
  .filter(result => !isSearchResultClearlyTooOld(result, maxDaysAgo))
  .slice(0, 80)

if (freshDeduplicated.length === 0) {
  return NextResponse.json({
    jobs: [],
    summary: `No recent search results found within the last ${maxDaysAgo} days.`,
    excluded_reasons: [
      'Older search results were removed before AI scoring.',
    ],
    total: 0,
  })
}

      let scored: any = { jobs: [], summary: '', excluded_reasons: [] }

      try {
        scored = await runClaudeForJobScoring(
  freshDeduplicated,
  candidateContext,
  targetRole,
  isDeliveryRole,
  maxDaysAgo,
  selectedStandardNames.length > 0 ? selectedStandardNames : standardNames,
)
      } catch (err: any) {
        console.error('Claude scoring error:', err)
        return NextResponse.json({ error: `Job scoring failed: ${err.message}` }, { status: 500 })
      }

      const jobs = Array.isArray(scored.jobs) ? scored.jobs : []

      const filtered = jobs.filter((job: any) => {
  const score = Number(job.match_score) || 0
  if (score < 60) return false

  if (isScoredJobClearlyTooOld(job, maxDaysAgo)) return false

  return true
})

      return NextResponse.json({
        jobs: filtered,
        summary: scored.summary || `${filtered.length} matched job(s) found.`,
        excluded_reasons: Array.isArray(scored.excluded_reasons) ? scored.excluded_reasons : [],
        total: filtered.length,
      })
    }

    const speculationId = cleanString(body.id || body.speculation_id || body.speculationId)

    if (!speculationId) {
      return NextResponse.json(
        { error: 'Speculation ID is required.' },
        { status: 400 },
      )
    }

    const updates = {
      status: cleanString(body.status) || undefined,
      target_role: cleanString(body.target_role),
      target_roles: Array.isArray(body.target_roles) ? cleanStringArray(body.target_roles) : undefined,
      target_sector: cleanString(body.target_sector),
      target_regions: Array.isArray(body.target_regions) ? cleanStringArray(body.target_regions) : undefined,
      candidate_profile: cleanString(body.candidate_profile),
      anonymous_profile: cleanString(body.anonymous_profile),
      profile_summary: cleanString(body.profile_summary),
      candidate_requirements: cleanString(body.candidate_requirements),
      consent_confirmed: typeof body.consent_confirmed === 'boolean' ? body.consent_confirmed : undefined,
      updated_at: new Date().toISOString(),
    }

    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined),
    )

    const { data, error } = await supabase
      .from('candidate_speculations')
      .update(cleanUpdates)
      .eq('id', speculationId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ speculation: data })
  } catch (error: any) {
    console.error('Speculation PATCH error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not update speculation.' },
      { status: 500 },
    )
  }
}