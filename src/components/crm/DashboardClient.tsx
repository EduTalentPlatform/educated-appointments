'use client'

import { useEffect } from 'react'

export default function DashboardClient() {
  useEffect(() => {
    // Run inactive client check silently on dashboard load
    fetch('/api/crm/check-inactive-clients', { method: 'POST' })
      .catch(() => {}) // Silent — don't show errors for background task
  }, [])

  return null
}