'use client'

import { useState } from 'react'

type Props = {
  token: string
  email: string
  alreadyUnsubscribed: boolean
}

export default function UnsubscribeClient({
  token,
  email,
  alreadyUnsubscribed,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(alreadyUnsubscribed)
  const [error, setError] = useState<string | null>(null)

  async function confirmUnsubscribe() {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/marketing/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setError(json?.error || 'Could not unsubscribe this email address.')
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div>
        <h1 style={{ margin: '0 0 12px', fontSize: 34 }}>
          You’re unsubscribed
        </h1>

        <p style={{ fontSize: 17, lineHeight: 1.6, color: '#4b5563' }}>
          <strong>{email}</strong> has been removed from Educated Appointments
          marketing emails.
        </p>

        <p style={{ fontSize: 17, lineHeight: 1.6, color: '#4b5563' }}>
          You may still receive direct one-to-one emails where there is an
          active conversation, vacancy, application, placement or service-related
          reason. But the candidate availability marketing emails will stop.
        </p>

        <p style={{ fontSize: 15, lineHeight: 1.6, color: '#6b7280' }}>
          No hard feelings. We’ll put the tiny violin back in its case.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1 style={{ margin: '0 0 12px', fontSize: 34 }}>
        Unsubscribe from marketing emails?
      </h1>

      <p style={{ fontSize: 17, lineHeight: 1.6, color: '#4b5563' }}>
        You’re about to unsubscribe <strong>{email}</strong> from Educated
        Appointments marketing emails.
      </p>

      <div
        style={{
          margin: '24px 0',
          padding: 18,
          borderRadius: 18,
          background: '#f8fafc',
          border: '1px solid #e5e7eb',
        }}
      >
        <p style={{ marginTop: 0, fontWeight: 700 }}>
          Before you go…
        </p>

        <p style={{ lineHeight: 1.6, color: '#4b5563' }}>
          These emails are designed to give you early visibility of candidates
          who may be a strong fit for your organisation. That could be an
          experienced Tutor, Assessor, Skills Coach, Manager or Business
          Development professional who is actively looking and ready to talk.
        </p>

        <p style={{ lineHeight: 1.6, color: '#4b5563' }}>
          In other words, the next email could save you a job advert, a
          headache, and several hours of CV archaeology.
        </p>

        <p style={{ marginBottom: 0, lineHeight: 1.6, color: '#4b5563' }}>
          We’ll only send relevant candidate availability and useful updates. No
          waffle. No spam. No “just checking in for the 47th time this week.”
        </p>
      </div>

      {error && (
        <p style={{ color: '#dc2626', fontWeight: 600 }}>
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={confirmUnsubscribe}
        disabled={loading}
        style={{
          border: 0,
          borderRadius: 999,
          background: '#1a1a2e',
          color: '#fff',
          padding: '12px 20px',
          fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Unsubscribing...' : 'Confirm unsubscribe'}
      </button>
    </div>
  )
}