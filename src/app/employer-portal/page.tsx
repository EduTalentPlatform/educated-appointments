import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient as createServerClient } from '@/lib/supabase/server'
import EmployerPortalShell from '@/components/employer-portal/EmployerPortalShell'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function normaliseRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function formatDate(value?: string | null) {
  if (!value) return 'No date'

  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getFirstName(name?: string | null) {
  return name?.split(' ')?.[0] || 'there'
}

function statusLabel(value?: string | null) {
  if (!value) return 'Open'
  return value.replace(/_/g, ' ')
}

export default async function EmployerPortalDashboardPage() {
  const authSupabase = await createServerClient()
  const {
    data: { user },
  } = await authSupabase.auth.getUser()

  if (!user) {
    redirect('/employer-portal/login')
  }

  const supabase = getServiceClient()

  const { data: portalUser } = await supabase
    .from('client_portal_users')
    .select(
      `
      *,
      clients (
        id,
        company_name
      )
    `,
    )
    .eq('auth_user_id', user.id)
    .eq('active', true)
    .maybeSingle()

  if (!portalUser) {
    return (
      <main
        style={{
          minHeight: '100vh',
          background:
            'radial-gradient(circle at top left, rgba(53,45,235,0.10), transparent 34%), var(--light-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 540,
            background: 'var(--white)',
            borderRadius: 24,
            padding: 32,
            border: '1px solid var(--border)',
            boxShadow: '0 24px 70px rgba(15,23,42,0.12)',
          }}
        >
          <p className="section-eyebrow">Employer Portal</p>

          <h1
            style={{
              margin: 0,
              fontSize: 28,
              lineHeight: 1.1,
              letterSpacing: -0.8,
              color: 'var(--text-dark)',
              fontWeight: 900,
            }}
          >
            Portal access not active
          </h1>

          <p
            style={{
              color: 'var(--text-muted)',
              lineHeight: 1.7,
              marginTop: 10,
              marginBottom: 18,
              fontSize: 14,
            }}
          >
            Your login exists, but it is not currently linked to an active
            employer portal account. Please contact Educated Appointments.
          </p>

          <Link
            href="/employer-portal/login"
            style={{
              color: 'var(--primary)',
              fontWeight: 900,
              textDecoration: 'none',
            }}
          >
            Back to login →
          </Link>
        </div>
      </main>
    )
  }

  if (portalUser.must_change_password) {
    redirect('/employer-portal/set-password?temporary=1')
  }

  const client = normaliseRelation(portalUser.clients)

  const { data: accessRows } = await supabase
    .from('portal_vacancy_access')
    .select(
      `
      id,
      can_view_vacancy,
      can_view_submissions,
      can_view_documents,
      created_at,
      vacancies (
        id,
        client_id,
        title,
        status,
        sector,
        type,
        location,
        region,
        salary_display,
        created_at
      )
    `,
    )
    .eq('portal_user_id', portalUser.id)
    .eq('can_view_vacancy', true)
    .order('created_at', { ascending: false })

  const visibleVacancies = (accessRows ?? [])
    .map((row: any) => {
      const vacancy = normaliseRelation(row.vacancies)

      if (!vacancy) return null
      if (vacancy.client_id !== portalUser.client_id) return null

      return {
        access: row,
        vacancy,
      }
    })
    .filter(Boolean) as Array<{
    access: any
    vacancy: any
  }>

  return (
    <EmployerPortalShell
      name={portalUser.name}
      email={portalUser.email}
      clientName={client?.company_name || 'Employer'}
    >
      <section
        style={{
          background: 'var(--white)',
          border: '1px solid var(--border)',
          borderRadius: 26,
          padding: 30,
          marginBottom: 22,
          boxShadow: '0 18px 55px rgba(15,23,42,0.08)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 260,
            height: 260,
            borderRadius: '50%',
            background: 'var(--primary)',
            opacity: 0.06,
            right: -90,
            top: -120,
          }}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            gap: 22,
            alignItems: 'end',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div>
            <p className="section-eyebrow">Shared vacancies</p>

            <h1
              style={{
                margin: 0,
                marginTop: 6,
                fontSize: 'clamp(30px, 4vw, 46px)',
                color: 'var(--text-dark)',
                letterSpacing: -1.4,
                lineHeight: 1.05,
                fontWeight: 900,
              }}
            >
              Welcome, {getFirstName(portalUser.name)}
            </h1>

            <p
              style={{
                margin: 0,
                marginTop: 12,
                color: 'var(--text-muted)',
                fontSize: 15,
                lineHeight: 1.7,
                maxWidth: 660,
              }}
            >
              View vacancies, candidate submissions, formatted CVs and released
              recruitment documents shared by Educated Appointments.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(120px, 1fr))',
              gap: 10,
              minWidth: 270,
            }}
          >
            <div
              style={{
                background: 'var(--primary-light)',
                border: '1px solid rgba(53,45,235,0.16)',
                borderRadius: 18,
                padding: 16,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 28,
                  fontWeight: 900,
                  color: 'var(--primary)',
                  lineHeight: 1,
                }}
              >
                {visibleVacancies.length}
              </p>

              <p
                style={{
                  margin: 0,
                  marginTop: 6,
                  fontSize: 11,
                  fontWeight: 900,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.7,
                }}
              >
                Visible vacancies
              </p>
            </div>

            <div
              style={{
                background: 'var(--teal-light)',
                border: '1px solid rgba(93,219,219,0.28)',
                borderRadius: 18,
                padding: 16,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 28,
                  fontWeight: 900,
                  color: '#1a9090',
                  lineHeight: 1,
                }}
              >
                EA
              </p>

              <p
                style={{
                  margin: 0,
                  marginTop: 6,
                  fontSize: 11,
                  fontWeight: 900,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.7,
                }}
              >
                Secure access
              </p>
            </div>
          </div>
        </div>
      </section>

      {visibleVacancies.length === 0 && (
        <section
          style={{
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 24,
            padding: 30,
            boxShadow: '0 12px 36px rgba(15,23,42,0.06)',
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 18,
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              marginBottom: 16,
            }}
          >
            📂
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: 22,
              color: 'var(--text-dark)',
              letterSpacing: -0.5,
              fontWeight: 900,
            }}
          >
            No vacancies shared yet
          </h2>

          <p
            style={{
              marginBottom: 0,
              marginTop: 8,
              color: 'var(--text-muted)',
              lineHeight: 1.7,
              fontSize: 14,
            }}
          >
            Educated Appointments has not shared any vacancies with this portal
            login yet. Once a vacancy is shared, it will appear here.
          </p>
        </section>
      )}

      {visibleVacancies.length > 0 && (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 22,
                  lineHeight: 1.1,
                  fontWeight: 900,
                  color: 'var(--text-dark)',
                  letterSpacing: -0.6,
                }}
              >
                Your shared vacancies
              </h2>

              <p
                style={{
                  margin: 0,
                  marginTop: 5,
                  fontSize: 13,
                  color: 'var(--text-muted)',
                }}
              >
                Open a vacancy to view submitted candidates and request
                interviews.
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 16,
            }}
          >
            {visibleVacancies.map(({ access, vacancy }) => (
              <Link
                key={access.id}
                href={`/employer-portal/vacancies/${vacancy.id}`}
                style={{
                  background: 'var(--white)',
                  border: '1px solid var(--border)',
                  borderRadius: 22,
                  padding: 20,
                  textDecoration: 'none',
                  color: 'var(--text-dark)',
                  boxShadow: '0 14px 38px rgba(15,23,42,0.07)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  transition: 'all 0.18s',
                  minHeight: 235,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 10,
                    alignItems: 'flex-start',
                  }}
                >
                  <span
                    style={{
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      borderRadius: 999,
                      padding: '6px 10px',
                      fontSize: 11,
                      fontWeight: 900,
                      maxWidth: 200,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {vacancy.sector || 'Vacancy'}
                  </span>

                  <span
                    style={{
                      background: 'var(--light-bg)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border)',
                      borderRadius: 999,
                      padding: '5px 9px',
                      fontSize: 11,
                      fontWeight: 900,
                      textTransform: 'capitalize',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {statusLabel(vacancy.status)}
                  </span>
                </div>

                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 20,
                      lineHeight: 1.2,
                      color: 'var(--text-dark)',
                      letterSpacing: -0.5,
                      fontWeight: 900,
                    }}
                  >
                    {vacancy.title}
                  </h3>

                  <p
                    style={{
                      margin: 0,
                      marginTop: 10,
                      color: 'var(--text-muted)',
                      fontSize: 13,
                      lineHeight: 1.5,
                      fontWeight: 600,
                    }}
                  >
                    {[vacancy.location, vacancy.region]
                      .filter(Boolean)
                      .join(', ') || 'Location not specified'}
                  </p>

                  <p
                    style={{
                      margin: 0,
                      marginTop: 8,
                      color: 'var(--primary)',
                      fontSize: 14,
                      fontWeight: 900,
                    }}
                  >
                    {vacancy.salary_display || 'Salary not specified'}
                  </p>
                </div>

                <div
                  style={{
                    borderTop: '1px solid var(--border-light)',
                    paddingTop: 14,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: 'var(--text-muted)',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    Shared {formatDate(access.created_at)}
                  </p>

                  <span
                    style={{
                      color: 'var(--primary)',
                      fontSize: 13,
                      fontWeight: 900,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    Open vacancy →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </EmployerPortalShell>
  )
}