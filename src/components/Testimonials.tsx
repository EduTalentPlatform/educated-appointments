import 'server-only'

import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

type Testimonial = {
  id: string
  initials: string | null
  first_name: string
  role: string | null
  body: string
  tag: 'candidate' | 'employer'
  featured: boolean
  display_order: number
}

const fallbackTestimonials: Testimonial[] = [
  {
    id: 'fallback-1',
    initials: 'LN',
    first_name: 'Lyn',
    role: 'Placed Candidate',
    body: 'Joe is one of the best Recruiters I have worked with. Extremely professional, reliable and credible, communication was first class! More importantly Joe understands the Skills and Employment Sector and provided me with invaluable advice throughout the process.',
    tag: 'candidate',
    featured: true,
    display_order: 1,
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
  },
]

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function getInitials(testimonial: Testimonial) {
  if (testimonial.initials) return testimonial.initials

  return testimonial.first_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('')
}

export default async function Testimonials() {
  const supabase = getServiceClient()

  const { data } = await supabase
    .from('website_recommendations')
    .select(
      'id, initials, first_name, role, body, tag, featured, display_order',
    )
    .eq('show_on_website', true)
    .order('featured', { ascending: false })
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(4)

  const testimonials = data && data.length > 0 ? data : fallbackTestimonials

  const featured = testimonials.find(t => t.featured) ?? testimonials[0]
  const rest = testimonials.filter(t => t.id !== featured?.id).slice(0, 3)

  return (
    <section className="testimonials-section">
      <div className="section-inner">
        <p className="section-eyebrow reveal">What people say</p>

        <h2 className="section-title reveal reveal-delay-1">
          We don&apos;t blow our
          <br />
          own trumpet.
        </h2>

        <div className="testimonials-grid">
          {featured && (
            <div className="testimonial-card featured reveal">
              <div className="tc-quote-mark">&ldquo;</div>

              <div style={{ flex: 1 }}>
                <p className="tc-body">{featured.body}</p>

                <div className="tc-author" style={{ marginTop: '24px' }}>
                  <div className="tc-avatar">{getInitials(featured)}</div>

                  <div>
                    <p className="tc-name">{featured.first_name}</p>
                    <p className="tc-role">{featured.role}</p>
                  </div>

                  <span
                    className={`tc-tag ${featured.tag}`}
                    style={{ marginLeft: 'auto' }}
                  >
                    {featured.tag.charAt(0).toUpperCase() +
                      featured.tag.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {rest.map((t, i) => (
            <div
              key={t.id}
              className={`testimonial-card reveal reveal-delay-${i + 1}`}
            >
              <div className="tc-quote-mark">&ldquo;</div>

              <p className="tc-body">{t.body}</p>

              <div className="tc-author">
                <div className="tc-avatar">{getInitials(t)}</div>

                <div>
                  <p className="tc-name">{t.first_name}</p>
                  <p className="tc-role">{t.role}</p>
                </div>

                <span
                  className={`tc-tag ${t.tag}`}
                  style={{ marginLeft: 'auto' }}
                >
                  {t.tag.charAt(0).toUpperCase() + t.tag.slice(1)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{ textAlign: 'center', marginTop: '40px' }}
          className="reveal"
        >
          <Link
            href="/testimonials"
            className="btn-view-all"
            style={{ display: 'inline-block' }}
          >
            Read all testimonials →
          </Link>
        </div>
      </div>
    </section>
  )
}