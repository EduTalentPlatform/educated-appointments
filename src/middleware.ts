import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const CRM_LOGIN_PATH = '/crm/login'

function isCrmLogin(pathname: string) {
  return pathname === CRM_LOGIN_PATH
}

function isProtectedCrmPath(pathname: string) {
  return (
    pathname.startsWith('/crm') ||
    pathname.startsWith('/api/crm') ||
    pathname.startsWith('/api/admin')
  )
}

function isApiPath(pathname: string) {
  return pathname.startsWith('/api/')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isCrmLogin(pathname)) {
    return NextResponse.next()
  }

  if (!isProtectedCrmPath(pathname)) {
    return NextResponse.next()
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    if (isApiPath(pathname)) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    return NextResponse.redirect(new URL(CRM_LOGIN_PATH, request.url))
  }

  const { data: crmUser, error: crmUserError } = await supabase
    .from('crm_users')
    .select('id, role, is_active')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (crmUserError || !crmUser) {
    if (isApiPath(pathname)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.redirect(new URL(CRM_LOGIN_PATH, request.url))
  }

  return response
}

export const config = {
  matcher: ['/crm/:path*', '/api/crm/:path*', '/api/admin/:path*'],
}