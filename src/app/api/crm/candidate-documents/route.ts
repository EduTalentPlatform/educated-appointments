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

function cleanString(value: unknown) {
  const text = String(value ?? '').trim()
  return text || null
}

function buildReferenceSummary(details: Record<string, any>) {
  return [
    details.referee_name ? `Referee: ${details.referee_name}` : '',
    details.organisation ? `Organisation: ${details.organisation}` : '',
    details.relationship ? `Relationship: ${details.relationship}` : '',
    details.status ? `Status: ${details.status}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function toBooleanOrUndefined(value: unknown) {
  if (typeof value === 'boolean') return value

  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase()

    if (['true', 'yes', '1', 'confirmed'].includes(lower)) return true
    if (['false', 'no', '0'].includes(lower)) return false
  }

  return undefined
}

function getCvsStoragePathFromPublicUrl(fileUrl?: string | null) {
  const value = String(fileUrl || '').trim()

  if (!value) return null

  try {
    const url = new URL(value)

    const publicMarker = '/storage/v1/object/public/cvs/'
    const publicIndex = url.pathname.indexOf(publicMarker)

    if (publicIndex !== -1) {
      return decodeURIComponent(url.pathname.slice(publicIndex + publicMarker.length))
    }

    const signedMarker = '/storage/v1/object/sign/cvs/'
    const signedIndex = url.pathname.indexOf(signedMarker)

    if (signedIndex !== -1) {
      return decodeURIComponent(url.pathname.slice(signedIndex + signedMarker.length))
    }

    return null
  } catch {
    const fallbackMatch = value.match(/candidates\/[^?#]+/)

    if (fallbackMatch?.[0]) {
      return decodeURIComponent(fallbackMatch[0])
    }

    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    const candidateId = cleanString(body.candidate_id)
    const docType = cleanString(body.doc_type) || 'reference'

    if (!candidateId) {
      return NextResponse.json(
        { error: 'Candidate ID is required.' },
        { status: 400 },
      )
    }

    if (docType !== 'reference') {
      return NextResponse.json(
        { error: 'This endpoint only creates reference records.' },
        { status: 400 },
      )
    }

    const details = {
      referee_name: cleanString(body.referee_name),
      referee_job_title: cleanString(body.referee_job_title),
      organisation: cleanString(body.organisation),
      relationship: cleanString(body.relationship),
      email: cleanString(body.email),
      phone: cleanString(body.phone),
      reference_type: cleanString(body.reference_type),
      status: cleanString(body.status) || 'not_requested',
      requested_at: cleanString(body.requested_at),
      received_at: cleanString(body.received_at),
      notes: cleanString(body.notes),
    }

    if (!details.referee_name) {
      return NextResponse.json(
        { error: 'Referee name is required.' },
        { status: 400 },
      )
    }

    if (!details.email && !details.phone && !details.organisation) {
      return NextResponse.json(
        {
          error:
            'Please add at least an email, phone number or organisation for the referee.',
        },
        { status: 400 },
      )
    }

    const documentName =
      cleanString(body.name) ||
      `Reference - ${details.referee_name}${
        details.organisation ? ` - ${details.organisation}` : ''
      }`

    const { data, error } = await supabase
      .from('candidate_documents')
      .insert({
        candidate_id: candidateId,
        name: documentName,
        doc_type: 'reference',
        file_url: null,
        summary: buildReferenceSummary(details),
        details,
        visibility: 'internal',
        visible_to_employer: false,
        show_in_employer_portal: false,
        released: false,
        released_at: null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await supabase.from('candidate_activities').insert({
      candidate_id: candidateId,
      activity_type: 'note',
      content: [
        'Reference details added.',
        `Referee: ${details.referee_name}`,
        details.organisation ? `Organisation: ${details.organisation}` : '',
        details.relationship ? `Relationship: ${details.relationship}` : '',
        details.status ? `Status: ${details.status}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    })

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Candidate reference create error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not create reference record.' },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const id = cleanString(body.id || body.document_id || body.documentId)

    if (!id) {
      return NextResponse.json(
        { error: 'Document ID is required.' },
        { status: 400 },
      )
    }

    const updates: Record<string, any> = {}

if ('name' in body || 'document_name' in body || 'documentName' in body) {
  const documentName = cleanString(
    body.name || body.document_name || body.documentName,
  )

  if (!documentName) {
    return NextResponse.json(
      { error: 'Document name cannot be blank.' },
      { status: 400 },
    )
  }

  updates.name = documentName
}

const docType = cleanString(body.doc_type || body.docType)

    if (docType) {
      updates.doc_type = docType
    }

    if ('released' in body) {
      const released = toBooleanOrUndefined(body.released)

      if (released === undefined) {
        return NextResponse.json(
          { error: 'Released must be true or false.' },
          { status: 400 },
        )
      }

      updates.released = released
      updates.released_at = released ? new Date().toISOString() : null

      // Keep old and newer visibility fields aligned where they exist.
      updates.visible_to_employer = released
    }

    if ('visible_to_employer' in body) {
      const visibleToEmployer = toBooleanOrUndefined(body.visible_to_employer)

      if (visibleToEmployer === undefined) {
        return NextResponse.json(
          { error: 'visible_to_employer must be true or false.' },
          { status: 400 },
        )
      }

      updates.visible_to_employer = visibleToEmployer
    }

    if ('show_in_employer_portal' in body) {
      const showInEmployerPortal = toBooleanOrUndefined(
        body.show_in_employer_portal,
      )

      if (showInEmployerPortal === undefined) {
        return NextResponse.json(
          { error: 'show_in_employer_portal must be true or false.' },
          { status: 400 },
        )
      }

      updates.show_in_employer_portal = showInEmployerPortal
    }

    if ('visibility' in body) {
      updates.visibility = cleanString(body.visibility)
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No document updates were provided.' },
        { status: 400 },
      )
    }

    const supabase = getServiceClient()

    const { data, error } = await supabase
      .from('candidate_documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      )
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Candidate document update error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not update candidate document.' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const id = cleanString(body.id || body.document_id || body.documentId)

    if (!id) {
      return NextResponse.json(
        { error: 'Document ID is required.' },
        { status: 400 },
      )
    }

    const supabase = getServiceClient()

    const { data: document, error: fetchError } = await supabase
      .from('candidate_documents')
      .select('id, candidate_id, name, file_url')
      .eq('id', id)
      .single()

    if (fetchError || !document) {
      return NextResponse.json(
        { error: fetchError?.message || 'Document not found.' },
        { status: 404 },
      )
    }

    const { error: deleteError } = await supabase
      .from('candidate_documents')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 400 },
      )
    }

    const storagePath = getCvsStoragePathFromPublicUrl(document.file_url)

    let storageDeleted = false
    let storageWarning: string | null = null

    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from('cvs')
        .remove([storagePath])

      if (storageError) {
        storageWarning = storageError.message

        console.warn(
          'Candidate document row deleted, but storage file could not be removed:',
          storageError.message,
        )
      } else {
        storageDeleted = true
      }
    }

    return NextResponse.json({
      success: true,
      deleted_id: id,
      storage_deleted: storageDeleted,
      storage_warning: storageWarning,
    })
  } catch (error: any) {
    console.error('Candidate document delete error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not delete candidate document.' },
      { status: 500 },
    )
  }
}