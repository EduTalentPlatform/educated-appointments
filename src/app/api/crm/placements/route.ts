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

function cleanDate(value: unknown) {
  const text = cleanString(value)
  return text || null
}

function cleanNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null

  const number = Number(String(value).replace(/[^0-9.-]/g, ''))

  return Number.isFinite(number) ? number : null
}

function calculateFeeAmount(
  salary: unknown,
  feePercentage: unknown,
  fallbackFeeAmount?: unknown,
) {
  const salaryNumber = cleanNumber(salary)
  const percentageNumber = cleanNumber(feePercentage)

  if (salaryNumber && percentageNumber) {
    return Math.round((salaryNumber * percentageNumber) / 100)
  }

  return cleanNumber(fallbackFeeAmount)
}

function normaliseRelation<T = any>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

async function getPlacementById(supabase: ReturnType<typeof getServiceClient>, id: string) {
  return supabase
    .from('placements')
    .select(`
      *,
      applications (
        id,
        status,
        internal_notes,
        placed_at
      ),
      candidates (
        id,
        first_name,
        last_name,
        email,
        phone,
        job_title,
        postcode
      ),
      vacancies (
        id,
        title,
        location,
        region,
        salary_display,
        clients (
          id,
          company_name,
          email,
          contact_name
        )
      ),
      clients (
        id,
        company_name,
        email,
        contact_name
      )
    `)
    .eq('id', id)
    .single()
}

