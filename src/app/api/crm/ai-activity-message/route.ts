import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai-client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const lead = body.lead || {}
    const context = String(body.context || '').trim()
    const tone = String(body.tone || 'professional').trim()
    const messageType = String(body.messageType || body.message_type || 'email').trim()

    if (!lead.company_name) {
      return NextResponse.json(
        { error: 'Lead company name is required.' },
        { status: 400 },
      )
    }

    const typeLabel =
      messageType === 'linkedin'
        ? 'LinkedIn message'
        : messageType === 'sms'
          ? 'SMS message'
          : messageType === 'call'
            ? 'call opener / call notes prompt'
            : messageType === 'follow_up'
              ? 'follow-up message'
              : messageType === 'note'
                ? 'internal CRM activity note'
                : 'email'

    const prompt = `
You are helping a specialist UK FE & Skills recruitment agency write CRM activity content.

Create a ${typeLabel} for this lead.

Lead:
${JSON.stringify(lead, null, 2)}

Context from recruiter:
${context || 'No additional context provided.'}

Tone:
${tone}

Rules:
- Do not invent facts.
- Keep it relevant to FE, Skills, Apprenticeships, training providers and recruitment.
- If writing an email, include a subject line and body.
- If writing a LinkedIn message, keep it natural and concise.
- If writing SMS, keep it short and direct.
- If writing a call opener, make it conversational and useful for a recruiter.
- If writing an internal note, format it as a clear CRM note.
- Do not use placeholders like [Name] unless a name is missing and absolutely needed.
- Return only the final text, no markdown.
`

    const { text } = await callAI(prompt, { maxTokens: 1200 })

    return NextResponse.json({
      result: text.trim(),
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Could not generate activity message.' },
      { status: 500 },
    )
  }
}