import 'server-only'

import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type WebsiteRecommendation = {
  id: string
  initials: string | null
  first_name: string
  role: string | null
  body: string
  tag: 'candidate' | 'employer'
  featured: boolean
  display_order: number
  created_at: string
}

const fallbackTestimonials: WebsiteRecommendation[] = [
  {
    id: 'fallback-1',
    initials: 'DK',
    first_name: 'Dan',
    role: 'Training Provider',
    body: "The team at Educated Appointments possess an exceptional ability to understand our organisation's unique requirements, swiftly identifying top-tier talent that aligns with our company culture and values.",
    tag: 'employer',
    featured: true,
    display_order: 1,
    created_at: '',
  },
  {
    id: 'fallback-2',
    initials: 'ZS',
    first_name: 'Zoe',
    role: 'College Director',
    body: 'After scouring the sector nationally for a Senior MIS Officer for nearly six months with three other agencies, Joe found us the right candidate within weeks. Genuinely impressive sector knowledge.',
    tag: 'employer',
    featured: false,
    display_order: 2,
    created_at: '',
  },
  {
    id: 'fallback-3',
    initials: 'LN',
    first_name: 'Lyn',
    role: 'Placed Candidate',
    body: 'Joe is one of the best Recruiters I have worked with. Extremely professional, reliable and credible, communication was first class! More importantly Joe understands the Skills and Employment Sector and provided me with invaluable advice throughout the process.',
    tag: 'candidate',
    featured: true,
    display_order: 1,
    created_at: '',
  },
  {
    id: 'fallback-4',
    initials: 'DH',
    first_name: 'Diane',
    role: 'Skills Coach',
    body: 'Joe went above and beyond every step of the way. Regular check-in calls, interview confidence prep, and he made sure I was fully informed at every stage. Would recommend without hesitation.',
    tag: 'candidate',
    featured: false,
    display_order: 2,
    created_at: '',
  },
]

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function getInitials(testimonial: WebsiteRecommendation) {
  if (testimonial.initials) return testimonial.initials

  return testimonial.first_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('')
}

function TestimonialCard({
  testimonial,
}: {
  testimonial: WebsiteRecommendation
}) {
  return (
    <article
      style={{
        background: '#ffffff',
        border: testimonial.featured
          ? '1px solid rgba(88, 86, 214, 0.34)'
          : '1px solid var(--border)',
        borderRadius: 24,
        padding: 26,
        boxShadow: testimonial.featured
          ? '0 18px 54px rgba(88, 86, 214, 0.16)'
          : '0 14px 44px rgba(15, 23, 42, 0.07)',
      }}
    >
      {testimonial.featured && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            borderRadius: 999,
            padding: '6px 10px',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            fontSize: 11,
            fontWeight: 950,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            marginBottom: 14,
          }}
        >
          Featured
        </span>
      )}

      <p
        style={{
          margin: 0,
          color: 'var(--text-dark)',
          fontSize: 16,
          lineHeight: 1.75,
          fontWeight: 650,
        }}
      >
        “{testimonial.body}”
      </p>

      <div
        style={{
          marginTop: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: 'var(--primary-light)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--primary)',
            fontWeight: 950,
            fontSize: 13,
            flex: '0 0 auto',
          }}
        >
          {getInitials(testimonial)}
        </div>

        <div>
          <p
            style={{
              margin: 0,
              color: 'var(--text-dark)',
              fontSize: 14,
              fontWeight: 950,
            }}
          >
            {testimonial.first_name}
          </p>

          <p
            style={{
              margin: 0,
              marginTop: 2,
              color: 'var(--text-muted)',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {testimonial.role || 'Educated Appointments testimonial'}
          </p>
        </div>
      </div>
    </article>
  )
}

