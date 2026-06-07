import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function safeText(value: unknown, maxLength = 10000) {
  const text = String(value ?? '').trim()
  if (!text) return ''
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

function getCandidateName(candidate: any) {
  const name = `${candidate?.first_name ?? ''} ${candidate?.last_name ?? ''}`.trim()
  return name || 'there'
}

function getVacancyTitle(vacancy: any) {
  return vacancy?.title || 'the role'
}

function getLocation(vacancy: any) {
  return [vacancy?.location, vacancy?.region].filter(Boolean).join(', ') || 'the role location'
}

function getSalary(vacancy: any) {
  return vacancy?.salary_display || 'salary not specified'
}

function getChannelInstruction(channel: string) {
  if (channel === 'sms') {
    return `
Write an SMS message.
Keep it under 320 characters.
No subject line.
No emojis unless very natural.
Mention that I came across their background and thought the role may be relevant.
Keep the employer anonymous.
End with a simple question asking if they are open to a quick chat.
`
  }

  if (channel === 'whatsapp') {
    return `
Write a WhatsApp message.
Keep it conversational but professional.
Around 60-100 words.
Keep the employer anonymous.
Make it sound like a real recruiter message, not a marketing pitch.
End by asking if they would be open to a quick chat.
`
  }

  if (channel === 'linkedin') {
    return `
Write a LinkedIn message.
Keep it concise and professional.
Around 70-110 words.
Keep the employer anonymous.
Do not sound salesy.
Mention why their background looks relevant.
End with a soft question asking if they are open to hearing more.
`
  }

  return `
Write an email.
Include a short subject line at the top in this format:
Subject: [subject]

Then write the email body.
Keep it professional, direct and human.
Keep the employer anonymous.
Around 140-220 words.
Explain why the candidate may be relevant for the role.
End by asking if they would like to discuss it.
Sign off as:
Kind regards,
Joe
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
        'You are a UK recruitment consultant at Educated Appointments writing candidate outreach messages. Write in British English. Sound human, direct and professional. Avoid AI-style phrasing, hype, clichés and exaggerated claims. Do not invent facts.',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error?.message || 'Could not generate outreach message.')
  }

  return (data.content || [])
    .map((part: any) => (part.type === 'text' ? part.text : ''))
    .join('\n')
    .trim()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const channel = String(body.channel || body.activityType || '').toLowerCase()
    const candidate = body.candidate || {}
    const vacancy = body.vacancy || {}
    const client = body.client || {}
    const application = body.application || {}
    const extraContext = String(body.extra_context || '').trim()

    if (!['email', 'sms', 'whatsapp', 'linkedin'].includes(channel)) {
      return NextResponse.json(
        { error: 'Unsupported outreach channel.' },
        { status: 400 },
      )
    }

    const candidateName = getCandidateName(candidate)
    const vacancyTitle = getVacancyTitle(vacancy)

    const prompt = `
Create a candidate outreach message for this application.

Channel:
${channel}

Candidate:
${candidateName}

Role:
${vacancyTitle}

Location:
${getLocation(vacancy)}

Salary:
${getSalary(vacancy)}

Important:
- Keep the employer/client anonymous.
- Do not mention the client name: ${client?.company_name || 'unknown'}.
- Refer to the employer as "a training provider", "a client", or "an employer" where needed.
- Do not invent benefits, salary, remote working, interview details or employer information.
- Use the actual role, location and candidate background where available.
- Sound like Joe from Educated Appointments wrote it.
- Be direct, professional and human.
- Avoid phrases like "exciting opportunity", "perfect fit", "highly impressed", "dynamic", "passionate", "your impressive background", or "I hope this message finds you well".
- If the candidate background is thin, keep it more general.

${
  extraContext
    ? `Additional recruiter context:
${extraContext}

Use this context when drafting the message. If the context says to include something, include it where appropriate. If it says to avoid something, follow that instruction. Do not reveal the employer name unless the recruiter specifically says it is allowed.
`
    : ''
}

Channel-specific instruction:
${getChannelInstruction(channel)}

Candidate data:
${safeText(JSON.stringify(candidate, null, 2), 10000)}

Vacancy data:
${safeText(JSON.stringify(vacancy, null, 2), 12000)}

Application data:
${safeText(JSON.stringify(application, null, 2), 6000)}

Client data for context only. Do not reveal the identity:
${safeText(JSON.stringify(client, null, 2), 4000)}
`

    const message = await runClaude(prompt)

    return NextResponse.json({ message })
  } catch (error: any) {
    console.error('Application outreach message error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not generate outreach message.' },
      { status: 500 },
    )
  }
}