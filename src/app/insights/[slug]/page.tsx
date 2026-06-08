import 'server-only'

import Link from 'next/link'
import { notFound } from 'next/navigation'
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
  body: string
  category: string
  audience: string
  seo_title: string | null
  seo_description: string | null
  published_at: string | null
  author_name: string | null
}

type Props = {
  params: Promise<{ slug: string }>
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
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

async function getInsight(slug: string) {
  const supabase = getServiceClient()

  const { data } = await supabase
    .from('website_insights')
    .select(
      'id, title, slug, excerpt, body, category, audience, seo_title, seo_description, published_at, author_name',
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  return data as Insight | null
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const insight = await getInsight(slug)

  if (!insight) {
    return {
      title: 'Insight not found | Educated Appointments',
    }
  }

  return {
    title: insight.seo_title || `${insight.title} | Educated Appointments`,
    description: insight.seo_description || insight.excerpt || undefined,
  }
}

function renderBody(body: string) {
  return body
    .split(/\n{2,}/)
    .map(part => part.trim())
    .filter(Boolean)
    .map((part, index) => (
      <p
        key={index}
        style={{
          margin: 0,
          marginTop: index === 0 ? 0 : 20,
          color: 'var(--text-dark)',
          fontSize: 18,
          lineHeight: 1.85,
          fontWeight: 550,
        }}
      >
        {part}
      </p>
    ))
}

export default async function InsightArticlePage({ params }: Props) {
  const { slug } = await params
  const insight = await getInsight(slug)

  if (!insight) {
    notFound()
  }

  const publishedDate = formatDate(insight.published_at)

  return (
    <>
      <Nav />

      <main style={{ background: '#f5f5f7', minHeight: '100vh' }}>
        <section
          style={{
            padding: '96px 32px 48px',
            background:
              'radial-gradient(circle at top left, rgba(88,86,214,0.16), transparent 34%), #ffffff',
          }}
        >
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <Link
              href="/insights"
              style={{
                color: 'var(--primary)',
                fontSize: 13,
                fontWeight: 950,
                textDecoration: 'none',
              }}
            >
              ← Back to insights
            </Link>

            <div
              style={{
                marginTop: 28,
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <span className="tc-tag employer">
                {categoryLabel(insight.category)}
              </span>

              <span className="tc-tag candidate">
                {audienceLabel(insight.audience)}
              </span>
            </div>

            <h1
              style={{
                margin: 0,
                marginTop: 18,
                color: 'var(--text-dark)',
                fontSize: 'clamp(38px, 5vw, 68px)',
                lineHeight: 0.98,
                letterSpacing: -2.4,
                fontWeight: 950,
              }}
            >
              {insight.title}
            </h1>

            {insight.excerpt && (
              <p
                style={{
                  margin: 0,
                  marginTop: 22,
                  color: 'var(--text-muted)',
                  fontSize: 19,
                  lineHeight: 1.75,
                  fontWeight: 650,
                }}
              >
                {insight.excerpt}
              </p>
            )}

            <p
              style={{
                margin: 0,
                marginTop: 24,
                color: 'var(--text-muted)',
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              {insight.author_name || 'Joseph Sutton'}
              {publishedDate ? ` · ${publishedDate}` : ''}
            </p>
          </div>
        </section>

        <section style={{ padding: '48px 32px 96px' }}>
          <article
            style={{
              maxWidth: 900,
              margin: '0 auto',
              background: '#ffffff',
              border: '1px solid var(--border)',
              borderRadius: 28,
              padding: 'clamp(26px, 5vw, 48px)',
              boxShadow: '0 18px 54px rgba(15,23,42,0.08)',
            }}
          >
            {renderBody(insight.body)}

            <div
              style={{
                marginTop: 42,
                paddingTop: 28,
                borderTop: '1px solid var(--border)',
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <Link href="/contact" className="btn-hero-primary">
                Speak to us →
              </Link>

              <Link href="/jobs" className="btn-hero-secondary">
                Browse live jobs →
              </Link>
            </div>
          </article>
        </section>
      </main>

      <Footer />
    </>
  )
}