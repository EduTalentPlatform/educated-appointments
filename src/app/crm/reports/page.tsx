import { createClient } from '@supabase/supabase-js'
import ReportsDashboard from '@/components/crm/reports/ReportsDashboard'

export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export default async function ReportsPage() {
  const supabase = getServiceClient()

  const [
    { data: applications },
    { data: placements },
    { data: candidateActivities },
    { data: candidates },
    { data: vacancies },
    { data: clients },
  ] = await Promise.all([
    supabase
      .from('applications')
      .select(`
        id,
status,
created_at,
updated_at,
placed_at,
internal_notes,
ea_interview_date,
ea_interview_notes,
ea_interview_verdict,
client_interview_date,
client_interview_time,
client_interview_feedback,
client_interview_outcome,
        candidates (
          id,
          first_name,
          last_name,
          email,
          job_title
        ),
        vacancies (
          id,
          title,
          location,
          region,
          clients (
            id,
            company_name
          )
        )
      `)
      .order('created_at', { ascending: false }),

    supabase
      .from('placements')
      .select(`
        id,
        placement_ref,
        status,
        start_date,
        salary,
        fee_percentage,
        fee_amount,
        invoice_status,
        final_documents_released,
        created_at,
        placed_at,
        candidates (
          id,
          first_name,
          last_name,
          email,
          job_title
        ),
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
        )
      `)
      .order('created_at', { ascending: false }),

    supabase
      .from('candidate_activities')
      .select(`
        id,
        candidate_id,
        activity_type,
        content,
        created_at,
        candidates (
          id,
          first_name,
          last_name,
          email,
          job_title
        )
      `)
      .order('created_at', { ascending: false }),

    supabase
      .from('candidates')
      .select(`
        id,
        first_name,
        last_name,
        email,
        job_title,
        created_at,
        actively_looking,
        status,
        source
      `)
      .order('created_at', { ascending: false }),

    supabase
      .from('vacancies')
      .select(`
        id,
        title,
        status,
        created_at,
        location,
        region,
        salary_display,
        clients (
          id,
          company_name
        )
      `)
      .order('created_at', { ascending: false }),

    supabase
      .from('clients')
      .select(`
        id,
        company_name,
        status,
        created_at,
        sector,
        region
      `)
      .order('company_name', { ascending: true }),
  ])

  return (
    <ReportsDashboard
      applications={applications ?? []}
      placements={placements ?? []}
      candidateActivities={candidateActivities ?? []}
      candidates={candidates ?? []}
      vacancies={vacancies ?? []}
      clients={clients ?? []}
    />
  )
}