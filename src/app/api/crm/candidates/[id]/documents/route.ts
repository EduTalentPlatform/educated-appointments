import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = getServiceClient()
  const { data: documents } = await supabase
    .from('candidate_documents')
    .select('*')
    .eq('candidate_id', id)
    .order('created_at', { ascending: false })
  return NextResponse.json({ documents: documents ?? [] })
}