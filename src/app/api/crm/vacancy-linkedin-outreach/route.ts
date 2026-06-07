import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function safeText(value: unknown, maxLength = 10000) {
  const text = String(value ?? '').trim()
  if (!text) return ''
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

function getMessageTypeInstruction(messageType: string) {
  if (messageType === 'connection_request') {
    return `
Write a LinkedIn connection request.
Keep it very short and natural.
Maximum 280 characters.
Use [Name] as the candidate name placeholder.
Do not include a subject line.
Do not mention Educated Appointments unless it sounds natural.
Keep the employer anonymous.
End with a simple reason to connect or a soft question.
`
  }

  if (messageType === 'existing_connection') {
    return `
Write a LinkedIn message for someone I am already connected with.
Around 70-110 words.
Use [Name] as the candidate name placeholder.
Keep the employer anonymous.
Mention the role and location where useful.
Make it sound like a human recruiter, not a campaign.
End by asking if they would be open to hearing more.
`
  }

  return `
Write an InMail-style LinkedIn message.
Include a short subject line in this format:
Subject: [subject]

Then write the message.
Around 120-180 words.
Use [Name] as the candidate name placeholder.
Keep the employer anonymous.
Mention why the opportunity may be relevant.
End with a soft call to action.
`
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
      max_tokens: 1200,
      temperature: 0.25,
      system:
        'You are a UK recruitment consultant at Educated Appointments writing LinkedIn candidate outreach messages. Write in British English. Sound human, direct, warm and professional. Avoid AI-style phrasing, hype, clichés and exaggerated claims. Keep the employer anonymous. Do not invent facts.',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error?.message || 'Could not generate LinkedIn outreach.')
  }

  return (data.content || [])
    .map((part: any) => (part.type === 'text' ? part.text : ''))
    .join('\n')
    .trim()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const messageType = String(body.message_type || 'connection_request')
        const extraContext = String(body.extra_context || '').trim()
    const linkedinSearchQuery = String(body.linkedin_search_query || '').trim()
    const vacancy = body.vacancy || {}
    const client = body.client || {}

    if (
      !['connection_request', 'existing_connection', 'inmail'].includes(
        messageType,
      )
    ) {
      return NextResponse.json(
        { error: 'Unsupported LinkedIn outreach message type.' },
        { status: 400 },
      )
    }

    const prompt = `
Create a LinkedIn outreach message for candidate sourcing.

Message type:
${messageType}

Instruction:
${getMessageTypeInstruction(messageType)}

Important:
- Keep the employer/client anonymous.
- Do not mention the client name: ${client?.company_name || 'unknown'}.
- Refer to the employer as "a training provider", "a client", or "an employer" where needed.
- Do not invent benefits, salary, remote working, interview details or employer information.
- Use the actual role, location, salary and vacancy details where available.
- Sound like Joe from Educated Appointments wrote it.
- Be direct, professional and human.
- Avoid phrases like "exciting opportunity", "perfect fit", "highly impressed", "dynamic", "passionate", "your impressive background", or "I hope this message finds you well".
- Do not say you have reviewed the candidate's full CV. This is for new LinkedIn outreach based on a profile/search result.
- Use [Name] as the candidate name placeholder.
- Return the message text only. Do not wrap it in quotation marks.

LinkedIn search query used:
${linkedinSearchQuery || 'Not provided'}

${
  extraContext
    ? `Additional recruiter context:
${extraContext}

Use this context when drafting the message. If it says to include something, include it where appropriate. If it says to avoid something, follow that instruction.
`
    : ''
}

Vacancy data:
${safeText(JSON.stringify(vacancy, null, 2), 12000)}

Client data for context only. Do not reveal identity:
${safeText(JSON.stringify(client, null, 2), 4000)}
`

    const message = await runClaude(prompt)

    return NextResponse.json({ message })
  } catch (error: any) {
    console.error('Vacancy LinkedIn outreach error:', error)

    return NextResponse.json(
      {
        error:
          error?.message || 'Could not generate LinkedIn outreach message.',
      },
      { status: 500 },
    )
  }
}