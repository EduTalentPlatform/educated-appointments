import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai-client'

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

type ParsedClaudeResponse = {
  summary?: string
  jobs?: JobSearchResult[]
}

const KNOWN_RECRUITMENT_AGENCIES = [
  'hays',
  'reed specialist recruitment',
  'reed recruitment',
  'reed talent solutions',
  'randstad',
  'adecco',
  'manpower',
  'morgan hunt',
  'protocol',
  'protocol national',
  'eden brown',
  'eden brown synergy',
  'dovetail and slate',
  'boston rose',
  's knights',
  's knights recruitment',
  'km recruitment',
  'km education recruitment',
  'lt selection',
  'able personnel',
  'coyne recruitment',
  'maze 8',
  'maze8',
  'pertemps',
  'blue arrow',
  'onlyfe',
  'fe associates',
  'castlefield recruitment',
  'education network',
  'teaching personnel',
  'teacheractive',
  'tradewind recruitment',
  'academics',
  'aspire people',
  'prospero teaching',
  'milk education',
  'smart education',
  'now education',
  'supply desk',
  'vision for education',
  'gsl education',
  'anzuk education',
  'empowering learning',
  'connex education',
  'education people',
  'tpp recruitment',
  'charity people',
  'page personnel',
  'michael page',
  'brook street',
  'office angels',
  'search consultancy',
  'the recruitment co',
  'recruitment solutions',
  'essential recruitment',
  'rise technical recruitment',
  'timeplan education',
  'bond recruitment',
  'candidate source',
  'hireful',
  'networx recruitment',
  'webrecruit',
  'people solutions',
  'coople',
  'gaia recruitment',
  'flow recruitment',
  'rec2rec',
]

const JOB_BOARD_OR_AGGREGATOR_NAMES = [
  'reed',
  'indeed',
  'cv-library',
  'cv library',
  'totaljobs',
  'linkedin',
  'tes',
  'tes jobs',
  'guardian jobs',
  'jobsite',
  'monster',
  'glassdoor',
  'adzuna',
]

const GENERIC_EMPLOYER_PATTERNS = [
  /\bconfidential\b/i,
  /\bundisclosed\b/i,
  /\banonymous\b/i,
  /\bour client\b/i,
  /\bthe client\b/i,
  /\bclient name\b/i,
  /\bprivate client\b/i,
  /\btraining provider\b/i,
  /\bindependent training provider\b/i,
  /\bleading training provider\b/i,
  /\bnational training provider\b/i,
  /\bcollege\b/i,
  /\bfe college\b/i,
  /\bfurther education college\b/i,
  /\beducation provider\b/i,
  /\bemployer\b/i,
  /\borganisation\b/i,
  /\borganization\b/i,
]

const AGENCY_EMPLOYER_PATTERNS = [
  /\brecruitment\b/i,
  /\brecruiting\b/i,
  /\bstaffing\b/i,
  /\bpersonnel\b/i,
  /\bresourcing\b/i,
  /\btalent solutions\b/i,
  /\bexecutive search\b/i,
  /\bhead ?hunt/i,
  /\bsearch consultancy\b/i,
  /\brec2rec\b/i,
]

const AGENCY_ADVERT_LANGUAGE_PATTERNS = [
  /\bon behalf of (our|a|the) client\b/i,
  /\bour client is\b/i,
  /\bour client,? (a|an|the)\b/i,
  /\bthe client is\b/i,
  /\bclient is looking\b/i,
  /\bclient is seeking\b/i,
  /\bclient is recruiting\b/i,
  /\bworking with (our|a|an|the) client\b/i,
  /\bwe are working with\b/i,
  /\bwe're working with\b/i,
  /\bwe are supporting\b/i,
  /\bwe're supporting\b/i,
  /\bwe are delighted to be working with\b/i,
  /\bwe have partnered with\b/i,
  /\bpartnered with\b/i,
  /\bretained by\b/i,
  /\bappointed by\b/i,
  /\bexclusive recruitment partner\b/i,
  /\brecruiting on behalf of\b/i,
  /\bacting as an employment agency\b/i,
  /\bacting as an employment business\b/i,
  /\bagency vacancy\b/i,
  /\bagency advert\b/i,
]

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
    throw new Error('No JSON object found in the AI response.')
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

  throw new Error('The AI response contained incomplete JSON.')
}

