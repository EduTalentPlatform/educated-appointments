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

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')
}

export async function POST(request: Request) {
  const user = await requireUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = await request.json()
  const portalUserId = String(body.portal_user_id || body.id || '').trim()

  if (!portalUserId) {
    return NextResponse.json(
      { error: 'Portal user ID is required.' },
      { status: 400 },
    )
  }

  const supabase = getServiceClient()

  const { data: portalUser, error: portalUserError } = await supabase
    .from('client_portal_users')
    .select('id, client_id, auth_user_id, name, email, active')
    .eq('id', portalUserId)
    .maybeSingle()

  if (portalUserError) {
    return NextResponse.json({ error: portalUserError.message }, { status: 400 })
  }

  if (!portalUser) {
    return NextResponse.json({ error: 'Portal user not found.' }, { status: 404 })
  }

  const email = normaliseEmail(portalUser.email)

  if (!email) {
    return NextResponse.json(
      { error: 'This portal user does not have an email address.' },
      { status: 400 },
    )
  }

  let authUserId = portalUser.auth_user_id as string | null

  if (!authUserId) {
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password: makeTemporaryPassword(),
        email_confirm: true,
        user_metadata: {
          user_type: 'client_portal',
          client_id: portalUser.client_id,
          name: portalUser.name,
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

    authUserId = authData.user.id

    await supabase
      .from('client_portal_users')
      .update({
        auth_user_id: authUserId,
        must_change_password: true,
        password_changed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', portalUser.id)
  }

  const redirectTo = `${getSiteUrl()}/employer-portal/set-password`

  const { error: resetError } = await supabase.auth.resetPasswordForEmail(
    email,
    {
      redirectTo,
    },
  )

  if (resetError) {
    return NextResponse.json({ error: resetError.message }, { status: 400 })
  }

  await supabase
    .from('client_portal_users')
    .update({
      must_change_password: true,
      password_changed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', portalUser.id)

  return NextResponse.json({
    success: true,
    message: 'Password setup/reset email sent.',
  })
}