import type { ReactNode } from 'react'
import Link from 'next/link'
import EmployerPortalLogoutButton from './EmployerPortalLogoutButton'

export default function EmployerPortalShell({
  name,
  email,
  clientName,
  children,
}: {
  name: string
  email: string
  clientName: string
  children: ReactNode
}) {
  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, rgba(53,45,235,0.10), transparent 34%), radial-gradient(circle at bottom right, rgba(93,219,219,0.18), transparent 30%), var(--light-bg)',
      }}
    >
      <header
        style={{
          background: 'rgba(255,255,255,0.92)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '14px 28px',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 18,
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Link
              href="/employer-portal"
              style={{
                width: 46,
                height: 46,
                borderRadius: 15,
                background: 'var(--primary)',
                color: 'var(--white)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                fontWeight: 900,
                letterSpacing: -0.6,
                boxShadow: '0 12px 28px rgba(53,45,235,0.22)',
              }}
            >
              EA
            </Link>

            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 900,
                  color: 'var(--text-dark)',
                  letterSpacing: -0.3,
                }}
              >
                Employer Portal
              </p>

              <p
                style={{
                  margin: 0,
                  marginTop: 2,
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  fontWeight: 700,
                }}
              >
                {clientName}
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <Link
              href="/"
              style={{
                fontSize: 12,
                fontWeight: 900,
                color: 'var(--text-muted)',
                textDecoration: 'none',
                padding: '9px 12px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--white)',
                whiteSpace: 'nowrap',
              }}
            >
              Main website
            </Link>

            <div
              style={{
                width: 1,
                height: 28,
                background: 'var(--border)',
              }}
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                textAlign: 'right',
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 900,
                    color: 'var(--text-dark)',
                  }}
                >
                  {name}
                </p>

                <p
                  style={{
                    margin: 0,
                    marginTop: 2,
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                  }}
                >
                  {email}
                </p>
              </div>

              <EmployerPortalLogoutButton />
            </div>
          </div>
        </div>
      </header>

      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '32px 28px 72px',
        }}
      >
        {children}
      </div>
    </main>
  )
}