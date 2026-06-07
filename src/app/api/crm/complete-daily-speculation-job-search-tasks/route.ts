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

  const { data, error } = await supabase
    .from('speculation_tasks')
    .update({
      completed: true,
      auto_completed: true,
      auto_completed_reason:
        'Daily speculation job search reminder auto-completed at end of day.',
      completed_at: new Date().toISOString(),
    })
    .eq('task_type', 'daily_job_search')
    .eq('auto_generated', true)
    .eq('completed', false)
    .lte('due_date', today)
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    date: today,
    autoCompleted: data?.length ?? 0,
  })
}