import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = new Set(['employer', 'candidate', 'general'])

function cleanString(value: unknown, maxLength = 500) {
  return String(value ?? '')
    .trim()
    .slice(0, maxLength)
}

function normaliseEmail(value: unknown) {
  return cleanString(value, 254).toLowerCase()
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid enquiry details.' },
        { status: 400 },
      )
    }

    const type = cleanString((body as any).type, 40)
    const firstName = cleanString((body as any).firstName, 80)
    const lastName = cleanString((body as any).lastName, 80)
    const email = normaliseEmail((body as any).email)
    const phone = cleanString((body as any).phone, 40)
    const organisation = cleanString((body as any).organisation, 160)
    const message = cleanString((body as any).message, 3000)

    if (!type || !firstName || !lastName || !email) {
      return NextResponse.json(
        { success: false, error: 'Please fill in all required fields.' },
        { status: 400 },
      )
    }

    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid enquiry type.' },
        { status: 400 },
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 },
      )
    }

    const supabase = await createClient()

    const { error: dbError } = await supabase.from('enquiries').insert({
      type,
      first_name: firstName,
      last_name: lastName,
      email,
      phone: phone || null,
      organisation: organisation || null,
      message: message || null,
    })

    if (dbError) {
      console.error('Enquiry insert error:', dbError)

      return NextResponse.json(
        { success: false, error: 'Something went wrong. Please try again.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Contact API error:', err)

    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 },
    )
  }
}