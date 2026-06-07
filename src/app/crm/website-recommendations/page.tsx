import { createClient } from '@supabase/supabase-js'
import WebsiteRecommendationsClient from '@/components/crm/WebsiteRecommendationsClient'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export default async function WebsiteRecommendationsPage() {
  const supabase = getServiceClient()

  const { data: recommendations } = await supabase
    .from('website_recommendations')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })

  return (
    <WebsiteRecommendationsClient
      initialRecommendations={recommendations ?? []}
    />
  )
}