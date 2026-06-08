import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type WebsiteTestimonial = {
  id: string
  quote: string
  person_name: string
  person_role: string | null
  organisation: string | null
  testimonial_type: string | null
  rating: number | null
  featured: boolean | null
}

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase environment variables are missing.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function getRoleLine(testimonial: WebsiteTestimonial) {
  const parts = [
    testimonial.person_role,
    testimonial.organisation,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' · ') : 'Educated Appointments testimonial'
}

export default async function TestimonialsPage() {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('website_testimonials')
    .select(
      'id, quote, person_name, person_role, organisation, testimonial_type, rating, featured',
    )
    .eq('is_published', true)
    .order('featured', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  const testimonials = !error && data ? data as WebsiteTestimonial[] : []
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
          {testimonials.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid var(--border)',
                borderRadius: 24,
                padding: 32,
                boxShadow: '0 18px 50px rgba(15, 23, 42, 0.08)',
              }}
            >
              <h2 style={{ margin: 0, color: 'var(--text-dark)' }}>
                Testimonials coming soon
              </h2>
              <p
                style={{
                  margin: 0,
                  marginTop: 10,
                  color: 'var(--text-muted)',
                  lineHeight: 1.7,
                }}
              >
                We are currently updating this page with recent employer and
                candidate feedback.
              </p>
            </div>
          ) : (
            <>
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
                    {featured.quote}
                  </p>

                  <div
                    style={{
                      marginTop: 28,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
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
                      {getInitials(featured.person_name)}
                    </div>

                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 15,
                          fontWeight: 950,
                        }}
                      >
                        {featured.person_name}
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
                        {getRoleLine(featured)}
                      </p>
                    </div>
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
                      “{testimonial.quote}”
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
                        {getInitials(testimonial.person_name)}
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
                          {testimonial.person_name}
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
                          {getRoleLine(testimonial)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  )
}