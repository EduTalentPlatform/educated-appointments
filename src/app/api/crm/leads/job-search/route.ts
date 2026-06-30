import { NextRequest, NextResponse } from 'next/server'

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
    // Remove trailing commas before closing braces/brackets
    .replace(/,\s*([}\]])/g, '$1')

    // Fix missing commas between objects in arrays:
    // } 
    // {
    .replace(/}\s*{/g, '},{')

    // Fix missing commas between arrays/objects and the next property
    .replace(/]\s*"/g, '],"')
    .replace(/}\s*"/g, '},"')
}

function parseJsonFromClaude(text: string): ParsedClaudeResponse {
  const json = extractFirstJsonObject(text)

  try {
    return JSON.parse(json)
  } catch {
    // Claude sometimes misses a comma in a long jobs array.
    // This catches the common cases without adding another dependency.
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

function cleanJob(job: JobSearchResult): JobSearchResult {
  return {
    job_title: String(job.job_title || '').trim(),
    employer_name: String(job.employer_name || '').trim(),
    employer_sector: job.employer_sector ? String(job.employer_sector).trim() : null,
    location: String(job.location || '').trim(),
    region: String(job.region || '').trim(),
    salary: job.salary ? String(job.salary).trim() : null,
    job_type: job.job_type ? String(job.job_type).trim() : null,
    posted_days_ago: normalisePostedDaysAgo(job.posted_days_ago),
    url: job.url ? String(job.url).trim() : null,
    source: job.source ? String(job.source).trim() : null,
    notes: job.notes ? String(job.notes).trim() : null,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const roles: string[] = Array.isArray(body.roles) ? body.roles.filter(Boolean) : []
    const regions: string[] = Array.isArray(body.regions) ? body.regions.filter(Boolean) : []
    const maxDaysAgo = Number(body.max_days_ago) || 30
    const extraKeywords = String(body.extra_keywords || '').trim()
    const searchNotes = String(body.search_notes || '').trim()

    if (roles.length === 0) {
      return NextResponse.json({ error: 'At least one role is required.' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY is missing.' }, { status: 500 })
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

You are a business development researcher for a UK recruitment agency specialising in Further Education, Skills, and Apprenticeships.

Search the web RIGHT NOW for LIVE job vacancies at training providers, colleges, ITPs, EPAOs and employers in the FE and Skills sector.

These vacancies tell us which organisations are actively growing their teams, making them warm BD prospects for our recruitment agency.

ROLES TO SEARCH FOR:
${roles.map((r, i) => `${i + 1}. ${r}`).join('\n')}

RECENCY:
Only return jobs posted on or after ${cutoffDate}, within the last ${maxDaysAgo} days.

${regionsBlock}

Search job boards including Reed, Indeed, LinkedIn, Tes Jobs, Totaljobs, CV-Library, Guardian Jobs, and training provider / college career pages directly.

${extraKeywords ? `Extra keywords to include in searches:\n${extraKeywords}` : ''}

${searchNotes ? `Additional instructions:\n${searchNotes}` : ''}

RULES:
- Only return jobs that genuinely exist as live postings right now.
- Do not fabricate employers, jobs, salaries, URLs, locations or posting dates.
- Only return jobs posted within the last ${maxDaysAgo} days.
- Include the employer's likely sector where identifiable.
- Return the actual direct URL to each job where possible.
- Include salary where advertised. Use null if not shown.
- Aim for broad geographic spread across the UK.
- Return a maximum of 40 jobs.
- Keep notes short.
- Return valid JSON only.
- Do not include markdown.
- Do not include commentary before or after the JSON.
- Every array item must be separated by a comma.
- All strings must use double quotes.
- Do not use trailing commas.

Return ONLY this exact JSON object shape:

{
  "summary": "2-3 sentence summary covering how many vacancies were found, which roles had most activity, any geographic patterns, and what this means for BD.",
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
      "url": "https://www.reed.co.uk/jobs/example",
      "source": "Reed",
      "notes": "Hiring for apprenticeship delivery."
    }
  ]
}`

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
        max_tokens: 12000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message || 'AI search failed.' },
        { status: 502 },
      )
    }

    const text = (data.content || [])
      .map((part: any) => (part.type === 'text' ? part.text : ''))
      .join('\n')
      .trim()

    if (!text) {
      return NextResponse.json({ error: 'No results returned.' }, { status: 502 })
    }

    const parsed = parseJsonFromClaude(text)

    const jobs = Array.isArray(parsed.jobs)
      ? parsed.jobs
          .map(cleanJob)
          .filter((job) => {
            const postedDaysAgo = normalisePostedDaysAgo(job.posted_days_ago)

            return (
              job.job_title &&
              job.employer_name &&
              (postedDaysAgo === null || postedDaysAgo <= maxDaysAgo)
            )
          })
          .slice(0, 40)
      : []

    return NextResponse.json({
      jobs,
      summary: parsed.summary || '',
      total: jobs.length,
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