function TestimonialColumn({
  title,
  subtitle,
  testimonials,
  emptyText,
}: {
  title: string
  subtitle: string
  testimonials: WebsiteRecommendation[]
  emptyText: string
}) {
  return (
    <section
      style={{
        background: 'rgba(255,255,255,0.62)',
        border: '1px solid var(--border)',
        borderRadius: 30,
        padding: 24,
        boxShadow: '0 18px 50px rgba(15, 23, 42, 0.06)',
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <h2
          style={{
            margin: 0,
            color: 'var(--text-dark)',
            fontSize: 30,
            letterSpacing: -0.8,
            fontWeight: 950,
          }}
        >
          {title}
        </h2>

        <p
          style={{
            margin: 0,
            marginTop: 8,
            color: 'var(--text-muted)',
            fontSize: 14,
            lineHeight: 1.65,
            fontWeight: 650,
          }}
        >
          {subtitle}
        </p>
      </div>

      {testimonials.length > 0 ? (
        <div style={{ display: 'grid', gap: 18 }}>
          {testimonials.map(testimonial => (
            <TestimonialCard
              key={testimonial.id}
              testimonial={testimonial}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            background: '#ffffff',
            border: '1px dashed var(--border)',
            borderRadius: 20,
            padding: 22,
            color: 'var(--text-muted)',
            lineHeight: 1.7,
            fontWeight: 650,
          }}
        >
          {emptyText}
        </div>
      )}
    </section>
  )
}

export default async function TestimonialsPage() {
  const supabase = getServiceClient()

  const { data } = await supabase
    .from('website_recommendations')
    .select(
      'id, initials, first_name, role, body, tag, featured, display_order, created_at',
    )
    .eq('show_on_website', true)
    .order('featured', { ascending: false })
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })

  const testimonials =
    data && data.length > 0
      ? (data as WebsiteRecommendation[])
      : fallbackTestimonials

  const employerTestimonials = testimonials.filter(
    testimonial => testimonial.tag === 'employer',
  )

  const candidateTestimonials = testimonials.filter(
    testimonial => testimonial.tag === 'candidate',
  )

  return (
    <>
      <Nav />

      <main style={{ background: '#f5f5f7', minHeight: '100vh' }}>
      <section
        style={{
          padding: '96px 32px 56px',
          background:
            'radial-gradient(circle at top left, rgba(88, 86, 214, 0.16), transparent 34%), #ffffff',
        }}
      >
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <p className="section-eyebrow">Testimonials</p>

          <h1
            style={{
              margin: 0,
              marginTop: 10,
              maxWidth: 820,
              color: 'var(--text-dark)',
              fontSize: 'clamp(42px, 6vw, 76px)',
              lineHeight: 0.96,
              letterSpacing: -2.8,
              fontWeight: 950,
            }}
          >
            What employers and candidates say about working with us.
          </h1>

          <p
            style={{
              margin: 0,
              marginTop: 22,
              maxWidth: 720,
              color: 'var(--text-muted)',
              fontSize: 18,
              lineHeight: 1.75,
              fontWeight: 600,
            }}
          >
            Feedback from training providers, colleges and FE & Skills
            professionals who have worked with Educated Appointments.
          </p>

          <div
            style={{
              marginTop: 30,
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <Link href="/jobs" className="btn-hero-secondary">
              Browse live jobs →
            </Link>

            <Link href="/employer" className="btn-hero-primary">
              Hire through us →
            </Link>
          </div>
        </div>
      </section>

      <section style={{ padding: '56px 32px 96px' }}>
        <div
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24,
            alignItems: 'start',
          }}
        >
          <TestimonialColumn
            title="Employer testimonials"
            subtitle="Feedback from training providers, colleges and hiring organisations."
            testimonials={employerTestimonials}
            emptyText="Employer testimonials will appear here once they are marked to show on the website."
          />

          <TestimonialColumn
            title="Candidate testimonials"
            subtitle="Feedback from candidates and FE & Skills professionals we have supported."
            testimonials={candidateTestimonials}
            emptyText="Candidate testimonials will appear here once they are marked to show on the website."
          />
        </div>
      </section>
      </main>

      <Footer />
    </>
  )
}