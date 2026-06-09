'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  MAIN_ROLE_TYPES as DEFAULT_MAIN_ROLE_TYPES,
  ROLE_TYPE_HIERARCHY as DEFAULT_ROLE_TYPE_HIERARCHY,
} from '@/lib/crm-data'

type RoleSetting = {
  id: string
  main_role_type: string
  specific_role: string
  is_active: boolean
  sort_order: number
  is_system?: boolean
}

type RoleHierarchy = Record<string, { hasStandards: boolean; subTypes: string[] }>

function uniqueClean(values: string[]) {
  return Array.from(
    new Set(
      values
        .map(value => String(value || '').trim())
        .filter(Boolean),
    ),
  )
}

export function useCrmRoleSettings() {
  const [roles, setRoles] = useState<RoleSetting[]>([])
  const [apiMainRoleTypes, setApiMainRoleTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadRoleSettings() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/crm/role-settings', {
        cache: 'no-store',
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to load CRM role settings.')
      }

      setRoles(Array.isArray(payload.roles) ? payload.roles : [])
      setApiMainRoleTypes(Array.isArray(payload.mainRoleTypes) ? payload.mainRoleTypes : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load CRM role settings.')
      setRoles([])
      setApiMainRoleTypes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRoleSettings()
  }, [])

  const roleTypeHierarchy = useMemo<RoleHierarchy>(() => {
    const next: RoleHierarchy = {}

    Object.entries(DEFAULT_ROLE_TYPE_HIERARCHY).forEach(([mainRoleType, config]) => {
      next[mainRoleType] = {
        hasStandards: Boolean(config.hasStandards),
        subTypes: uniqueClean(config.subTypes || []),
      }
    })

    roles
      .filter(role => role.is_active !== false)
      .sort((a, b) => {
        const mainCompare = a.main_role_type.localeCompare(b.main_role_type)
        if (mainCompare !== 0) return mainCompare

        const sortCompare = Number(a.sort_order || 0) - Number(b.sort_order || 0)
        if (sortCompare !== 0) return sortCompare

        return a.specific_role.localeCompare(b.specific_role)
      })
      .forEach(role => {
        const mainRoleType = String(role.main_role_type || '').trim()
        const specificRole = String(role.specific_role || '').trim()

        if (!mainRoleType || !specificRole) return

        if (!next[mainRoleType]) {
          next[mainRoleType] = {
            hasStandards: Boolean(DEFAULT_ROLE_TYPE_HIERARCHY[mainRoleType]?.hasStandards),
            subTypes: [],
          }
        }

        if (!next[mainRoleType].subTypes.includes(specificRole)) {
          next[mainRoleType].subTypes.push(specificRole)
        }
      })

    apiMainRoleTypes.forEach(mainRoleType => {
      const cleanMainRoleType = String(mainRoleType || '').trim()
      if (!cleanMainRoleType) return

      if (!next[cleanMainRoleType]) {
        next[cleanMainRoleType] = {
          hasStandards: Boolean(DEFAULT_ROLE_TYPE_HIERARCHY[cleanMainRoleType]?.hasStandards),
          subTypes: [],
        }
      }
    })

    return next
  }, [roles, apiMainRoleTypes])

  const mainRoleTypes = useMemo(() => {
    return uniqueClean([
      ...DEFAULT_MAIN_ROLE_TYPES,
      ...apiMainRoleTypes,
      ...roles.map(role => role.main_role_type),
    ]).filter(mainRoleType => roleTypeHierarchy[mainRoleType])
  }, [apiMainRoleTypes, roles, roleTypeHierarchy])

  return {
    roleTypeHierarchy,
    mainRoleTypes,
    roles,
    loading,
    error,
    reloadRoleSettings: loadRoleSettings,
  }
}
