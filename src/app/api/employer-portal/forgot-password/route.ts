import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function normaliseEmail(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
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
  try {
    const body = await request.json()
    const email = normaliseEmail(body.email)

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 },
      )
    }

    const supabase = getServiceClient()

    const { data: portalUsers } = await supabase
      .from('client_portal_users')
      .select('id, client_id, auth_user_id, name, email, active')
      .ilike('email', email)
      .eq('active', true)
      .limit(1)

    const portalUser = portalUsers?.[0]

    // Do not reveal whether the email exists.
    if (!portalUser) {
      return NextResponse.json({
        success: true,
        message:
          'If that email has employer portal access, a password reset link has been sent.',
      })
    }

    if (!portalUser.auth_user_id) {
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

      if (!authError && authData.user) {
        await supabase
          .from('client_portal_users')
          .update({
            auth_user_id: authData.user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', portalUser.id)
      }
    }

    const redirectTo = `${getSiteUrl()}/employer-portal/set-password`

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo,
      },
    )

    if (resetError) {
      console.error('Employer forgot password error:', resetError.message)
    }

    return NextResponse.json({
      success: true,
      message:
        'If that email has employer portal access, a password reset link has been sent.',
    })
  } catch (error: any) {
    console.error('Employer forgot password route error:', error)

    return NextResponse.json({
      success: true,
      message:
        'If that email has employer portal access, a password reset link has been sent.',
    })
  }
}