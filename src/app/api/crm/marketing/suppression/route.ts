import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_REASONS = new Set([
  'manual',
  'unsubscribe',
  'bounce',
  'complaint',
  'do_not_contact',
  'invalid_email',
])

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function clean(value: unknown) {
  return String(value ?? '').trim()
}

function normaliseEmail(value: unknown) {
  const text = clean(value).toLowerCase()
  return text || null
}

function isValidEmail(value: string | null) {
  if (!value) return false
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)
}

function reasonLabel(value: unknown) {
  const reason = clean(value) || 'manual'
  return VALID_REASONS.has(reason) ? reason : 'manual'
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    const { searchParams } = new URL(request.url)

    const search = clean(searchParams.get('search')).toLowerCase()
    const reason = clean(searchParams.get('reason'))

    let query = supabase
      .from('marketing_suppression_list')
      .select('*')
      .order('created_at', { ascending: false })

    if (reason && reason !== 'all') {
      query = query.eq('reason', reason)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const rows = Array.isArray(data) ? data : []

    const filtered = search
      ? rows.filter(row => {
          return (
            String(row.email ?? '').toLowerCase().includes(search) ||
            String(row.email_normalised ?? '').toLowerCase().includes(search) ||
            String(row.reason ?? '').toLowerCase().includes(search) ||
            String(row.source ?? '').toLowerCase().includes(search) ||
            String(row.notes ?? '').toLowerCase().includes(search)
          )
        })
      : rows

    return NextResponse.json({
      data: filtered,
    })
  } catch (error: any) {
    console.error('Marketing suppression GET error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not load suppression list.' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    const email = clean(body.email)
    const emailNormalised = normaliseEmail(email)
    const reason = reasonLabel(body.reason)
    const source = clean(body.source) || 'CRM manual suppression'
    const notes = clean(body.notes) || null

    if (!isValidEmail(emailNormalised)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from('marketing_suppression_list')
      .upsert(
        {
          email,
          email_normalised: emailNormalised,
          reason,
          source,
          notes,
        },
        {
          onConflict: 'email_normalised',
        },
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await Promise.all([
      supabase
        .from('client_contacts')
        .update({
          marketing_status:
            reason === 'bounce' ? 'bounced' : 'suppressed',
          marketing_consent_status:
            reason === 'unsubscribe' ? 'not_consented' : undefined,
          do_not_email: true,
          bounced_at: reason === 'bounce' ? new Date().toISOString() : undefined,
          unsubscribed_at:
            reason === 'unsubscribe' ? new Date().toISOString() : undefined,
          marketing_notes:
            notes ||
            `Suppressed via CRM marketing suppression list. Reason: ${reason}`,
        })
        .eq('email_normalised', emailNormalised),

      supabase
        .from('lead_contacts')
        .update({
          marketing_status:
            reason === 'bounce' ? 'bounced' : 'suppressed',
          marketing_consent_status:
            reason === 'unsubscribe' ? 'not_consented' : undefined,
          do_not_email: true,
          bounced_at: reason === 'bounce' ? new Date().toISOString() : undefined,
          unsubscribed_at:
            reason === 'unsubscribe' ? new Date().toISOString() : undefined,
          marketing_notes:
            notes ||
            `Suppressed via CRM marketing suppression list. Reason: ${reason}`,
        })
        .eq('email_normalised', emailNormalised),
    ])

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Marketing suppression POST error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not add suppressed email.' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    const id = clean(body.id)

    if (!id) {
      return NextResponse.json(
        { error: 'Suppression ID is required.' },
        { status: 400 },
      )
    }

    const { data: existing, error: existingError } = await supabase
      .from('marketing_suppression_list')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 400 })
    }

    if (!existing) {
      return NextResponse.json(
        { error: 'Suppression record not found.' },
        { status: 404 },
      )
    }

    const { error } = await supabase
      .from('marketing_suppression_list')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: existing })
  } catch (error: any) {
    console.error('Marketing suppression DELETE error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not remove suppressed email.' },
      { status: 500 },
    )
  }
}