function lightlyRepairJson(json: string) {
  return json
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/}\s*{/g, '},{')
    .replace(/]\s*"/g, '],"')
    .replace(/}\s*"/g, '},"')
}

function parseJsonFromClaude(text: string): ParsedClaudeResponse {
  const json = extractFirstJsonObject(text)

  try {
    return JSON.parse(json)
  } catch {
    try {
      return JSON.parse(lightlyRepairJson(json))
    } catch (repairError) {
      console.error('Could not parse Claude JSON response:', {
        error: repairError,
        preview: json.slice(0, 3000),
      })

      throw new Error(
        'The job search returned too many results in a broken format. Please try again with fewer roles, fewer regions, or a shorter date range.',
      )
    }
  }
}

function normalisePostedDaysAgo(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null

  const numberValue = Number(value)

  if (Number.isNaN(numberValue)) return null

  return numberValue
}

function cleanText(value: unknown) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normaliseForMatching(value: unknown) {
  return cleanText(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanJob(job: JobSearchResult): JobSearchResult {
  return {
    job_title: cleanText(job.job_title),
    employer_name: cleanText(job.employer_name),
    employer_sector: job.employer_sector ? cleanText(job.employer_sector) : null,
    location: cleanText(job.location),
    region: cleanText(job.region),
    salary: job.salary ? cleanText(job.salary) : null,
    job_type: job.job_type ? cleanText(job.job_type) : null,
    posted_days_ago: normalisePostedDaysAgo(job.posted_days_ago),
    url: job.url ? cleanText(job.url) : null,
    source: job.source ? cleanText(job.source) : null,
    notes: job.notes ? cleanText(job.notes) : null,
  }
}

function isGenericEmployerName(employerName: string) {
  const normalisedEmployer = normaliseForMatching(employerName)

  if (!normalisedEmployer) return true

  if (JOB_BOARD_OR_AGGREGATOR_NAMES.includes(normalisedEmployer)) {
    return true
  }

  return GENERIC_EMPLOYER_PATTERNS.some((pattern) => pattern.test(employerName))
}

function isKnownRecruitmentAgency(employerName: string) {
  const normalisedEmployer = normaliseForMatching(employerName)

  if (!normalisedEmployer) return false

  return KNOWN_RECRUITMENT_AGENCIES.some((agencyName) => {
    const normalisedAgency = normaliseForMatching(agencyName)

    return (
      normalisedEmployer === normalisedAgency ||
      normalisedEmployer.includes(normalisedAgency)
    )
  })
}

function hasAgencyEmployerLanguage(employerName: string) {
  return AGENCY_EMPLOYER_PATTERNS.some((pattern) => pattern.test(employerName))
}

function hasAgencyAdvertLanguage(job: JobSearchResult) {
  const searchableText = [
    job.job_title,
    job.employer_name,
    job.employer_sector,
    job.location,
    job.region,
    job.source,
    job.notes,
    job.url,
  ]
    .filter(Boolean)
    .join(' ')

  return AGENCY_ADVERT_LANGUAGE_PATTERNS.some((pattern) => pattern.test(searchableText))
}

function getAgencyOrInvalidReason(job: JobSearchResult): string | null {
  const employerName = cleanText(job.employer_name)

  if (!employerName) {
    return 'No employer name returned.'
  }

  if (isGenericEmployerName(employerName)) {
    return 'Employer was generic, confidential, a job board, or not useful for BD.'
  }

  if (isKnownRecruitmentAgency(employerName)) {
    return 'Employer appears to be a known recruitment agency.'
  }

  if (hasAgencyEmployerLanguage(employerName)) {
    return 'Employer name contains recruitment agency language.'
  }

  if (hasAgencyAdvertLanguage(job)) {
    return 'Advert contains agency-style wording.'
  }

  return null
}

function createJobKey(job: JobSearchResult) {
  return [
    normaliseForMatching(job.job_title),
    normaliseForMatching(job.employer_name),
    normaliseForMatching(job.location),
  ].join('|')
}

function dedupeJobs(jobs: JobSearchResult[]) {
  const seen = new Set<string>()

  return jobs.filter((job) => {
    const key = createJobKey(job)

    if (seen.has(key)) return false

    seen.add(key)
    return true
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const roles: string[] = Array.isArray(body.roles) ? body.roles.filter(Boolean) : []
    const regions: string[] = Array.isArray(body.regions) ? body.regions.filter(Boolean) : []
    const maxDaysAgo = Number(body.max_days_ago) || 30
    const extraKeywords = cleanText(body.extra_keywords)
    const searchNotes = cleanText(body.search_notes)

    if (roles.length === 0) {
      return NextResponse.json({ error: 'At least one role is required.' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]
    const cutoffDate = new Date(Date.now() - maxDaysAgo * 86400000).toISOString().split('T')[0]

    const regionsBlock =
      regions.length > 0
        ? `Focus particularly on these regions, but still cover all of the UK:\n${regions
            .map((r, i) => `${i + 1}. ${r}`)
            .join('\n')}`
        : `Search every UK region:
1. London
2. South East England
3. South West England
4. East of England
5. East Midlands
6. West Midlands
7. Yorkshire and the Humber
8. North West England
9. North East England
10. Wales
11. Scotland
12. Northern Ireland
13. Remote / UK-wide`

    const prompt = `Today's date is ${today}.

You are a business development researcher for Educated Appointments, a UK recruitment agency specialising in Further Education, Skills, Apprenticeships and Training Providers.

Your task is to search the web RIGHT NOW for LIVE job vacancies that have been advertised DIRECTLY by the hiring organisation.

This search is for business development. We only want to find employers/providers that are actively hiring themselves, so we can approach them as warm BD prospects.

ROLES TO SEARCH FOR:
${roles.map((r, i) => `${i + 1}. ${r}`).join('\n')}

RECENCY:
Only return jobs posted on or after ${cutoffDate}, within the last ${maxDaysAgo} days.

${regionsBlock}

WHERE TO SEARCH:
Search job boards and direct employer sources, including:
- Training provider career pages
- College career pages
- EPAO career pages
- Employer websites
- LinkedIn company job posts
- Reed
- Indeed
- Tes Jobs
- Totaljobs
- CV-Library
- Guardian Jobs

IMPORTANT DIRECT-ADVERT RULE:
The vacancy must be advertised by the actual hiring organisation, not by a recruitment agency.

You MAY return a job from Reed, Indeed, LinkedIn, CV-Library, Totaljobs or another job board ONLY if the named advertiser/employer is the actual training provider, college, EPAO or employer hiring for the role.

You MUST NOT return:
- Recruitment agency adverts
- Staffing agency adverts
- Rec2Rec adverts
- Search consultancy adverts
- Any advert where the employer is a recruitment agency
- Any advert saying "our client"
- Any advert saying "on behalf of our client"
- Any advert saying "we are working with"
- Any advert saying "we are supporting"
- Any advert saying "we have partnered with"
- Any advert where the real employer is confidential or unnamed
- Any advert where employer_name would be "Training Provider", "College", "Confidential", "Our Client", "The Client", "Private Client", "Reed", "Indeed", "CV-Library", "LinkedIn" or another job board

EXCLUDE employers/advertisers that appear to be recruitment agencies, including but not limited to:
Hays, Reed Specialist Recruitment, Randstad, Adecco, Manpower, Morgan Hunt, Protocol, Eden Brown, Dovetail and Slate, Boston Rose, S Knights Recruitment, KM Recruitment, LT Selection, Able Personnel, Maze 8, Pertemps, OnlyFE, FE Associates, Castlefield Recruitment, Teaching Personnel, TeacherActive, Tradewind Recruitment, Academics, Aspire People, Prospero Teaching, Milk Education, Search Consultancy, Page Personnel and Michael Page.

For every result:
- employer_name must be the actual hiring organisation.
- Do not use the job board name as employer_name.
- Do not use the agency name as employer_name.
- Do not return the job if you cannot identify the actual hiring organisation.
- Prefer direct employer career-page URLs where available.
- If using a job board URL, make sure the advertiser is the actual employer/provider.
- Include salary where advertised. Use null if not shown.
- Include the employer's likely sector where identifiable.
- Keep notes short and useful for BD.
- Return a maximum of 40 jobs.
- Return valid JSON only.
- Do not include markdown.
- Do not include commentary before or after the JSON.
- Every array item must be separated by a comma.
- All strings must use double quotes.
- Do not use trailing commas.

${extraKeywords ? `Extra keywords to include in searches:\n${extraKeywords}` : ''}

${searchNotes ? `Additional instructions:\n${searchNotes}` : ''}

Return ONLY this exact JSON object shape:

{
  "summary": "2-3 sentence summary covering how many direct employer vacancies were found, which roles had most activity, any geographic patterns, and what this means for BD.",
  "jobs": [
    {
      "job_title": "Assessor",
      "employer_name": "ABC Training Ltd",
      "employer_sector": "Independent Training Provider",
      "location": "Birmingham, West Midlands",
      "region": "West Midlands",
      "salary": "£28,000 - £32,000",
      "job_type": "Full-time",
      "posted_days_ago": 3,
      "url": "https://www.abctraining.co.uk/careers/assessor",
      "source": "Employer careers page",
      "notes": "Direct employer advert; hiring for apprenticeship delivery."
    }
  ]
}`

    const aiResult = await callAI(prompt, {
      provider: 'openai',
      model:
        process.env.OPENAI_WEB_SEARCH_MODEL ||
        process.env.OPENAI_LOW_COST_MODEL ||
        process.env.OPENAI_MODEL ||
        'gpt-4.1-mini',
      useWebSearch: true,
      webSearchContextSize: 'high',
      taskType: 'web_search',
      route: 'crm/leads/job-search',
      maxTokens: 12000,
      temperature: 0.2,
      autoContinue: false,
      metadata: {
        roles,
        regions,
        max_days_ago: maxDaysAgo,
        extra_keywords: extraKeywords || null,
        has_search_notes: Boolean(searchNotes),
      },
    })

    const text = aiResult.text?.trim()

    if (!text) {
      return NextResponse.json({ error: 'No results returned.' }, { status: 502 })
    }

    const parsed = parseJsonFromClaude(text)

    const cleanedJobs = Array.isArray(parsed.jobs) ? parsed.jobs.map(cleanJob) : []

    const validJobs: JobSearchResult[] = []
    const rejectedJobs: { job: JobSearchResult; reason: string }[] = []

    cleanedJobs.forEach((job) => {
      const postedDaysAgo = normalisePostedDaysAgo(job.posted_days_ago)

      if (!job.job_title || !job.employer_name) {
        rejectedJobs.push({
          job,
          reason: 'Missing job title or employer name.',
        })
        return
      }

      if (postedDaysAgo !== null && postedDaysAgo > maxDaysAgo) {
        rejectedJobs.push({
          job,
          reason: 'Vacancy was outside the selected date range.',
        })
        return
      }

      const agencyOrInvalidReason = getAgencyOrInvalidReason(job)

      if (agencyOrInvalidReason) {
        rejectedJobs.push({
          job,
          reason: agencyOrInvalidReason,
        })
        return
      }

      validJobs.push(job)
    })

    const jobs = dedupeJobs(validJobs).slice(0, 40)

    const summaryPrefix =
      rejectedJobs.length > 0
        ? `Showing ${jobs.length} direct employer/provider adverts after removing ${rejectedJobs.length} likely agency, unnamed employer or unsuitable results.`
        : `Showing ${jobs.length} direct employer/provider adverts.`

    return NextResponse.json({
      jobs,
      summary: `${summaryPrefix}${parsed.summary ? ` ${parsed.summary}` : ''}`,
      total: jobs.length,
      rejected_total: rejectedJobs.length,
    })
  } catch (error: any) {
    console.error('BD job search error:', error)

    return NextResponse.json(
      {
        error:
          error?.message ||
          'The job search failed. Please try again with fewer roles or a shorter date range.',
      },
      { status: 500 },
    )
  }
}