import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/**
 * Keep this route flexible, like your original version.
 * These are only the keys we absolutely do NOT want to send to Supabase
 * because they are joined/nested data, not columns on applications.
 */
const RELATION_KEYS = new Set([
  'candidate',
  'candidates',
  'vacancy',
  'vacancies',
  'client',
  'clients',
  'documents',
  'vacancyDocuments',
  'activities',
  'aiReview',
  'applicationInterviews',
  'clientContacts',
])

/**
 * Empty strings cause issues on date/timestamp columns.
 * These should be stored as null when cleared.
 */
const DATE_FIELDS = new Set([
  'ea_interview_date',
  'client_interview_date',
  'client_interview_time',
  'profile_sent_at',
  'placed_at',
  'archived_at',
  'created_at',
  'updated_at',
  'role_switched_at',
])

/**
 * Front-end aliases, just in case any component sends camelCase.
 * This will not hurt existing snake_case fields.
 */
const FIELD_ALIASES: Record<string, string> = {
  eaInterviewDate: 'ea_interview_date',
  eaInterviewNotes: 'ea_interview_notes',
  eaInterviewVerdict: 'ea_interview_verdict',

  clientInterviewDate: 'client_interview_date',
  clientInterviewTime: 'client_interview_time',
  clientInterviewFeedback: 'client_interview_feedback',
  clientInterviewOutcome: 'client_interview_outcome',

  internalNotes: 'internal_notes',
  coverNote: 'cover_note',
  profileText: 'profile_text',
  profileAnonymous: 'profile_anonymous',
  profileSentAt: 'profile_sent_at',

  archivedAt: 'archived_at',
  archiveReason: 'archive_reason',
}

function normaliseKey(key: string) {
  return FIELD_ALIASES[key] || key
}

function cleanUpdates(updates: Record<string, any>) {
  const safeUpdates: Record<string, any> = {}

  Object.entries(updates).forEach(([rawKey, value]) => {
    const key = normaliseKey(rawKey)

    if (!key) return
    if (key === 'id') return
    if (key === 'action') return
    if (RELATION_KEYS.has(key)) return
    if (value === undefined) return

    /**
     * Do not try to save nested relation objects into the applications table.
     * Your original route was flexible, but this is the bit that can silently break saves.
     */
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      return
    }

    /**
     * Arrays are not expected on the applications table for this route.
     * This avoids accidentally sending relation arrays.
     */
    if (Array.isArray(value)) {
      return
    }

    /**
     * Empty date/time fields should clear the value rather than fail.
     */
    if (DATE_FIELDS.has(key) && value === '') {
      safeUpdates[key] = null
      return
    }

    /**
     * Empty strings are OK for text fields, but storing null is cleaner.
     */
    if (value === '') {
      safeUpdates[key] = null
      return
    }

    safeUpdates[key] = value
  })

  return safeUpdates
}

function clean(value: unknown) {
  return String(value ?? '').trim()
}

function firstRelation(value: any) {
  return Array.isArray(value) ? value[0] : value
}

function vacancyLabel(vacancy: any) {
  if (!vacancy) return 'Unknown role'

  const client = vacancy.clients ? firstRelation(vacancy.clients) : null

  return [vacancy.title, client?.company_name].filter(Boolean).join(' - ')
}

