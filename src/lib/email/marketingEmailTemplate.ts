type MarketingEmailTemplateInput = {
  campaignType?: string | null
  headerLabel?: string | null
  heroTitle?: string | null
  previewText?: string | null
  subject?: string | null
  bodyText: string
  ctaText?: string | null
  ctaUrl?: string | null
}

const BRAND = {
  name: 'Educated Appointments',
  website: 'https://www.educatedappointments.co.uk',
  navy: '#1a1a2e',
  blue: '#0B72B8',
  green: '#217822',
  paleBlue: '#e0f0fb',
  background: '#f5f5f7',
  text: '#1f2937',
  muted: '#6b7280',
  border: '#e5e7eb',
}

const CAMPAIGN_LABELS: Record<string, string> = {
  candidate_availability: 'Candidate availability',
  client_newsletter: 'Client update',
  sector_insight: 'FE & Skills insight',
  hiring_advice: 'Hiring advice',
  crm_portal_update: 'Employer portal update',
  compliance_update: 'Compliance update',
  event_invite: 'Event invitation',
  case_study: 'Client story',
  general: 'Educated Appointments update',
}

const CAMPAIGN_ACCENTS: Record<string, string> = {
  candidate_availability: BRAND.blue,
  client_newsletter: BRAND.navy,
  sector_insight: BRAND.blue,
  hiring_advice: BRAND.green,
  crm_portal_update: BRAND.blue,
  compliance_update: BRAND.green,
  event_invite: BRAND.navy,
  case_study: BRAND.green,
  general: BRAND.blue,
}

function clean(value?: string | null) {
  return String(value ?? '').trim()
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function linkifyUnsubscribe(value: string) {
  return value.replaceAll(
    '{{unsubscribe_url}}',
    '<a href="{{unsubscribe_url}}" style="color:#0B72B8; font-weight:700; text-decoration:underline;">unsubscribe here</a>',
  )
}

function renderBodyText(value: string) {
  const escaped = escapeHtml(value)

  return escaped
    .split(/\n{2,}/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)
    .map(paragraph => {
      const html = paragraph.replaceAll('\n', '<br />')
      return `<p style="margin:0 0 16px; font-size:16px; line-height:1.65; color:${BRAND.text};">${linkifyUnsubscribe(html)}</p>`
    })
    .join('\n')
}

function renderPreviewText(previewText?: string | null) {
  const text = clean(previewText)
  if (!text) return ''

  return `
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; mso-hide:all;">
      ${escapeHtml(text)}
    </div>
  `
}

function safeUrl(value?: string | null) {
  const url = clean(value)

  if (!url) return null

  if (url.startsWith('https://') || url.startsWith('http://')) {
    return url
  }

  return null
}

export function renderMarketingEmailHtml({
  campaignType = 'general',
  headerLabel,
  heroTitle,
  previewText,
  subject,
  bodyText,
  ctaText,
  ctaUrl,
}: MarketingEmailTemplateInput) {
  const type = clean(campaignType) || 'general'
  const label = clean(headerLabel) || CAMPAIGN_LABELS[type] || CAMPAIGN_LABELS.general
  const title = clean(heroTitle) || clean(subject) || 'A useful update from Educated Appointments'
  const accent = CAMPAIGN_ACCENTS[type] || BRAND.blue
  const buttonUrl = safeUrl(ctaUrl)
  const buttonText = clean(ctaText)

  return `<!doctype html>
<html>
  <head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>

  <body style="margin:0; padding:0; background:${BRAND.background}; font-family:Arial, Helvetica, sans-serif;">
    ${renderPreviewText(previewText)}

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%; background:${BRAND.background}; margin:0; padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%; max-width:680px; background:#ffffff; border-radius:22px; overflow:hidden; border:1px solid ${BRAND.border}; box-shadow:0 18px 45px rgba(15,23,42,0.10);">
            
            <tr>
              <td style="background:${BRAND.navy}; padding:24px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <table role="presentation" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="width:46px; height:46px; border-radius:15px; background:#ffffff; color:${BRAND.navy}; font-size:18px; font-weight:800; text-align:center; vertical-align:middle;">
                            EA
                          </td>
                          <td style="padding-left:14px;">
                            <div style="color:#ffffff; font-size:20px; font-weight:800; line-height:1.2;">
                              Educated Appointments
                            </div>
                            <div style="color:#dbeafe; font-size:13px; line-height:1.4; margin-top:2px;">
                              Further Education, Skills & Apprenticeship Recruitment
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td align="right" style="vertical-align:middle;">
                      <div style="display:inline-block; background:rgba(255,255,255,0.10); color:#ffffff; border:1px solid rgba(255,255,255,0.18); border-radius:999px; padding:8px 12px; font-size:12px; font-weight:700;">
                        ${escapeHtml(label)}
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:30px 30px 10px;">
                <div style="width:54px; height:5px; background:${accent}; border-radius:999px; margin-bottom:18px;"></div>
                <h1 style="margin:0 0 12px; font-size:28px; line-height:1.2; color:${BRAND.navy}; letter-spacing:-0.03em;">
                  ${escapeHtml(title)}
                </h1>
                ${
                  clean(previewText)
                    ? `<p style="margin:0 0 12px; font-size:15px; line-height:1.55; color:${BRAND.muted};">${escapeHtml(clean(previewText))}</p>`
                    : ''
                }
              </td>
            </tr>

            <tr>
              <td style="padding:10px 30px 12px;">
                ${renderBodyText(bodyText)}
              </td>
            </tr>

            ${
              buttonUrl && buttonText
                ? `
            <tr>
              <td style="padding:4px 30px 30px;">
                <a href="${escapeHtml(buttonUrl)}" style="display:inline-block; background:${accent}; color:#ffffff; text-decoration:none; border-radius:999px; padding:13px 20px; font-size:15px; font-weight:800;">
                  ${escapeHtml(buttonText)}
                </a>
              </td>
            </tr>
                `
                : ''
            }

            <tr>
              <td style="background:#f8fafc; padding:22px 30px; border-top:1px solid ${BRAND.border};">
                <p style="margin:0 0 8px; color:${BRAND.navy}; font-size:14px; line-height:1.5; font-weight:800;">
                  Educated Appointments
                </p>
                <p style="margin:0; color:${BRAND.muted}; font-size:13px; line-height:1.6;">
                  Specialist recruitment across Further Education, Skills and Apprenticeships.
                  <br />
                  <a href="${BRAND.website}" style="color:${BRAND.blue}; font-weight:700; text-decoration:none;">${BRAND.website}</a>
                </p>
              </td>
            </tr>

          </table>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%; max-width:680px;">
            <tr>
              <td style="padding:16px 8px 0; text-align:center;">
                <p style="margin:0; color:#9ca3af; font-size:12px; line-height:1.5;">
                  You are receiving this because you are listed as a relevant business contact for Educated Appointments.
                </p>
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>
  </body>
</html>`
}

export function renderMarketingEmailPlainText(bodyText: string) {
  return clean(bodyText)
}