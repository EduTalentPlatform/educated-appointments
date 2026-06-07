import { createClient } from '@/lib/supabase/server'
import CandidatesList from '@/components/crm/candidates/CandidatesList'

export default async function CrmCandidatesPage() {
  const supabase = await createClient()
  const { data: candidates } = await supabase
    .from('candidates')
    .select('*, applications(id, status)')
    .order('created_at', { ascending: false })
  return <CandidatesList initialCandidates={candidates ?? []} />
}
