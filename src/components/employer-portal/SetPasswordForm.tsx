'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SetPasswordForm() {
  const router = useRouter()
  const supabase = createClient()

  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function prepareRecoverySession() {
      setChecking(true)
      setError(null)

      try {
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')

        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code)

          if (exchangeError) {
            setError(
              exchangeError.message ||
                'This password setup link is invalid or has expired.',
            )
            setReady(false)
            setChecking(false)
            return
          }

          window.history.replaceState(
            {},
            document.title,
            '/employer-portal/set-password',
          )
        }

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          setError(
            'This password setup link is invalid or has expired. Please request a new password link.',
          )
          setReady(false)
          setChecking(false)
          return
        }

        setReady(true)
      } catch {
        setError('Could not prepare the password setup page.')
        setReady(false)
      } finally {
        setChecking(false)
      }
    }

    prepareRecoverySession()
  }, [supabase.auth])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    setSaving(true)
    setMessage(null)
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      setSaving(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setSaving(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    })

    if (updateError) {
      setError(updateError.message || 'Could not update password.')
      setSaving(false)
      return
    }

    const flagResponse = await fetch('/api/employer-portal/password-changed', {
      method: 'POST',
    })

    const flagResult = await flagResponse.json().catch(() => null)

    if (!flagResponse.ok) {
      setError(
        flagResult?.error ||
          'Your password was updated, but we could not update your portal status. Please contact Educated Appointments.',
      )
      setSaving(false)
      return
    }

    setMessage('Password set successfully. Redirecting to the employer portal...')

    setTimeout(() => {
      router.push('/employer-portal')
      router.refresh()
    }, 900)
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
            Change your temporary password
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
            For security, please choose your own password before accessing the
            Educated Appointments employer portal.
          </p>

          {checking && (
            <p
              style={{
                margin: 0,
                marginTop: 18,
                color: 'var(--text-muted)',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              Checking password link...
            </p>
          )}

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

          {ready && (
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
                  New password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  minLength={8}
                  required
                  autoComplete="new-password"
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
                  Confirm password
                </label>

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={event => setConfirmPassword(event.target.value)}
                  minLength={8}
                  required
                  autoComplete="new-password"
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
                disabled={saving}
                style={{
                  border: 0,
                  borderRadius: 12,
                  padding: '13px 16px',
                  background: 'var(--primary)',
                  color: 'var(--white)',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: saving ? 'wait' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Saving password...' : 'Set password'}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}