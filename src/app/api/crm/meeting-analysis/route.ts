import { NextRequest, NextResponse } from 'next/server'
import { callAIJson } from '@/lib/ai-client'

export async function POST(request: NextRequest) {
  try {
    const { transcript, lead } = await request.json()
    if (!transcript) return NextResponse.json({ error: 'No transcript provided' }, { status: 400 })

    const prompt = `You are an expert FE & Skills recruitment consultant reviewing notes from a business development meeting.

Company: ${lead.company_name}
Sector: ${lead.sector ?? 'FE & Skills Provider'}
Region: ${lead.region ?? 'UK'}

Meeting transcript / notes:
"""
${transcript}
"""

Analyse this and return ONLY valid JSON (no markdown):

{
  "overview": "2-3 sentence summary of what was discussed",
  "key_points": ["point 1", "point 2", "point 3"],
  "pain_points": "What recruitment challenges did they mention?",
  "roles_to_fill": "What specific roles are they looking to recruit?",
  "psl_agencies": "Any competitor agencies or PSL arrangements mentioned?",
  "salary_notes": "Any salary or budget information discussed?",
  "retention_notes": "Any staff retention or turnover issues mentioned?",
  "fee_agreed": "Any fee or rate discussed or agreed?",
  "decision_maker": "Who is the decision maker / budget holder?",
  "next_steps": "Recommended next steps based on this meeting",
  "follow_up_date": "Suggested follow-up date YYYY-MM-DD (5-7 days from today) or null",
  "convert_to_client": true or false,
  "conversion_reasoning": "One sentence on why or why not to convert"
}`

    const result = await callAIJson(prompt, { maxTokens: 1500 })
    return NextResponse.json({ result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Something went wrong.' }, { status: 500 })
  }
}