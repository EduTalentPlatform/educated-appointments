import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function requirePortalUser() {
  const authSupabase = await createServerClient()
  const {
    data: { user },
  } = await authSupabase.auth.getUser()

  if (!user) return null

  const supabase = getServiceClient()

  const { data: portalUser } = await supabase
    .from('client_portal_users')
    .select('*')
    .eq('auth_user_id', user.id)
    .eq('active', true)
    .maybeSingle()

  return portalUser
}

export async function POST(request: Request) {
  const portalUser = await requirePortalUser()

  if (!portalUser) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = await request.json()

  const vacancyId = String(body.vacancy_id || '').trim()
  const applicationId = String(body.application_id || '').trim()
  const outcome = String(body.outcome || '').trim()
  const reason = String(body.reason || '').trim() || null

  if (!vacancyId || !applicationId) {
    return NextResponse.json(
      { error: 'Vacancy and application are required.' },
      { status: 400 },
    )
  }

  if (outcome !== 'rejected') {
    return NextResponse.json(
      { error: 'Invalid outcome.' },
      { status: 400 },
    )
  }

  const supabase = getServiceClient()

  const { data: access } = await supabase
    .from('portal_vacancy_access')
    .select('*')
    .eq('portal_user_id', portalUser.id)
    .eq('vacancy_id', vacancyId)
    .eq('can_view_vacancy', true)
    .eq('can_view_submissions', true)
    .maybeSingle()

  if (!access) {
    return NextResponse.json(
      { error: 'You do not have access to this vacancy.' },
      { status: 403 },
    )
  }

  const { data: application } = await supabase
    .from('applications')
    .select('id, vacancy_id, candidate_id, status')
    .eq('id', applicationId)
    .eq('vacancy_id', vacancyId)
    .maybeSingle()

  if (!application) {
    return NextResponse.json(
      { error: 'Application not found.' },
      { status: 404 },
    )
  }

  const { data, error } = await supabase
  .from('applications')
  .update({
    status: 'rejected',
    client_interview_outcome: 'rejected',
    client_interview_feedback: reason,
  })
  .eq('id', applicationId)
  .eq('vacancy_id', vacancyId)
  .select('*')
  .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await supabase.from('candidate_activities').insert({
    candidate_id: application.candidate_id,
    activity_type: 'note',
    content: [
      'Employer portal outcome: candidate rejected.',
      `Portal user: ${portalUser.name || portalUser.email || 'Unknown'}`,
      reason ? `Reason: ${reason}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  })

  return NextResponse.json({ application: data })
}