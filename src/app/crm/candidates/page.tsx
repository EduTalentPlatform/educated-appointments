import { createClient } from '@/lib/supabase/server'
import CandidatesList from '@/components/crm/candidates/CandidatesList'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CrmCandidatesPage() {
  const supabase = await createClient()

  const [
    { data: candidates },
    { count: totalCandidatesCount },
    { count: activelyLookingCandidatesCount },
  ] = await Promise.all([
    supabase
      .from('candidates')
      .select('*, applications(id, status)')
      .order('created_at', { ascending: false })
      .range(0, 999),

    supabase
      .from('candidates')
      .select('id', { count: 'exact', head: true }),

    supabase
      .from('candidates')
      .select('id', { count: 'exact', head: true })
      .or('actively_looking.eq.true,status.eq.active'),
  ])

  return (
    <CandidatesList
      initialCandidates={candidates ?? []}
      totalCandidatesCount={totalCandidatesCount ?? 0}
      activelyLookingCandidatesCount={activelyLookingCandidatesCount ?? 0}
    />
  )
}