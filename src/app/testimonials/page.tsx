import 'server-only'

import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

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
    id: 'fallback-2',
    initials: 'DK',
    first_name: 'Dan',
    role: 'Training Provider',
    body: "The team at Educated Appointments possess an exceptional ability to understand our organisation's unique requirements, swiftly identifying top-tier talent that aligns with our company culture and values.",
    tag: 'employer',
    featured: false,
    display_order: 2,
    created_at: '',
  },
  {
    id: 'fallback-3',
    initials: 'ZS',
    first_name: 'Zoe',
    role: 'College Director',
    body: 'After scouring the sector nationally for a Senior MIS Officer for nearly six months with three other agencies, Joe found us the right candidate within weeks. Genuinely impressive sector knowledge.',
    tag: 'employer',
    featured: false,
    display_order: 3,
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
    display_order: 4,
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

function getTagLabel(tag: WebsiteRecommendation['tag']) {
  return tag.charAt(0).toUpperCase() + tag.slice(1)
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

  const featured = testimonials.find(item => item.featured) ?? testimonials[0]
  const rest = testimonials.filter(item => item.id !== featured?.id)

  return (
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
              maxWidth: 780,
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
            Real feedback from training providers, colleges and FE & Skills
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
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          {featured && (
            <article
              style={{
                background: 'linear-gradient(135deg, var(--primary), #2f2ce8)',
                color: '#ffffff',
                borderRadius: 30,
                padding: 36,
                boxShadow: '0 24px 70px rgba(47, 44, 232, 0.28)',
                marginBottom: 24,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 64,
                  lineHeight: 0.8,
                  opacity: 0.28,
                  fontWeight: 950,
                }}
              >
                “
              </p>

              <p
                style={{
                  margin: 0,
                  marginTop: 4,
                  fontSize: 24,
                  lineHeight: 1.55,
                  fontWeight: 750,
                  maxWidth: 920,
                }}
              >
                {featured.body}
              </p>

              <div
                style={{
                  marginTop: 28,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.18)',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#ffffff',
                    fontWeight: 950,
                  }}
                >
                  {getInitials(featured)}
                </div>

                <div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 950 }}>
                    {featured.first_name}
                  </p>

                  <p
                    style={{
                      margin: 0,
                      marginTop: 3,
                      color: 'rgba(255,255,255,0.72)',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {featured.role || 'Educated Appointments testimonial'}
                  </p>
                </div>

                <span
                  className={`tc-tag ${featured.tag}`}
                  style={{
                    marginLeft: 'auto',
                    background: 'rgba(255,255,255,0.15)',
                    color: 'rgba(255,255,255,0.88)',
                  }}
                >
                  {getTagLabel(featured.tag)}
                </span>
              </div>
            </article>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 20,
            }}
          >
            {rest.map(testimonial => (
              <article
                key={testimonial.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--border)',
                  borderRadius: 24,
                  padding: 26,
                  boxShadow: '0 14px 44px rgba(15, 23, 42, 0.07)',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: 'var(--text-dark)',
                    fontSize: 16,
                    lineHeight: 1.7,
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
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      background: 'var(--primary-light)',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--primary)',
                      fontWeight: 950,
                      fontSize: 13,
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

                  <span
                    className={`tc-tag ${testimonial.tag}`}
                    style={{ marginLeft: 'auto' }}
                  >
                    {getTagLabel(testimonial.tag)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}