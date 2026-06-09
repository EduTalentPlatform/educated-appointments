import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type DuplicateMatchType = 'email' | 'phone' | 'linkedin'

type DuplicateCandidateRow = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  linkedin: string | null
  can_deliver?: string | null
  created_at: string | null
}

function getServiceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function cleanText(value: unknown) {
  const text = String(value ?? '').trim()
  return text.length > 0 ? text : null
}

function normaliseEmail(value: unknown) {
  const email = cleanText(value)?.toLowerCase() || null
  return email && email.includes('@') ? email : null
}

function normalisePhoneDigits(value: unknown) {
  const digits = String(value ?? '').replace(/\D/g, '')

  if (digits.length < 7) return null

  if (digits.startsWith('44') && digits.length >= 11) {
    return `0${digits.slice(2)}`
  }

  return digits
}

function normaliseLinkedIn(value: unknown) {
  const raw = cleanText(value)
  if (!raw) return null

  return raw
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('?')[0]
    .split('#')[0]
    .replace(/\/$/, '')
}

async function lookupPostcode(postcode?: string | null) {
  if (!postcode) return { lat: null, lng: null }

  try {
    const cleanPostcode = postcode.replace(/\s/g, '').toUpperCase()

    const res = await fetch(
      `https://api.postcodes.io/postcodes/${cleanPostcode}`,
    )

    const data = await res.json()

    if (data.status === 200) {
      return {
        lat: data.result.latitude,
        lng: data.result.longitude,
      }
    }
  } catch {}

  return { lat: null, lng: null }
}

function splitStandards(value: unknown) {
  return String(value ?? '')
    .split(/[,|\n]/)
    .map(item => item.trim())
    .filter(Boolean)
}

function mergeStandards(existing: unknown, incoming: unknown) {
  const seen = new Set<string>()
  const merged: string[] = []

  for (const standard of [...splitStandards(existing), ...splitStandards(incoming)]) {
    const key = standard.toLowerCase()

    if (!seen.has(key)) {
      seen.add(key)
      merged.push(standard)
    }
  }

  return merged.join(', ')
}

async function addImportedStandardsToDuplicate(
  supabase: SupabaseClient,
  candidate: DuplicateCandidateRow,
  incomingCanDeliver: unknown,
) {
  const incomingStandards = splitStandards(incomingCanDeliver)

  if (incomingStandards.length === 0) {
    return {
      candidate,
      standardsUpdated: false,
      addedStandards: [],
    }
  }

  const existingStandards = splitStandards(candidate.can_deliver)
  const existingKeys = new Set(existingStandards.map(item => item.toLowerCase()))

  const addedStandards = incomingStandards.filter(
    standard => !existingKeys.has(standard.toLowerCase()),
  )

  if (addedStandards.length === 0) {
    return {
      candidate,
      standardsUpdated: false,
      addedStandards: [],
    }
  }

  const nextCanDeliver = mergeStandards(candidate.can_deliver, incomingCanDeliver)

  const { data, error } = await supabase
    .from('candidates')
    .update({
      can_deliver: nextCanDeliver,
      updated_at: new Date().toISOString(),
    })
    .eq('id', candidate.id)
    .select('id, first_name, last_name, email, phone, linkedin, can_deliver, created_at')
    .single()

  if (error) throw error

  return {
    candidate: data as DuplicateCandidateRow,
    standardsUpdated: true,
    addedStandards,
  }
}

