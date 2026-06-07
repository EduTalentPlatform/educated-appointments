import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai-client'

export async function POST(request: NextRequest) {
  try {
    const { lead, context } = await request.json()

    const prompt = `You are a specialist FE & Skills recruitment consultant at Educated Appointments. Identify potential recruitment opportunities at this training provider.

Training Provider: ${lead.company_name}
Region: ${lead.region ?? 'UK'}
Sector: ${lead.sector ?? 'Training Provider / College'}
${context ? `Additional context: ${context}` : ''}

Based on your knowledge of the FE & Skills sector:
1. What roles is this type of organisation most likely to need?
2. Which roles have highest turnover?
3. Seasonal recruitment patterns (academic year)?
4. Best approach for opening a conversation about their recruitment needs?

Focus on: Assessors / IQAs, Tutors / Skills Coaches, Curriculum / Quality, Sales / Employer Engagement, Management / Leadership.
Format clearly with short sections. Be practical and specific.`

    const { text, provider } = await callAI(prompt, { maxTokens: 1500, useWebSearch: true })
    return NextResponse.json({ result: text, provider })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Something went wrong.' }, { status: 500 })
  }
}