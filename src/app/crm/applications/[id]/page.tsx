import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import ApplicationDetail from '@/components/crm/applications/ApplicationDetail'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function CrmApplicationPage({ params }: Props) {
  const { id } = await params
  const supabase = getServiceClient()

  const { data: application, error: applicationError } = await supabase
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
        sub_role_type,
        seeking_role_type,
        looking_for_roles,
        formatted_cv,
        notes,
        qualifications,
        can_deliver,
        preferred_location,
        address_line_1,
        address_line_2,
        town_city,
        county,
        postcode,
        source,
        status,
        actively_looking,
        work_type_pref,
        current_salary,
        salary_expected,
        salary_notes,
        notice_period,
        dbs_status,
        right_to_work,
        cv_url,
        linkedin
      ),
      vacancies (
        id,
        title,
        sector,
        role_type,
        type,
        location,
        region,
        salary_display,
        description,
        employer_job_description,
        anonymous_description,
        briefing_notes,
        clients (
  id,
  company_name,
  contact_name,
  email,
  website
)
      )
    `)
    .eq('id', id)
    .single()

  if (applicationError) {
  console.error('Application detail load error:', applicationError)
  throw new Error(applicationError.message)
}
  
    if (!application) notFound()

  if (!application.viewed_at) {
    const viewedAt = new Date().toISOString()

    const { error: viewedError } = await supabase
      .from('applications')
      .update({ viewed_at: viewedAt })
      .eq('id', id)
      .is('viewed_at', null)

    if (viewedError) {
      console.error('Application viewed_at update error:', viewedError)
    } else {
      application.viewed_at = viewedAt
    }
  }

  const candidateId = (application.candidates as any)?.id
  const vacancyId = (application.vacancies as any)?.id
  const client = Array.isArray((application.vacancies as any)?.clients)
    ? (application.vacancies as any)?.clients?.[0]
    : (application.vacancies as any)?.clients
  const clientId = client?.id

  const [
  { data: documents },
  { data: vacancyDocuments },
  { data: activities },
  { data: latestAiReview },
  { data: applicationInterviews },
  { data: clientContacts },
  { data: standards },
] = await Promise.all([
    candidateId
      ? supabase
          .from('candidate_documents')
          .select('*')
          .eq('candidate_id', candidateId)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),

    vacancyId
      ? supabase
          .from('vacancy_documents')
          .select('*')
          .eq('vacancy_id', vacancyId)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),

    candidateId
      ? supabase
          .from('candidate_activities')
          .select('*')
          .eq('candidate_id', candidateId)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),

    supabase
      .from('application_ai_reviews')
      .select('*')
      .eq('application_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('application_interviews')
      .select('*')
      .eq('application_id', id)
      .order('created_at', { ascending: false }),

    clientId
  ? supabase
      .from('client_contacts')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
  : Promise.resolve({ data: [] }),

supabase
  .from('apprenticeship_standards')
  .select(`
    id,
    title,
    name,
    standard_name,
    reference,
    sector,
    route,
    level,
    status,
    programme_type,
    is_active
  `)
  .order('standard_name', { ascending: true })
])

  return (
  <ApplicationDetail
    application={application}
    documents={documents ?? []}
    vacancyDocuments={vacancyDocuments ?? []}
    activities={activities ?? []}
    aiReview={latestAiReview ?? null}
    applicationInterviews={applicationInterviews ?? []}
    clientContacts={clientContacts ?? []}
    standards={standards ?? []}
  />
)
}
