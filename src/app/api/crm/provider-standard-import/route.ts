import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ParsedProviderRow = {
  provider_name: string | null
  ukprn: string | null
  website: string | null
  standard_name: string | null
  standard_reference: string | null
  sector: string | null
  route: string | null
  regions: string[]
  delivery_modes: string[]
  source: string | null
  source_url: string | null
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function cleanString(value: unknown) {
  const text = String(value ?? '').trim()
  return text || null
}

function normaliseCompanyName(value: unknown) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\b(ltd|limited|llp|plc|cic|inc|company|co|the)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

function normaliseStandardKey(value: unknown) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

function extractDomain(value: unknown) {
  const text = String(value ?? '').trim().toLowerCase()
  if (!text) return null

  try {
    const url = text.startsWith('http') ? new URL(text) : new URL(`https://${text}`)
    return url.hostname.replace(/^www\./, '')
  } catch {
    return (
      text
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0]
        .trim() || null
    )
  }
}

function splitList(value: unknown) {
  const text = String(value ?? '').trim()
  if (!text) return []

  return text
    .split(/[;,|]/g)
    .map(item => item.trim())
    .filter(Boolean)
}

function parseCsv(text: string) {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentValue = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"' && inQuotes && next === '"') {
      currentValue += '"'
      i += 1
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentValue.trim())
      currentValue = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1

      currentRow.push(currentValue.trim())
      currentValue = ''

      if (currentRow.some(value => value.trim())) {
        rows.push(currentRow)
      }

      currentRow = []
      continue
    }

    currentValue += char
  }

  currentRow.push(currentValue.trim())

  if (currentRow.some(value => value.trim())) {
    rows.push(currentRow)
  }

  return rows
}

function normaliseHeader(header: string) {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '')
}

const HEADER_MAP: Record<string, keyof ParsedProviderRow> = {
  provider: 'provider_name',
  providername: 'provider_name',
  trainingprovider: 'provider_name',
  organisation: 'provider_name',
  organisationname: 'provider_name',
  employer: 'provider_name',
  employername: 'provider_name',

  ukprn: 'ukprn',
  upin: 'ukprn',

  website: 'website',
  url: 'website',
  providerwebsite: 'website',

  standard: 'standard_name',
  standardname: 'standard_name',
  apprenticeshipstandard: 'standard_name',
  coursename: 'standard_name',
  course: 'standard_name',

  reference: 'standard_reference',
  standardreference: 'standard_reference',
  standardref: 'standard_reference',
  stcode: 'standard_reference',
  larscode: 'standard_reference',

  sector: 'sector',
  route: 'route',

  region: 'regions',
  regions: 'regions',
  location: 'regions',
  locations: 'regions',

  deliverymode: 'delivery_modes',
  deliverymodes: 'delivery_modes',
  mode: 'delivery_modes',

  source: 'source',
  sourceurl: 'source_url',
  evidenceurl: 'source_url',
  findapprenticeshiptrainingurl: 'source_url',
}

function parseProviderCsv(csvText: string) {
  const rows = parseCsv(csvText)

  if (rows.length < 2) {
    return []
  }

  const headers = rows[0].map(header => HEADER_MAP[normaliseHeader(header)])

  return rows.slice(1).map((row, index) => {
    const parsed: ParsedProviderRow = {
      provider_name: null,
      ukprn: null,
      website: null,
      standard_name: null,
      standard_reference: null,
      sector: null,
      route: null,
      regions: [],
      delivery_modes: [],
      source: null,
      source_url: null,
    }

    row.forEach((value, columnIndex) => {
      const field = headers[columnIndex]
      if (!field) return

      if (field === 'regions' || field === 'delivery_modes') {
        parsed[field] = splitList(value)
        return
      }

      parsed[field] = cleanString(value) as any
    })

    return {
      row_number: index + 2,
      ...parsed,
    }
  })
}

function findMatchingCompany<
  T extends { id: string; company_name?: string | null; website?: string | null },
>(rows: T[] | null | undefined, providerName: string, website?: string | null) {
  const targetName = normaliseCompanyName(providerName)
  const targetDomain = extractDomain(website)

  return (
    (rows ?? []).find(row => {
      const rowName = normaliseCompanyName(row.company_name)
      const rowDomain = extractDomain(row.website)

      const nameMatches = targetName && rowName && rowName === targetName
      const domainMatches = targetDomain && rowDomain && rowDomain === targetDomain

      return nameMatches || domainMatches
    }) ?? null
  )
}

function matchStandard(row: any, standards: any[]) {
  const referenceKey = normaliseStandardKey(row.standard_reference)
  const nameKey = normaliseStandardKey(row.standard_name)

  if (referenceKey) {
    const byReference = standards.find(standard =>
      normaliseStandardKey(standard.reference) === referenceKey,
    )

    if (byReference) return byReference
  }

  if (nameKey) {
    const byExactName = standards.find(standard => {
      const standardName = normaliseStandardKey(
        standard.standard_name || standard.title,
      )

      return standardName === nameKey
    })

    if (byExactName) return byExactName

    const byContains = standards.find(standard => {
      const standardName = normaliseStandardKey(
        standard.standard_name || standard.title,
      )

      return (
        standardName.includes(nameKey) ||
        nameKey.includes(standardName)
      )
    })

    if (byContains) return byContains
  }

  return null
}

