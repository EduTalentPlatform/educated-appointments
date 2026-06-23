import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { sendEmail } from '@/lib/email/sendEmail'
import { renderMarketingEmailHtml } from '@/lib/email/marketingEmailTemplate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VERIFIED_MARKETING_FROM_EMAIL = 'noreply@send.educatedappointments.co.uk'
const DEFAULT_REPLY_TO = 'info@educatedappointments.co.uk'
const MAX_SEND_PER_REQUEST = 100

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function clean(value: unknown) {
  return String(value ?? '').trim()
}

function normaliseEmail(value: unknown) {
  return clean(value).toLowerCase()
}

function isValidEmail(value: string) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)
}

function siteUrlFromRequest(request: NextRequest) {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL

  if (configured) {
    return configured.replace(/\/$/, '')
  }

  return new URL(request.url).origin.replace(/\/$/, '')
}

function formatMarketingFrom(senderName?: string | null) {
  const name = clean(senderName) || 'Educated Appointments'
  return `${name} <${VERIFIED_MARKETING_FROM_EMAIL}>`
}

function getResendEmailId(result: any) {
  return (
    result?.id ||
    result?.data?.id ||
    result?.email_id ||
    result?.message_id ||
    null
  )
}

function safeLimit(value: unknown) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 25
  }

  return Math.min(Math.floor(parsed), MAX_SEND_PER_REQUEST)
}

function buildFallbackHtml(campaign: any) {
  return renderMarketingEmailHtml({
    campaignType: campaign.campaign_type || 'general',
    headerLabel: campaign.header_label,
    heroTitle: campaign.hero_title,
    previewText: campaign.preview_text,
    subject: campaign.subject,
    bodyText: campaign.body_text || '',
    ctaText: campaign.cta_text,
    ctaUrl: campaign.cta_url,
  })
}

function replaceMergeFields(value: string, replacements: Record<string, string>) {
  return value.replace(/{{\s*([^}]+?)\s*}}/g, (fullMatch, rawKey) => {
    const key = String(rawKey ?? '').trim()
    return replacements[key] ?? fullMatch
  })
}

function firstName(value?: string | null) {
  const text = clean(value)
  if (!text) return ''
  return text.split(/\s+/)[0] || text
}

function buildRecipientReplacements(input: {
  recipient: any
  campaign: any
  unsubscribeUrl: string
}) {
  const { recipient, campaign, unsubscribeUrl } = input

  const contactName = clean(recipient.contact_name)
  const contactFirstName = firstName(contactName)
  const companyName = clean(recipient.company_name)
  const contactTitle = clean(recipient.contact_title)
  const roleType = clean(recipient.role_type)
  const email = clean(recipient.email)

  return {
    unsubscribe_url: unsubscribeUrl,

    'contact.name': contactName,
    'contact.first_name': contactFirstName,
    'contact.title': contactTitle,
    'contact.role_type': roleType,
    'contact.email': email,

    'client.contact_name': contactName,
    'client.first_name': contactFirstName,
    'client.name': companyName,
    'client.company_name': companyName,

    'lead.contact_name': contactName,
    'lead.first_name': contactFirstName,
    'lead.name': companyName,
    'lead.company_name': companyName,

    'company.name': companyName,
    'company_name': companyName,

    'campaign.name': clean(campaign.name),
    'campaign.subject': clean(campaign.subject),

    'sender.name': clean(campaign.sender_name) || 'Educated Appointments',
  }
}

async function getOrCreateUnsubscribeToken(input: {
  supabase: ReturnType<typeof getServiceClient>
  campaignId: string
  campaignRecipientId: string
  email: string
  emailNormalised: string
}) {
  const {
    supabase,
    campaignId,
    campaignRecipientId,
    email,
    emailNormalised,
  } = input

  const { data: existing, error: existingError } = await supabase
    .from('marketing_unsubscribes')
    .select('id, token')
    .eq('campaign_recipient_id', campaignRecipientId)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message)
  }

  if (existing?.token) {
    return existing.token
  }

  const token = randomUUID()

  const { error: insertError } = await supabase
    .from('marketing_unsubscribes')
    .insert({
      campaign_id: campaignId,
      campaign_recipient_id: campaignRecipientId,
      email,
      email_normalised: emailNormalised,
      token,
    })

  if (insertError) {
    throw new Error(insertError.message)
  }

  return token
}

