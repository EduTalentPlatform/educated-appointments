import { NextRequest, NextResponse } from 'next/server'
import { callAIJson } from '@/lib/ai-client'

export async function POST(request: NextRequest) {
  try {
    const { jdText, vacancy, employerWebsite } = await request.json()
    if (!jdText) return NextResponse.json({ error: 'No job description provided.' }, { status: 400 })

    const prompt = `You are writing job adverts for Educated Appointments — a specialist FE & Skills recruitment agency. Their style is direct, human and sector-specific. No clichés.

Client's job description / brief:
"""
${jdText}
"""

Vacancy details:
- Title: ${vacancy.title || 'Not specified'}
- Role type: ${vacancy.sector || 'Not specified'}
- Location: ${vacancy.location || 'Not specified'}, ${vacancy.region || ''}
- Salary: ${vacancy.salary_display || 'Competitive'}
- Contract: ${vacancy.type || 'Permanent'}
${employerWebsite ? `- Employer website: ${employerWebsite} (context only — keep employer anonymous)` : ''}

Write TWO outputs and return as JSON only (no markdown):

{
  "advert": "Full job advert with ** headings and - bullets. Engaging opening, responsibilities, requirements, benefits. No employer name.",
  "anonymous_pack": "Candidate-facing document. Replace employer with 'A leading [provider type] in [region]'. Use region only for location. Full role details.",
  "suggested_title": "Better job title if needed",
  "key_requirements": ["req 1", "req 2", "req 3"],
  "ideal_candidate_summary": "One sentence summary of ideal candidate"
}`

    const result = await callAIJson(prompt, { maxTokens: 4000, useWebSearch: !!employerWebsite })
    return NextResponse.json({ result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Something went wrong.' }, { status: 500 })
  }
}