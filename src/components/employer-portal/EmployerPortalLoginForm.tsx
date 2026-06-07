'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  )
}

export default function EmployerPortalLoginForm() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    setLoading(true)
    setError(null)

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (loginError) {
      setError(loginError.message || 'Could not sign in.')
      setLoading(false)
      return
    }

    router.push('/employer-portal')
    router.refresh()
  }

  return (
    <main
      style={{
        paddingTop: 64,
        background:
          'radial-gradient(circle at top left, rgba(53,45,235,0.12), transparent 34%), radial-gradient(circle at bottom right, rgba(93,219,219,0.20), transparent 28%), var(--light-bg)',
        minHeight: 'calc(100vh - 64px)',
      }}
    >
      <section
        style={{
          background: 'var(--white)',
          borderBottom: '1px solid var(--border)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 480,
            height: 480,
            borderRadius: '50%',
            background: 'var(--primary)',
            opacity: 0.06,
            right: -160,
            top: -180,
          }}
        />

        <div
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            padding: '58px 32px 56px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              color: 'var(--primary)',
              fontSize: 13,
              fontWeight: 900,
              textDecoration: 'none',
              marginBottom: 22,
            }}
          >
            ← Back to Educated Appointments
          </Link>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '430px minmax(0, 1fr)',
              gap: 44,
              alignItems: 'center',
            }}
          >
            <div
              style={{
                background: 'var(--white)',
                border: '1px solid var(--border)',
                borderRadius: 24,
                padding: 30,
                boxShadow: '0 24px 70px rgba(15,23,42,0.12)',
              }}
            >
              <div style={{ marginBottom: 24 }}>
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 16,
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <LockIcon />
                </div>

                <p className="section-eyebrow" style={{ marginBottom: 8 }}>
                  Employer Portal
                </p>

                <h1
                  style={{
                    fontSize: 30,
                    lineHeight: 1.08,
                    margin: 0,
                    color: 'var(--text-dark)',
                    letterSpacing: -0.9,
                    fontWeight: 900,
                  }}
                >
                  Sign in to your secure portal
                </h1>

                <p
                  style={{
                    marginTop: 9,
                    marginBottom: 0,
                    color: 'var(--text-muted)',
                    fontSize: 14,
                    lineHeight: 1.6,
                  }}
                >
                  Use the login details provided by Educated Appointments.
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 900,
                        color: 'var(--text-dark)',
                        marginBottom: 6,
                      }}
                    >
                      Email
                    </label>

                    <input
                      type="email"
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                      required
                      placeholder="name@company.co.uk"
                      style={{
                        width: '100%',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: '12px 14px',
                        fontSize: 14,
                        outline: 'none',
                        fontFamily: 'inherit',
                        background: 'var(--white)',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 900,
                        color: 'var(--text-dark)',
                        marginBottom: 6,
                      }}
                    >
                      Password
                    </label>

                    <input
                      type="password"
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                      required
                      placeholder="Password"
                      style={{
                        width: '100%',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: '12px 14px',
                        fontSize: 14,
                        outline: 'none',
                        fontFamily: 'inherit',
                        background: 'var(--white)',
                      }}
                    />
                  </div>

                  <div style={{ textAlign: 'right', marginTop: -6 }}>
                    <Link
                      href="/employer-portal/forgot-password"
                      style={{
                        color: 'var(--primary)',
                        fontSize: 12,
                        fontWeight: 900,
                        textDecoration: 'none',
                      }}
                    >
                      Forgot password?
                    </Link>
                  </div>

                  {error && (
                    <p
                      style={{
                        margin: 0,
                        padding: 11,
                        borderRadius: 12,
                        background: '#fef2f2',
                        color: '#e53e3e',
                        fontSize: 12,
                        fontWeight: 800,
                        lineHeight: 1.5,
                      }}
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      border: 0,
                      borderRadius: 12,
                      padding: '14px 16px',
                      background: 'var(--primary)',
                      color: 'var(--white)',
                      fontSize: 14,
                      fontWeight: 900,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.7 : 1,
                      fontFamily: 'inherit',
                    }}
                  >
                    {loading ? 'Signing in...' : 'Sign in →'}
                  </button>

                  <p
                    style={{
                      margin: 0,
                      marginTop: 4,
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      lineHeight: 1.6,
                      textAlign: 'center',
                    }}
                  >
                    Need access? Contact your Educated Appointments consultant.
                  </p>
                </div>
              </form>
            </div>

            <div>
              <p className="section-eyebrow">Secure client access</p>

              <h2
                style={{
                  margin: 0,
                  fontSize: 'clamp(34px, 4.6vw, 56px)',
                  lineHeight: 1.03,
                  letterSpacing: -1.7,
                  color: 'var(--text-dark)',
                  fontWeight: 900,
                }}
              >
                Your candidates.
                <br />
                <span style={{ color: 'var(--primary)' }}>
                  One secure login.
                </span>
              </h2>

              <p
                style={{
                  margin: 0,
                  marginTop: 18,
                  maxWidth: 620,
                  fontSize: 16,
                  lineHeight: 1.8,
                  color: 'var(--text-muted)',
                }}
              >
                View candidate submissions shared by Educated Appointments,
                review employer-facing profiles, open formatted CVs and request
                interviews directly through the portal.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 12,
                  marginTop: 28,
                }}
              >
                {[
                  'Submitted candidate profiles',
                  'Formatted CV access',
                  'Interview request function',
                  'Controlled document release',
                ].map(item => (
                  <div
                    key={item}
                    style={{
                      display: 'flex',
                      gap: 9,
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: 'var(--light-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: 800,
                      color: 'var(--text-dark)',
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: 'var(--success-light)',
                        color: 'var(--success)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <CheckIcon />
                    </span>

                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '42px 32px 80px',
        }}
      >
        <div
          style={{
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 24,
            padding: 30,
            boxShadow: '0 16px 45px rgba(15,23,42,0.06)',
          }}
        >
          <p className="section-eyebrow">What does the portal do?</p>

          <h2
            style={{
              margin: 0,
              fontSize: 32,
              lineHeight: 1.1,
              letterSpacing: -1,
              fontWeight: 900,
              color: 'var(--text-dark)',
              marginBottom: 20,
            }}
          >
            Everything you need once candidates have been submitted.
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: 14,
            }}
          >
            {[
              {
                title: 'View candidate submissions',
                text:
                  'See candidates Educated Appointments has submitted against your vacancies in one secure place.',
              },
              {
                title: 'Read employer-facing profiles',
                text:
                  'Review the concise candidate summary created in our CRM, including role fit and key background.',
              },
              {
                title: 'Open formatted CVs',
                text:
                  'Access the Educated Appointments formatted CV as soon as a candidate is presented.',
              },
              {
                title: 'See documents held on file',
                text:
                  'View which supporting documents we currently hold, such as DBS, right to work, qualifications and references.',
              },
              {
                title: 'Controlled document release',
                text:
                  'Sensitive documents are not automatically downloadable. They are released at the appropriate stage.',
              },
              {
                title: 'Request interviews',
                text:
                  'Send interview requests with preferred format, location and availability straight to Educated Appointments.',
              },
            ].map(item => (
              <div
                key={item.title}
                style={{
                  padding: 18,
                  borderRadius: 18,
                  background: 'var(--light-bg)',
                  border: '1px solid var(--border-light)',
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 11,
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                    fontWeight: 900,
                  }}
                >
                  ✓
                </div>

                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 900,
                    color: 'var(--text-dark)',
                    marginBottom: 6,
                  }}
                >
                  {item.title}
                </p>

                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    lineHeight: 1.65,
                    color: 'var(--text-muted)',
                  }}
                >
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 22,
              padding: 16,
              borderRadius: 18,
              background: 'var(--primary-light)',
              border: '1px solid rgba(53,45,235,0.16)',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.7,
                color: 'var(--text-dark)',
                fontWeight: 700,
              }}
            >
              Formatted CVs are available once a candidate has been presented.
              Safer recruitment and compliance documents remain controlled and
              are only released when appropriate.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}