import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { MAIN_ROLE_TYPES, ROLE_TYPE_HIERARCHY } from '@/lib/crm-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RoleSettingRow = {
  id: string
  main_role_type: string
  specific_role: string
  is_active: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase environment variables.')
  }

  return createClient(url, serviceKey)
}

function cleanText(value: unknown) {
  return String(value || '').trim()
}

function roleKey(mainRoleType: string, specificRole: string) {
  return `${mainRoleType.trim().toLowerCase()}::${specificRole.trim().toLowerCase()}`
}

function getSystemRoles() {
  return Object.entries(ROLE_TYPE_HIERARCHY).flatMap(([mainRoleType, config]) =>
    config.subTypes.map((specificRole, index) => ({
      id: `system:${mainRoleType}:${specificRole}`,
      main_role_type: mainRoleType,
      specific_role: specificRole,
      is_active: true,
      sort_order: index,
      is_system: true,
      created_at: null,
      updated_at: null,
    })),
  )
}

function mergeSystemAndDatabaseRoles(databaseRows: RoleSettingRow[]) {
  const databaseKeys = new Set(
    databaseRows.map(row => roleKey(row.main_role_type, row.specific_role)),
  )

  const systemRows = getSystemRoles().filter(
    row => !databaseKeys.has(roleKey(row.main_role_type, row.specific_role)),
  )

  return [...systemRows, ...databaseRows.map(row => ({ ...row, is_system: false }))]
    .sort((a, b) => {
      const mainCompare = a.main_role_type.localeCompare(b.main_role_type)
      if (mainCompare !== 0) return mainCompare

      const orderCompare = Number(a.sort_order || 0) - Number(b.sort_order || 0)
      if (orderCompare !== 0) return orderCompare

      return a.specific_role.localeCompare(b.specific_role)
    })
}

export async function GET() {
  try {
    const supabase = getServiceClient()

    const { data, error } = await supabase
      .from('crm_role_settings')
      .select('id, main_role_type, specific_role, is_active, sort_order, created_at, updated_at')
      .order('main_role_type', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('specific_role', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const databaseRows = (data || []) as RoleSettingRow[]
    const roles = mergeSystemAndDatabaseRoles(databaseRows)

    const mainRoleTypes = Array.from(
      new Set([
        ...MAIN_ROLE_TYPES,
        ...databaseRows.map(row => row.main_role_type).filter(Boolean),
      ]),
    ).sort()

    return NextResponse.json({
      roles,
      mainRoleTypes,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load role settings.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const mainRoleType = cleanText(body.main_role_type)
    const specificRole = cleanText(body.specific_role)

    if (!mainRoleType || !specificRole) {
      return NextResponse.json(
        { error: 'Main role type and specific role are required.' },
        { status: 400 },
      )
    }

    const supabase = getServiceClient()

    const { data, error } = await supabase
      .from('crm_role_settings')
      .upsert(
        {
          main_role_type: mainRoleType,
          specific_role: specificRole,
          is_active: body.is_active === false ? false : true,
          sort_order: Number.isFinite(Number(body.sort_order))
            ? Number(body.sort_order)
            : 0,
        },
        { onConflict: 'main_role_type,specific_role' },
      )
      .select('id, main_role_type, specific_role, is_active, sort_order, created_at, updated_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ role: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save role setting.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const id = cleanText(body.id)

    if (!id) {
      return NextResponse.json({ error: 'Role setting ID is required.' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}

    if (body.main_role_type !== undefined) {
      const mainRoleType = cleanText(body.main_role_type)
      if (!mainRoleType) {
        return NextResponse.json({ error: 'Main role type cannot be blank.' }, { status: 400 })
      }
      updates.main_role_type = mainRoleType
    }

    if (body.specific_role !== undefined) {
      const specificRole = cleanText(body.specific_role)
      if (!specificRole) {
        return NextResponse.json({ error: 'Specific role cannot be blank.' }, { status: 400 })
      }
      updates.specific_role = specificRole
    }

    if (body.is_active !== undefined) {
      updates.is_active = Boolean(body.is_active)
    }

    if (body.sort_order !== undefined) {
      updates.sort_order = Number.isFinite(Number(body.sort_order))
        ? Number(body.sort_order)
        : 0
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates supplied.' }, { status: 400 })
    }

    const supabase = getServiceClient()

    const { data, error } = await supabase
      .from('crm_role_settings')
      .update(updates)
      .eq('id', id)
      .select('id, main_role_type, specific_role, is_active, sort_order, created_at, updated_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ role: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update role setting.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const id = cleanText(body.id)

    if (!id) {
      return NextResponse.json({ error: 'Role setting ID is required.' }, { status: 400 })
    }

    const supabase = getServiceClient()

    const { error } = await supabase
      .from('crm_role_settings')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete role setting.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
