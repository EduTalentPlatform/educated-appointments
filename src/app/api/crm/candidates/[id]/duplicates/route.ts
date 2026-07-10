import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type DuplicateCandidate = {
  candidate_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  postcode: string | null
  job_title: string | null
  linkedin: string | null
  created_at: string | null
  match_score: number
  match_reasons: string[]
}

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

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>
  },
) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Candidate ID is required.',
        },
        { status: 400 },
      )
    }

    const url = new URL(request.url)
    const requestedLimit = Number(url.searchParams.get('limit') || 10)

    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(requestedLimit, 25))
      : 10

    const supabase = getServiceClient()

    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (candidateError) {
      console.error('Candidate duplicate lookup error:', candidateError)

      return NextResponse.json(
        {
          success: false,
          error: 'Could not check the candidate.',
        },
        { status: 500 },
      )
    }

    if (!candidate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Candidate not found.',
        },
        { status: 404 },
      )
    }

    const { data, error } = await supabase.rpc(
      'find_candidate_duplicates',
      {
        p_candidate_id: id,
        p_limit: limit,
      },
    )

    if (error) {
      console.error('Duplicate candidate search error:', error)

      return NextResponse.json(
        {
          success: false,
          error: 'Could not search for duplicate candidates.',
        },
        { status: 500 },
      )
    }

    const duplicates = ((data ?? []) as DuplicateCandidate[]).map(item => ({
      id: item.candidate_id,
      firstName: item.first_name,
      lastName: item.last_name,
      fullName: [item.first_name, item.last_name]
        .filter(Boolean)
        .join(' ')
        .trim(),
      email: item.email,
      phone: item.phone,
      postcode: item.postcode,
      jobTitle: item.job_title,
      linkedin: item.linkedin,
      createdAt: item.created_at,
      score: Number(item.match_score || 0),
      reasons: Array.isArray(item.match_reasons)
        ? item.match_reasons
        : [],
      confidence:
        item.match_score >= 85
          ? 'very_likely'
          : item.match_score >= 60
            ? 'possible'
            : 'weak',
    }))

    return NextResponse.json({
      success: true,
      candidateId: id,
      duplicates,
    })
  } catch (error) {
    console.error('Unexpected duplicate candidate search error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Something went wrong while checking for duplicates.',
      },
      { status: 500 },
    )
  }
}