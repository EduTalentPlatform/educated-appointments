'use server'

import { createClient } from '@/lib/supabase/server'
import { ActionResult } from '@/types'

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

export async function submitEnquiry(formData: FormData): Promise<ActionResult> {
  const type = cleanString(formData.get('type'), 40)
  const firstName = cleanString(formData.get('firstName'), 80)
  const lastName = cleanString(formData.get('lastName'), 80)
  const email = normaliseEmail(formData.get('email'))
  const phone = cleanString(formData.get('phone'), 40)
  const organisation = cleanString(formData.get('organisation'), 160)
  const message = cleanString(formData.get('message'), 3000)

  if (!type || !firstName || !lastName || !email) {
    return { success: false, error: 'Please fill in all required fields.' }
  }

  if (!ALLOWED_TYPES.has(type)) {
    return { success: false, error: 'Invalid enquiry type.' }
  }

  if (!isValidEmail(email)) {
    return { success: false, error: 'Please enter a valid email address.' }
  }

  try {
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
      return { success: false, error: 'Something went wrong. Please try again.' }
    }

    return { success: true }
  } catch (err) {
    console.error('Unexpected enquiry error:', err)
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}