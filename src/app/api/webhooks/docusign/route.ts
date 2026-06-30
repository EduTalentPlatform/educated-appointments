import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function requiredEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is not configured.`)
  }

  return value
}

function clean(value: unknown) {
  return String(value ?? '').trim()
}

function base64Url(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function getPrivateKey() {
  return requiredEnv('DOCUSIGN_PRIVATE_KEY').replace(/\\n/g, '\n')
}

function safeStorageName(value: string) {
  return String(value || 'document')
    .trim()
    .replace(/[^a-z0-9\-_ ]/gi, '')
    .replace(/\s+/g, '_')
    .slice(0, 80)
}

function buildJwt() {
  const now = Math.floor(Date.now() / 1000)

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  }

  const payload = {
    iss: requiredEnv('DOCUSIGN_INTEGRATION_KEY'),
    sub: requiredEnv('DOCUSIGN_USER_ID'),
    aud: requiredEnv('DOCUSIGN_AUTH_SERVER'),
    iat: now,
    exp: now + 3600,
    scope: 'signature impersonation',
  }

  const encodedHeader = base64Url(JSON.stringify(header))
  const encodedPayload = base64Url(JSON.stringify(payload))
  const signingInput = `${encodedHeader}.${encodedPayload}`

  const signature = crypto
    .createSign('RSA-SHA256')
    .update(signingInput)
    .sign(getPrivateKey())

  return `${signingInput}.${base64Url(signature)}`
}

async function getDocuSignAccessToken() {
  const authServer = requiredEnv('DOCUSIGN_AUTH_SERVER')
  const jwt = buildJwt()

  const res = await fetch(`https://${authServer}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const json = await res.json().catch(() => null)

  if (!res.ok) {
    console.error('DocuSign token error:', json)

    throw new Error(
      json?.error_description ||
        json?.error ||
        'Could not get DocuSign access token.',
    )
  }

  if (!json?.access_token) {
    throw new Error('DocuSign did not return an access token.')
  }

  return String(json.access_token)
}

