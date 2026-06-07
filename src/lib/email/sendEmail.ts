type SendEmailInput = {
  to: string
  from?: string
  subject: string
  html: string
  text?: string
  replyTo?: string
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

  const fromEmail =
    from ||
    process.env.INTERVIEW_REQUEST_FROM_EMAIL ||
    'Educated Appointments <noreply@educatedappointments.co.uk>'

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