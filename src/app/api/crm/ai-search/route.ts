import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type VacancyResult = {
  job_title?: string
  source?: string
  url?: string
  posted_date?: string | null
  posted_days_ago?: number | null
  location?: string | null
  salary?: string | null
  evidence?: string | null
  confidence?: 'verified' | 'likely' | 'needs_checking' | string
  notes?: string | null
}

function clean(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
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

function formatVacancyResult(args: {
  companyName: string
  daysBack: number
  vacancies: VacancyResult[]
  summary?: string
  bdOpener?: string
  verificationNotes?: string[]
}) {
  const {
    companyName,
    daysBack,
    vacancies,
    summary,
    bdOpener,
    verificationNotes,
  } = args

  if (!vacancies.length) {
    return [
      `Live vacancy search for ${companyName}`,
      '',
      summary ||
        `No clearly live vacancies were found in the last ${daysBack} days from the searched sources.`,
      '',
      'Suggested call opener:',
      bdOpener ||
        `I was looking at your current recruitment activity and wanted to check whether you have any delivery, quality or commercial roles coming up that are proving difficult to fill.`,
      '',
      verificationNotes?.length
        ? `Notes:\n${verificationNotes.map(note => `- ${note}`).join('\n')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n')
  }

  const vacancyLines = vacancies.map((vacancy, index) => {
    const posted =
      vacancy.posted_days_ago !== null && vacancy.posted_days_ago !== undefined
        ? `${vacancy.posted_days_ago} days ago`
        : vacancy.posted_date || 'date not confirmed'

    return [
      `${index + 1}. ${vacancy.job_title || 'Role title not confirmed'}`,
      vacancy.location ? `Location: ${vacancy.location}` : '',
      vacancy.salary ? `Salary: ${vacancy.salary}` : '',
      `Source: ${vacancy.source || 'Source not confirmed'}`,
      `Posted: ${posted}`,
      `Confidence: ${vacancy.confidence || 'needs_checking'}`,
      vacancy.evidence ? `Evidence: ${vacancy.evidence}` : '',
      vacancy.url ? `Link: ${vacancy.url}` : '',
      vacancy.notes ? `Notes: ${vacancy.notes}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  })

  return [
    `Live vacancy search for ${companyName}`,
    `Search window: last ${daysBack} days`,
    '',
    summary || '',
    '',
    'Roles found:',
    vacancyLines.join('\n\n'),
    '',
    'Suggested call opener:',
    bdOpener ||
      `I noticed you appear to be advertising for a few roles at the moment. Are these proving straightforward to fill, or would it be worth us comparing notes?`,
    '',
    verificationNotes?.length
      ? `Verification notes:\n${verificationNotes.map(note => `- ${note}`).join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const lead = body.lead || {}
    const context = clean(body.context)

    const companyName = clean(lead.company_name)
    const website = clean(lead.website)
    const linkedinCompany = clean(lead.linkedin_company)
    const region = clean(lead.region) || 'UK'
    const sector = clean(lead.sector) || 'Training Provider / College'

    const requestedDaysBack = Number(body.daysBack || body.dateRange || 60)
    const daysBack = requestedDaysBack === 30 ? 30 : 60

    if (!companyName) {
      return NextResponse.json(
        { error: 'Company name is required.' },
        { status: 400 },
      )
    }

    const prompt = `You are a live vacancy research assistant for Educated Appointments, a UK recruitment agency specialising in Further Education, Skills, Apprenticeships, Training Providers and Colleges.

Your task is to search the web now and identify CURRENT or RECENTLY POSTED live vacancies for this specific organisation.

Organisation:
- Name: ${companyName}
- Website: ${website || 'Unknown'}
- LinkedIn company page: ${linkedinCompany || 'Unknown'}
- Region: ${region}
- Sector: ${sector}
${context ? `- Additional context from Joseph: ${context}` : ''}

Search focus:
1. The organisation's own website, especially pages called Careers, Jobs, Vacancies, Work for us, Join us, Recruitment or Current vacancies.
2. Publicly indexed LinkedIn job results or public LinkedIn company/job pages, where available.
3. Public job boards and search results, including Indeed, Reed, Totaljobs, CV-Library, FE Jobs, TES, Guardian Jobs, college/training provider job pages and other relevant UK job sources.
4. Only include roles that appear to be live or posted within the last ${daysBack} days.
5. If a date is unclear but the advert looks current, include it but mark confidence as "needs_checking".
6. Exclude old, expired, cached or clearly closed adverts.
7. Do not invent vacancies, dates, salaries or URLs.
8. Prefer FE & Skills relevant roles: Assessors, Tutors, Trainers, Skills Coaches, IQAs, Quality, Curriculum, Apprenticeships, Business Development, Employer Engagement, Operations and Leadership.
9. If no live vacancies are found, say that clearly and suggest a useful BD angle based on hiring signals or likely needs.

Return valid JSON only. Do not include markdown.

Return exactly this shape:
{
  "summary": "Short practical summary of what was found.",
  "vacancies": [
    {
      "job_title": "Role title",
      "source": "Company website / LinkedIn / Indeed / Reed / etc",
      "url": "https://...",
      "posted_date": "YYYY-MM-DD or null",
      "posted_days_ago": 12,
      "location": "Location or null",
      "salary": "Salary or null",
      "evidence": "Short evidence from the listing/search result showing why this appears current.",
      "confidence": "verified",
      "notes": "Any useful recruitment angle for Joseph"
    }
  ],
  "bd_opener": "A natural call opener Joseph can use when calling the company.",
  "verification_notes": [
    "Anything Joseph should manually verify before referencing it on a call."
  ]
}`

    const { text, provider } = await callAI(prompt, {
      maxTokens: 3000,
      useWebSearch: true,
    })

    let parsed: any

    try {
      parsed = parseJsonFromAi(text)
    } catch {
      return NextResponse.json({
        result: text,
        provider,
        vacancies: [],
        parse_warning:
          'AI returned a non-JSON response, so the raw research result has been shown.',
      })
    }

    const vacancies: VacancyResult[] = Array.isArray(parsed.vacancies)
      ? parsed.vacancies
          .slice(0, 12)
          .map((vacancy: any) => ({
            job_title: clean(vacancy.job_title),
            source: clean(vacancy.source),
            url: clean(vacancy.url) || null,
            posted_date: clean(vacancy.posted_date) || null,
            posted_days_ago:
              vacancy.posted_days_ago === null ||
              vacancy.posted_days_ago === undefined ||
              Number.isNaN(Number(vacancy.posted_days_ago))
                ? null
                : Number(vacancy.posted_days_ago),
            location: clean(vacancy.location) || null,
            salary: clean(vacancy.salary) || null,
            evidence: clean(vacancy.evidence) || null,
            confidence: clean(vacancy.confidence) || 'needs_checking',
            notes: clean(vacancy.notes) || null,
          }))
          .filter((vacancy: VacancyResult) => vacancy.job_title || vacancy.url)
      : []

    const verificationNotes = Array.isArray(parsed.verification_notes)
      ? parsed.verification_notes.map((note: any) => clean(note)).filter(Boolean)
      : []

    const result = formatVacancyResult({
      companyName,
      daysBack,
      vacancies,
      summary: clean(parsed.summary),
      bdOpener: clean(parsed.bd_opener),
      verificationNotes,
    })

    return NextResponse.json({
      result,
      provider,
      vacancies,
      summary: clean(parsed.summary),
      bd_opener: clean(parsed.bd_opener),
      verification_notes: verificationNotes,
      search_window_days: daysBack,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Something went wrong.' },
      { status: 500 },
    )
  }
}