import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function safeText(value: unknown, maxLength = 12000) {
  const text = String(value ?? '').trim()
  if (!text) return ''
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

  throw new Error('Claude returned invalid JSON.')
}

async function runClaude(prompt: string) {
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
      max_tokens: 4000,
      temperature: 0.18,
      system:
        'You are a UK recruitment consultant at Educated Appointments writing confidential candidate vacancy packs. Write in British English. Keep the employer anonymous. Be clear, professional and direct. Do not invent facts.',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error?.message || 'Claude generation failed.')
  }

  const text = (data.content || [])
    .map((part: any) => (part.type === 'text' ? part.text : ''))
    .join('\n')
    .trim()

  return parseJsonFromClaude(text)
}

function packToText(pack: any) {
  const responsibilities = Array.isArray(pack.key_responsibilities)
    ? pack.key_responsibilities
        .map((section: any) => {
          const bullets = Array.isArray(section.bullets)
            ? section.bullets.map((item: string) => `• ${item}`).join('\n')
            : ''

          return `${section.heading || 'Responsibilities'}\n${bullets}`
        })
        .join('\n\n')
    : ''

  const essential = Array.isArray(pack.person_specification?.essential)
    ? pack.person_specification.essential.map((item: string) => `• ${item}`).join('\n')
    : ''

  const desirable = Array.isArray(pack.person_specification?.desirable)
    ? pack.person_specification.desirable.map((item: string) => `• ${item}`).join('\n')
    : ''

  const attributes = Array.isArray(pack.person_specification?.key_attributes)
    ? pack.person_specification.key_attributes.map((item: string) => `• ${item}`).join('\n')
    : ''

  const apply = Array.isArray(pack.how_to_apply)
    ? pack.how_to_apply.map((item: string) => `• ${item}`).join('\n')
    : ''

  return `CANDIDATE VACANCY PACK
${pack.cover?.title || 'Vacancy'}
${pack.cover?.subtitle || ''}

LOCATION
${pack.cover?.location || 'Not specified'}

REPORTS TO
${pack.cover?.reports_to || 'Not specified'}

CONTRACT
${pack.cover?.contract || 'Not specified'}

This document is confidential and intended for shortlisted candidates only. The employing organisation will be disclosed prior to interview.

About the Organisation

${pack.about_organisation || ''}

Why join now?

${pack.why_join_now || ''}

The Role

${pack.role_overview || ''}

Key Responsibilities

${responsibilities}

Person Specification

Essential Criteria

${essential}

Desirable Criteria

${desirable}

Key Attributes

${attributes}

How to Apply

${apply}

Safeguarding Notice

${pack.safeguarding_notice || ''}

Equal Opportunities

${pack.equal_opportunities || ''}
`
}

type Context = {
  params: Promise<{ id: string }>
}

export async function POST(_request: NextRequest, { params }: Context) {
  try {
    const { id } = await params
    const supabase = getServiceClient()

    const { data: vacancy, error } = await supabase
      .from('vacancies')
      .select(`
        *,
        clients (
          id,
          company_name,
          contact_name,
          email,
          website
        )
      `)
      .eq('id', id)
      .single()

    if (error || !vacancy) {
      return NextResponse.json(
        { error: error?.message || 'Vacancy not found.' },
        { status: 404 },
      )
    }

    const client = Array.isArray(vacancy.clients)
      ? vacancy.clients[0] ?? null
      : vacancy.clients ?? null

    const prompt = `
Create a confidential candidate vacancy pack for this vacancy.

The pack must be employer-anonymous. Do not reveal:
- employer/company name
- employer website
- named client contacts
- any wording that clearly identifies the employer

Use this structure:
- Front cover details
- About the organisation, anonymised
- Why join now?
- The role
- Key responsibilities
- Person specification: essential, desirable, key attributes
- How to apply
- Safeguarding notice
- Equal opportunities

Return valid JSON only with this exact structure:

{
  "cover": {
    "title": "Role title",
    "subtitle": "Short sector/specialism line",
    "location": "Location",
    "reports_to": "Reports to",
    "contract": "Contract type"
  },
  "about_organisation": "An anonymised summary of the employer. Use 'our client' rather than the company name.",
  "why_join_now": "Why this is a good time to join.",
  "role_overview": "Clear summary of the role.",
  "key_responsibilities": [
    {
      "heading": "Responsibility group",
      "bullets": ["bullet 1", "bullet 2"]
    }
  ],
  "person_specification": {
    "essential": ["essential criterion 1", "essential criterion 2"],
    "desirable": ["desirable criterion 1", "desirable criterion 2"],
    "key_attributes": ["attribute 1", "attribute 2"]
  },
  "how_to_apply": ["application instruction 1", "application instruction 2"],
  "safeguarding_notice": "Safeguarding wording.",
  "equal_opportunities": "Equal opportunities wording."
}

Rules:
- Keep it candidate-facing.
- Keep it confidential.
- Do not use the employer name.
- Do not use markdown.
- Do not invent benefits, salary, reports-to, contract details, Ofsted grade, clients or facilities.
- If something is not specified, say "Not specified" or omit it where sensible.
- Use the saved website advert and anonymous description where useful.
- Make it suitable to download and send to candidates.
- Use British English.
- Write like a recruiter, not like a brochure.

Vacancy data:
${safeText(JSON.stringify(vacancy, null, 2), 18000)}

Client data, for context only. Do not reveal identity:
${safeText(JSON.stringify(client, null, 2), 5000)}
`

    const pack = await runClaude(prompt)
    const packText = packToText(pack)

    const { data: updated, error: updateError } = await supabase
      .from('vacancies')
      .update({
        candidate_pack_json: pack,
        candidate_pack_text: packText,
        candidate_pack_generated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({
      pack,
      pack_text: packText,
      vacancy: updated,
    })
  } catch (error: any) {
    console.error('Candidate vacancy pack error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not generate candidate vacancy pack.' },
      { status: 500 },
    )
  }
}