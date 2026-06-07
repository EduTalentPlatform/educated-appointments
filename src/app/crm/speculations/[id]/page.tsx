import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import SpeculationDetail from '@/components/crm/speculations/SpeculationDetail'

export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function SpeculationDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = getServiceClient()

  const { data: speculation } = await supabase
    .from('candidate_speculations')
    .select(`
      *,
      candidates (
        id,
        first_name,
        last_name,
        email,
        phone,
        job_title,
        postcode,
        preferred_location,
        town_city,
        county,
        formatted_cv,
        notes,
        qualifications,
        can_deliver,
        seeking_role_type,
        main_role_type,
        sub_role_type,
        looking_for_roles
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (!speculation) notFound()

  const [
    { data: notes },
    { data: tasks },
    { data: targets },
    { data: opportunities },
    { data: outreach },
    { data: documents },
    { data: activities },
    { data: standards },
    { data: leads },
    { data: clients },
    { data: providerSites },
  ] = await Promise.all([
    supabase
      .from('speculation_notes')
      .select('*')
      .eq('speculation_id', id)
      .order('created_at', { ascending: false }),

    supabase
      .from('speculation_tasks')
      .select('*')
      .eq('speculation_id', id)
      .order('due_date', { ascending: true }),

    supabase
      .from('speculation_target_employers')
      .select('*')
      .eq('speculation_id', id)
      .order('created_at', { ascending: false }),

    supabase
      .from('candidate_speculation_opportunities')
      .select('*')
      .eq('speculation_id', id)
      .order('created_at', { ascending: false }),

    supabase
      .from('speculation_outreach')
      .select('*')
      .eq('speculation_id', id)
      .order('created_at', { ascending: false }),

    supabase
      .from('candidate_documents')
      .select('*')
      .eq('candidate_id', speculation.candidate_id)
      .order('created_at', { ascending: false }),

    supabase
      .from('candidate_activities')
      .select('*')
      .eq('candidate_id', speculation.candidate_id)
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
        is_active
      `)
      .eq('is_active', true)
      .order('standard_name', { ascending: true }),

    supabase
      .from('leads')
      .select(`
        id,
        company_name,
        contact_name,
        contact_title,
        email,
        phone,
        website,
        linkedin_company,
        sector,
        region,
        status,
        main_office_address_line_1,
        main_office_address_line_2,
        main_office_town_city,
        main_office_county,
        main_office_postcode,
        main_office_lat,
        main_office_lng
      `)
      .order('company_name', { ascending: true }),

    supabase
      .from('clients')
      .select(`
        id,
        company_name,
        contact_name,
        contact_title,
        email,
        phone,
        website,
        linkedin_company,
        sector,
        region,
        status,
        main_office_address_line_1,
        main_office_address_line_2,
        main_office_town_city,
        main_office_county,
        main_office_postcode,
        main_office_lat,
        main_office_lng
      `)
      .order('company_name', { ascending: true }),

    supabase
      .from('provider_sites')
      .select('*')
      .eq('is_active', true)
      .order('site_name', { ascending: true }),
  ])

  return (
    <SpeculationDetail
      speculation={speculation}
      notes={notes ?? []}
      tasks={tasks ?? []}
      targets={targets ?? []}
      opportunities={opportunities ?? []}
      outreach={outreach ?? []}
      documents={documents ?? []}
      activities={activities ?? []}
      standards={standards ?? []}
      leads={leads ?? []}
      clients={clients ?? []}
      providerSites={providerSites ?? []}
    />
  )
}