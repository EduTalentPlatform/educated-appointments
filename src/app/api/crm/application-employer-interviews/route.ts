import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    if (!body.application_id) {
      return NextResponse.json(
        { error: 'Missing application_id.' },
        { status: 400 },
      )
    }

    if (body.counts_towards_interview_rate === true) {
      await supabase
        .from('application_employer_interviews')
        .update({ counts_towards_interview_rate: false })
        .eq('application_id', body.application_id)
    }

    const { data, error } = await supabase
      .from('application_employer_interviews')
      .insert({
        application_id: body.application_id,
        stage_number: body.stage_number ?? 1,
        interview_date: body.interview_date || null,
        interview_time: body.interview_time || null,
        interview_format: body.interview_format || null,
        interview_location: body.interview_location || null,
        contact_ids: body.contact_ids ?? [],
        contact_names: body.contact_names || null,
        candidate_message: body.candidate_message || null,
        notes: body.notes || null,
        counts_towards_interview_rate: body.counts_towards_interview_rate === true,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Create employer interview error:', error)

    return NextResponse.json(
      { error: 'Something went wrong creating the employer interview.' },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    if (!body.id) {
      return NextResponse.json(
        { error: 'Missing interview id.' },
        { status: 400 },
      )
    }

    if (!body.application_id) {
      return NextResponse.json(
        { error: 'Missing application_id.' },
        { status: 400 },
      )
    }

    if (body.counts_towards_interview_rate === true) {
      await supabase
        .from('application_employer_interviews')
        .update({ counts_towards_interview_rate: false })
        .eq('application_id', body.application_id)
        .neq('id', body.id)
    }

    const { data, error } = await supabase
      .from('application_employer_interviews')
      .update({
        stage_number: body.stage_number ?? 1,
        interview_date: body.interview_date || null,
        interview_time: body.interview_time || null,
        interview_format: body.interview_format || null,
        interview_location: body.interview_location || null,
        contact_ids: body.contact_ids ?? [],
        contact_names: body.contact_names || null,
        candidate_message: body.candidate_message || null,
        notes: body.notes || null,
        counts_towards_interview_rate: body.counts_towards_interview_rate === true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Update employer interview error:', error)

    return NextResponse.json(
      { error: 'Something went wrong updating the employer interview.' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    if (!body.id) {
      return NextResponse.json(
        { error: 'Missing interview id.' },
        { status: 400 },
      )
    }

    const { data: existing } = await supabase
      .from('application_employer_interviews')
      .select('*')
      .eq('id', body.id)
      .single()

    const { error } = await supabase
      .from('application_employer_interviews')
      .delete()
      .eq('id', body.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    let promoted = null

    if (existing?.counts_towards_interview_rate && existing.application_id) {
      const { data: nextInterview } = await supabase
        .from('application_employer_interviews')
        .select('*')
        .eq('application_id', existing.application_id)
        .order('stage_number', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (nextInterview) {
        const { data: updated } = await supabase
          .from('application_employer_interviews')
          .update({
            counts_towards_interview_rate: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', nextInterview.id)
          .select()
          .single()

        promoted = updated
      }
    }

    return NextResponse.json({
      ok: true,
      deleted_id: body.id,
      promoted,
    })
  } catch (error) {
    console.error('Delete employer interview error:', error)

    return NextResponse.json(
      { error: 'Something went wrong deleting the employer interview.' },
      { status: 500 },
    )
  }
}