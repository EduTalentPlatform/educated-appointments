import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SIGNED_URL_SECONDS = 60 * 5

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function clean(value: unknown) {
  return String(value ?? '').trim()
}

async function requirePortalUser() {
  const authSupabase = await createServerClient()

  const {
    data: { user },
  } = await authSupabase.auth.getUser()

  if (!user) return null

  const supabase = getServiceClient()

  const { data: portalUser } = await supabase
    .from('client_portal_users')
    .select('*')
    .eq('auth_user_id', user.id)
    .eq('active', true)
    .maybeSingle()

  return portalUser
}

function getStoragePathFromSupabaseUrl(fileUrl?: string | null) {
  const value = String(fileUrl || '').trim()

  if (!value) return null

  try {
    const url = new URL(value)

    const publicMarker = '/storage/v1/object/public/'
    const signedMarker = '/storage/v1/object/sign/'

    const publicIndex = url.pathname.indexOf(publicMarker)

    if (publicIndex !== -1) {
      const rest = decodeURIComponent(
        url.pathname.slice(publicIndex + publicMarker.length),
      )

      const [bucket, ...pathParts] = rest.split('/')

      if (bucket && pathParts.length > 0) {
        return {
          bucket,
          path: pathParts.join('/'),
        }
      }
    }

    const signedIndex = url.pathname.indexOf(signedMarker)

    if (signedIndex !== -1) {
      const rest = decodeURIComponent(
        url.pathname.slice(signedIndex + signedMarker.length),
      )

      const [bucket, ...pathParts] = rest.split('/')

      if (bucket && pathParts.length > 0) {
        return {
          bucket,
          path: pathParts.join('/'),
        }
      }
    }

    return null
  } catch {
    return null
  }
}

function getDocumentStorageInfo(document: {
  file_url?: string | null
  storage_bucket?: string | null
  storage_path?: string | null
}) {
  if (document.storage_bucket && document.storage_path) {
    return {
      bucket: document.storage_bucket,
      path: document.storage_path,
    }
  }

  return getStoragePathFromSupabaseUrl(document.file_url)
}

const PRE_RELEASE_EMPLOYER_DOC_TYPES = new Set([
  'formatted_cv',
  'candidate_profile',
  'profile',
  'interview_prep',
])

const SENSITIVE_EMPLOYER_DOC_TYPES = new Set([
  'cv',
  'qualification',
  'qualifications',
  'certificate',
  'certificates',
  'right_to_work',
  'dbs',
  'reference',
  'gdpr_acceptance',
  'identity',
  'passport',
  'other',
])

function normaliseDocType(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function candidateDocumentCanBeViewedByEmployer(document: any) {
  const docType = normaliseDocType(document.doc_type)

  const isReleased =
    document.visible_to_employer === true &&
    document.released === true

  // The formatted CV is the employer-facing submission document.
  // Once an employer has access to the submitted candidate, they can view this
  // before offer. Supporting evidence remains locked unless deliberately released.
  if (docType === 'formatted_cv') {
    return true
  }

  if (docType === 'candidate_profile' || docType === 'profile') {
    return document.show_in_employer_portal === true || isReleased
  }

  if (docType === 'interview_prep') {
    return document.show_in_employer_portal === true || isReleased
  }

  // Sensitive evidence should only be downloadable after deliberate release.
  if (SENSITIVE_EMPLOYER_DOC_TYPES.has(docType)) {
    return isReleased
  }

  // Anything unknown should default to the safer rule.
  return isReleased
}

async function createDocumentResponse({
  supabase,
  document,
}: {
  supabase: ReturnType<typeof getServiceClient>
  document: any
}) {
  const storageInfo = getDocumentStorageInfo(document)

  if (storageInfo?.bucket && storageInfo?.path) {
    const { data, error } = await supabase.storage
      .from(storageInfo.bucket)
      .createSignedUrl(storageInfo.path, SIGNED_URL_SECONDS)

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        {
          error:
            error?.message ||
            'Could not create a secure document link.',
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      url: data.signedUrl,
      name: document.name,
      expires_in: SIGNED_URL_SECONDS,
      is_signed_url: true,
    })
  }

  if (document.file_url) {
    return NextResponse.json({
      url: document.file_url,
      name: document.name,
      expires_in: null,
      is_signed_url: false,
      warning: 'Using legacy public file URL.',
    })
  }

  return NextResponse.json(
    { error: 'No document file is attached.' },
    { status: 404 },
  )
}

