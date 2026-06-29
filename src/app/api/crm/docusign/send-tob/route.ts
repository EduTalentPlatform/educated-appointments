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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function stripExistingSignatureSection(value: string) {
  return value
    .replace(/#\s*SIGNATURE AND ACCEPTANCE[\s\S]*$/i, '')
    .replace(/SIGNED FOR AND ON BEHALF[\s\S]*$/i, '')
    .trim()
}

function formatTermsBodyHtml(rawText: string) {
  const cleanText = stripExistingSignatureSection(rawText)
  const lines = cleanText.split('\n')
  const html: string[] = []
  let tableRows: string[][] = []

  function flushTable() {
    if (tableRows.length === 0) return

    html.push('<table class="refund-table">')

    tableRows.forEach((row, index) => {
      if (row.every(cell => /^-+$/.test(cell.replace(/\s/g, '')))) return

      const tag = index === 0 ? 'th' : 'td'

      html.push('<tr>')
      row.forEach(cell => {
        html.push(`<${tag}>${formatInlineHtml(cell)}</${tag}>`)
      })
      html.push('</tr>')
    })

    html.push('</table>')
    tableRows = []
  }

  function formatInlineHtml(value: string) {
    let output = escapeHtml(value.trim())

    output = output.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    output = output.replace(/\*(.*?)\*/g, '<em>$1</em>')

    return output
  }

  lines.forEach(line => {
    const trimmed = line.trim()

    if (!trimmed) {
      flushTable()
      return
    }

    if (trimmed === '---') {
      flushTable()
      return
    }

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed
        .split('|')
        .slice(1, -1)
        .map(cell => cell.trim())

      tableRows.push(cells)
      return
    }

    flushTable()

    if (trimmed.startsWith('# ')) {
      html.push(`<h1>${formatInlineHtml(trimmed.replace(/^#\s+/, ''))}</h1>`)
      return
    }

    if (trimmed.startsWith('## ')) {
      html.push(`<h2>${formatInlineHtml(trimmed.replace(/^##\s+/, ''))}</h2>`)
      return
    }

    if (/^\d+\.\s+[A-Z]/.test(trimmed)) {
      html.push(`<h2>${formatInlineHtml(trimmed)}</h2>`)
      return
    }

    if (/^\*\*\d+\.\d+/.test(trimmed)) {
      html.push(`<p class="clause">${formatInlineHtml(trimmed)}</p>`)
      return
    }

    if (trimmed.startsWith('>')) {
      html.push(
        `<p class="sub-clause">${formatInlineHtml(
          trimmed.replace(/^>\s*/, ''),
        )}</p>`,
      )
      return
    }

    html.push(`<p>${formatInlineHtml(trimmed)}</p>`)
  })

  flushTable()

  return html.join('\n')
}

function buildTobDocumentHtml({
  tobText,
  clientName,
}: {
  tobText: string
  clientName: string
}) {
  const today = new Date().toLocaleDateString('en-GB')

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page {
      size: A4;
      margin: 34px 42px 42px;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #17172f;
      font-size: 10.5px;
      line-height: 1.48;
      margin: 0;
      background: #ffffff;
    }

    .document {
      width: 100%;
    }

    .header {
      border-bottom: 3px solid #352deb;
      padding-bottom: 14px;
      margin-bottom: 22px;
    }

    .brand {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.2px;
      color: #17172f;
      margin: 0;
    }

    .brand span {
      color: #352deb;
    }

    .subtitle {
      margin: 5px 0 0;
      font-size: 10px;
      color: #5f6270;
    }

    .title-box {
      background: #f4f4ff;
      border: 1px solid #d8d7ff;
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 22px;
    }

    .title-box h1 {
      margin: 0 0 8px;
      font-size: 22px;
      line-height: 1.15;
      color: #17172f;
      letter-spacing: -0.5px;
    }

    .meta {
      display: table;
      width: 100%;
      margin-top: 10px;
    }

    .meta-row {
      display: table-row;
    }

    .meta-label,
    .meta-value {
      display: table-cell;
      padding: 3px 0;
      font-size: 10px;
    }

    .meta-label {
      width: 110px;
      font-weight: 700;
      color: #5f6270;
    }

    .meta-value {
      color: #17172f;
    }

    h1 {
      font-size: 18px;
      line-height: 1.2;
      margin: 20px 0 10px;
      color: #17172f;
      page-break-after: avoid;
    }

    h2 {
      font-size: 13px;
      line-height: 1.25;
      margin: 18px 0 8px;
      color: #352deb;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      page-break-after: avoid;
    }

    p {
      margin: 0 0 7px;
    }

    .clause {
      margin-bottom: 7px;
    }

    .sub-clause {
      margin-left: 16px;
      padding-left: 10px;
      border-left: 2px solid #d8d7ff;
      color: #2d2d42;
    }

    strong {
      font-weight: 700;
    }

    .refund-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 16px;
      page-break-inside: avoid;
    }

    .refund-table th {
      background: #352deb;
      color: #ffffff;
      text-align: left;
      padding: 8px;
      font-size: 10px;
      border: 1px solid #352deb;
    }

    .refund-table td {
      padding: 8px;
      font-size: 10px;
      border: 1px solid #d8d7ff;
    }

    .signature-section {
      page-break-inside: avoid;
      margin-top: 28px;
      padding-top: 18px;
      border-top: 2px solid #352deb;
    }

    .signature-title {
      font-size: 13px;
      font-weight: 800;
      color: #17172f;
      margin: 0 0 14px;
      text-transform: uppercase;
    }

    .signature-box {
      border: 1px solid #d8d7ff;
      border-radius: 10px;
      padding: 16px;
      background: #fbfbff;
    }

    .signature-row {
  display: flex;
  align-items: center;
  min-height: 34px;
  margin-bottom: 8px;
  border-bottom: 1px solid #d8d7ff;
}

