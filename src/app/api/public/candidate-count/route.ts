import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase environment variables are missing.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function GET() {
  try {
    const supabase = getServiceClient()

    const { count, error } = await supabase
      .from('candidates')
      .select('id', { count: 'exact', head: true })
      .in('status', ['active', 'passive'])

    if (error) {
      return NextResponse.json(
        { error: 'Could not load candidate count.' },
        { status: 500 },
      )
    }

    return NextResponse.json(
      { count: count ?? 0 },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    )
  } catch {
    return NextResponse.json(
      { error: 'Could not load candidate count.' },
      { status: 500 },
    )
  }
}