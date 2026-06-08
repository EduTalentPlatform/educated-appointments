import { createClient } from '@supabase/supabase-js'
import ApplicationsList from '@/components/crm/applications/ApplicationsList'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export default async function ApplicationsPage() {
  const supabase = getServiceClient()

  const [
    { data: applications },
    { data: candidates },
    { data: vacancies },
  ] = await Promise.all([
    supabase
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
          main_role_type,
          sub_role_type
        ),
        vacancies (
          id,
          title,
          location,
          region,
          potential_fee_billed,
          clients (
            id,
            company_name
          )
        )
      `)
      .order('updated_at', { ascending: false }),

    supabase
      .from('candidates')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        job_title,
        main_role_type,
        sub_role_type
      `)
      .order('first_name', { ascending: true }),

    supabase
      .from('vacancies')
      .select(`
        id,
        title,
        status,
        location,
        region,
        potential_fee_billed,
        clients (
          id,
          company_name
        )
      `)
      .in('status', ['live', 'draft'])
      .order('created_at', { ascending: false }),
  ])

  return (
    <ApplicationsList
      initialApplications={applications ?? []}
      allCandidates={candidates ?? []}
      allVacancies={vacancies ?? []}
    />
  )
}