async function createAftercareTasksManually({
  supabase,
  placementId,
  startDate,
}: {
  supabase: ReturnType<typeof getServiceClient>
  placementId: string
  startDate: string | null
}) {
  if (!startDate) return

  const start = new Date(startDate)

  function addDays(days: number) {
    const date = new Date(start)
    date.setDate(start.getDate() + days)
    return date.toISOString().split('T')[0]
  }

  const tasks = [
    {
      placement_id: placementId,
      task_type: 'week_1_check_in',
      title: 'Week 1 check-in with candidate and client',
      due_date: addDays(7),
    },
    {
      placement_id: placementId,
      task_type: 'week_4_check_in',
      title: 'Week 4 placement check-in',
      due_date: addDays(28),
    },
    {
      placement_id: placementId,
      task_type: 'week_8_check_in',
      title: 'Week 8 placement check-in',
      due_date: addDays(56),
    },
    {
      placement_id: placementId,
      task_type: 'week_12_check_in',
      title: 'Week 12 placement check-in',
      due_date: addDays(84),
    },
  ]

  await supabase
    .from('placement_tasks')
    .upsert(tasks, { onConflict: 'placement_id,task_type' })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    const applicationId = cleanString(body.application_id || body.applicationId)

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required.' },
        { status: 400 },
      )
    }

    const { data: existingPlacement, error: existingError } = await supabase
      .from('placements')
      .select('id')
      .eq('application_id', applicationId)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 400 })
    }

    if (existingPlacement?.id) {
      return NextResponse.json({
        placement: existingPlacement,
        alreadyExists: true,
      })
    }

    const { data: application, error: applicationError } = await supabase
      .from('applications')
      .select(`
        id,
        candidate_id,
        vacancy_id,
        status,
        candidates (
          id,
          first_name,
          last_name
        ),
        vacancies (
          id,
          client_id,
          title,
          clients (
            id,
            company_name
          )
        )
      `)
      .eq('id', applicationId)
      .single()

    if (applicationError || !application) {
      return NextResponse.json(
        { error: applicationError?.message || 'Application not found.' },
        { status: 404 },
      )
    }

    const vacancy = normaliseRelation((application as any).vacancies)
    const vacancyClient = normaliseRelation(vacancy?.clients)

    const candidateId = (application as any).candidate_id
    const vacancyId = (application as any).vacancy_id
    const clientId = vacancy?.client_id || vacancyClient?.id || null

    if (!candidateId || !vacancyId) {
      return NextResponse.json(
        { error: 'Application is missing candidate or vacancy links.' },
        { status: 400 },
      )
    }

    const { data: placement, error: placementError } = await supabase
      .from('placements')
      .insert({
        application_id: applicationId,
        candidate_id: candidateId,
        vacancy_id: vacancyId,
        client_id: clientId,
        status: 'draft',
        offer_date: cleanDate(body.offer_date),
        accepted_date: cleanDate(body.accepted_date),
        start_date: cleanDate(body.start_date),
        salary: cleanNumber(body.salary),
        salary_period: cleanString(body.salary_period) || 'annual',
        fee_type: cleanString(body.fee_type) || 'percentage',
        fee_percentage: cleanNumber(body.fee_percentage),
fee_amount: calculateFeeAmount(
  body.salary,
  body.fee_percentage,
  body.fee_amount,
),
        candidate_accepted: Boolean(body.candidate_accepted),
        employer_confirmed: Boolean(body.employer_confirmed),
        invoice_status: cleanString(body.invoice_status) || 'not_invoiced',
        invoice_number: cleanString(body.invoice_number),
        payment_terms: cleanString(body.payment_terms),
        purchase_order_number: cleanString(body.purchase_order_number),
        guarantee_period: cleanString(body.guarantee_period),
        rebate_terms: cleanString(body.rebate_terms),
        notes: cleanString(body.notes),
      })
      .select()
      .single()

    if (placementError) {
      return NextResponse.json({ error: placementError.message }, { status: 400 })
    }

    await createAftercareTasksManually({
      supabase,
      placementId: placement.id,
      startDate: placement.start_date,
    })

    return NextResponse.json({
      placement,
      alreadyExists: false,
    })
  } catch (error: any) {
    console.error('Placement POST error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not create placement.' },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    const action = cleanString(body.action)

    if (action === 'toggle_task') {
      const taskId = cleanString(body.task_id || body.taskId)

      if (!taskId) {
        return NextResponse.json(
          { error: 'Task ID is required.' },
          { status: 400 },
        )
      }

      const { data, error } = await supabase
        .from('placement_tasks')
        .update({
          completed: Boolean(body.completed),
          completed_at: body.completed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ task: data })
    }

    if (action === 'release_documents') {
      const placementId = cleanString(body.placement_id || body.placementId)
      const documentIds: string[] = Array.isArray(body.document_ids || body.documentIds)
  ? (body.document_ids || body.documentIds)
      .map((id: unknown) => String(id))
      .filter(Boolean)
  : []

      if (!placementId) {
        return NextResponse.json(
          { error: 'Placement ID is required.' },
          { status: 400 },
        )
      }

      if (documentIds.length === 0) {
        return NextResponse.json(
          { error: 'Select at least one document to release.' },
          { status: 400 },
        )
      }

      const releasedAt = new Date().toISOString()

      const { data: placement, error: placementError } = await supabase
        .from('placements')
        .select('id, candidate_id')
        .eq('id', placementId)
        .single()

      if (placementError || !placement) {
        return NextResponse.json(
          { error: placementError?.message || 'Placement not found.' },
          { status: 404 },
        )
      }

      const { data: docs, error: docsError } = await supabase
        .from('candidate_documents')
        .update({
          released: true,
          released_at: releasedAt,
          visible_to_employer: true,
          visibility: 'employer',
        })
        .eq('candidate_id', placement.candidate_id)
        .in('id', documentIds)
        .select()

      if (docsError) {
        return NextResponse.json({ error: docsError.message }, { status: 400 })
      }

      const releaseRows = documentIds.map(documentId => ({
        placement_id: placementId,
        candidate_document_id: documentId,
        released_at: releasedAt,
      }))

      const { error: releaseError } = await supabase
        .from('placement_document_releases')
        .upsert(releaseRows, {
          onConflict: 'placement_id,candidate_document_id',
        })

      if (releaseError) {
        return NextResponse.json({ error: releaseError.message }, { status: 400 })
      }

      const { data: updatedPlacement, error: updatePlacementError } = await supabase
        .from('placements')
        .update({
          final_documents_released: true,
          final_documents_released_at: releasedAt,
          updated_at: releasedAt,
        })
        .eq('id', placementId)
        .select()
        .single()

      if (updatePlacementError) {
        return NextResponse.json(
          { error: updatePlacementError.message },
          { status: 400 },
        )
      }

      return NextResponse.json({
        placement: updatedPlacement,
        documents: docs ?? [],
      })
    }

    if (action === 'confirm_placed') {
      const placementId = cleanString(body.id || body.placement_id || body.placementId)

      if (!placementId) {
        return NextResponse.json(
          { error: 'Placement ID is required.' },
          { status: 400 },
        )
      }

      const { data: placement, error: placementError } = await supabase
        .from('placements')
        .select('*')
        .eq('id', placementId)
        .single()

      if (placementError || !placement) {
        return NextResponse.json(
          { error: placementError?.message || 'Placement not found.' },
          { status: 404 },
        )
      }

      const missing: string[] = []

      if (!placement.start_date) missing.push('start date')
      if (!placement.salary) missing.push('salary')
      const calculatedFeeAmount = calculateFeeAmount(
  placement.salary,
  placement.fee_percentage,
  placement.fee_amount,
)

if (!calculatedFeeAmount) {
  missing.push('fee amount')
}
      if (!placement.candidate_accepted) missing.push('candidate accepted')
      if (!placement.employer_confirmed) missing.push('employer confirmed')

      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Before confirming placement, complete: ${missing.join(', ')}.` },
          { status: 400 },
        )
      }

      const placedAt = new Date().toISOString()

      const { data: updatedPlacement, error: updateError } = await supabase
        .from('placements')
        .update({
  status: 'placed',
  placed_at: placedAt,
  fee_amount: calculatedFeeAmount,
  updated_at: placedAt,
})
        .eq('id', placementId)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 })
      }

      await supabase
        .from('applications')
        .update({
          status: 'placed',
          placed_at: placedAt,
          updated_at: placedAt,
        })
        .eq('id', placement.application_id)

      await createAftercareTasksManually({
        supabase,
        placementId,
        startDate: placement.start_date,
      })

      return NextResponse.json({ placement: updatedPlacement })
    }

    const placementId = cleanString(body.id || body.placement_id || body.placementId)

    if (!placementId) {
      return NextResponse.json(
        { error: 'Placement ID is required.' },
        { status: 400 },
      )
    }

    const updates = {
      status: cleanString(body.status) ?? undefined,
      offer_date: cleanDate(body.offer_date),
      accepted_date: cleanDate(body.accepted_date),
      start_date: cleanDate(body.start_date),
      salary: cleanNumber(body.salary),
      salary_period: cleanString(body.salary_period) || undefined,
      fee_type: cleanString(body.fee_type) || undefined,
      fee_percentage: cleanNumber(body.fee_percentage),
fee_amount: calculateFeeAmount(
  body.salary,
  body.fee_percentage,
  body.fee_amount,
),
      candidate_accepted:
        typeof body.candidate_accepted === 'boolean'
          ? body.candidate_accepted
          : undefined,
      employer_confirmed:
        typeof body.employer_confirmed === 'boolean'
          ? body.employer_confirmed
          : undefined,
      invoice_status: cleanString(body.invoice_status) || undefined,
      invoice_number: cleanString(body.invoice_number),
      payment_terms: cleanString(body.payment_terms),
      purchase_order_number: cleanString(body.purchase_order_number),
      guarantee_period: cleanString(body.guarantee_period),
      rebate_terms: cleanString(body.rebate_terms),
      notes: cleanString(body.notes),
      updated_at: new Date().toISOString(),
    }

    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined),
    )

    const { data, error } = await supabase
      .from('placements')
      .update(cleanUpdates)
      .eq('id', placementId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await createAftercareTasksManually({
      supabase,
      placementId,
      startDate: data.start_date,
    })

    return NextResponse.json({ placement: data })
  } catch (error: any) {
    console.error('Placement PATCH error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not update placement.' },
      { status: 500 },
    )
  }
}