.signature-label {
  width: 90px;
  font-size: 10.5px;
  font-weight: 700;
  color: #17172f;
}

.signature-anchor {
  color: #fbfbff;
  font-size: 1px;
  line-height: 1px;
}

    .footer {
      margin-top: 26px;
      padding-top: 12px;
      border-top: 1px solid #d8d7ff;
      font-size: 9px;
      color: #5f6270;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="document">
    <div class="header">
      <p class="brand">Educated <span>Appointments</span></p>
      <p class="subtitle">Specialist recruitment for Further Education, Apprenticeships and Skills</p>
    </div>

    <div class="title-box">
      <h1>Terms of Business</h1>
      <div class="meta">
        <div class="meta-row">
          <div class="meta-label">Prepared for</div>
          <div class="meta-value">${escapeHtml(clientName)}</div>
        </div>
        <div class="meta-row">
          <div class="meta-label">Prepared by</div>
          <div class="meta-value">Educated Appointments Limited</div>
        </div>
        <div class="meta-row">
          <div class="meta-label">Date</div>
          <div class="meta-value">${today}</div>
        </div>
      </div>
    </div>

    ${formatTermsBodyHtml(tobText)}

    <div class="signature-section">
      <p class="signature-title">Signature and Acceptance</p>

      <div class="signature-box">
        <p><strong>For and on behalf of ${escapeHtml(clientName)}</strong></p>

<div class="signature-row">
  <span class="signature-label">Signature:</span>
  <span class="signature-anchor">/sn1/</span>
</div>

<div class="signature-row">
  <span class="signature-label">Name:</span>
  <span class="signature-anchor">/name1/</span>
</div>

<div class="signature-row">
  <span class="signature-label">Position:</span>
  <span class="signature-anchor">/title1/</span>
</div>

<div class="signature-row">
  <span class="signature-label">Date:</span>
  <span class="signature-anchor">/date1/</span>
</div>
      </div>
    </div>

    <div class="footer">
      Educated Appointments Limited · Company No. 11817946 · Westerfield Business Centre, Main Road, Ipswich, IP6 9AB
    </div>
  </div>
</body>
</html>`
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

    const documentHtml = buildTobDocumentHtml({
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
  documentBase64: Buffer.from(documentHtml, 'utf8').toString('base64'),
  name: `Terms of Business - ${client.company_name}.html`,
  fileExtension: 'html',
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
      anchorXOffset: '10',
      anchorYOffset: '-8',
      anchorIgnoreIfNotPresent: 'false',
    },
  ],
  fullNameTabs: [
    {
      anchorString: '/name1/',
      anchorUnits: 'pixels',
      anchorXOffset: '10',
      anchorYOffset: '-8',
      anchorIgnoreIfNotPresent: 'false',
    },
  ],
  titleTabs: [
    {
      anchorString: '/title1/',
      anchorUnits: 'pixels',
      anchorXOffset: '10',
      anchorYOffset: '-8',
      anchorIgnoreIfNotPresent: 'false',
      required: 'true',
    },
  ],
  dateSignedTabs: [
    {
      anchorString: '/date1/',
      anchorUnits: 'pixels',
      anchorXOffset: '10',
      anchorYOffset: '-8',
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