import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function requireUser() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
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

function buildTobDocumentText({
  tobText,
  clientName,
}: {
  tobText: string
  clientName: string
}) {
  return `${tobText}






SIGNED FOR AND ON BEHALF OF ${clientName.toUpperCase()}

Signature: /sn1/

Name:

Title:

Date:
`
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)

    const clientId = clean(body?.client_id)
    const signerName = clean(body?.signer_name)
    const signerEmail = clean(body?.signer_email).toLowerCase()
    const tobText = clean(body?.tob_text)

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required.' },
        { status: 400 },
      )
    }

    if (!signerName) {
      return NextResponse.json(
        { error: 'Signer name is required.' },
        { status: 400 },
      )
    }

    if (!signerEmail) {
      return NextResponse.json(
        { error: 'Signer email is required.' },
        { status: 400 },
      )
    }

    if (!tobText) {
      return NextResponse.json(
        { error: 'Terms of Business text is required.' },
        { status: 400 },
      )
    }

    const supabase = getServiceClient()

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, company_name')
      .eq('id', clientId)
      .maybeSingle()

    if (clientError || !client) {
      return NextResponse.json(
        {
          error:
            clientError?.message ||
            'Could not find this client before sending DocuSign.',
        },
        { status: 404 },
      )
    }

    const accessToken = await getDocuSignAccessToken()

    const documentText = buildTobDocumentText({
      tobText,
      clientName: client.company_name,
    })

    const envelopePayload = {
      emailSubject: `Educated Appointments Terms of Business - ${client.company_name}`,
      emailBlurb: `Hi ${signerName.split(/\s+/)[0] || 'there'},

Please review and sign the Educated Appointments Terms of Business via DocuSign.

Kind regards,

Joe
Educated Appointments`,
      documents: [
        {
          documentBase64: Buffer.from(documentText, 'utf8').toString('base64'),
          name: `Terms of Business - ${client.company_name}.txt`,
          fileExtension: 'txt',
          documentId: '1',
        },
      ],
      recipients: {
        signers: [
          {
            email: signerEmail,
            name: signerName,
            recipientId: '1',
            routingOrder: '1',
            tabs: {
              signHereTabs: [
                {
                  anchorString: '/sn1/',
                  anchorUnits: 'pixels',
                  anchorXOffset: '20',
                  anchorYOffset: '10',
                  anchorIgnoreIfNotPresent: 'false',
                },
              ],
            },
          },
        ],
      },
      status: 'sent',
    }

    const basePath = requiredEnv('DOCUSIGN_BASE_PATH').replace(/\/$/, '')
    const accountId = requiredEnv('DOCUSIGN_ACCOUNT_ID')

    const envelopeRes = await fetch(
      `${basePath}/v2.1/accounts/${accountId}/envelopes`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(envelopePayload),
      },
    )

    const envelopeJson = await envelopeRes.json().catch(() => null)

    if (!envelopeRes.ok) {
      console.error('DocuSign envelope error:', envelopeJson)

      throw new Error(
        envelopeJson?.message ||
          envelopeJson?.error_description ||
          'Could not create DocuSign envelope.',
      )
    }

    const envelopeId = envelopeJson?.envelopeId

    if (!envelopeId) {
      throw new Error('DocuSign did not return an envelope ID.')
    }

    await supabase
      .from('clients')
      .update({
        docusign_tob_envelope_id: envelopeId,
        docusign_tob_status: envelopeJson?.status || 'sent',
        docusign_tob_sent_at: new Date().toISOString(),
        tob_signed: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)

    await supabase.from('client_activities').insert({
      client_id: clientId,
      activity_type: 'email',
      direction: 'outbound',
      content: [
        'Terms of Business sent via DocuSign.',
        `Signer: ${signerName}`,
        `Email: ${signerEmail}`,
        `DocuSign envelope ID: ${envelopeId}`,
      ].join('\n'),
    })

    return NextResponse.json({
      success: true,
      envelopeId,
      status: envelopeJson?.status || 'sent',
      message: `Terms of Business sent to ${signerEmail} via DocuSign.`,
    })
  } catch (error: any) {
    console.error('DocuSign TOB send error:', error)

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Could not send Terms of Business via DocuSign.',
      },
      { status: 500 },
    )
  }
}