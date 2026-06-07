import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import PlacementDetail from '@/components/crm/placements/PlacementDetail'

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

export default async function PlacementDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = getServiceClient()

  const { data: placement, error } = await supabase
    .from('placements')
    .select(`
      *,
      applications (
        id,
        status,
        internal_notes,
        placed_at
      ),
      candidates (
        id,
        first_name,
        last_name,
        email,
        phone,
        job_title,
        postcode
      ),
      vacancies (
        id,
        title,
        location,
        region,
        salary_display,
        clients (
          id,
          company_name,
          email,
          contact_name
        )
      ),
      clients (
        id,
        company_name,
        email,
        contact_name
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (error || !placement) notFound()

  const candidateId = (placement as any).candidate_id

  const [
    { data: documents },
    { data: tasks },
    { data: releases },
  ] = await Promise.all([
    candidateId
      ? supabase
          .from('candidate_documents')
          .select('*')
          .eq('candidate_id', candidateId)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),

    supabase
      .from('placement_tasks')
      .select('*')
      .eq('placement_id', id)
      .order('due_date', { ascending: true }),

    supabase
      .from('placement_document_releases')
      .select('*')
      .eq('placement_id', id),
  ])

  return (
    <PlacementDetail
      placement={placement}
      documents={documents ?? []}
      tasks={tasks ?? []}
      releases={releases ?? []}
    />
  )
}