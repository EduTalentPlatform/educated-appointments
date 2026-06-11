import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/sendEmail'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function requireUser() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

function clean(value: unknown) {
  return String(value ?? '').trim()
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function textToHtml(text: string) {
  return `
    <div style="font-family: Arial, sans-serif; color: #17172f; line-height: 1.6; font-size: 14px;">
      ${escapeHtml(text)
        .split('\n\n')
        .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br />')}</p>`)
        .join('')}
    </div>
  `
}

export async function POST(request: Request) {
  const user = await requireUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)

  const to = clean(body?.to)
  const subject = clean(body?.subject)
  const text = clean(body?.text)

  if (!to) {
    return NextResponse.json({ error: 'Recipient email is required.' }, { status: 400 })
  }

  if (!subject) {
    return NextResponse.json({ error: 'Subject is required.' }, { status: 400 })
  }

  if (!text) {
    return NextResponse.json({ error: 'Email body is required.' }, { status: 400 })
  }

  try {
    const result = await sendEmail({
      to,
      subject,
      text,
      html: textToHtml(text),
      replyTo: process.env.CRM_REPLY_TO_EMAIL || 'joe@educatedappointments.co.uk',
    })

    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    console.error('Employer portal introduction email error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not send introduction email.' },
      { status: 500 },
    )
  }
}