async function loadSuppressedEmails(
  supabase: ReturnType<typeof getServiceClient>,
  emails: string[],
) {
  const uniqueEmails = Array.from(new Set(emails.map(normaliseEmail).filter(Boolean)))

  if (uniqueEmails.length === 0) {
    return new Set<string>()
  }

  const { data, error } = await supabase
    .from('marketing_suppression_list')
    .select('email_normalised')
    .in('email_normalised', uniqueEmails)

  if (error) {
    throw new Error(error.message)
  }

  return new Set(
    (Array.isArray(data) ? data : [])
      .map(row => normaliseEmail(row.email_normalised))
      .filter(Boolean),
  )
}

async function markRecipientFailed(input: {
  supabase: ReturnType<typeof getServiceClient>
  recipientId: string
  error: string
}) {
  const { supabase, recipientId, error } = input

  await supabase
    .from('marketing_campaign_recipients')
    .update({
      status: 'failed',
      failed_at: new Date().toISOString(),
      last_error: error.slice(0, 1000),
    })
    .eq('id', recipientId)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    const campaignId = clean(body.campaign_id)
    const confirmSend = clean(body.confirm_send)
    const limit = safeLimit(body.limit)

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required.' },
        { status: 400 },
      )
    }

    if (confirmSend !== 'SEND_CAMPAIGN') {
      return NextResponse.json(
        {
          error:
            'Live sending requires confirmation. Pass confirm_send: SEND_CAMPAIGN.',
        },
        { status: 400 },
      )
    }

    const { data: campaign, error: campaignError } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('id', campaignId)
      .maybeSingle()

    if (campaignError) {
      return NextResponse.json({ error: campaignError.message }, { status: 400 })
    }

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found.' },
        { status: 404 },
      )
    }

    if (clean(campaign.status) !== 'ready') {
      return NextResponse.json(
        {
          error:
            'Campaign must be marked as ready before sending. Generate/review recipients first.',
        },
        { status: 400 },
      )
    }

    const subject = clean(campaign.subject)

    if (!subject) {
      return NextResponse.json(
        { error: 'Campaign subject is required before sending.' },
        { status: 400 },
      )
    }

    const { data: recipients, error: recipientsError } = await supabase
      .from('marketing_campaign_recipients')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit)

    if (recipientsError) {
      return NextResponse.json({ error: recipientsError.message }, { status: 400 })
    }

    const pendingRecipients = Array.isArray(recipients) ? recipients : []

    if (pendingRecipients.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending recipients to send.',
        summary: {
          attempted: 0,
          sent: 0,
          failed: 0,
          skipped: 0,
          remaining_pending: 0,
        },
      })
    }

    const suppressedEmails = await loadSuppressedEmails(
      supabase,
      pendingRecipients.map(recipient => recipient.email_normalised || recipient.email),
    )

    const siteUrl = siteUrlFromRequest(request)
    const rawHtml = clean(campaign.body_html) || buildFallbackHtml(campaign)
    const rawText = clean(campaign.body_text)

    const results: Array<{
      recipient_id: string
      email: string | null
      status: 'sent' | 'failed' | 'skipped'
      error?: string
      resend_email_id?: string | null
    }> = []

    let sentCount = 0
    let failedCount = 0
    let skippedCount = 0

    await supabase
      .from('marketing_campaigns')
      .update({
        status: 'sending',
      })
      .eq('id', campaignId)

    for (const recipient of pendingRecipients) {
      const email = clean(recipient.email)
      const emailNormalised = normaliseEmail(
        recipient.email_normalised || recipient.email,
      )

      try {
        if (!email || !emailNormalised || !isValidEmail(emailNormalised)) {
          skippedCount += 1

          await markRecipientFailed({
            supabase,
            recipientId: recipient.id,
            error: 'Recipient email is missing or invalid.',
          })

          results.push({
            recipient_id: recipient.id,
            email,
            status: 'skipped',
            error: 'Recipient email is missing or invalid.',
          })

          continue
        }

        if (suppressedEmails.has(emailNormalised)) {
          skippedCount += 1

          await markRecipientFailed({
            supabase,
            recipientId: recipient.id,
            error: 'Recipient email is on the suppression list.',
          })

          results.push({
            recipient_id: recipient.id,
            email,
            status: 'skipped',
            error: 'Recipient email is on the suppression list.',
          })

          continue
        }

        const token = await getOrCreateUnsubscribeToken({
          supabase,
          campaignId,
          campaignRecipientId: recipient.id,
          email,
          emailNormalised,
        })

        const unsubscribeUrl = `${siteUrl}/unsubscribe/${token}`

        const replacements = buildRecipientReplacements({
          recipient,
          campaign,
          unsubscribeUrl,
        })

        const html = replaceMergeFields(rawHtml, replacements)
        const text = replaceMergeFields(
          rawText || `${subject}\n\nUnsubscribe: {{unsubscribe_url}}`,
          replacements,
        )
        const personalisedSubject = replaceMergeFields(subject, replacements)

        const sendResult = await sendEmail({
          to: email,
          from: formatMarketingFrom(campaign.sender_name),
          subject: personalisedSubject,
          html,
          text,
          replyTo: clean(campaign.reply_to) || DEFAULT_REPLY_TO,
        })

        const resendEmailId = getResendEmailId(sendResult)
        const now = new Date().toISOString()

        await supabase
          .from('marketing_campaign_recipients')
          .update({
            status: 'sent',
            sent_at: now,
            resend_email_id: resendEmailId,
            last_error: null,
          })
          .eq('id', recipient.id)

        if (recipient.source_type === 'client_contact' && recipient.source_contact_id) {
          await supabase
            .from('client_contacts')
            .update({
              last_marketing_email_sent_at: now,
            })
            .eq('id', recipient.source_contact_id)
        }

        if (recipient.source_type === 'lead_contact' && recipient.source_contact_id) {
          await supabase
            .from('lead_contacts')
            .update({
              last_marketing_email_sent_at: now,
            })
            .eq('id', recipient.source_contact_id)
        }

        await supabase.from('marketing_events').insert({
          campaign_id: campaignId,
          campaign_recipient_id: recipient.id,
          event_type: 'sent',
          event_payload: {
            email,
            email_normalised: emailNormalised,
            resend_email_id: resendEmailId,
          },
        })

        sentCount += 1

        results.push({
          recipient_id: recipient.id,
          email,
          status: 'sent',
          resend_email_id: resendEmailId,
        })
      } catch (sendError: any) {
        const message = sendError?.message || 'Could not send email.'

        failedCount += 1

        await markRecipientFailed({
          supabase,
          recipientId: recipient.id,
          error: message,
        })

        await supabase.from('marketing_events').insert({
          campaign_id: campaignId,
          campaign_recipient_id: recipient.id,
          event_type: 'failed',
          event_payload: {
            email,
            email_normalised: emailNormalised,
            error: message,
          },
        })

        results.push({
          recipient_id: recipient.id,
          email,
          status: 'failed',
          error: message,
        })
      }
    }

    const { count: remainingPendingCount } = await supabase
      .from('marketing_campaign_recipients')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')

    const remainingPending = remainingPendingCount || 0

    await supabase
      .from('marketing_campaigns')
      .update({
        status: remainingPending > 0 ? 'ready' : 'sent',
        sent_at: remainingPending > 0 ? campaign.sent_at : new Date().toISOString(),
      })
      .eq('id', campaignId)

    return NextResponse.json({
      success: true,
      message:
        remainingPending > 0
          ? `Batch sent. ${remainingPending} pending recipients remain.`
          : 'Campaign sending complete.',
      summary: {
        attempted: pendingRecipients.length,
        sent: sentCount,
        failed: failedCount,
        skipped: skippedCount,
        remaining_pending: remainingPending,
      },
      data: results,
    })
  } catch (error: any) {
    console.error('Marketing campaign send error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not send marketing campaign.' },
      { status: 500 },
    )
  }
}