import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EES_DATA_SET_ID = '15b85e0e-28e0-423f-beb9-3a4e8031300c'

type LeadPayload = {
  id?: string
  company_name?: string
  sector?: string | null
  region?: string | null
  website?: string | null
  linkedin_company?: string | null
  status?: string | null
  ukprn?: string | null
  ofsted_grade?: string | null
  ofsted_date?: string | null
  esfa_funding?: number | null
  frameworks?: string | null
  main_office_address_line_1?: string | null
  main_office_address_line_2?: string | null
  main_office_town_city?: string | null
  main_office_county?: string | null
  main_office_postcode?: string | null
  notes?: string | null
}

type ContactPayload = {
  name?: string | null
  title?: string | null
  email?: string | null
  phone?: string | null
  linkedin?: string | null
  role_type?: string | null
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normaliseUrl(url?: string | null) {
  const clean = cleanText(url)
  if (!clean) return ''

  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean
  }

  return `https://${clean}`
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 15000,
) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchWebsiteSummary(website?: string | null) {
  const url = normaliseUrl(website)

  if (!url) {
    return 'No company website recorded on the lead.'
  }

  try {
    const res = await fetchWithTimeout(
      url,
      {
        headers: {
          'User-Agent':
            'EducatedAppointmentsCRM/1.0 (+https://educatedappointments.co.uk)',
          Accept: 'text/html,application/xhtml+xml',
        },
      },
      10000,
    )

    if (!res.ok) {
      return `Website fetch failed with status ${res.status}: ${url}`
    }

    const html = await res.text()

    return stripHtml(html).slice(0, 14000)
  } catch {
    return `Website could not be fetched automatically: ${url}`
  }
}

async function getEducationStatsSnippet(lead: LeadPayload) {
  try {
    const url = `https://api.education.gov.uk/statistics/v1/data-sets/${EES_DATA_SET_ID}/csv`

    const res = await fetchWithTimeout(
      url,
      {
        method: 'GET',
        headers: {
          Accept: 'text/csv',
        },
      },
      25000,
    )

    if (!res.ok) {
      return `DfE Explore Education Statistics dataset fetch failed with status ${res.status}.`
    }

    const csv = await res.text()
    const lines = csv.split(/\r?\n/)

    const searchTerms = [
      lead.ukprn,
      lead.company_name,
      lead.region,
      lead.main_office_town_city,
      lead.main_office_county,
      lead.main_office_postcode,
    ]
      .map(term => cleanText(term).toLowerCase())
      .filter(Boolean)

    const header = lines[0] || ''
    const matchedLines = lines
      .slice(1)
      .filter(line => {
        const lower = line.toLowerCase()
        return searchTerms.some(term => lower.includes(term))
      })
      .slice(0, 80)

    if (matchedLines.length === 0) {
      return [
        header,
        '',
        'No direct rows were matched using the lead company name, UKPRN, region, town, county or postcode.',
        'Use this as a limitation. Do not pretend the dataset contains a direct company match.',
      ].join('\n')
    }

    return [header, ...matchedLines].join('\n').slice(0, 30000)
  } catch {
    return 'DfE Explore Education Statistics dataset could not be fetched automatically.'
  }
}

function extractOpenAIText(response: any) {
  if (typeof response?.output_text === 'string') {
    return response.output_text
  }

  const chunks: string[] = []

  for (const item of response?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (typeof content?.text === 'string') {
        chunks.push(content.text)
      }
    }
  }

  return chunks.join('\n').trim()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const lead: LeadPayload = body.lead ?? {}
    const meetingContact: ContactPayload | null = body.meetingContact ?? null
    const contacts: ContactPayload[] = Array.isArray(body.contacts)
      ? body.contacts
      : []
    const sites = Array.isArray(body.sites) ? body.sites : []
    const context = cleanText(body.context)

    const companyName = cleanText(lead.company_name)

    if (!companyName) {
      return NextResponse.json(
        { error: 'Company name is required for research.' },
        { status: 400 },
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not configured.' },
        { status: 500 },
      )
    }

    const [websiteText, educationStatsSnippet] = await Promise.all([
      fetchWebsiteSummary(lead.website),
      getEducationStatsSnippet(lead),
    ])

    const prompt = `
You are Educated Appointments' senior BD research assistant for the UK Further Education, Skills and Apprenticeships recruitment market.

You are preparing Joseph Sutton for a booked business development meeting.

Research target:
Company: ${companyName}
Sector: ${lead.sector || 'Unknown'}
Region: ${lead.region || 'Unknown'}
Website: ${lead.website || 'Not recorded'}
LinkedIn company page: ${lead.linkedin_company || 'Not recorded'}
UKPRN: ${lead.ukprn || 'Not recorded'}
Ofsted grade: ${lead.ofsted_grade || 'Not recorded'}
Ofsted date: ${lead.ofsted_date || 'Not recorded'}
ESFA funding: ${
      typeof lead.esfa_funding === 'number' ? lead.esfa_funding : 'Not recorded'
    }
Frameworks / standards: ${lead.frameworks || 'Not recorded'}
Main address: ${[
      lead.main_office_address_line_1,
      lead.main_office_address_line_2,
      lead.main_office_town_city,
      lead.main_office_county,
      lead.main_office_postcode,
    ]
      .filter(Boolean)
      .join(', ') || 'Not recorded'}

Lead notes:
${lead.notes || 'No notes recorded.'}

Meeting contact:
${
  meetingContact
    ? `
