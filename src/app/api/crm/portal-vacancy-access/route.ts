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

async function requireUser() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

export async function PATCH(request: Request) {
  const user = await requireUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = await request.json()

  const vacancyId = String(body.vacancy_id ?? '').trim()
  const portalUserId = String(body.portal_user_id ?? '').trim()

  const canViewVacancy = Boolean(body.can_view_vacancy)
  const canViewSubmissions = Boolean(body.can_view_submissions)
  const canViewDocuments = Boolean(body.can_view_documents)

  if (!vacancyId || !portalUserId) {
    return NextResponse.json(
      { error: 'Vacancy and portal user are required.' },
      { status: 400 },
    )
  }

  const supabase = getServiceClient()

  const [{ data: vacancy }, { data: portalUser }] = await Promise.all([
    supabase
      .from('vacancies')
      .select('id, client_id')
      .eq('id', vacancyId)
      .single(),

    supabase
      .from('client_portal_users')
      .select('id, client_id, active')
      .eq('id', portalUserId)
      .single(),
  ])

  if (!vacancy || !portalUser) {
    return NextResponse.json(
      { error: 'Vacancy or portal user not found.' },
      { status: 404 },
    )
  }

  if (vacancy.client_id !== portalUser.client_id) {
    return NextResponse.json(
      { error: 'This portal user does not belong to this client.' },
      { status: 400 },
    )
  }

  if (!canViewVacancy && !canViewSubmissions && !canViewDocuments) {
    const { error } = await supabase
      .from('portal_vacancy_access')
      .delete()
      .eq('vacancy_id', vacancyId)
      .eq('portal_user_id', portalUserId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ access: null })
  }

  const { data, error } = await supabase
    .from('portal_vacancy_access')
    .upsert(
      {
        client_id: vacancy.client_id,
        vacancy_id: vacancyId,
        portal_user_id: portalUserId,
        can_view_vacancy: canViewVacancy,
        can_view_submissions: canViewSubmissions,
        can_view_documents: canViewDocuments,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'vacancy_id,portal_user_id',
      },
    )
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ access: data })
}