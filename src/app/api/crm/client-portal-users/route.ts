import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

function normaliseEmail(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

function makeTemporaryPassword() {
  return `${crypto.randomBytes(18).toString('base64url')}Aa1!`
}

export async function GET() {
  const user = await requireUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const supabase = getServiceClient()

  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, company_name')
    .order('company_name', { ascending: true })

  if (clientsError) {
    return NextResponse.json({ error: clientsError.message }, { status: 400 })
  }

  const clientIds = (clients || []).map(client => client.id)

  const { data: contacts, error: contactsError } =
    clientIds.length > 0
      ? await supabase
          .from('client_contacts')
          .select(
            'id, client_id, name, title, email, phone, linkedin, role_type, is_primary, created_at',
          )
          .in('client_id', clientIds)
          .order('is_primary', { ascending: false, nullsFirst: false })
          .order('name', { ascending: true })
      : { data: [], error: null }

  if (contactsError) {
    return NextResponse.json({ error: contactsError.message }, { status: 400 })
  }

  const { data: portalUsers, error: portalUsersError } = await supabase
    .from('client_portal_users')
    .select(
      `
      id,
      client_id,
      client_contact_id,
      auth_user_id,
      name,
      email,
      role,
      active,
      created_at,
      updated_at,
      clients (
        id,
        company_name
      )
    `,
    )
    .order('created_at', { ascending: false })

  if (portalUsersError) {
    return NextResponse.json(
      { error: portalUsersError.message },
      { status: 400 },
    )
  }

  const portalUserIds = (portalUsers || []).map(user => user.id)

  const { data: accessRows, error: accessError } =
    portalUserIds.length > 0
      ? await supabase
          .from('portal_vacancy_access')
          .select(
            `
            id,
            client_id,
            vacancy_id,
            portal_user_id,
            can_view_vacancy,
            can_view_submissions,
            can_view_documents,
            created_at,
            updated_at,
            vacancies (
              id,
              title,
              status
            )
          `,
          )
          .in('portal_user_id', portalUserIds)
          .order('created_at', { ascending: false })
      : { data: [], error: null }

  if (accessError) {
    return NextResponse.json({ error: accessError.message }, { status: 400 })
  }

  const accessByPortalUserId = (accessRows || []).reduce<Record<string, any[]>>(
    (acc, row: any) => {
      if (!acc[row.portal_user_id]) acc[row.portal_user_id] = []
      acc[row.portal_user_id].push(row)
      return acc
    },
    {},
  )

  const users = (portalUsers || []).map((portalUser: any) => ({
    ...portalUser,
    vacancy_access: accessByPortalUserId[portalUser.id] || [],
  }))

  return NextResponse.json({
    clients: clients || [],
    contacts: contacts || [],
    users,
  })
}

export async function POST(request: Request) {
  const user = await requireUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = await request.json()

  const clientId = String(body.client_id ?? '').trim()
  const clientContactId = String(body.client_contact_id ?? '').trim() || null
  const name = String(body.name ?? '').trim()
  const email = normaliseEmail(body.email)
  const role = String(body.role ?? 'Employer').trim() || 'Employer'

  if (!clientId) {
    return NextResponse.json({ error: 'Client is required.' }, { status: 400 })
  }

  if (!name) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  }

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  }

  const supabase = getServiceClient()

  const { data: existing } = await supabase
    .from('client_portal_users')
    .select('*')
    .eq('client_id', clientId)
    .ilike('email', email)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'This employer portal user already exists for this client.' },
      { status: 400 },
    )
  }

  const temporaryPassword = makeTemporaryPassword()

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        user_type: 'client_portal',
        client_id: clientId,
        name,
      },
    })

  if (authError || !authData.user) {
    return NextResponse.json(
      {
        error:
          authError?.message ||
          'Could not create the employer login in Supabase Auth.',
      },
      { status: 400 },
    )
  }

  const { data: portalUser, error: insertError } = await supabase
    .from('client_portal_users')
    .insert({
      client_id: clientId,
      client_contact_id: clientContactId,
      auth_user_id: authData.user.id,
      name,
      email,
      role,
      active: true,
      created_by: user.id,
      must_change_password: true,
      password_changed_at: null,
    })
    .select('*')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({
    portalUser,
    temporaryPassword,
  })
}

export async function PATCH(request: Request) {
  const user = await requireUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = await request.json()
  const id = String(body.id ?? '').trim()

  if (!id) {
    return NextResponse.json(
      { error: 'Portal user ID is required.' },
      { status: 400 },
    )
  }

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (typeof body.active === 'boolean') updates.active = body.active
  if (body.name !== undefined) updates.name = String(body.name ?? '').trim()
  if (body.role !== undefined) updates.role = String(body.role ?? '').trim()

  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('client_portal_users')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ portalUser: data })
}