async function buildPreviewRows(csvText: string) {
  const supabase = getServiceClient()
  const parsedRows = parseProviderCsv(csvText)

  const [
    { data: standards },
    { data: clients },
    { data: leads },
  ] = await Promise.all([
    supabase
      .from('apprenticeship_standards')
      .select('id, title, standard_name, reference, sector, route, level, is_active'),

    supabase
      .from('clients')
      .select('id, company_name, website')
      .limit(2000),

    supabase
      .from('leads')
      .select('id, company_name, website')
      .limit(3000),
  ])

  return parsedRows.map(row => {
    const warnings: string[] = []

    if (!row.provider_name) warnings.push('Missing provider name')
    if (!row.standard_name && !row.standard_reference) {
      warnings.push('Missing standard name/reference')
    }

    const matchedStandard = matchStandard(row, standards ?? [])

    if (!matchedStandard) {
      warnings.push('Could not confidently match to apprenticeship_standards')
    }

    const existingClient = row.provider_name
      ? findMatchingCompany(clients, row.provider_name, row.website)
      : null

    const existingLead = row.provider_name
      ? findMatchingCompany(leads, row.provider_name, row.website)
      : null

    const finalStandardName =
      matchedStandard?.standard_name ||
      matchedStandard?.title ||
      row.standard_name ||
      null

    const finalStandardReference =
      matchedStandard?.reference ||
      row.standard_reference ||
      null

    const providerKey = normaliseCompanyName(row.provider_name)
    const standardKey =
      matchedStandard?.id ||
      normaliseStandardKey(finalStandardReference) ||
      normaliseStandardKey(finalStandardName)

    const valid = Boolean(row.provider_name && finalStandardName && providerKey && standardKey)

    return {
      ...row,
      valid,
      warnings,
      provider_key: providerKey,
      standard_key: standardKey,
      standard_id: matchedStandard?.id ?? null,
      matched_standard_name: finalStandardName,
      matched_standard_reference: finalStandardReference,
      matched_standard_sector: matchedStandard?.sector || matchedStandard?.route || row.sector,
      matched_standard_route: matchedStandard?.route || row.route,
      match_status: matchedStandard ? 'matched' : 'needs_review',
      client_id: existingClient?.id ?? null,
      client_name: existingClient?.company_name ?? null,
      lead_id: existingLead?.id ?? null,
      lead_name: existingLead?.company_name ?? null,
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = cleanString(body.action) || 'preview'
    const csvText = String(body.csvText || body.csv_text || '').trim()
    const sourceName = cleanString(body.source_name) || 'CSV import'

    if (!csvText) {
      return NextResponse.json(
        { error: 'CSV text is required.' },
        { status: 400 },
      )
    }

    const supabase = getServiceClient()
    const previewRows = await buildPreviewRows(csvText)

    if (action === 'preview') {
      return NextResponse.json({
        rows: previewRows,
        summary: {
          rows_received: previewRows.length,
          rows_valid: previewRows.filter(row => row.valid).length,
          rows_with_warnings: previewRows.filter(row => row.warnings.length > 0).length,
          matched_clients: previewRows.filter(row => row.client_id).length,
          matched_leads: previewRows.filter(row => row.lead_id).length,
        },
      })
    }

    if (action !== 'import') {
      return NextResponse.json(
        { error: 'Unsupported action.' },
        { status: 400 },
      )
    }

    const validRows = previewRows.filter(row => row.valid)

    const { data: importRun, error: importRunError } = await supabase
      .from('provider_standard_import_runs')
      .insert({
        source_name: sourceName,
        rows_received: previewRows.length,
        rows_valid: validRows.length,
        rows_imported: 0,
        rows_skipped: previewRows.length - validRows.length,
      })
      .select()
      .single()

    if (importRunError) {
      return NextResponse.json(
        { error: importRunError.message },
        { status: 400 },
      )
    }

    const rowsToUpsert = validRows.map(row => ({
      provider_name: row.provider_name,
      provider_key: row.provider_key,
      ukprn: row.ukprn,
      website: row.website,
      standard_id: row.standard_id,
      standard_name: row.matched_standard_name,
      standard_reference: row.matched_standard_reference,
      standard_key: row.standard_key,
      sector: row.matched_standard_sector,
      route: row.matched_standard_route,
      regions: row.regions,
      delivery_modes: row.delivery_modes,
      source: row.source || sourceName,
      source_url: row.source_url,
      is_active: true,
      last_checked_at: new Date().toISOString(),
      match_status: row.match_status,
      client_id: row.client_id,
      lead_id: row.lead_id,
      import_batch_id: importRun.id,
      updated_at: new Date().toISOString(),
    }))

    const { data: importedRows, error: upsertError } = await supabase
      .from('provider_standard_delivery')
      .upsert(rowsToUpsert, {
        onConflict: 'provider_key,standard_key',
      })
      .select()

    if (upsertError) {
      return NextResponse.json(
        { error: upsertError.message },
        { status: 400 },
      )
    }

    await supabase
      .from('provider_standard_import_runs')
      .update({
        rows_imported: importedRows?.length ?? 0,
        rows_skipped: previewRows.length - validRows.length,
      })
      .eq('id', importRun.id)

    return NextResponse.json({
      import_run_id: importRun.id,
      rows: previewRows,
      imported_rows: importedRows ?? [],
      summary: {
        rows_received: previewRows.length,
        rows_valid: validRows.length,
        rows_imported: importedRows?.length ?? 0,
        rows_skipped: previewRows.length - validRows.length,
        matched_clients: previewRows.filter(row => row.client_id).length,
        matched_leads: previewRows.filter(row => row.lead_id).length,
      },
    })
  } catch (error: any) {
    console.error('Provider standard import error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not process provider standard import.' },
      { status: 500 },
    )
  }
}