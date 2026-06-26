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

function normaliseRoleValue(value: unknown) {
  return clean(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\s+/g, ' ')
}

function splitStoredRoleValues(value: unknown): unknown[] {
  if (Array.isArray(value)) return value

  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
  }

  const text = clean(value)

  if (!text) return []

  return text
    .split(/[,|;\n]/)
    .map(item => item.trim())
    .filter(Boolean)
}

function fieldMatchesExactRole(value: unknown, selectedRole: string): boolean {
  const selected = normaliseRoleValue(selectedRole)

  if (!selected) return true

  const storedValues = splitStoredRoleValues(value)

  if (storedValues.length === 0) return false

  return storedValues.some(item => {
    if (Array.isArray(item) || (item && typeof item === 'object')) {
      return fieldMatchesExactRole(item, selectedRole)
    }

    return normaliseRoleValue(item) === selected
  })
}

function candidateMatchesExactRole({
  candidate,
  selectedMainRoleType,
  selectedSpecificRole,
}: {
  candidate: any
  selectedMainRoleType: string
  selectedSpecificRole: string
}) {
  const mainRole = normaliseRoleValue(selectedMainRoleType)
  const specificRole = normaliseRoleValue(selectedSpecificRole)

  if (mainRole && normaliseRoleValue(candidate.main_role_type) !== mainRole) {
    return false
  }

  if (!specificRole) return true

  return [
    candidate.sub_role_type,
    candidate.seeking_role_type,
    candidate.looking_for_roles,
  ].some(value => fieldMatchesExactRole(value, selectedSpecificRole))
}

function splitLooseTerms(value: unknown) {
  return String(value || '')
    .split(/[,|\n]/)
    .map(term => term.trim().toLowerCase())
    .filter(Boolean)
}

function candidateMatchesStandard(candidate: any, standardQuery: string) {
  const standardTerms = splitLooseTerms(standardQuery)

  if (standardTerms.length === 0) return true

  const standardText = [
    candidate.can_deliver,
    candidate.qualifications,
    candidate.notes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return standardTerms.some(term => standardText.includes(term))
}

function candidateMatchesKeyword(candidate: any, keywordQuery: string) {
  const keywordTerms = splitLooseTerms(keywordQuery)

  if (keywordTerms.length === 0) return true

  const fullText = [
    candidate.job_title,
    candidate.main_role_type,
    candidate.sub_role_type,
    candidate.seeking_role_type,
    Array.isArray(candidate.looking_for_roles)
      ? candidate.looking_for_roles.join(' ')
      : candidate.looking_for_roles,
    candidate.can_deliver,
    candidate.qualifications,
    candidate.notes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return keywordTerms.some(term => fullText.includes(term))
}

function candidateMatchesSelectedSearch({
  candidate,
  searchMode,
  selectedMainRoleType,
  selectedSpecificRole,
  standardQuery,
  keywordQuery,
}: {
  candidate: any
  searchMode: string
  selectedMainRoleType: string
  selectedSpecificRole: string
  standardQuery: string
  keywordQuery: string
}) {
  const roleMatches = candidateMatchesExactRole({
    candidate,
    selectedMainRoleType,
    selectedSpecificRole,
  })

  const standardMatches = candidateMatchesStandard(candidate, standardQuery)
  const keywordMatches = candidateMatchesKeyword(candidate, keywordQuery)

  if (searchMode === 'role') return roleMatches
  if (searchMode === 'standard') return standardMatches
  if (searchMode === 'keyword') return keywordMatches

  return roleMatches && standardMatches
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

    const selectedMainRoleType = clean(
      body.mainRoleType ||
        body.main_role_type ||
        body.roleMainType ||
        body.role_main_type ||
        '',
    )

    const selectedSpecificRole = clean(
      body.specificRole ||
        body.specific_role ||
        body.subRoleType ||
        body.sub_role_type ||
        body.roleQuery ||
        body.roleType ||
        '',
    )

    const roleQuery = selectedSpecificRole
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
        return NextResponse.json({ error: error.message }, { status: 400 })
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
        status,
        created_at
      `)
      .or('status.in.(active,passive),status.is.null,actively_looking.eq.true')
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
        selectedMainRoleType,
        selectedSpecificRole,
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
        .map((application: any) => [application.candidate_id, application]),
    )

    const candidatePostcodeNorms = Array.from(
      new Set(
        roleMatched
          .map(candidate => normalisePostcode(candidate.postcode))
          .filter(Boolean),
      ),
    )

    const { data: cachedGeocodes, error: geocodeError } =
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
      (cachedGeocodes || []).map(row => [row.postcode_norm, row]),
    )

    const missingPostcodeNorms = candidatePostcodeNorms.filter(
      postcodeNorm => !geocodeMap.has(postcodeNorm),
    )

    if (missingPostcodeNorms.length > 0) {
      const newlyGeocoded = await Promise.all(
        missingPostcodeNorms.map(postcodeNorm =>
          getOrCreatePostcodeGeocode(supabase, postcodeNorm),
        ),
      )

      for (const geo of newlyGeocoded) {
        if (geo?.postcode_norm) {
          geocodeMap.set(geo.postcode_norm, geo)
        }
      }
    }

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
          name: `${candidate.first_name || ''} ${
            candidate.last_name || ''
          }`.trim(),
          candidate_name: `${candidate.first_name || ''} ${
            candidate.last_name || ''
          }`.trim(),
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
              ? 'Matched role + standard'
              : searchMode === 'standard'
                ? 'Matched standard'
                : searchMode === 'keyword'
                  ? 'Matched keyword'
                  : 'Matched role',
            selectedMainRoleType ? `Main role: ${selectedMainRoleType}` : '',
            selectedSpecificRole ? `Specific role: ${selectedSpecificRole}` : '',
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

        if (workType === 'hybrid') return true

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
        selected_main_role_type: selectedMainRoleType || null,
        selected_specific_role: selectedSpecificRole || null,
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