import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function clean(value: unknown) {
  return String(value || '').trim()
}

function getStandardLabel(row: any) {
  return clean(
    row.standard_name ||
      row.title ||
      row.name ||
      row.standard_title ||
      row.standard ||
      row.lars_title ||
      row.apprenticeship_standard ||
      row.ifate_title ||
      '',
  )
}

function getStandardRoute(row: any) {
  return clean(
    row.route ||
      row.sector ||
      row.subject_area ||
      row.apprenticeship_route ||
      row.pathway ||
      '',
  )
}

function getStandardCode(row: any) {
  return clean(
    row.lars_code ||
      row.standard_code ||
      row.ifate_reference ||
      row.standard_reference ||
      row.reference ||
      row.code ||
      '',
  )
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient()

    const q = request.nextUrl.searchParams.get('q')?.toLowerCase().trim() || ''
    const route = request.nextUrl.searchParams.get('route')?.trim() || ''

    const { data, error } = await supabase
      .from('apprenticeship_standards')
      .select('*')
      .order('route', { ascending: true, nullsFirst: false })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      )
    }

    const allStandards = (data || [])
      .map(row => {
        const label = getStandardLabel(row)
        const routeLabel = getStandardRoute(row)
        const code = getStandardCode(row)

        return {
          id: clean(row.id || code || label),
          label,
          level: row.level ?? row.apprenticeship_level ?? null,
          route: routeLabel || 'No route/sector',
          code: code || null,
        }
      })
      .filter(item => item.label)

    const routes = Array.from(
      new Set(allStandards.map(standard => standard.route)),
    ).sort((a, b) => a.localeCompare(b))

    const filteredStandards = allStandards
      .filter(item => {
        if (!route || route === 'all') return true
        return item.route === route
      })
      .filter(item => {
        if (!q) return true

        return [
          item.label,
          item.route,
          item.level ? `level ${item.level}` : '',
          item.code,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q)
      })
      .sort((a, b) => {
        const routeCompare = String(a.route || '').localeCompare(
          String(b.route || ''),
        )

        if (routeCompare !== 0) return routeCompare

        return a.label.localeCompare(b.label)
      })

    return NextResponse.json({
      standards: filteredStandards,
      routes,
      total: filteredStandards.length,
      total_in_database: allStandards.length,
    })
  } catch (error: any) {
    console.error('Apprenticeship standards route error:', error)

    return NextResponse.json(
      {
        error:
          error?.message || 'Something went wrong loading apprenticeship standards.',
      },
      { status: 500 },
    )
  }
}