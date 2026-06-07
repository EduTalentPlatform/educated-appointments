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

const allowedDocumentTypes = [
  'cv',
  'qualification',
  'right_to_work',
  'dbs',
  'reference',
  'interview_prep',
  'gdpr_acceptance',
  'other',
]

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    const candidateId = String(body.candidate_id || '').trim()
    const message = String(body.message || '').trim() || null

    const requestedDocumentTypes = Array.isArray(body.requested_document_types)
      ? body.requested_document_types
          .map((item: unknown) => String(item || '').trim())
          .filter((item: string) => allowedDocumentTypes.includes(item))
      : []

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

    const { data: uploadLink, error } = await supabase
      .from('candidate_upload_links')
      .insert({
        candidate_id: candidateId,
        requested_document_types: requestedDocumentTypes,
        message,
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const uploadUrl = `${getSiteUrl()}/candidate-portal/upload/${uploadLink.token}`

    return NextResponse.json({
      uploadLink,
      uploadUrl,
      candidate,
    })
  } catch (error) {
    console.error('Create candidate upload link error:', error)

    return NextResponse.json(
      { error: 'Something went wrong creating the upload link.' },
      { status: 500 },
    )
  }
}