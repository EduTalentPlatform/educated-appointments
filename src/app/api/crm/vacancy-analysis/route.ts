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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const vacancy = body?.vacancy
    const client = body?.client

    if (!vacancy?.id) {
      return NextResponse.json(
        { error: 'Missing vacancy ID.' },
        { status: 400 },
      )
    }

    const prompt = `
You are an experienced UK Further Education, Skills and Apprenticeships recruitment consultant.

Analyse this vacancy as a recruiter. Be commercially useful, direct and practical. Do not write generic filler.

Return ONLY valid JSON with this exact shape:
{
  "market_position": ["..."],
  "what_looks_good": ["..."],
  "risks": ["..."],
  "recommendations": ["..."],
  "questions_to_ask": ["..."],
  "search_difficulty": "Easy / Moderate / Difficult, with one short reason"
}

Vacancy:
${JSON.stringify(vacancy, null, 2)}

Client:
${JSON.stringify(client, null, 2)}

Consider:
- role title clarity
- salary competitiveness
- location and postcode impact
- whether the brief is realistic
- candidate attraction points
- likely red flags
- qualification/experience requirements
- urgency / ASAP impact
- how easy this will be to source
- what the recruiter should challenge or clarify with the client
`

    const aiResult = await callAI(prompt)

const aiText = String(
  (aiResult as any)?.text ??
    (aiResult as any)?.content ??
    (aiResult as any)?.message ??
    '',
)

let analysis: any = null

try {
  analysis = JSON.parse(aiText)
} catch {
  const match = aiText.match(/\{[\s\S]*\}/)
  analysis = match ? JSON.parse(match[0]) : null
}

    if (!analysis) {
      return NextResponse.json(
        { error: 'AI did not return a valid analysis.' },
        { status: 500 },
      )
    }

    const supabase = getServiceClient()
    const updatedAt = new Date().toISOString()

    const { error } = await supabase
      .from('vacancies')
      .update({
        vacancy_analysis: analysis,
        vacancy_analysis_updated_at: updatedAt,
      })
      .eq('id', vacancy.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      analysis,
      updated_at: updatedAt,
    })
  } catch (error: any) {
    console.error('Vacancy analysis error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not analyse vacancy.' },
      { status: 500 },
    )
  }
}