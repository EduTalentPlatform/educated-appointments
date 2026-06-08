'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }

    const { data: aalData } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

    if (aalData?.currentLevel === 'aal2') {
      router.push('/crm')
      router.refresh()
      return
    }

    if (aalData?.nextLevel === 'aal2') {
      router.push('/crm/mfa/verify')
      router.refresh()
      return
    }

    router.push('/crm/mfa/setup')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="crm-login-form">
      <div className="crm-login-field">
        <label className="crm-login-label">Email</label>
        <input
          type="email"
          className="crm-login-input"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@educatedappointments.co.uk"
          required
          autoFocus
        />
      </div>
      <div className="crm-login-field">
        <label className="crm-login-label">Password</label>
        <input
          type="password"
          className="crm-login-input"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
      </div>
      {error && <p className="crm-login-error">{error}</p>}
      <button type="submit" className="crm-login-btn" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign in →'}
      </button>
    </form>
  )
}
