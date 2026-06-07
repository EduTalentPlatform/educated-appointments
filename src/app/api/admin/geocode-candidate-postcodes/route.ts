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

function normalisePostcode(value: unknown) {
  return String(value || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .trim()
}

function displayPostcode(value: unknown) {
  const normalised = normalisePostcode(value)

  if (!normalised) return ''
  if (normalised.length <= 3) return normalised

  return `${normalised.slice(0, -3)} ${normalised.slice(-3)}`
}

function isLikelyUkPostcode(value: unknown) {
  const postcode = String(value || '').toUpperCase().trim()

  return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/.test(postcode)
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = []

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }

  return chunks
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceClient()

    const body = await request.json().catch(() => ({}))
    const onlyQualityManager = body.only_quality_manager !== false

    let query = supabase
      .from('candidates')
      .select(`
        id,
        first_name,
        last_name,
        postcode,
        seeking_role_type,
        sub_role_type,
        notes
      `)
      .not('postcode', 'is', null)

    if (onlyQualityManager) {
      query = query.or(
        'seeking_role_type.eq.Quality Manager,sub_role_type.eq.Quality Manager,notes.ilike.%Quality Manager%',
      )
    }

    const { data: candidates, error: candidateError } = await query

    if (candidateError) {
      return NextResponse.json(
        { error: candidateError.message },
        { status: 400 },
      )
    }

    const candidatePostcodes = Array.from(
      new Set(
        (candidates || [])
          .map(candidate => candidate.postcode)
          .filter(isLikelyUkPostcode)
          .map(normalisePostcode),
      ),
    )

    if (candidatePostcodes.length === 0) {
      return NextResponse.json({
        message: 'No valid candidate postcodes found to geocode.',
        candidate_postcodes_found: 0,
        inserted: 0,
        skipped_existing: 0,
        failed: [],
      })
    }

    const { data: existingGeocodes, error: existingError } = await supabase
      .from('postcode_geocodes')
      .select('postcode_norm')
      .in('postcode_norm', candidatePostcodes)

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message },
        { status: 400 },
      )
    }

    const existingSet = new Set(
      (existingGeocodes || []).map(row => row.postcode_norm),
    )

    const missingPostcodes = candidatePostcodes.filter(
      postcode => !existingSet.has(postcode),
    )

    const batches = chunkArray(missingPostcodes, 100)

    let inserted = 0
    const failed: string[] = []

    for (const batch of batches) {
      const res = await fetch('https://api.postcodes.io/postcodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          postcodes: batch.map(displayPostcode),
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        failed.push(...batch)
        continue
      }

      const rows =
        json?.result
          ?.map((item: any) => {
            const result = item?.result

            if (
              !result ||
              typeof result.latitude !== 'number' ||
              typeof result.longitude !== 'number'
            ) {
              failed.push(normalisePostcode(item?.query))
              return null
            }

            return {
              postcode_norm: normalisePostcode(result.postcode),
              postcode: result.postcode,
              latitude: result.latitude,
              longitude: result.longitude,
              source: 'postcodes.io',
              updated_at: new Date().toISOString(),
            }
          })
          .filter(Boolean) || []

      if (rows.length > 0) {
        const { error: upsertError } = await supabase
          .from('postcode_geocodes')
          .upsert(rows, { onConflict: 'postcode_norm' })

        if (upsertError) {
          return NextResponse.json(
            { error: upsertError.message },
            { status: 400 },
          )
        }

        inserted += rows.length
      }
    }

    return NextResponse.json({
      message: 'Candidate postcode geocoding complete.',
      only_quality_manager: onlyQualityManager,
      candidate_postcodes_found: candidatePostcodes.length,
      skipped_existing: existingSet.size,
      missing_before_run: missingPostcodes.length,
      inserted,
      failed_count: failed.length,
      failed: failed.slice(0, 100),
    })
  } catch (error: any) {
    console.error('Candidate postcode geocode error:', error)

    return NextResponse.json(
      {
        error:
          error?.message || 'Something went wrong geocoding candidate postcodes.',
      },
      { status: 500 },
    )
  }
}