'use client'

import { useEffect, useState } from 'react'

export default function LiveCandidateCount() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let active = true

    async function loadCount() {
      try {
        const response = await fetch('/api/public/candidate-count', {
          cache: 'no-store',
        })

        if (!response.ok) return

        const data = await response.json()

        if (active && typeof data.count === 'number') {
          setCount(data.count)
        }
      } catch {
        // Keep the fallback if the count cannot be loaded.
      }
    }

    loadCount()

    return () => {
      active = false
    }
  }, [])

  if (count === null) {
    return <>—</>
  }

  return <>{count.toLocaleString('en-GB')}</>
}