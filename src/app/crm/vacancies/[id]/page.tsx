import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import VacancyDetail from '@/components/crm/vacancies/VacancyDetail'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface Props { params: Promise<{ id: string }> }

export default async function CrmVacancyPage({ params }: Props) {
  const { id } = await params
  const supabase = getServiceClient()

  const [
    { data: vacancy },
    { data: applications },
    { data: candidates },
    { data: vacancyDocuments },
  ] = await Promise.all([
    supabase
  .from('vacancies')
  .select(`
    *,
    clients(
      id,
      company_name,
      contact_name,
      email,
      website,
      postcode,
      fee_agreed,
      agreed_terms,
      billing_terms,
      terms
    )
  `)
  .eq('id', id)
  .single(),

    supabase
      .from('applications')
      .select('*, candidates(id, first_name, last_name, email, phone, job_title, seeking_role_type, cv_url)')
      .eq('vacancy_id', id)
      .order('created_at', { ascending: false }),

    supabase
      .from('candidates')
      .select('id, first_name, last_name, email, job_title')
      .order('created_at', { ascending: false })
      .limit(50),

    supabase
      .from('vacancy_documents')
      .select('*')
      .eq('vacancy_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!vacancy) notFound()

  const [
  { data: portalUsers },
  { data: portalAccess },
] = await Promise.all([
  supabase
    .from('client_portal_users')
    .select('*')
    .eq('client_id', vacancy.client_id)
    .eq('active', true)
    .order('created_at', { ascending: false }),

  supabase
    .from('portal_vacancy_access')
    .select('*')
    .eq('vacancy_id', vacancy.id),
])

  return (
    <VacancyDetail
  vacancy={vacancy}
  applications={applications ?? []}
  allCandidates={candidates ?? []}
  vacancyDocuments={vacancyDocuments ?? []}
  portalUsers={portalUsers ?? []}
  portalAccess={portalAccess ?? []}
/>
  )
}