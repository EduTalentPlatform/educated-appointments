'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function EmployerPortalLogoutButton() {
  const router = useRouter()

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/employer-portal/login')
    router.refresh()
  }

  return (
    <button
      onClick={logout}
      style={{
        border: '1px solid rgba(255,255,255,0.22)',
        background: 'rgba(255,255,255,0.08)',
        color: '#fff',
        borderRadius: 10,
        padding: '9px 12px',
        fontSize: 12,
        fontWeight: 900,
        cursor: 'pointer',
      }}
    >
      Sign out
    </button>
  )
}