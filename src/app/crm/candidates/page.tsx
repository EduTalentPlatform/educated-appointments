import { createClient } from '@/lib/supabase/server'
import CandidatesList from '@/components/crm/candidates/CandidatesList'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CrmCandidatesPage() {
  const supabase = await createClient()

  const [
    { data: candidates, count: totalCandidatesCount, error: candidatesError },
    { count: activelyLookingCandidatesCount, error: activeCountError },
  ] = await Promise.all([
    supabase
      .from('candidates')
      .select('*, applications(id, status)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(0, 999),

    supabase
      .from('candidates')
      .select('id', { count: 'exact', head: true })
      .or('actively_looking.eq.true,status.eq.active'),
  ])

  if (candidatesError) {
    console.error('Candidates page load error:', candidatesError)
  }

  if (activeCountError) {
    console.error('Active candidates count error:', activeCountError)
  }

  return (
    <CandidatesList
      initialCandidates={candidates ?? []}
      totalCandidatesCount={totalCandidatesCount ?? candidates?.length ?? 0}
      activelyLookingCandidatesCount={
        activelyLookingCandidatesCount ??
        (candidates ?? []).filter(candidate => candidate.actively_looking).length
      }
    />
  )
}