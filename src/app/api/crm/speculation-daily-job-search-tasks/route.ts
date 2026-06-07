import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function isAuthorised(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) return false

  return authHeader === `Bearer ${cronSecret}`
}

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const supabase = getServiceClient()
  const today = todayDate()

  const { data: speculations, error: speculationsError } = await supabase
    .from('candidate_speculations')
    .select(`
      id,
      status,
      candidates (
        id,
        first_name,
        last_name,
        job_title,
        seeking_role_type
      )
    `)
    .in('status', ['active', 'open', 'in_progress'])
    .order('created_at', { ascending: false })

  if (speculationsError) {
    return NextResponse.json(
      { error: speculationsError.message },
      { status: 400 },
    )
  }

  const activeSpeculations = speculations ?? []

  if (activeSpeculations.length === 0) {
    return NextResponse.json({
      created: 0,
      message: 'No active speculations found.',
    })
  }

  let created = 0
  let skipped = 0

  for (const speculation of activeSpeculations as any[]) {
    const candidate = Array.isArray(speculation.candidates)
      ? speculation.candidates[0]
      : speculation.candidates

    const candidateName =
      `${candidate?.first_name ?? ''} ${candidate?.last_name ?? ''}`.trim() ||
      'candidate'

    const role =
      candidate?.job_title ||
      candidate?.seeking_role_type ||
      'suitable roles'

    const { data: existing } = await supabase
      .from('speculation_tasks')
      .select('id')
      .eq('speculation_id', speculation.id)
      .eq('task_type', 'daily_job_search')
      .eq('due_date', today)
      .maybeSingle()

    if (existing) {
      skipped++
      continue
    }

    const { error: insertError } = await supabase
      .from('speculation_tasks')
      .insert({
        speculation_id: speculation.id,
        title: `Search live jobs for ${candidateName}`,
        description: `Daily reminder to search for live ${role} opportunities for this speculation candidate. This task auto-completes at the end of the day if not actioned.`,
        due_date: today,
        completed: false,
        task_type: 'daily_job_search',
        auto_generated: true,
      })

    if (!insertError) {
      created++
    }
  }

  return NextResponse.json({
    date: today,
    activeSpeculations: activeSpeculations.length,
    created,
    skipped,
  })
}