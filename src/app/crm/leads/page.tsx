import { createClient } from '@/lib/supabase/server'
import LeadsList from '@/components/crm/leads/LeadsList'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function LeadsPage() {
  const supabase = await createClient()

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .order('updated_at', { ascending: false })

  return <LeadsList initialLeads={leads ?? []} />
}