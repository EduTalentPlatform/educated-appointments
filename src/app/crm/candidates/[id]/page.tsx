import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import CandidateDetail from '@/components/crm/candidates/CandidateDetail'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function CrmCandidatePage({ params }: Props) {
  const { id } = await params
  const supabase = getServiceClient()

  const [
    { data: candidate },
    { data: applications },
    { data: documents },
    { data: activities },
    { data: tasks },
    { data: vacancies },
    { data: standards },
    { data: placements },
  ] = await Promise.all([
    supabase
      .from('candidates')
      .select('*')
      .eq('id', id)
      .single(),

    supabase
  .from('applications')
  .select(`
    id,
    candidate_id,
    vacancy_id,
    status,
    created_at,
    updated_at,

    ea_interview_date,
    ea_interview_notes,
    ea_interview_verdict,

    client_interview_date,
    client_interview_time,
    client_interview_feedback,
    client_interview_outcome,

    vacancies (
      id,
      title,
      salary_display,
      location,
      region,
      status,
      clients (
        id,
        company_name
      )
    )
  `)
  .eq('candidate_id', id)
  .order('created_at', { ascending: false }),

    supabase
      .from('candidate_documents')
            .select(`
        id,
        candidate_id,
        name,
        doc_type,
        file_url,
        storage_bucket,
        storage_path,
        released,
        released_at,
        summary,
        details,
        visibility,
        visible_to_employer,
        show_in_employer_portal,
        created_at
      `)
      .eq('candidate_id', id)
      .order('created_at', { ascending: false }),

    supabase
      .from('candidate_activities')
      .select('*')
      .eq('candidate_id', id)
      .order('created_at', { ascending: false }),

    supabase
      .from('candidate_tasks')
      .select('*')
      .eq('candidate_id', id)
      .order('due_date', { ascending: true }),

    supabase
      .from('vacancies')
      .select(`
        id,
        title,
        status,
        location,
        region,
        salary_display,
        clients (
          id,
          company_name
        )
      `)
      .in('status', ['live', 'draft'])
      .order('created_at', { ascending: false }),

    supabase
      .from('apprenticeship_standards')
      .select(`
        id,
        title,
        standard_name,
        reference,
        sector,
        route,
        level,
        status,
        programme_type,
        is_active
      `),

    supabase
      .from('placements')
      .select(`
        *,
        vacancies (
          id,
          title,
          location,
          region,
          clients (
            id,
            company_name
          )
        ),
        clients (
          id,
          company_name
        ),
        placement_tasks (
          id,
          completed
        )
      `)
      .eq('candidate_id', id)
      .order('created_at', { ascending: false }),
  ])

  const candidateRecord = Array.isArray(candidate)
    ? candidate[0] ?? null
    : candidate

  if (!candidateRecord) notFound()

  const normalisedVacancies = (vacancies ?? []).map((vacancy: any) => ({
    ...vacancy,
    clients: Array.isArray(vacancy.clients)
      ? vacancy.clients[0] ?? null
      : vacancy.clients ?? null,
  }))

  const normalisedApplications = (applications ?? []).map((application: any) => ({
    ...application,
    vacancies: application.vacancies
      ? {
          ...application.vacancies,
          clients: Array.isArray(application.vacancies.clients)
            ? application.vacancies.clients[0] ?? null
            : application.vacancies.clients ?? null,
        }
      : null,
  }))

  return (
    <CandidateDetail
      candidate={candidateRecord}
      applications={normalisedApplications}
      documents={documents ?? []}
      activities={activities ?? []}
      tasks={tasks ?? []}
      vacancies={normalisedVacancies}
      standards={standards ?? []}
      placements={placements ?? []}
    />
  )
}