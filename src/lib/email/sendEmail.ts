type SendEmailInput = {
  to: string
  from?: string
  subject: string
  html: string
  text?: string
  replyTo?: string
}

const DEFAULT_FROM_EMAIL =
  'Educated Appointments <noreply@educatedappointments.co.uk>'

function cleanEmailHeader(value?: string | null) {
  return String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/,$/, '')
    .trim()
}

function isValidFromEmail(value: string) {
  return (
    /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value) ||
    /^.+ <[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>$/.test(value)
  )
}

export async function sendEmail({
  to,
  from,
  subject,
  html,
  text,
  replyTo,
}: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY environment variable.')
  }

  const requestedFromEmail = cleanEmailHeader(
    from || process.env.INTERVIEW_REQUEST_FROM_EMAIL || DEFAULT_FROM_EMAIL,
  )

  const fromEmail = isValidFromEmail(requestedFromEmail)
    ? requestedFromEmail
    : DEFAULT_FROM_EMAIL

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to,
      subject,
      html,
      text,
      reply_to: replyTo,
    }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        'Email provider returned an error while sending email.',
    )
  }

  return data
}