Name: ${meetingContact.name || 'Unknown'}
Title: ${meetingContact.title || 'Unknown'}
Email: ${meetingContact.email || 'Not recorded'}
Phone: ${meetingContact.phone || 'Not recorded'}
LinkedIn: ${meetingContact.linkedin || 'Not recorded'}
Role type: ${meetingContact.role_type || 'Unknown'}
`
    : 'No specific meeting contact selected.'
}

Other known contacts:
${JSON.stringify(contacts, null, 2)}

Known provider sites:
${JSON.stringify(sites, null, 2)}

Meeting context from Joseph:
${context || 'No extra meeting context provided.'}

Company website extract:
${websiteText}

DfE Explore Education Statistics dataset extract:
${educationStatsSnippet}

Use live web search to supplement the CRM and DfE data.

Search for:
1. The company website and any useful recent company updates.
2. The company LinkedIn page.
3. The selected contact's LinkedIn profile if a name or URL is available.
4. Companies House public web pages using normal web search only. Do not use or refer to any Companies House API.
5. Public review / reputation signals from Glassdoor, Indeed company reviews, Google reviews, Trustpilot, Ofsted and sector-specific sources.
6. Current vacancies from the company site, LinkedIn, Indeed, Find a Job or other public job boards.
7. Salary ranges for roles they appear to be hiring for.
8. Market salary comparisons for similar FE, Skills, Apprenticeships and training provider roles in the same region.
9. DfE / education statistics context, especially whether the provider appears to be above, below or broadly in line with comparable providers in the sector or region.

Rules:
- Do not invent facts.
- If Glassdoor, LinkedIn, Companies House or another platform is inaccessible, say so clearly.
- If the DfE data does not directly match the company, say so clearly.
- If salary comparison is based on limited public adverts, say so clearly.
- Be commercially useful and direct.
- Focus on how Educated Appointments can help with recruitment, hard-to-fill roles, quality, compliance, delivery growth, retention and speed-to-hire.
- Keep the tone natural, consultative and practical.

Return the output in this exact structure:

# Meeting Research: ${companyName}

## 1. Executive snapshot
Give 5 to 8 concise bullets about what matters before the meeting.

## 2. Company overview
Cover what they do, who they serve, locations, sectors/standards, growth signals and anything commercially useful.

## 3. Contact insight
Summarise the selected meeting contact, likely priorities and suggested conversation angle.

## 4. Reputation and risk signals
Summarise Companies House public page findings, Glassdoor/Indeed/Google/Trustpilot/Ofsted/public review findings and limitations.

## 5. Hiring and salary intelligence
List roles found, salary ranges found, how they compare to similar market roles, and any warning signs.

## 6. DfE / sector comparison
Summarise relevant DfE dataset findings and how the company appears to compare with similar providers in the sector/region. Include limitations.

## 7. Likely pain points
List likely recruitment, quality, compliance, delivery, growth or retention issues.

## 8. How Educated Appointments can support
Give practical BD angles. Link each angle to evidence found.

## 9. Best questions to ask in the meeting
Give 10 strong consultative questions.

## 10. 60-second meeting opener
Write a natural opener Joseph can use at the start of the meeting.
`

    const openAIRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_LOW_COST_MODEL || 'gpt-5.4-mini',
        tools: [{ type: 'web_search' }],
        input: prompt,
      }),
    })

    const data = await openAIRes.json()

    if (!openAIRes.ok) {
      return NextResponse.json(
        {
          error:
            data?.error?.message ||
            'OpenAI research request failed. If this mentions web_search, try changing web_search to web_search_preview.',
        },
        { status: 500 },
      )
    }

    const result = extractOpenAIText(data)

    return NextResponse.json({
      result: result || 'No research result returned from OpenAI.',
    })
  } catch (error) {
    console.error('Lead research error:', error)

    return NextResponse.json(
      { error: 'Could not run lead research.' },
      { status: 500 },
    )
  }
}