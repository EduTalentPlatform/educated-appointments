import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST() {
  try {
    const supabase = getServiceClient()
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const followUpDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Get all active clients with their last vacancy update
    const { data: clients } = await supabase
      .from('clients')
      .select('id, company_name, updated_at, vacancies(updated_at)')
      .eq('status', 'active')

    if (!clients?.length) return NextResponse.json({ created: 0 })

    // Find inactive ones — no client or vacancy update in 90 days
    const inactive = clients.filter(c => {
      const latestVacancy = (c.vacancies as any[])
        ?.map((v: any) => v.updated_at)
        .sort()
        .reverse()[0] ?? null
      const lastActivity = latestVacancy && latestVacancy > c.updated_at
        ? latestVacancy
        : c.updated_at
      return lastActivity < ninetyDaysAgo
    })

    if (!inactive.length) return NextResponse.json({ created: 0 })

    // For each inactive client, check if an auto task already exists
    const { data: existingTasks } = await supabase
      .from('client_tasks')
      .select('client_id')
      .eq('auto_generated', true)
      .eq('completed', false)
      .in('client_id', inactive.map(c => c.id))

    const alreadyHasTask = new Set((existingTasks ?? []).map((t: any) => t.client_id))

    // Create tasks for clients that don't have one yet
    const toCreate = inactive
      .filter(c => !alreadyHasTask.has(c.id))
      .map(c => ({
        client_id: c.id,
        title: `Follow up — no contact with ${c.company_name} in over 90 days`,
        due_date: followUpDate,
        auto_generated: true,
        completed: false,
      }))

    if (toCreate.length) {
      await supabase.from('client_tasks').insert(toCreate)
    }

    return NextResponse.json({ created: toCreate.length, inactive: inactive.length })
  } catch (err) {
    console.error('Inactive client check error:', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}