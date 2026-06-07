import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function requireUser() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

function cleanPayload(body: any) {
  return {
    first_name: String(body.first_name || '').trim(),
    initials: String(body.initials || '').trim() || null,
    role: String(body.role || '').trim() || null,
    body: String(body.body || '').trim(),
    tag: body.tag === 'employer' ? 'employer' : 'candidate',
    featured: Boolean(body.featured),
    show_on_website: body.show_on_website !== false,
    display_order: Number.isFinite(Number(body.display_order))
      ? Number(body.display_order)
      : 0,
    updated_at: new Date().toISOString(),
  }
}

export async function POST(request: Request) {
  const user = await requireUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const payload = cleanPayload(await request.json())

  if (!payload.first_name) {
    return NextResponse.json(
      { error: 'First name is required.' },
      { status: 400 },
    )
  }

  if (!payload.body) {
    return NextResponse.json(
      { error: 'Recommendation text is required.' },
      { status: 400 },
    )
  }

  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('website_recommendations')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ recommendation: data })
}

export async function PATCH(request: Request) {
  const user = await requireUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = await request.json()
  const id = String(body.id || '').trim()

  if (!id) {
    return NextResponse.json(
      { error: 'Recommendation ID is required.' },
      { status: 400 },
    )
  }

  const payload = cleanPayload(body)
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('website_recommendations')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ recommendation: data })
}

export async function DELETE(request: Request) {
  const user = await requireUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = await request.json()
  const id = String(body.id || '').trim()

  if (!id) {
    return NextResponse.json(
      { error: 'Recommendation ID is required.' },
      { status: 400 },
    )
  }

  const supabase = getServiceClient()

  const { error } = await supabase
    .from('website_recommendations')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}