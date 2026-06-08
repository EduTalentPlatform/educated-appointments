import 'server-only'

import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Insight = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  category: string
  audience: string
  featured: boolean
  published_at: string | null
  created_at: string
}

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

function categoryLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase())
}

function audienceLabel(value: string) {
  if (value === 'both') return 'Employers & Candidates'

  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatDate(value: string | null) {
  if (!value) return null

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export default async function InsightsPage() {
  const supabase = getServiceClient()

  const { data } = await supabase
    .from('website_insights')
    .select(
      'id, title, slug, excerpt, category, audience, featured, published_at, created_at',
    )
    .eq('status', 'published')
    .order('featured', { ascending: false })
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false })

  const insights = (data ?? []) as Insight[]

  return (
    <>
      <Nav />

      <main style={{ background: '#f5f5f7', minHeight: '100vh' }}>
        <section
          style={{
            padding: '96px 32px 56px',
            background:
              'radial-gradient(circle at top left, rgba(88,86,214,0.16), transparent 34%), #ffffff',
          }}
        >
          <div style={{ maxWidth: 1120, margin: '0 auto' }}>
            <p className="section-eyebrow">Insights</p>

            <h1
              style={{
                margin: 0,
                marginTop: 10,
                maxWidth: 840,
                color: 'var(--text-dark)',
                fontSize: 'clamp(42px, 6vw, 76px)',
                lineHeight: 0.96,
                letterSpacing: -2.8,
                fontWeight: 950,
              }}
            >
              FE & Skills recruitment advice, updates and practical guidance.
            </h1>

            <p
              style={{
                margin: 0,
                marginTop: 22,
                maxWidth: 760,
                color: 'var(--text-muted)',
                fontSize: 18,
                lineHeight: 1.75,
                fontWeight: 600,
              }}
            >
              Useful guidance for training providers, colleges and candidates
              across Further Education, Skills and Apprenticeships.
            </p>
          </div>
        </section>

        <section style={{ padding: '56px 32px 96px' }}>
          <div
            style={{
              maxWidth: 1120,
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 20,
            }}
          >
            {insights.map(insight => {
              const publishedDate = formatDate(insight.published_at)

              return (
                <Link
                  key={insight.id}
                  href={`/insights/${insight.slug}`}
                  style={{ textDecoration: 'none' }}
                >
                  <article
                    style={{
                      height: '100%',
                      background: '#ffffff',
                      border: insight.featured
                        ? '1px solid rgba(88,86,214,0.34)'
                        : '1px solid var(--border)',
                      borderRadius: 24,
                      padding: 26,
                      boxShadow: insight.featured
                        ? '0 18px 54px rgba(88,86,214,0.16)'
                        : '0 14px 44px rgba(15,23,42,0.07)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        flexWrap: 'wrap',
                        marginBottom: 16,
                      }}
                    >
                      <span className="tc-tag employer">
                        {categoryLabel(insight.category)}
                      </span>

                      <span className="tc-tag candidate">
                        {audienceLabel(insight.audience)}
                      </span>

                      {insight.featured && (
                        <span className="tc-tag candidate">Featured</span>
                      )}
                    </div>

                    <h2
                      style={{
                        margin: 0,
                        color: 'var(--text-dark)',
                        fontSize: 23,
                        lineHeight: 1.15,
                        letterSpacing: -0.5,
                        fontWeight: 950,
                      }}
                    >
                      {insight.title}
                    </h2>

                    {insight.excerpt && (
                      <p
                        style={{
                          margin: 0,
                          marginTop: 14,
                          color: 'var(--text-muted)',
                          fontSize: 14,
                          lineHeight: 1.7,
                          fontWeight: 650,
                        }}
                      >
                        {insight.excerpt}
                      </p>
                    )}

                    <p
                      style={{
                        margin: 0,
                        marginTop: 20,
                        color: 'var(--primary)',
                        fontSize: 13,
                        fontWeight: 950,
                      }}
                    >
                      Read insight →
                    </p>

                    {publishedDate && (
                      <p
                        style={{
                          margin: 0,
                          marginTop: 12,
                          color: 'var(--text-muted)',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {publishedDate}
                      </p>
                    )}
                  </article>
                </Link>
              )
            })}

            {insights.length === 0 && (
              <div
                style={{
                  gridColumn: '1 / -1',
                  background: '#ffffff',
                  border: '1px solid var(--border)',
                  borderRadius: 24,
                  padding: 32,
                  boxShadow: '0 18px 50px rgba(15,23,42,0.08)',
                }}
              >
                <h2 style={{ margin: 0, color: 'var(--text-dark)' }}>
                  Insights coming soon
                </h2>
                <p
                  style={{
                    margin: 0,
                    marginTop: 10,
                    color: 'var(--text-muted)',
                    lineHeight: 1.7,
                  }}
                >
                  We are currently preparing practical FE & Skills recruitment
                  guidance for employers and candidates.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}