async function handleSwitchRole({
  supabase,
  id,
  body,
}: {
  supabase: ReturnType<typeof getServiceClient>
  id: string
  body: any
}) {
  const newVacancyId = clean(
    body.new_vacancy_id ||
      body.to_vacancy_id ||
      body.target_vacancy_id ||
      body.vacancy_id,
  )

  const reason = clean(body.reason || body.role_switch_reason)

  if (!newVacancyId) {
    return NextResponse.json(
      { error: 'Please choose the new vacancy/role.' },
      { status: 400 },
    )
  }

  const { data: currentApplication, error: currentError } = await supabase
    .from('applications')
    .select(`
      id,
      candidate_id,
      vacancy_id,
      original_vacancy_id,
      vacancies (
        id,
        title,
        clients (
          id,
          company_name
        )
      )
    `)
    .eq('id', id)
    .single()

  if (currentError || !currentApplication) {
    return NextResponse.json(
      { error: currentError?.message || 'Application not found.' },
      { status: 404 },
    )
  }

  if (currentApplication.vacancy_id === newVacancyId) {
    return NextResponse.json(
      { error: 'This application is already linked to that role.' },
      { status: 400 },
    )
  }

  const { data: targetVacancy, error: targetError } = await supabase
    .from('vacancies')
    .select(`
      id,
      title,
      clients (
        id,
        company_name
      )
    `)
    .eq('id', newVacancyId)
    .single()

  if (targetError || !targetVacancy) {
    return NextResponse.json(
      { error: targetError?.message || 'New vacancy not found.' },
      { status: 404 },
    )
  }

  const now = new Date().toISOString()

  const originalVacancyId =
    currentApplication.original_vacancy_id ||
    currentApplication.vacancy_id ||
    null

  const { data: updatedApplication, error: updateError } = await supabase
    .from('applications')
    .update({
      vacancy_id: newVacancyId,
      original_vacancy_id: originalVacancyId,
      role_switched_at: now,
      role_switch_reason: reason || null,
      updated_at: now,
    })
    .eq('id', id)
    .select(`
      *,
      candidates (
        id,
        first_name,
        last_name,
        email,
        phone,
        job_title,
        main_role_type,
        sub_role_type,
        seeking_role_type,
        looking_for_roles,
        formatted_cv,
        notes,
        qualifications,
        can_deliver,
        preferred_location,
        address_line_1,
        address_line_2,
        town_city,
        county,
        postcode,
        source,
        status,
        actively_looking,
        work_type_pref,
        current_salary,
        salary_expected,
        salary_notes,
        notice_period,
        dbs_status,
        right_to_work,
        cv_url,
        linkedin
      ),
      vacancies (
        id,
        title,
        sector,
        role_type,
        type,
        location,
        region,
        salary_display,
        description,
        employer_job_description,
        anonymous_description,
        briefing_notes,
        clients (
          id,
          company_name,
          contact_name,
          email,
          website
        )
      )
    `)
    .single()

  if (updateError) {
    console.error('Application role switch update error:', updateError)

    return NextResponse.json(
      { error: updateError.message },
      { status: 400 },
    )
  }

  const historyError = await supabase
    .from('application_role_changes')
    .insert({
      application_id: currentApplication.id,
      candidate_id: currentApplication.candidate_id,
      from_vacancy_id: currentApplication.vacancy_id,
      to_vacancy_id: newVacancyId,
      reason: reason || null,
      changed_at: now,
    })
    .then(result => result.error)

  if (historyError) {
    console.error('Application role change history error:', historyError)
  }

  const activityContent = [
    'Application role switched.',
    `From: ${vacancyLabel(currentApplication.vacancies)}`,
    `To: ${vacancyLabel(targetVacancy)}`,
    reason ? `Reason: ${reason}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  if (currentApplication.candidate_id) {
    const { error: activityError } = await supabase
      .from('candidate_activities')
      .insert({
        candidate_id: currentApplication.candidate_id,
        activity_type: 'note',
        content: activityContent,
      })

    if (activityError) {
      console.error('Application role switch activity error:', activityError)
    }
  }

  return NextResponse.json({
    data: updatedApplication,
    switched: true,
  })
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, action, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Application ID required.' },
        { status: 400 },
      )
    }

    const supabase = getServiceClient()

    if (action === 'switch_role' || action === 'switchRole') {
      return handleSwitchRole({
        supabase,
        id,
        body,
      })
    }

    const safeUpdates = cleanUpdates(updates)

if (safeUpdates.status === 'not_interested') {
  safeUpdates.archived_at = new Date().toISOString()
  safeUpdates.archive_reason = 'Candidate not interested'
}

if (
  safeUpdates.status &&
  safeUpdates.status !== 'not_interested' &&
  safeUpdates.status !== 'rejected' &&
  safeUpdates.status !== 'withdrawn'
) {
  safeUpdates.archived_at = null
  safeUpdates.archive_reason = null
}

if (Object.keys(safeUpdates).length === 0) {
  return NextResponse.json(
    { error: 'No valid application fields supplied.' },
    { status: 400 },
  )
}

    const { data, error } = await supabase
      .from('applications')
      .update({
        ...safeUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Application update error:', error)

      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      )
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('Application PATCH error:', err)

    return NextResponse.json(
      { error: err?.message || 'Something went wrong.' },
      { status: 500 },
    )
  }
}