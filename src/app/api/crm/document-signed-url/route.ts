import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SIGNED_URL_SECONDS = 60 * 5

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function clean(value: unknown) {
  return String(value ?? '').trim()
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const documentId = clean(body.document_id || body.id)
    const documentKind = clean(body.document_kind || body.kind || 'candidate')

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required.' },
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

    const table =
      documentKind === 'vacancy' ? 'vacancy_documents' : 'candidate_documents'

    const { data: document, error } = await supabase
      .from(table)
      .select('id, name, file_url, storage_bucket, storage_path')
      .eq('id', documentId)
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

    const storageInfo = getDocumentStorageInfo(document)

    if (storageInfo?.bucket && storageInfo?.path) {
      const { data, error: signedError } = await supabase.storage
        .from(storageInfo.bucket)
        .createSignedUrl(storageInfo.path, SIGNED_URL_SECONDS)

      if (signedError || !data?.signedUrl) {
        return NextResponse.json(
          {
            error:
              signedError?.message ||
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
  } catch (error: any) {
    console.error('CRM document signed URL error:', error)

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