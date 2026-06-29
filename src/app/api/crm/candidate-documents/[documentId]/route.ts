import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function getStoragePathFromPublicUrl(fileUrl?: string | null) {
  if (!fileUrl) return null

  const candidateDocumentsMarker =
    '/storage/v1/object/public/candidate-documents/'
  const cvsMarker = '/storage/v1/object/public/cvs/'

  if (fileUrl.includes(candidateDocumentsMarker)) {
    return decodeURIComponent(
      fileUrl.slice(
        fileUrl.indexOf(candidateDocumentsMarker) +
          candidateDocumentsMarker.length,
      ),
    )
  }

  if (fileUrl.includes(cvsMarker)) {
    return decodeURIComponent(
      fileUrl.slice(fileUrl.indexOf(cvsMarker) + cvsMarker.length),
    )
  }

  return null
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ documentId: string }> },
) {
  try {
    const supabase = getServiceClient()
    const { documentId } = await context.params

    const cleanDocumentId = String(documentId || '').trim()

    if (!cleanDocumentId) {
      return NextResponse.json(
        { error: 'Missing document id.' },
        { status: 400 },
      )
    }

    const { data: document, error: documentError } = await supabase
      .from('candidate_documents')
      .select(
        'id, candidate_id, name, file_url, storage_bucket, storage_path',
      )
      .eq('id', cleanDocumentId)
      .maybeSingle()

    if (documentError) {
      return NextResponse.json(
        { error: documentError.message },
        { status: 400 },
      )
    }

    if (!document) {
      return NextResponse.json(
        { error: 'Candidate document not found.' },
        { status: 404 },
      )
    }

    const storageBucket =
      document.storage_bucket ||
      (document.file_url?.includes('/candidate-documents/')
        ? 'candidate-documents'
        : document.file_url?.includes('/cvs/')
          ? 'cvs'
          : null)

    const storagePath =
      document.storage_path || getStoragePathFromPublicUrl(document.file_url)

    if (storageBucket && storagePath) {
      const { error: storageError } = await supabase.storage
        .from(storageBucket)
        .remove([storagePath])

      if (storageError) {
        console.error('Candidate document storage delete failed:', storageError)
      }
    }

    const { error: deleteError } = await supabase
      .from('candidate_documents')
      .delete()
      .eq('id', cleanDocumentId)

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 400 },
      )
    }

    return NextResponse.json({
      deleted: true,
      document,
    })
  } catch (error: any) {
    console.error('Candidate document DELETE error:', error)

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Something went wrong deleting the candidate document.',
      },
      { status: 500 },
    )
  }
}