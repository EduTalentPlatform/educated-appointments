import { createClient } from '@/lib/supabase/server'
import ClientsList from '@/components/crm/clients/ClientsList'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('*, vacancies(id, status)')
    .order('created_at', { ascending: false })
  return <ClientsList initialClients={clients ?? []} />
}
