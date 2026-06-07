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

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Application ID required.' },
        { status: 400 },
      )
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

const supabase = getServiceClient()

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