function normaliseLookingForRoles(value: unknown, fallbackRole?: string | null) {
  if (Array.isArray(value)) {
    return value
      .map(item => String(item || '').trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  }

  if (fallbackRole) {
    return [fallbackRole].filter(Boolean)
  }

  return []
}

function normaliseRightToWork(value: unknown) {
  if (value === true) return true
  if (value === false) return false

  if (value === null || value === undefined || value === '') {
    return null
  }

  if (typeof value === 'string') {
    const normalised = value.toLowerCase().trim()

    if (
      ['true', 'yes', 'confirmed', '1', 'seen', 'evidence_seen'].includes(
        normalised,
      )
    ) {
      return true
    }

    if (
      ['false', 'no', 'not_confirmed', '0', 'not seen', 'not_seen'].includes(
        normalised,
      )
    ) {
      return false
    }
  }

  return null
}

function getStoragePathFromPublicUrl(fileUrl?: string | null) {
  if (!fileUrl) return null

  const candidateDocumentsMarker = '/storage/v1/object/public/candidate-documents/'
  const cvsMarker = '/storage/v1/object/public/cvs/'

  if (fileUrl.includes(candidateDocumentsMarker)) {
    return decodeURIComponent(
      fileUrl.slice(fileUrl.indexOf(candidateDocumentsMarker) + candidateDocumentsMarker.length),
    )
  }

  if (fileUrl.includes(cvsMarker)) {
    return decodeURIComponent(
      fileUrl.slice(fileUrl.indexOf(cvsMarker) + cvsMarker.length),
    )
  }

  return null
}

async function findExistingCandidate(
  supabase: SupabaseClient,
  values: {
    email: string | null
    phoneDigits: string | null
    linkedin: string | null
  },
): Promise<{
  candidate: DuplicateCandidateRow
  matchedOn: DuplicateMatchType
} | null> {
  const selectFields =
  'id, first_name, last_name, email, phone, linkedin, can_deliver, created_at'

  if (values.email) {
    const { data, error } = await supabase
      .from('candidates')
      .select(selectFields)
      .ilike('email', values.email)
      .limit(1)

    if (error) throw error

    const rows = (data ?? []) as DuplicateCandidateRow[]

    if (rows[0]) {
      return {
        candidate: rows[0],
        matchedOn: 'email',
      }
    }
  }

  if (values.linkedin || values.phoneDigits) {
    const { data, error } = await supabase
      .from('candidates')
      .select(selectFields)
      .limit(10000)

    if (error) throw error

    const rows = (data ?? []) as DuplicateCandidateRow[]

    const match = rows.find(candidate => {
      const candidateLinkedIn = normaliseLinkedIn(candidate.linkedin)
      const candidatePhoneDigits = normalisePhoneDigits(candidate.phone)

      return (
        Boolean(values.linkedin && candidateLinkedIn === values.linkedin) ||
        Boolean(values.phoneDigits && candidatePhoneDigits === values.phoneDigits)
      )
    })

    if (match) {
      const matchedOn: DuplicateMatchType =
        values.linkedin && normaliseLinkedIn(match.linkedin) === values.linkedin
          ? 'linkedin'
          : 'phone'

      return {
        candidate: match,
        matchedOn,
      }
    }
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    const firstName = cleanText(body.first_name)
    const lastName = cleanText(body.last_name)
    const email = normaliseEmail(body.email)
    const phone = cleanText(body.phone)
    const phoneDigits = normalisePhoneDigits(body.phone)
    const linkedin = cleanText(body.linkedin)
    const linkedinKey = normaliseLinkedIn(body.linkedin)

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required.' },
        { status: 400 },
      )
    }

    if (!email && !phoneDigits && !linkedinKey) {
      return NextResponse.json(
        {
          error:
            'Please add at least one contact method: email, phone or LinkedIn URL.',
        },
        { status: 400 },
      )
    }

    const duplicate = await findExistingCandidate(supabase, {
      email,
      phoneDigits,
      linkedin: linkedinKey,
    })

    if (duplicate?.candidate) {
  const duplicateUpdate = await addImportedStandardsToDuplicate(
    supabase,
    duplicate.candidate,
    body.can_deliver,
  )

  return NextResponse.json({
    data: duplicateUpdate.candidate,
    duplicate: true,
    standards_updated: duplicateUpdate.standardsUpdated,
    added_standards: duplicateUpdate.addedStandards,
    match: {
      matchedOn: duplicate.matchedOn,
      candidate: duplicateUpdate.candidate,
    },
  })
}

    const { lat, lng } = await lookupPostcode(body.postcode)
    const primaryRole = body.seeking_role_type || body.sub_role_type || null

    const { data, error } = await supabase
      .from('candidates')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        job_title: cleanText(body.job_title),

        main_role_type: cleanText(body.main_role_type),
        sub_role_type: cleanText(body.sub_role_type),
        seeking_role_type: primaryRole,
        looking_for_roles: normaliseLookingForRoles(
          body.looking_for_roles,
          primaryRole,
        ),

        preferred_location: cleanText(body.preferred_location),
        address_line_1: cleanText(body.address_line_1),
        address_line_2: cleanText(body.address_line_2),
        town_city: cleanText(body.town_city),
        county: cleanText(body.county),
        postcode: cleanText(body.postcode),
        lat,
        lng,

        source: cleanText(body.source) || 'crm',
        status: cleanText(body.status) || 'active',
        notes: cleanText(body.notes),
        actively_looking:
          body.status === 'active'
            ? true
            : body.status === 'passive'
              ? false
              : body.actively_looking ?? true,
        work_type_pref: cleanText(body.work_type_pref),
        linkedin,

        can_deliver: cleanText(body.can_deliver),
        qualifications: cleanText(body.qualifications),
        dbs_status: cleanText(body.dbs_status),

        current_salary: cleanText(body.current_salary),
        salary_expected: cleanText(body.salary_expected),
        salary_notes: cleanText(body.salary_notes),
        notice_period: cleanText(body.notice_period),

        right_to_work: normaliseRightToWork(body.right_to_work),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data, duplicate: false })
  } catch (err: any) {
    console.error('Candidate POST error:', err)

    return NextResponse.json(
      { error: err?.message || 'Something went wrong creating the candidate.' },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    if (!body.id) {
      return NextResponse.json(
        { error: 'Missing candidate id.' },
        { status: 400 },
      )
    }

    const { lat, lng } = await lookupPostcode(body.postcode)
    const primaryRole = body.seeking_role_type || body.sub_role_type || null

    const updates = {
      first_name: cleanText(body.first_name),
      last_name: cleanText(body.last_name),
      email: normaliseEmail(body.email),
      phone: cleanText(body.phone),
      job_title: cleanText(body.job_title),

      main_role_type: cleanText(body.main_role_type),
      sub_role_type: cleanText(body.sub_role_type),
      seeking_role_type: primaryRole,
      looking_for_roles: normaliseLookingForRoles(
        body.looking_for_roles,
        primaryRole,
      ),

      preferred_location: cleanText(body.preferred_location),
      address_line_1: cleanText(body.address_line_1),
      address_line_2: cleanText(body.address_line_2),
      town_city: cleanText(body.town_city),
      county: cleanText(body.county),
      postcode: cleanText(body.postcode),
      lat,
      lng,

      source: cleanText(body.source),
      status: cleanText(body.status) || 'active',
      notes: cleanText(body.notes),
      actively_looking:
        body.status === 'active'
          ? true
          : body.status === 'passive'
            ? false
            : body.actively_looking ?? true,
      work_type_pref: cleanText(body.work_type_pref),
      linkedin: cleanText(body.linkedin),

      can_deliver: cleanText(body.can_deliver),
      qualifications: cleanText(body.qualifications),
      dbs_status: cleanText(body.dbs_status),
      current_salary: cleanText(body.current_salary),
      salary_expected: cleanText(body.salary_expected),
      salary_notes: cleanText(body.salary_notes),
      notice_period: cleanText(body.notice_period),
      right_to_work: normaliseRightToWork(body.right_to_work),
    }

    const { data, error } = await supabase
      .from('candidates')
      .update(updates)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('Candidate PATCH error:', err)

    return NextResponse.json(
      { error: err?.message || 'Something went wrong updating the candidate.' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    const candidateId = String(body.id || '').trim()

    if (!candidateId) {
      return NextResponse.json(
        { error: 'Missing candidate id.' },
        { status: 400 },
      )
    }

    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('id, first_name, last_name, email')
      .eq('id', candidateId)
      .maybeSingle()

    if (candidateError) {
      return NextResponse.json(
        { error: candidateError.message },
        { status: 400 },
      )
    }

    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate not found.' },
        { status: 404 },
      )
    }

    const { count: applicationCount, error: applicationError } = await supabase
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('candidate_id', candidateId)

    if (applicationError) {
      return NextResponse.json(
        { error: applicationError.message },
        { status: 400 },
      )
    }

    if ((applicationCount || 0) > 0) {
      return NextResponse.json(
        {
          error:
            'This candidate cannot be deleted because they are linked to one or more applications.',
          applicationCount,
        },
        { status: 409 },
      )
    }

    const { data: documents, error: documentsError } = await supabase
      .from('candidate_documents')
      .select('id, file_url')
      .eq('candidate_id', candidateId)

    if (documentsError) {
      return NextResponse.json(
        { error: documentsError.message },
        { status: 400 },
      )
    }

    const storagePaths = (documents || [])
      .map(doc => getStoragePathFromPublicUrl(doc.file_url))
      .filter((path): path is string => Boolean(path))

    if (storagePaths.length > 0) {
      await supabase.storage.from('candidate-documents').remove(storagePaths)
      await supabase.storage.from('cvs').remove(storagePaths)
    }

    const { error: taskDeleteError } = await supabase
      .from('candidate_tasks')
      .delete()
      .eq('candidate_id', candidateId)

    if (taskDeleteError) {
      return NextResponse.json(
        { error: taskDeleteError.message },
        { status: 400 },
      )
    }

    const { error: activityDeleteError } = await supabase
      .from('candidate_activities')
      .delete()
      .eq('candidate_id', candidateId)

    if (activityDeleteError) {
      return NextResponse.json(
        { error: activityDeleteError.message },
        { status: 400 },
      )
    }

    const { error: documentDeleteError } = await supabase
      .from('candidate_documents')
      .delete()
      .eq('candidate_id', candidateId)

    if (documentDeleteError) {
      return NextResponse.json(
        { error: documentDeleteError.message },
        { status: 400 },
      )
    }

    const { error: deleteError } = await supabase
      .from('candidates')
      .delete()
      .eq('id', candidateId)

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 400 },
      )
    }

    return NextResponse.json({
      deleted: true,
      candidate,
    })
  } catch (err: any) {
    console.error('Candidate DELETE error:', err)

    return NextResponse.json(
      { error: err?.message || 'Something went wrong deleting the candidate.' },
      { status: 500 },
    )
  }
}