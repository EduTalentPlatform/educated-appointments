'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function MfaVerifyForm() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [factorId, setFactorId] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadFactor() {
      setLoading(true)
      setError(null)

      const { data: aalData } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

      if (aalData?.currentLevel === 'aal2') {
        router.push('/crm')
        router.refresh()
        return
      }

      const { data: factorsData, error: factorsError } =
        await supabase.auth.mfa.listFactors()

      if (factorsError) {
        setError(factorsError.message || 'Could not load MFA factors.')
        setLoading(false)
        return
      }

      const verifiedTotp = factorsData?.totp?.find(
        factor => factor.status === 'verified',
      )

      if (!verifiedTotp) {
        router.push('/crm/mfa/setup')
        return
      }

      setFactorId(verifiedTotp.id)
      setLoading(false)
    }

    loadFactor()
  }, [router, supabase.auth.mfa])

  async function handleVerify(event: FormEvent) {
    event.preventDefault()

    setVerifying(true)
    setError(null)

    const cleanCode = code.replace(/\s+/g, '')

    if (!factorId || cleanCode.length < 6) {
      setError('Please enter the 6-digit code from Google Authenticator.')
      setVerifying(false)
      return
    }

    const { error: verifyError } =
      await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: cleanCode,
      })

    if (verifyError) {
      setError(verifyError.message || 'Invalid authentication code.')
      setVerifying(false)
      return
    }

    await supabase.auth.refreshSession()

    window.location.href = '/crm'
  }

  return (
    <main className="crm-page">
      <section
        style={{
          maxWidth: 520,
          margin: '0 auto',
          background: 'var(--white)',
          border: '1px solid var(--border)',
          borderRadius: 22,
          padding: 28,
          boxShadow: '0 18px 55px rgba(15,23,42,0.08)',
        }}
      >
        <p className="section-eyebrow">CRM Security</p>

        <h1
          style={{
            margin: 0,
            color: 'var(--text-dark)',
            fontSize: 34,
            letterSpacing: -1,
          }}
        >
          Enter your 2FA code
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
          Open Google Authenticator and enter the current 6-digit code for
          Educated Appointments CRM.
        </p>

        {loading && (
          <p style={{ marginTop: 18, color: 'var(--text-muted)' }}>
            Checking MFA setup...
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

        {!loading && (
          <form onSubmit={handleVerify} style={{ display: 'grid', gap: 14, marginTop: 22 }}>
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
                6-digit code
              </label>

              <input
                value={code}
                onChange={event => setCode(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                required
                autoFocus
                style={{
                  width: '100%',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '13px 14px',
                  fontFamily: 'inherit',
                  fontSize: 18,
                  letterSpacing: 3,
                  fontWeight: 900,
                }}
              />
            </div>

            <button
              type="submit"
              disabled={verifying}
              style={{
                border: 0,
                borderRadius: 12,
                padding: '13px 16px',
                background: 'var(--primary)',
                color: 'var(--white)',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 900,
                cursor: verifying ? 'wait' : 'pointer',
                opacity: verifying ? 0.7 : 1,
              }}
            >
              {verifying ? 'Verifying...' : 'Verify and enter CRM'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}