function verifyDocuSignHmac(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.DOCUSIGN_CONNECT_HMAC_SECRET

  if (!secret) {
    return true
  }

  if (!signatureHeader) {
    return false
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64')

  const actualBuffer = Buffer.from(signatureHeader)
  const expectedBuffer = Buffer.from(expected)

  if (actualBuffer.length !== expectedBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(actualBuffer, expectedBuffer)
}

function getNestedValue(source: any, paths: string[]) {
  for (const path of paths) {
    const value = path
      .split('.')
      .reduce((current, key) => current?.[key], source)

    if (value) return value
  }

  return null
}

function parseDocuSignPayload(rawBody: string) {
  try {
    const json = JSON.parse(rawBody)

    const envelopeId = clean(
      getNestedValue(json, [
        'data.envelopeId',
        'data.envelopeID',
        'envelopeId',
        'envelopeID',
        'envelopeStatus.envelopeId',
        'envelopeStatus.envelopeID',
        'EnvelopeStatus.EnvelopeID',
        'EnvelopeStatus.envelopeId',
      ]),
    )

    const status = clean(
      getNestedValue(json, [
        'event',
        'data.envelopeStatus',
        'data.status',
        'status',
        'envelopeStatus.status',
        'EnvelopeStatus.Status',
      ]),
    ).toLowerCase()

    return {
      envelopeId,
      status,
      completed: status.includes('completed'),
    }
  } catch {
    const envelopeId =
      rawBody.match(/<EnvelopeID>([^<]+)<\/EnvelopeID>/i)?.[1] ||
      rawBody.match(/<EnvelopeId>([^<]+)<\/EnvelopeId>/i)?.[1] ||
      rawBody.match(/<envelopeId>([^<]+)<\/envelopeId>/i)?.[1] ||
      ''

    const status =
      rawBody.match(/<Status>([^<]+)<\/Status>/i)?.[1] ||
      rawBody.match(/<status>([^<]+)<\/status>/i)?.[1] ||
      ''

    return {
      envelopeId: clean(envelopeId),
      status: clean(status).toLowerCase(),
      completed: clean(status).toLowerCase() === 'completed',
    }
  }
}

async function downloadSignedEnvelopePdf(envelopeId: string) {
  const accessToken = await getDocuSignAccessToken()
  const basePath = requiredEnv('DOCUSIGN_BASE_PATH').replace(/\/$/, '')
  const accountId = requiredEnv('DOCUSIGN_ACCOUNT_ID')

  const res = await fetch(
    `${basePath}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/documents/combined`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )

  if (!res.ok) {
    const text = await res.text().catch(() => '')

    console.error('DocuSign signed PDF download error:', text)

    throw new Error(
      text || 'Could not download completed DocuSign document.',
    )
  }

  const arrayBuffer = await res.arrayBuffer()

  return Buffer.from(arrayBuffer)
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signatureHeader = request.headers.get('x-docusign-signature-1')

    const validHmac = verifyDocuSignHmac(rawBody, signatureHeader)

    if (!validHmac) {
      return NextResponse.json(
        { error: 'Invalid DocuSign webhook signature.' },
        { status: 401 },
      )
    }

    const payload = parseDocuSignPayload(rawBody)

    if (!payload.envelopeId) {
      console.error('DocuSign webhook missing envelope ID:', rawBody)

      return NextResponse.json(
        { received: true, ignored: true, reason: 'Missing envelope ID.' },
        { status: 200 },
      )
    }

    if (!payload.completed) {
      return NextResponse.json({
        received: true,
        ignored: true,
        envelopeId: payload.envelopeId,
        status: payload.status,
      })
    }

    const supabase = getServiceClient()

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select(
        'id, company_name, tob_url, tob_signed, docusign_tob_envelope_id, docusign_tob_signed_at',
      )
      .eq('docusign_tob_envelope_id', payload.envelopeId)
      .maybeSingle()

    if (clientError) {
      throw new Error(clientError.message)
    }

    if (!client) {
      console.error(
        `DocuSign completed envelope could not be matched to a client: ${payload.envelopeId}`,
      )

      return NextResponse.json({
        received: true,
        ignored: true,
        reason: 'No matching client found.',
        envelopeId: payload.envelopeId,
      })
    }

    if (client.tob_signed && client.docusign_tob_signed_at) {
      return NextResponse.json({
        received: true,
        alreadyProcessed: true,
        clientId: client.id,
        envelopeId: payload.envelopeId,
      })
    }

    const signedPdf = await downloadSignedEnvelopePdf(payload.envelopeId)

    const storageBucket = 'client-documents'
    const storagePath = `${client.id}/terms-of-business/signed_${safeStorageName(
      client.company_name,
    )}_${payload.envelopeId}.pdf`

    const { error: uploadError } = await supabase.storage
      .from(storageBucket)
      .upload(storagePath, signedPdf, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      throw new Error(
        uploadError.message ||
          'Signed DocuSign PDF could not be saved to storage.',
      )
    }

    const {
      data: { publicUrl: signedTobUrl },
    } = supabase.storage.from(storageBucket).getPublicUrl(storagePath)

    const signedAt = new Date().toISOString()

    const { error: updateError } = await supabase
      .from('clients')
      .update({
        tob_url: signedTobUrl,
        tob_signed: true,
        docusign_tob_status: 'completed',
        docusign_tob_signed_at: signedAt,
        updated_at: signedAt,
      })
      .eq('id', client.id)

    if (updateError) {
      throw new Error(updateError.message)
    }

    await supabase.from('client_activities').insert({
      client_id: client.id,
      activity_type: 'email',
      direction: 'inbound',
      content: [
        'Terms of Business completed via DocuSign.',
        `Signed PDF saved to client documents.`,
        `DocuSign envelope ID: ${payload.envelopeId}`,
      ].join('\n'),
    })

    return NextResponse.json({
      received: true,
      saved: true,
      clientId: client.id,
      envelopeId: payload.envelopeId,
      signedTobUrl,
      storageBucket,
      storagePath,
    })
  } catch (error: any) {
    console.error('DocuSign webhook error:', error)

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Could not process DocuSign webhook.',
      },
      { status: 500 },
    )
  }
}