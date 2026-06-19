import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import LeadDetail from '@/components/crm/leads/LeadDetail'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Props {
  params: Promise<{ id: string }>
}

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: lead },
    { data: contacts },
    { data: activities },
    { data: tasks },
    { data: sites },
  ] = await Promise.all([
    supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single(),

    supabase
      .from('lead_contacts')
      .select('*')
      .eq('lead_id', id)
      .order('is_primary', { ascending: false }),

    supabase
      .from('lead_activities')
      .select(`
        *,
        lead_contacts (
          id,
          name,
          title,
          email,
          phone
        )
      `)
      .eq('lead_id', id)
      .order('created_at', { ascending: false }),

    supabase
      .from('lead_tasks')
      .select('*')
      .eq('lead_id', id)
      .order('due_date', { ascending: true }),

    supabase
      .from('provider_sites')
      .select('*')
      .eq('lead_id', id)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .order('site_name', { ascending: true }),
  ])

  if (!lead) notFound()

  return (
    <LeadDetail
      lead={lead}
      initialContacts={contacts ?? []}
      initialActivities={activities ?? []}
      initialTasks={tasks ?? []}
      initialSites={sites ?? []}
    />
  )
}