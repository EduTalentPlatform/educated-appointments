import { createClient } from '@/lib/supabase/server'
import NewVacancyForm from '@/components/crm/vacancies/NewVacancyForm'

export const dynamic = 'force-dynamic'

export default async function NewVacancyPage() {
  const supabase = await createClient()

  const { data: clients } = await supabase
    .from('clients')
    .select('id, company_name, region, status')
    .order('company_name', { ascending: true })

  return <NewVacancyForm clients={clients ?? []} />
}