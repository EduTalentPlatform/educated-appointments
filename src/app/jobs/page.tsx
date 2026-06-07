import { createClient } from '@/lib/supabase/server'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import JobsClient from '@/components/jobs/JobsClient'
import PageEffects from '@/components/PageEffects'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Live Jobs — Educated Appointments',
  description:
    'Browse live vacancies in Further Education, Skills and Apprenticeships.',
}

export default async function JobsPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('vacancies')
    .select('*')
    .eq('status', 'live')
    .order('created_at', { ascending: false })

  const jobs = data ?? []

  return (
    <>
      <PageEffects />
      <Nav />

      <main className="ea-jobs-page">
        <section className="ea-jobs-hero">
          <div className="ea-jobs-hero-inner">
            <div className="ea-jobs-hero-grid">
              <div>
                <p className="section-eyebrow">Live vacancies</p>

                <h1>
                  Find your next role
                  <span>in FE &amp; Skills.</span>
                </h1>

                <p>
                  Browse live opportunities across Further Education, Skills,
                  Training and Apprenticeships. We work with candidates and
                  employers who care about proper fit, not just filling a seat.
                </p>

                <div className="ea-jobs-hero-actions">
                  <a href="#live-jobs" className="ea-jobs-primary-link">
                    View live roles →
                  </a>

                  <a href="/candidate" className="ea-jobs-secondary-link">
                    Register your CV
                  </a>
                </div>
              </div>

              <aside className="ea-jobs-hero-panel">
                <p>Recruitment focus</p>

                <div>
                  <span>Sector</span>
                  <strong>FE, Skills &amp; Apprenticeships</strong>
                </div>

                <div>
                  <span>Roles live</span>
                  <strong>{jobs.length}</strong>
                </div>

                <div>
                  <span>Coverage</span>
                  <strong>UK-wide</strong>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section id="live-jobs" className="ea-jobs-list-section">
          <JobsClient jobs={jobs} />
        </section>
      </main>

      <Footer />
    </>
  )
}