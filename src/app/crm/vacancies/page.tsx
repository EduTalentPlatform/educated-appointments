import { createClient } from '@/lib/supabase/server'
import VacanciesList from '@/components/crm/vacancies/VacanciesList'

export default async function CrmVacanciesPage() {
  const supabase = await createClient()
  const { data: vacancies } = await supabase
    .from('vacancies')
    .select('*, clients(company_name), applications(id, status)')
    .order('created_at', { ascending: false })
  return <VacanciesList initialVacancies={vacancies ?? []} />
}
