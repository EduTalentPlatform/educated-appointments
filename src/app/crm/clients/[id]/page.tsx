import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import ClientDetail from '@/components/crm/clients/ClientDetail'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = getServiceClient()

  const [
  { data: client },
  { data: vacancies },
  { data: contacts },
  { data: placements },
  { data: portalUsers },
  { data: sites },
  { data: activities },
] = await Promise.all([
    supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single(),

    supabase
      .from('vacancies')
      .select('*, applications(id, status)')
      .eq('client_id', id)
      .order('created_at', { ascending: false }),

    supabase
      .from('client_contacts')
      .select('*')
      .eq('client_id', id)
      .order('is_primary', { ascending: false }),

    supabase
      .from('placements')
      .select(`
        *,
        candidates (
          id,
          first_name,
          last_name,
          email,
          phone,
          job_title
        ),
        vacancies (
          id,
          title,
          location,
          region
        ),
        placement_tasks (
          id,
          completed
        )
      `)
      .eq('client_id', id)
      .order('created_at', { ascending: false }),

    supabase
      .from('client_portal_users')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false }),

    supabase
      .from('provider_sites')
      .select('*')
      .eq('client_id', id)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .order('site_name', { ascending: true }),

    supabase
  .from('client_activities')
  .select(
    `
    *,
    client_contacts (
      id,
      name,
      title,
      email,
      phone
    )
  `,
  )
  .eq('client_id', id)
  .order('created_at', { ascending: false }),
  ])

  if (!client) notFound()

  return (
    <ClientDetail
  client={client}
  vacancies={vacancies ?? []}
  contacts={contacts ?? []}
  placements={placements ?? []}
  portalUsers={portalUsers ?? []}
  initialSites={sites ?? []}
  initialActivities={activities ?? []}
/>
  )
}