import { createClient } from '@supabase/supabase-js'
import InsightsGeneratorClient from '@/components/crm/InsightsGeneratorClient'

export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  )
}

export default async function CrmInsightsPage() {
  const supabase = getServiceClient()

  const { data: insights } = await supabase
    .from('website_insights')
    .select('*')
    .order('updated_at', { ascending: false })

  return <InsightsGeneratorClient initialInsights={insights ?? []} />
}