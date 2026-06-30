import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import VacancyDetail from '@/components/crm/vacancies/VacancyDetail'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function CrmVacancyPage({ params }: Props) {
  const { id } = await params
  const supabase = getServiceClient()

  const { data: vacancy, error: vacancyError } = await supabase
    .from('vacancies')
    .select('*')
    .eq('id', id)
    .single()

  if (vacancyError || !vacancy) {
    console.error('Vacancy load error:', vacancyError)
    notFound()
  }

  const [
    { data: client, error: clientError },
    { data: applications, error: applicationsError },
    { data: candidates, error: candidatesError },
    { data: vacancyDocuments, error: vacancyDocumentsError },
    { data: portalUsers, error: portalUsersError },
    { data: portalAccess, error: portalAccessError },
  ] = await Promise.all([
    vacancy.client_id
      ? supabase
          .from('clients')
          .select('*')
          .eq('id', vacancy.client_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),

    supabase
      .from('applications')
      .select(
        '*, candidates(id, first_name, last_name, email, phone, job_title, seeking_role_type, cv_url)',
      )
      .eq('vacancy_id', id)
      .order('created_at', { ascending: false }),

    supabase
      .from('candidates')
      .select(
        'id, first_name, last_name, email, phone, postcode, job_title, main_role_type, sub_role_type, seeking_role_type',
      )
      .order('created_at', { ascending: false })
      .limit(50),

    supabase
      .from('vacancy_documents')
      .select('*')
      .eq('vacancy_id', id)
      .order('created_at', { ascending: false }),

    vacancy.client_id
      ? supabase
          .from('client_portal_users')
          .select('*')
          .eq('client_id', vacancy.client_id)
          .eq('active', true)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),

    supabase
      .from('portal_vacancy_access')
      .select('*')
      .eq('vacancy_id', vacancy.id),
  ])

  if (clientError) console.error('Client load error:', clientError)
  if (applicationsError) console.error('Applications load error:', applicationsError)
  if (candidatesError) console.error('Candidates load error:', candidatesError)
  if (vacancyDocumentsError) {
    console.error('Vacancy documents load error:', vacancyDocumentsError)
  }
  if (portalUsersError) console.error('Portal users load error:', portalUsersError)
  if (portalAccessError) console.error('Portal access load error:', portalAccessError)

  const vacancyWithClient = {
    ...vacancy,
    clients: client,
  }

  return (
    <VacancyDetail
      vacancy={vacancyWithClient}
      applications={applications ?? []}
      allCandidates={candidates ?? []}
      vacancyDocuments={vacancyDocuments ?? []}
      portalUsers={portalUsers ?? []}
      portalAccess={portalAccess ?? []}
    />
  )
}