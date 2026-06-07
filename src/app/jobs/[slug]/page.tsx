import { notFound } from 'next/navigation'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import JobPageClient from '@/components/jobs/JobPageClient'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { Job } from '@/types'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: job } = await supabase
    .from('vacancies')
    .select('title, location, region, salary_display, sector, subject_area')
    .eq('slug', slug)
    .single()

  if (!job) return { title: 'Job Not Found — Educated Appointments' }

  return {
    title: `${job.title} — ${job.location} | Educated Appointments`,
    description: `${job.title} | ${job.location}, ${job.region} | ${job.salary_display}. Apply now with Educated Appointments, the FE & Skills recruitment specialists.`,
  }
}

export default async function JobPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  // Fetch the main job
  const { data: job } = await supabase
    .from('vacancies')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'live')
    .single()

  if (!job) notFound()

  // ── Similar roles — three tiers of matching ───────────────────────────────
  const usedIds = new Set([job.id])
  let similar: Job[] = []

  // Tier 1: Same sector AND same subject_area (most similar)
  if (similar.length < 3 && job.subject_area) {
    const { data: tier1 } = await supabase
      .from('vacancies')
      .select('*')
      .eq('status', 'live')
      .eq('sector', job.sector)
      .eq('subject_area', job.subject_area)
      .neq('id', job.id)
      .limit(3)

    for (const j of tier1 ?? []) {
      if (!usedIds.has(j.id) && similar.length < 3) {
        similar.push(j)
        usedIds.add(j.id)
      }
    }
  }

  // Tier 2: Same sector, any subject area
  if (similar.length < 3) {
    const { data: tier2 } = await supabase
      .from('vacancies')
      .select('*')
      .eq('status', 'live')
      .eq('sector', job.sector)
      .neq('id', job.id)
      .limit(6) // fetch more to account for already-used ids

    for (const j of tier2 ?? []) {
      if (!usedIds.has(j.id) && similar.length < 3) {
        similar.push(j)
        usedIds.add(j.id)
      }
    }
  }

  // Tier 3: Same subject_area, different sector
  if (similar.length < 3 && job.subject_area) {
    const { data: tier3 } = await supabase
      .from('vacancies')
      .select('*')
      .eq('status', 'live')
      .eq('subject_area', job.subject_area)
      .neq('id', job.id)
      .limit(6)

    for (const j of tier3 ?? []) {
      if (!usedIds.has(j.id) && similar.length < 3) {
        similar.push(j)
        usedIds.add(j.id)
      }
    }
  }

  // Tier 4: Any other live role (last resort)
  if (similar.length < 3) {
    const { data: tier4 } = await supabase
      .from('vacancies')
      .select('*')
      .eq('status', 'live')
      .neq('id', job.id)
      .limit(10)

    for (const j of tier4 ?? []) {
      if (!usedIds.has(j.id) && similar.length < 3) {
        similar.push(j)
        usedIds.add(j.id)
      }
    }
  }

  return (
    <>
      <Nav />
      <JobPageClient job={job} similarJobs={similar} />
      <Footer />
    </>
  )
}