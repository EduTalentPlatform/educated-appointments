import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai-client'

export async function POST(request: NextRequest) {
  try {
    const { lead, context, tone } = await request.json()

    const prompt = `You are an expert recruitment consultant at Educated Appointments — a specialist FE & Skills recruitment agency based in the UK. You place assessors, IQAs, skills coaches, tutors, curriculum leads, sales professionals and leadership roles exclusively within Further Education, Skills and Apprenticeship providers.

Write a professional outreach email to the following contact:

Company: ${lead.company_name}
Contact: ${lead.contact_name ?? 'the team'}${lead.contact_title ? ` (${lead.contact_title})` : ''}
Sector: ${lead.sector ?? 'Training Provider'}
Region: ${lead.region ?? 'UK'}

Context / purpose of this email:
${context || 'Introduce Educated Appointments and our specialist FE & Skills recruitment service.'}

Tone: ${tone}

Guidelines:
- Write in the first person as Joe from Educated Appointments
- Keep it concise — under 200 words
- Do not use generic phrases like "I hope this email finds you well"
- Be direct, specific and show sector knowledge
- End with a clear, low-friction call to action
- Do not include a subject line — just the email body
- Do not use bullet points in the email
- Sound human, not templated

Write only the email body.`

    const { text, provider, model } = await callAI(prompt, {
  maxTokens: 1000,
  temperature: 0.5,
  taskType: 'email',
  route: 'crm/ai-email',
})

    return NextResponse.json({ result: text, provider, model })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Something went wrong.' },
      { status: 500 },
    )
  }
}