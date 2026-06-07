import 'server-only'

import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import PageEffects from '@/components/PageEffects'
import CandidatePage from '@/components/candidate/CandidatePage'
import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

export const metadata: Metadata = {
  title: 'Find Your Next FE & Skills Role — Educated Appointments',
  description:
    'Register with Educated Appointments and find your next role in Further Education, Skills and Apprenticeships. Assessors, IQAs, Skills Coaches, Sales and more. UK-wide.',
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export default async function Candidate() {
  const supabase = getServiceClient()

  const { data: standards } = await supabase
    .from('apprenticeship_standards')
    .select(`
      id,
      title,
      standard_name,
      reference,
      sector,
      route,
      level,
      status,
      programme_type,
      is_active
    `)
    .or('is_active.eq.true,status.eq.active')
    .order('title', { ascending: true })

  return (
    <>
      <PageEffects />
      <Nav />
      <CandidatePage standards={standards ?? []} />
      <Footer />
    </>
  )
}