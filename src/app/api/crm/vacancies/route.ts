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

function cleanString(value: unknown) {
  const text = String(value ?? '').trim()
  return text || null
}

function makeSlug(value: unknown) {
  return String(value || 'vacancy')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function pickDefined<T extends Record<string, any>>(input: T) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  )
}

function normaliseIdArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value
    .map(item => String(item || '').trim())
    .filter(Boolean)
}

async function getCandidateCvUrl({
  supabase,
  candidateId,
  presentedDocIds,
}: {
  supabase: ReturnType<typeof getServiceClient>
  candidateId: string
  presentedDocIds: string[]
}) {
  if (presentedDocIds.length > 0) {
    const { data: selectedDoc } = await supabase
      .from('candidate_documents')
      .select('file_url')
      .in('id', presentedDocIds)
      .eq('candidate_id', candidateId)
      .not('file_url', 'is', null)
      .limit(1)
      .maybeSingle()

    if (selectedDoc?.file_url) return selectedDoc.file_url
  }

  const { data: cvDoc } = await supabase
    .from('candidate_documents')
    .select('file_url')
    .eq('candidate_id', candidateId)
    .eq('doc_type', 'cv')
    .not('file_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (cvDoc?.file_url) return cvDoc.file_url

  const { data: candidate } = await supabase
    .from('candidates')
    .select('cv_url')
    .eq('id', candidateId)
    .maybeSingle()

  return candidate?.cv_url || null
}

async function releaseCandidateDocuments({
  supabase,
  candidateId,
  docIds,
}: {
  supabase: ReturnType<typeof getServiceClient>
  candidateId: string
  docIds: string[]
}) {
  let query = supabase
    .from('candidate_documents')
    .update({ released: true })
    .eq('candidate_id', candidateId)

  if (docIds.length > 0) {
    query = query.in('id', docIds)
  }

  const { data, error } = await query.select()

  if (!error) {
    return { data, error: null }
  }

  // Some older builds used visible_to_client rather than released.
  let fallbackQuery = supabase
    .from('candidate_documents')
    .update({ visible_to_client: true })
    .eq('candidate_id', candidateId)

  if (docIds.length > 0) {
    fallbackQuery = fallbackQuery.in('id', docIds)
  }

  const fallback = await fallbackQuery.select()

  return {
    data: fallback.data,
    error: fallback.error,
  }
}

async function getApplicationWithCandidate({
  supabase,
  applicationId,
}: {
  supabase: ReturnType<typeof getServiceClient>
  applicationId: string
}) {
  const { data, error } = await supabase
    .from('applications')
    .select(`
      *,
      candidates (
        id,
        first_name,
        last_name,
        email,
        phone,
        job_title,
        cv_url
      )
    `)
    .eq('id', applicationId)
    .single()

  return { data, error }
}

async function addCandidateToVacancy({
  supabase,
  vacancyId,
  candidateId,
  initialStatus,
  presentedDocIds,
  internalNotes,
}: {
  supabase: ReturnType<typeof getServiceClient>
  vacancyId: string
  candidateId: string
  initialStatus?: string | null
  presentedDocIds: string[]
  internalNotes?: string | null
}) {
  const { data: existingApplication, error: existingError } = await supabase
    .from('applications')
    .select('*')
    .eq('vacancy_id', vacancyId)
    .eq('candidate_id', candidateId)
    .maybeSingle()

  if (existingError) {
    return { application: null, error: existingError }
  }

  if (existingApplication) {
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    const note = cleanString(internalNotes)

    if (
      note &&
      !String(existingApplication.internal_notes || '').includes(note)
    ) {
      updates.internal_notes = existingApplication.internal_notes
        ? `${existingApplication.internal_notes}\n\n${note}`
        : note
    }

    if (Object.keys(updates).length > 1) {
      const { error: updateError } = await supabase
        .from('applications')
        .update(updates)
        .eq('id', existingApplication.id)

      if (updateError) {
        return { application: null, error: updateError }
      }
    }

    const refreshed = await getApplicationWithCandidate({
      supabase,
      applicationId: existingApplication.id,
    })

    return {
      application: refreshed.data,
      error: refreshed.error,
      alreadyExists: true,
    }
  }

  const cvUrl = await getCandidateCvUrl({
    supabase,
    candidateId,
    presentedDocIds,
  })

  const { data: insertedApplication, error: insertError } = await supabase
    .from('applications')
    .insert({
      vacancy_id: vacancyId,
      candidate_id: candidateId,
      status: initialStatus || 'screening',
      cv_url: cvUrl,
      internal_notes: cleanString(internalNotes),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (insertError) {
    return { application: null, error: insertError }
  }

  const refreshed = await getApplicationWithCandidate({
    supabase,
    applicationId: insertedApplication.id,
  })

  return {
    application: refreshed.data,
    error: refreshed.error,
    alreadyExists: false,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    const title = cleanString(body.title)

    if (!title) {
      return NextResponse.json(
        { error: 'Vacancy title is required.' },
        { status: 400 },
      )
    }

    const insertPayload = pickDefined({
      title,
      slug: body.slug || makeSlug(title),
      status: body.status || 'draft',

      client_id: body.client_id || null,

      sector: cleanString(body.sector),
      role_type: cleanString(body.role_type),
      subject_area: cleanString(body.subject_area),
      type: cleanString(body.type),

      location: cleanString(body.location),
      region: cleanString(body.region),
      postcode: cleanString(body.postcode),
      lat: body.lat ?? null,
      lng: body.lng ?? null,
      work_type: body.work_type || 'office',

      salary_display: cleanString(body.salary_display),
      salary_min: body.salary_min ?? null,
      salary_max: body.salary_max ?? null,

      employer_job_description: cleanString(body.employer_job_description),
      description: cleanString(body.description),
      anonymous_description: cleanString(body.anonymous_description),

      briefing_notes: cleanString(body.briefing_notes),
      reason_for_vacancy: cleanString(body.reason_for_vacancy),
      advertising_notes: cleanString(body.advertising_notes),
      fee_info: cleanString(body.fee_info),
      target_fill_date: body.target_fill_date || null,

      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const { data, error } = await supabase
      .from('vacancies')
      .insert(insertPayload)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Vacancy POST error:', error)

    return NextResponse.json(
      {
        error: error?.message || 'Something went wrong creating the vacancy.',
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    // ── Add candidate to job / create application ───────────────────────────
    if (body.addCandidate) {
      const vacancyId = cleanString(body.vacancyId)
      const candidateId = cleanString(body.candidateId)

      if (!vacancyId || !candidateId) {
        return NextResponse.json(
          { error: 'Vacancy ID and candidate ID are required.' },
          { status: 400 },
        )
      }

      const presentedDocIds = normaliseIdArray(body.presentedDocIds)

      const result = await addCandidateToVacancy({
        supabase,
        vacancyId,
        candidateId,
        initialStatus: body.initialStatus || 'screening',
        presentedDocIds,
        internalNotes: body.internal_notes,
      })

      if (result.error) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 },
        )
      }

      return NextResponse.json({
        application: result.application,
        alreadyExists: result.alreadyExists,
      })
    }

    // ── Update application status ───────────────────────────────────────────
    if (body.applicationId && body.appStatus) {
      const applicationId = cleanString(body.applicationId)
      const appStatus = cleanString(body.appStatus)

      if (!applicationId || !appStatus) {
        return NextResponse.json(
          { error: 'Application ID and status are required.' },
          { status: 400 },
        )
      }

      const { data, error } = await supabase
        .from('applications')
        .update({
          status: appStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ application: data })
    }

    // ── Release candidate documents to client view ──────────────────────────
    if (body.releaseDocs) {
      const candidateId = cleanString(body.candidateId)

      if (!candidateId) {
        return NextResponse.json(
          { error: 'Candidate ID is required to release documents.' },
          { status: 400 },
        )
      }

      const docIds = normaliseIdArray(body.presentedDocIds)

      const { data, error } = await releaseCandidateDocuments({
        supabase,
        candidateId,
        docIds,
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ documents: data ?? [] })
    }

    // ── Standard vacancy update ─────────────────────────────────────────────
    const id = cleanString(body.id)

    if (!id) {
      return NextResponse.json(
        { error: 'Vacancy ID is required.' },
        { status: 400 },
      )
    }

    const updates = pickDefined({
      title: body.title,
      slug: body.slug,

      status: body.status,

      client_id: body.client_id,

      sector: body.sector,
      role_type: body.role_type,
      subject_area: body.subject_area,
      type: body.type,

      location: body.location,
      region: body.region,
      postcode: body.postcode,
      lat: body.lat,
      lng: body.lng,
      work_type: body.work_type,

      salary_display: body.salary_display,
      salary_min: body.salary_min,
      salary_max: body.salary_max,

      employer_job_description: body.employer_job_description,
      description: body.description,
      anonymous_description: body.anonymous_description,

      briefing_notes: body.briefing_notes,
      reason_for_vacancy: body.reason_for_vacancy,
      advertising_notes: body.advertising_notes,
      fee_info: body.fee_info,
      target_fill_date: body.target_fill_date || undefined,

      updated_at: new Date().toISOString(),
    })

    const { data, error } = await supabase
      .from('vacancies')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Vacancy PATCH error:', error)

    return NextResponse.json(
      {
        error: error?.message || 'Something went wrong updating the vacancy.',
      },
      { status: 500 },
    )
  }
}