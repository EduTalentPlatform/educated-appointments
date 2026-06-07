import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function cleanArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value
    .map(item => String(item || '').trim())
    .filter(Boolean)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    if (!body.application_id) {
      return NextResponse.json(
        { error: 'Missing application id.' },
        { status: 400 },
      )
    }

    const interviewType = body.interview_type || 'client'

    if (!['ea', 'client'].includes(interviewType)) {
      return NextResponse.json(
        { error: 'Invalid interview type.' },
        { status: 400 },
      )
    }

    const countsForInterviewToFill =
      interviewType === 'client' && body.counts_for_interview_to_fill === true

    if (countsForInterviewToFill) {
      let query = supabase
        .from('application_interviews')
        .update({
          counts_for_interview_to_fill: false,
          updated_at: new Date().toISOString(),
        })
        .eq('application_id', body.application_id)
        .eq('interview_type', 'client')

      if (body.id) {
        query = query.neq('id', body.id)
      }

      await query
    }

    const payload = {
      application_id: body.application_id,
      interview_type: interviewType,

      stage_number: body.stage_number || null,
      counts_for_interview_to_fill: countsForInterviewToFill,

      interview_date: body.interview_date || null,
      interview_time: body.interview_time || null,
      interview_format: body.interview_format || null,
      location: body.location || null,
      instructions: body.instructions || null,

      employer_contact_ids: Array.isArray(body.employer_contact_ids)
        ? body.employer_contact_ids
        : [],
      employer_contact_names: cleanArray(body.employer_contact_names),
      employer_contact_job_titles: cleanArray(body.employer_contact_job_titles),

      confirmation_email: body.confirmation_email || null,
      feedback: body.feedback || null,
      outcome: body.outcome || null,

      updated_at: new Date().toISOString(),
    }

    const query = body.id
      ? supabase
          .from('application_interviews')
          .update(payload)
          .eq('id', body.id)
          .select()
          .single()
      : supabase
          .from('application_interviews')
          .insert(payload)
          .select()
          .single()

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Application interview save error:', error)

    return NextResponse.json(
      { error: 'Something went wrong saving the interview.' },
      { status: 500 },
    )
  }
}