export async function POST(request: Request) {
  try {
    const portalUser = await requirePortalUser()

    if (!portalUser) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = await request.json()

    const documentId = clean(body.document_id || body.id)
    const documentKind = clean(body.document_kind || body.kind || 'candidate')
    const vacancyId = clean(body.vacancy_id)
    const applicationId = clean(body.application_id)

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required.' },
        { status: 400 },
      )
    }

    if (!vacancyId) {
      return NextResponse.json(
        { error: 'Vacancy ID is required.' },
        { status: 400 },
      )
    }

    if (!['candidate', 'vacancy'].includes(documentKind)) {
      return NextResponse.json(
        { error: 'Invalid document kind.' },
        { status: 400 },
      )
    }

    const supabase = getServiceClient()

    const { data: access } = await supabase
      .from('portal_vacancy_access')
      .select('*')
      .eq('portal_user_id', portalUser.id)
      .eq('vacancy_id', vacancyId)
      .eq('can_view_vacancy', true)
      .maybeSingle()

    if (!access) {
      return NextResponse.json(
        { error: 'You do not have access to this vacancy.' },
        { status: 403 },
      )
    }

    if (documentKind === 'vacancy') {
      if (access.can_view_documents !== true) {
        return NextResponse.json(
          { error: 'You do not have access to this document.' },
          { status: 403 },
        )
      }

      const { data: document, error } = await supabase
        .from('vacancy_documents')
        .select(
          `
          id,
          vacancy_id,
          name,
          file_url,
          storage_bucket,
          storage_path
        `,
        )
        .eq('id', documentId)
        .eq('vacancy_id', vacancyId)
        .maybeSingle()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      if (!document) {
        return NextResponse.json(
          { error: 'Document not found.' },
          { status: 404 },
        )
      }

      return createDocumentResponse({ supabase, document })
    }

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required for candidate documents.' },
        { status: 400 },
      )
    }

    const { data: application } = await supabase
      .from('applications')
      .select('id, vacancy_id, candidate_id, status')
      .eq('id', applicationId)
      .eq('vacancy_id', vacancyId)
      .maybeSingle()

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found.' },
        { status: 404 },
      )
    }

    const { data: document, error } = await supabase
      .from('candidate_documents')
      .select(
        `
        id,
        candidate_id,
        name,
        doc_type,
        file_url,
        storage_bucket,
        storage_path,
        show_in_employer_portal,
        visible_to_employer,
        released
      `,
      )
      .eq('id', documentId)
      .eq('candidate_id', application.candidate_id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found.' },
        { status: 404 },
      )
    }

    const docType = normaliseDocType(document.doc_type)

    const submittedStatuses = new Set([
      'submitted',
      'presented',
      'client_interview',
      'offer',
      'placed',
    ])

    const isSubmittedApplication = submittedStatuses.has(
      normaliseDocType(application.status),
    )

    if (docType === 'formatted_cv') {
      if (access.can_view_submissions !== true || !isSubmittedApplication) {
        return NextResponse.json(
          { error: 'You do not have access to this CV.' },
          { status: 403 },
        )
      }

      return createDocumentResponse({ supabase, document })
    }

    const { data: placementForApplication } = await supabase
      .from('placements')
      .select('id')
      .eq('application_id', application.id)
      .maybeSingle()

    const isPlacedApplication =
      normaliseDocType(application.status) === 'placed' ||
      Boolean(placementForApplication?.id)

    if (isPlacedApplication && access.can_view_submissions === true) {
      return createDocumentResponse({ supabase, document })
    }

    return NextResponse.json(
      { error: 'This document has not been released to the employer.' },
      { status: 403 },
    )

  } catch (error: any) {
    console.error('Employer portal document signed URL error:', error)

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Could not create a secure document link.',
      },
      { status: 500 },
    )
  }
}