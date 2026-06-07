'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SpecOutCandidateButton({
  candidateId,
}: {
  candidateId: string
}) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  async function createSpeculation() {
    setCreating(true)

    const res = await fetch('/api/crm/speculations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_id: candidateId,
        consent_confirmed: true,
      }),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok || !data?.speculation?.id) {
      alert(data?.error || 'Could not create speculation.')
      setCreating(false)
      return
    }

    router.push(`/crm/speculations/${data.speculation.id}`)
  }

  return (
    <button
      type="button"
      onClick={createSpeculation}
      disabled={creating}
      className="crm-card-link"
      style={{
        border: 0,
        background: 'transparent',
        cursor: creating ? 'not-allowed' : 'pointer',
        opacity: creating ? 0.65 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {creating ? 'Creating...' : 'Spec out →'}
    </button>
  )
}