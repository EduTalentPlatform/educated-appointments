import { NextRequest, NextResponse } from 'next/server'
import { callAIJson } from '@/lib/ai-client'

export async function POST(request: NextRequest) {
  try {
    const { cvText, standards } = await request.json()
    if (!cvText || !standards?.length) return NextResponse.json({ error: 'CV text and standards are required.' }, { status: 400 })

    const prompt = `You are an expert FE & Skills recruitment consultant assessing a candidate's suitability to deliver specific apprenticeship standards.

CV:
"""
${cvText}
"""

Standards to assess:
${standards.map((s: string) => `- ${s}`).join('\n')}

Return ONLY valid JSON:
{
  "candidate_summary": "2-3 sentence overview of background and experience",
  "assessments": [
    {
      "standard": "Standard name exactly as provided",
      "can_deliver": true or false,
      "confidence": "High or Medium or Low",
      "evidence": "Specific evidence from the CV",
      "gaps": "Missing qualifications or experience, or null",
      "recommendation": "One sentence recommendation"
    }
  ],
  "overall_recommendation": "Summary of best matched standards and why",
  "suggested_roles": ["suitable", "role", "titles"]
}`

    const result = await callAIJson(prompt, { maxTokens: 3000 })
    return NextResponse.json({ result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Something went wrong.' }, { status: 500 })
  }
}