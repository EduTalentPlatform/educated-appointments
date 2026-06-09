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
  return String(value ?? '').trim()
}

function toNumber(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function normalisePostcode(value: unknown) {
  return clean(value).toUpperCase().replace(/\s+/g, '')
}

function toRad(value: number) {
  return (value * Math.PI) / 180
}

function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const earthRadiusMiles = 3958.8

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return earthRadiusMiles * c
}

async function geocodePostcode(postcode: string) {
  const cleaned = clean(postcode)

  if (!cleaned) {
    throw new Error('Postcode is required.')
  }

  const res = await fetch(
    `https://api.postcodes.io/postcodes/${encodeURIComponent(cleaned)}`,
    {
      cache: 'no-store',
    },
  )

  const json = await res.json().catch(() => null)

  if (!res.ok || !json?.result?.latitude || !json?.result?.longitude) {
    throw new Error('Could not find that postcode.')
  }

  return {
    postcode: json.result.postcode || cleaned,
    latitude: Number(json.result.latitude),
    longitude: Number(json.result.longitude),
  }
}

function candidateLat(candidate: any) {
  return toNumber(candidate.lat) ?? toNumber(candidate.latitude)
}

function candidateLng(candidate: any) {
  return toNumber(candidate.lng) ?? toNumber(candidate.longitude)
}

function candidateSearchText(candidate: any) {
  const lookingForRoles = Array.isArray(candidate.looking_for_roles)
    ? candidate.looking_for_roles.join(' ')
    : candidate.looking_for_roles || ''

  return [
    candidate.first_name,
    candidate.last_name,
    candidate.email,
    candidate.phone,
    candidate.job_title,
    candidate.main_role_type,
    candidate.sub_role_type,
    candidate.seeking_role_type,
    lookingForRoles,
    candidate.can_deliver,
    candidate.qualifications,
    candidate.notes,
    candidate.preferred_location,
    candidate.town_city,
    candidate.county,
    candidate.postcode,
    candidate.source,
  ]
    .map(item => clean(item).toLowerCase())
    .filter(Boolean)
    .join(' ')
}

function matchesKeyword(candidate: any, keyword: string) {
  const words = clean(keyword)
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.trim())
    .filter(Boolean)

  if (words.length === 0) return true

  const searchText = candidateSearchText(candidate)

  return words.every(word => searchText.includes(word))
}

function matchesStatus(candidate: any, status: string) {
  if (!status || status === 'any') return true

  if (status === 'actively_looking') {
    return candidate.actively_looking === true
  }

  return clean(candidate.status).toLowerCase() === status.toLowerCase()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))

    const keyword = clean(body.keyword)
    const postcode = clean(body.postcode)
    const status = clean(body.status || 'any')
    const radiusMiles = Math.min(
      Math.max(Number(body.radius_miles || body.radiusMiles || 15), 1),
      250,
    )

    if (!postcode) {
      return NextResponse.json(
        { error: 'Please enter a postcode.' },
        { status: 400 },
      )
    }

    const searchLocation = await geocodePostcode(postcode)

    const supabase = getServiceClient()

    const { data: candidates, error } = await supabase
      .from('candidates')
      .select('*, applications(id, status)')
      .limit(5000)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const results = (candidates || [])
      .map((candidate: any) => {
        const lat = candidateLat(candidate)
        const lng = candidateLng(candidate)

        if (lat === null || lng === null) return null

        const distance = haversineMiles(
          searchLocation.latitude,
          searchLocation.longitude,
          lat,
          lng,
        )

        return {
          ...candidate,
          distance_miles: Math.round(distance * 10) / 10,
        }
      })
      .filter(Boolean)
      .filter((candidate: any) => candidate.distance_miles <= radiusMiles)
      .filter((candidate: any) => matchesKeyword(candidate, keyword))
      .filter((candidate: any) => matchesStatus(candidate, status))
      .sort((a: any, b: any) => a.distance_miles - b.distance_miles)

    return NextResponse.json({
      results,
      count: results.length,
      search: {
        keyword,
        postcode: searchLocation.postcode,
        postcode_normalised: normalisePostcode(searchLocation.postcode),
        radius_miles: radiusMiles,
        latitude: searchLocation.latitude,
        longitude: searchLocation.longitude,
        status,
      },
    })
  } catch (error: any) {
    console.error('Candidate radius search error:', error)

    return NextResponse.json(
      {
        error: error?.message || 'Could not search candidates.',
      },
      { status: 500 },
    )
  }
}