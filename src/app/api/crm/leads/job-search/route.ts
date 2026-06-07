import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

  throw new Error('Could not parse JSON from response.')
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

    const regionsBlock = regions.length > 0
      ? `Focus particularly on these regions, but still cover all of the UK:\n${regions.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
      : `Search every UK region:\n1. London\n2. South East England\n3. South West England\n4. East of England\n5. East Midlands\n6. West Midlands\n7. Yorkshire and the Humber\n8. North West England\n9. North East England\n10. Wales\n11. Scotland\n12. Northern Ireland\n13. Remote / UK-wide`

    const prompt = `Today's date is ${today}.

You are a business development researcher for a UK recruitment agency specialising in Further Education, Skills, and Apprenticeships.

Search the web RIGHT NOW for LIVE job vacancies at training providers, colleges, ITPs and employers in the FE and Skills sector. These vacancies tell us which organisations are actively growing their teams — making them warm BD prospects for our recruitment agency.

ROLES TO SEARCH FOR (search for ALL of these):
${roles.map((r, i) => `${i + 1}. ${r}`).join('\n')}

RECENCY: Only return jobs posted on or after ${cutoffDate} (within the last ${maxDaysAgo} days).

${regionsBlock}

Search job boards including: Reed, Indeed, LinkedIn, Tes Jobs, Totaljobs, CV-Library, Guardian Jobs, and training provider / college career pages directly.
${extraKeywords ? `\nExtra keywords to include in searches: ${extraKeywords}` : ''}
${searchNotes ? `\nAdditional instructions: ${searchNotes}` : ''}

RULES:
- Only return jobs that genuinely exist as live postings RIGHT NOW. Do not fabricate or hallucinate.
- Only return jobs posted within the last ${maxDaysAgo} days.
- Include the employer's likely sector (e.g. Independent Training Provider, FE College, EPAO) where identifiable.
- Return the actual direct URL to each job where possible.
- Include salary where advertised, null if not shown.
- Aim for broad geographic spread across all UK regions.

Return ONLY a JSON object with this exact shape, no markdown fences, no preamble:

{
  "summary": "2-3 sentence summary: how many vacancies found, which roles had most activity, any geographic patterns, and what this means for BD.",
  "jobs": [
    {
      "job_title": "Assessor",
      "employer_name": "ABC Training Ltd",
      "employer_sector": "Independent Training Provider",
      "location": "Birmingham, West Midlands",
      "region": "West Midlands",
      "salary": "£28,000 – £32,000",
      "job_type": "Full-time",
      "posted_days_ago": 3,
      "url": "https://www.reed.co.uk/jobs/...",
      "source": "Reed",
      "notes": "Growing ITP delivering construction apprenticeships."
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
        max_tokens: 16000,
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
      ? parsed.jobs.filter(
          (job: any) =>
            job.posted_days_ago === null ||
            job.posted_days_ago === undefined ||
            Number(job.posted_days_ago) <= maxDaysAgo,
        )
      : []

    return NextResponse.json({
      jobs,
      summary: parsed.summary || '',
      total: jobs.length,
    })
  } catch (error: any) {
    console.error('BD job search error:', error)
    return NextResponse.json(
      { error: error?.message || 'Unexpected error.' },
      { status: 500 },
    )
  }
}