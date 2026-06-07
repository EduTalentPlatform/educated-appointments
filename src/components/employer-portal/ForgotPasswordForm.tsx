'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    setSending(true)
    setMessage(null)
    setError(null)

    const res = await fetch('/api/employer-portal/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setError(json?.error || 'Could not send password reset email.')
      setSending(false)
      return
    }

    setMessage(
      json?.message ||
        'If that email has employer portal access, a password reset link has been sent.',
    )
    setSending(false)
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
          maxWidth: 560,
          margin: '0 auto',
          padding: '70px 24px',
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
          <Link
            href="/employer-portal/login"
            style={{
              display: 'inline-flex',
              color: 'var(--primary)',
              fontSize: 13,
              fontWeight: 900,
              textDecoration: 'none',
              marginBottom: 22,
            }}
          >
            ← Back to employer login
          </Link>

          <p className="section-eyebrow">Employer Portal</p>

          <h1
            style={{
              margin: 0,
              color: 'var(--text-dark)',
              fontSize: 34,
              letterSpacing: -1,
              lineHeight: 1.1,
            }}
          >
            Reset your password
          </h1>

          <p
            style={{
              margin: 0,
              marginTop: 10,
              color: 'var(--text-muted)',
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            Enter your employer portal email address and we’ll send you a secure
            password reset link.
          </p>

          <form
            onSubmit={handleSubmit}
            style={{ display: 'grid', gap: 14, marginTop: 22 }}
          >
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
                Email address
              </label>

              <input
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                required
                autoComplete="email"
                style={{
                  width: '100%',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '12px 13px',
                  fontFamily: 'inherit',
                  fontSize: 14,
                }}
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              style={{
                border: 0,
                borderRadius: 12,
                padding: '13px 16px',
                background: 'var(--primary)',
                color: 'var(--white)',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 900,
                cursor: sending ? 'wait' : 'pointer',
                opacity: sending ? 0.7 : 1,
              }}
            >
              {sending ? 'Sending...' : 'Send password reset link'}
            </button>
          </form>

          {error && (
            <p
              style={{
                margin: 0,
                marginTop: 18,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                borderRadius: 12,
                padding: 12,
                fontSize: 13,
                fontWeight: 800,
                lineHeight: 1.5,
              }}
            >
              {error}
            </p>
          )}

          {message && (
            <p
              style={{
                margin: 0,
                marginTop: 18,
                background: 'var(--success-light)',
                border: '1px solid rgba(33,120,34,0.18)',
                color: 'var(--success)',
                borderRadius: 12,
                padding: 12,
                fontSize: 13,
                fontWeight: 800,
                lineHeight: 1.5,
              }}
            >
              {message}
            </p>
          )}
        </div>
      </section>
    </main>
  )
}