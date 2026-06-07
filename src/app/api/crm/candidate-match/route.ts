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

function normalisePostcode(value: unknown) {
  return clean(value).toUpperCase().replace(/\s+/g, '')
}

function displayPostcode(value: unknown) {
  const normalised = normalisePostcode(value)
  if (!normalised) return ''
  if (normalised.length <= 3) return normalised
  return `${normalised.slice(0, -3)} ${normalised.slice(-3)}`
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null

  const number = Number(value)

  return Number.isFinite(number) ? number : null
}

function toRad(value: number) {
  return (value * Math.PI) / 180
}

function distanceMiles(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
) {
  const earthRadiusMiles = 3958.8

  const dLat = toRad(toLat - fromLat)
  const dLng = toRad(toLng - fromLng)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(fromLat)) *
      Math.cos(toRad(toLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return earthRadiusMiles * c
}

function textIncludesAny(source: string, terms: string[]) {
  const haystack = source.toLowerCase()

  return terms.some(term => haystack.includes(term.toLowerCase()))
}

function previewText(value: unknown, maxLength = 220) {
  const text = clean(value).replace(/\s+/g, ' ')
  if (!text) return ''
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trimEnd()}…`
}

function firstClean(values: unknown[]) {
  for (const value of values) {
    const text = clean(value)
    if (text) return text
  }

  return ''
}

type RecentCandidateNote = {
  id: string
  candidate_id: string
  type: string
  content: string
  preview: string
  created_at: string | null
}

function normaliseCandidateActivity(row: any): RecentCandidateNote | null {
  const candidateId = clean(row.candidate_id || row.candidateId)

  const content = firstClean([
    row.content,
    row.note,
    row.notes,
    row.body,
    row.summary,
    row.description,
    row.comment,
    row.details,
  ])

  if (!candidateId || !content) return null

  const type =
    firstClean([
      row.activity_type,
      row.note_type,
      row.type,
      row.kind,
      row.category,
    ]) || 'Note'

  const createdAt = clean(row.created_at || row.createdAt)

  return {
    id: clean(row.id) || `${candidateId}-${createdAt || 'activity'}`,
    candidate_id: candidateId,
    type,
    content,
    preview: previewText(content),
    created_at: createdAt || null,
  }
}

function buildCandidateNotesFallback(candidate: any): RecentCandidateNote | null {
  const content = clean(candidate.notes)

  if (!content) return null

  return {
    id: `candidate-notes-${candidate.id}`,
    candidate_id: candidate.id,
    type: 'Candidate notes',
    content,
    preview: previewText(content),
    created_at: clean(candidate.created_at) || null,
  }
}

async function getRecentCandidateNotesMap(
  supabase: ReturnType<typeof getServiceClient>,
  candidates: any[],
) {
  const notesByCandidateId = new Map<string, RecentCandidateNote[]>()

  const candidateIds = Array.from(
    new Set(
      candidates
        .map(candidate => clean(candidate.id))
        .filter(Boolean),
    ),
  )

  if (candidateIds.length > 0) {
    const activityLimit = Math.min(
      Math.max(candidateIds.length * 5, 100),
      5000,
    )

    const { data: activityRows, error: activityError } = await supabase
      .from('candidate_activities')
      .select('*')
      .in('candidate_id', candidateIds)
      .order('created_at', { ascending: false })
      .limit(activityLimit)

    if (activityError) {
      console.warn(
        'Candidate recent notes preview skipped:',
        activityError.message,
      )
    } else {
      for (const row of activityRows || []) {
        const note = normaliseCandidateActivity(row)
        if (!note) continue

        const existing = notesByCandidateId.get(note.candidate_id) || []

        if (existing.length >= 3) continue

        notesByCandidateId.set(note.candidate_id, [...existing, note])
      }
    }
  }

  for (const candidate of candidates) {
    const candidateId = clean(candidate.id)
    const existing = notesByCandidateId.get(candidateId) || []

    if (existing.length > 0) continue

    const fallbackNote = buildCandidateNotesFallback(candidate)

    if (fallbackNote) {
      notesByCandidateId.set(candidateId, [fallbackNote])
    }
  }

  return notesByCandidateId
}

function buildCandidateSearchText(candidate: any) {
  return [
    candidate.first_name,
    candidate.last_name,
    candidate.job_title,
    candidate.main_role_type,
    candidate.sub_role_type,
    candidate.seeking_role_type,
    Array.isArray(candidate.looking_for_roles)
      ? candidate.looking_for_roles.join(' ')
      : candidate.looking_for_roles,
    candidate.notes,
    candidate.qualifications,
    candidate.can_deliver,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function buildRoleTerms(roleType: unknown, vacancy: any) {
  const raw = [
    roleType,
    vacancy?.sector,
    vacancy?.role_type,
    vacancy?.title,
    vacancy?.subject_area,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const terms = new Set<string>()

  if (raw.includes('quality manager')) {
    terms.add('quality manager')
    terms.add('quality')
  }

  if (raw.includes('quality')) terms.add('quality')
  if (raw.includes('manager')) terms.add('manager')
  if (raw.includes('tutor')) terms.add('tutor')
  if (raw.includes('trainer')) terms.add('trainer')
  if (raw.includes('assessor')) terms.add('assessor')
  if (raw.includes('skills coach')) terms.add('skills coach')
  if (raw.includes('iqa')) terms.add('iqa')
  if (raw.includes('lead iqa')) terms.add('lead iqa')
  if (raw.includes('operations')) terms.add('operations')
  if (raw.includes('bdm')) terms.add('bdm')
  if (raw.includes('business development')) terms.add('business development')
  if (raw.includes('employer engagement')) terms.add('employer engagement')

  if (terms.size === 0 && clean(roleType)) {
    terms.add(clean(roleType))
  }

  if (terms.size === 0 && clean(vacancy?.title)) {
    terms.add(clean(vacancy.title))
  }

  return Array.from(terms).filter(Boolean)
}

function candidateMatchesRole(candidate: any, terms: string[]) {
  if (terms.length === 0) return true

  const candidateText = buildCandidateSearchText(candidate)

  return textIncludesAny(candidateText, terms)
}

function splitSearchTerms(value: unknown) {
  return String(value || '')
    .split(/[,|\n]/)
    .map(term => term.trim().toLowerCase())
    .filter(Boolean)
}

function includesTerm(text: string, term: string) {
  return text.toLowerCase().includes(term.toLowerCase())
}

function candidateMatchesSelectedSearch({
  candidate,
  searchMode,
  roleQuery,
  standardQuery,
  keywordQuery,
}: {
  candidate: any
  searchMode: string
  roleQuery: string
  standardQuery: string
  keywordQuery: string
}) {
  const roleTerms = splitSearchTerms(roleQuery)
  const standardTerms = splitSearchTerms(standardQuery)
  const keywordTerms = splitSearchTerms(keywordQuery)

  const roleText = [
    candidate.job_title,
    candidate.main_role_type,
    candidate.sub_role_type,
    candidate.seeking_role_type,
    Array.isArray(candidate.looking_for_roles)
      ? candidate.looking_for_roles.join(' ')
      : candidate.looking_for_roles,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const standardText = [
    candidate.can_deliver,
    candidate.qualifications,
    candidate.notes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const fullText = `${roleText} ${standardText}`

  const roleMatches =
    roleTerms.length === 0 ||
    roleTerms.some(term => includesTerm(roleText, term))

  const standardMatches =
    standardTerms.length === 0 ||
    standardTerms.some(term => includesTerm(standardText, term))

  const keywordMatches =
    keywordTerms.length === 0 ||
    keywordTerms.some(term => includesTerm(fullText, term))

  if (searchMode === 'role') return roleMatches
  if (searchMode === 'standard') return standardMatches
  if (searchMode === 'keyword') return keywordMatches

  return roleMatches && standardMatches
}

async function getOrCreatePostcodeGeocode(
  supabase: ReturnType<typeof getServiceClient>,
  postcodeValue: unknown,
) {
  const postcodeNorm = normalisePostcode(postcodeValue)

  if (!postcodeNorm) return null

  const { data: cached } = await supabase
    .from('postcode_geocodes')
    .select('postcode_norm, postcode, latitude, longitude')
    .eq('postcode_norm', postcodeNorm)
    .maybeSingle()

  if (
    cached &&
    cached.latitude !== null &&
    cached.latitude !== undefined &&
    cached.longitude !== null &&
    cached.longitude !== undefined
  ) {
    return {
      postcode_norm: cached.postcode_norm,
      postcode: cached.postcode,
      latitude: Number(cached.latitude),
      longitude: Number(cached.longitude),
    }
  }

  const res = await fetch(
    `https://api.postcodes.io/postcodes/${encodeURIComponent(postcodeNorm)}`,
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
    },
  )

  if (!res.ok) return null

  const json = await res.json()
  const result = json?.result

  if (
    !result ||
    typeof result.latitude !== 'number' ||
    typeof result.longitude !== 'number'
  ) {
    return null
  }

  const row = {
    postcode_norm: normalisePostcode(result.postcode),
    postcode: result.postcode || displayPostcode(postcodeNorm),
    latitude: result.latitude,
    longitude: result.longitude,
    source: 'postcodes.io',
    updated_at: new Date().toISOString(),
  }

  await supabase
    .from('postcode_geocodes')
    .upsert(row, { onConflict: 'postcode_norm' })

  return row
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const searchMode = String(body.searchMode || 'role_standard')
    const roleQuery = clean(body.roleQuery || body.roleType || '')
    const standardQuery = clean(body.standardQuery || '')
    const keywordQuery = clean(body.keywordQuery || '')

    const workType = clean(body.workType || 'office')
    const radius = Number(body.radius || 20)
    const vacancyId = body.vacancyId

    const bodyLat = toNumber(body.lat)
    const bodyLng = toNumber(body.lng)

    const supabase = getServiceClient()

    let vacancy: any = null

    if (vacancyId) {
      const { data, error } = await supabase
        .from('vacancies')
        .select(`
          id,
          title,
          sector,
          role_type,
          subject_area,
          work_type,
          location,
          region,
          postcode,
          lat,
          lng
        `)
        .eq('id', vacancyId)
        .maybeSingle()

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 },
        )
      }

      vacancy = data
    }

    const vacancyLat = bodyLat ?? toNumber(vacancy?.lat)
    const vacancyLng = bodyLng ?? toNumber(vacancy?.lng)

    let vacancyGeo:
      | {
          postcode?: string
          latitude: number
          longitude: number
        }
      | null = null

    if (vacancyLat !== null && vacancyLng !== null) {
      vacancyGeo = {
        postcode: vacancy?.postcode || undefined,
        latitude: vacancyLat,
        longitude: vacancyLng,
      }
    } else if (vacancy?.postcode) {
      vacancyGeo = await getOrCreatePostcodeGeocode(supabase, vacancy.postcode)
    }

    if (workType === 'office' && !vacancyGeo) {
      return NextResponse.json(
        {
          error:
            'No vacancy coordinates found. Add and look up the vacancy postcode in the Briefing tab before running office radius matching.',
        },
        { status: 400 },
      )
    }

    const roleTerms = buildRoleTerms(roleQuery, vacancy)

    const { data: candidates, error: candidatesError } = await supabase
      .from('candidates')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        job_title,
        main_role_type,
        sub_role_type,
        seeking_role_type,
        looking_for_roles,
        postcode,
        notes,
        qualifications,
        can_deliver,
        actively_looking,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(2000)

    if (candidatesError) {
      return NextResponse.json(
        { error: candidatesError.message },
        { status: 400 },
      )
    }

    const roleMatched = (candidates || []).filter(candidate =>
      candidateMatchesSelectedSearch({
        candidate,
        searchMode,
        roleQuery,
        standardQuery,
        keywordQuery,
      }),
    )

    const recentNotesByCandidateId = await getRecentCandidateNotesMap(
      supabase,
      roleMatched,
    )

    const { data: existingApplications, error: existingApplicationsError } =
      vacancyId
        ? await supabase
            .from('applications')
            .select('id, candidate_id, status')
            .eq('vacancy_id', vacancyId)
        : { data: [], error: null }

    if (existingApplicationsError) {
      return NextResponse.json(
        { error: existingApplicationsError.message },
        { status: 400 },
      )
    }

    const applicationByCandidateId = new Map(
      (existingApplications || [])
        .filter((application: any) => application.candidate_id)
        .map((application: any) => [
          application.candidate_id,
          application,
        ]),
    )

    const candidatePostcodeNorms = Array.from(
      new Set(
        roleMatched
          .map(candidate => normalisePostcode(candidate.postcode))
          .filter(Boolean),
      ),
    )

    const { data: geocodes, error: geocodeError } =
      candidatePostcodeNorms.length > 0
        ? await supabase
            .from('postcode_geocodes')
            .select('postcode_norm, postcode, latitude, longitude')
            .in('postcode_norm', candidatePostcodeNorms)
        : { data: [], error: null }

    if (geocodeError) {
      return NextResponse.json(
        { error: geocodeError.message },
        { status: 400 },
      )
    }

    const geocodeMap = new Map(
      (geocodes || []).map(row => [row.postcode_norm, row]),
    )

    const results = roleMatched
      .map(candidate => {
        const postcodeNorm = normalisePostcode(candidate.postcode)
        const geo = postcodeNorm ? geocodeMap.get(postcodeNorm) : null

        let distance: number | null = null

        if (
          vacancyGeo &&
          geo &&
          geo.latitude !== null &&
          geo.longitude !== null
        ) {
          distance = distanceMiles(
            vacancyGeo.latitude,
            vacancyGeo.longitude,
            Number(geo.latitude),
            Number(geo.longitude),
          )
        }

        const existingApplication = applicationByCandidateId.get(candidate.id)
        const alreadyAdded = Boolean(existingApplication)

        const recentNotes = recentNotesByCandidateId.get(candidate.id) || []
        const latestNote = recentNotes[0] || null

        return {
          ...candidate,
          name: `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim(),
          candidate_name: `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim(),
          postcode: candidate.postcode,
          postcode_geocoded: Boolean(geo),
          distance_miles:
            distance === null ? null : Math.round(distance * 10) / 10,

          alreadyAdded,
          alreadyPresented: alreadyAdded,
          application_id: existingApplication?.id || null,
          application_status: existingApplication?.status || null,

          recent_notes: recentNotes,
          latest_note_preview: latestNote?.preview || '',
          latest_note_date: latestNote?.created_at || null,
          latest_note_type: latestNote?.type || null,

          match_reasons: [
            searchMode === 'role_standard'
              ? `Matched role + standard`
              : searchMode === 'standard'
                ? `Matched standard`
                : searchMode === 'keyword'
                  ? `Matched keyword`
                  : `Matched role`,
            roleQuery ? `Role: ${roleQuery}` : '',
            standardQuery ? `Standard: ${standardQuery}` : '',
            keywordQuery ? `Keyword: ${keywordQuery}` : '',
            distance !== null
              ? `Distance: ${Math.round(distance * 10) / 10} miles`
              : '',
            alreadyAdded
              ? `Already added to job: ${
                  existingApplication?.status || 'application'
                }`
              : '',
          ].filter(Boolean),
        }
      })
      .filter(candidate => {
        if (workType === 'remote') return true

        if (workType === 'hybrid') {
          return true
        }

        return (
          candidate.distance_miles !== null &&
          candidate.distance_miles <= radius
        )
      })
      .sort((a, b) => {
        const aDistance = a.distance_miles ?? 9999
        const bDistance = b.distance_miles ?? 9999

        return aDistance - bDistance
      })

    return NextResponse.json({
      candidates: results,
      meta: {
        vacancy_id: vacancyId || null,
        vacancy_postcode: vacancy?.postcode || null,
        vacancy_has_coordinates: Boolean(vacancyGeo),
        work_type: workType,
        radius,
        role_terms: roleTerms,
        role_matched_before_radius: roleMatched.length,
        candidates_with_postcode_geocode: results.filter(
          candidate => candidate.postcode_geocoded,
        ).length,
        candidates_with_recent_notes: results.filter(
          candidate => candidate.recent_notes?.length > 0,
        ).length,
        returned: results.length,
      },
    })
  } catch (error: any) {
    console.error('Candidate match error:', error)

    return NextResponse.json(
      {
        error: error?.message || 'Could not find candidate matches.',
      },
      { status: 500 },
    )
  }
}