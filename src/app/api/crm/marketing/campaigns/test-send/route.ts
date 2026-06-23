import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/sendEmail'
import { renderMarketingEmailHtml } from '@/lib/email/marketingEmailTemplate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function clean(value: unknown) {
  return String(value ?? '').trim()
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

  const origin = new URL(request.url).origin
  return origin.replace(/\/$/, '')
}

function formatFrom(senderName?: string | null, senderEmail?: string | null) {
  const email = clean(senderEmail) || 'noreply@send.educatedappointments.co.uk'
  const name = clean(senderName) || 'Educated Appointments'

  return `${name} <${email}>`
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

function buildTestReplacements(siteUrl: string) {
  return {
    unsubscribe_url: `${siteUrl}/unsubscribe/test-preview`,

    'client.contact_name': 'Joseph',
    'client.name': 'Test Employer',
    'client.company_name': 'Test Training Provider',
    'contact.name': 'Joseph',
    'contact.first_name': 'Joseph',
    'lead.contact_name': 'Joseph',
    'lead.company_name': 'Test Training Provider',

    'candidate.name': 'Example Candidate',
    'candidate.first_name': 'Example',
    'candidate.location': 'Bristol',
    'candidate.notice_period': '4 weeks',
    'candidate.salary_expected': '£38,000',
    'candidate.dbs': 'Enhanced DBS on update service',
    'candidate.profile_text':
      'This is example candidate profile text for your test email. In a live campaign, this would be replaced with the relevant candidate summary or campaign content.',

    'vacancy.title': 'Example Vacancy',
    'vacancy.location': 'Remote / Hybrid',
    'role.title': 'Example Role',

    'sender.name': 'Educated Appointments',
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    const campaignId = clean(body.campaign_id)
    const testEmail = clean(body.to || body.email)

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required.' },
        { status: 400 },
      )
    }

    if (!isValidEmail(testEmail)) {
      return NextResponse.json(
        { error: 'A valid test email address is required.' },
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

    const subject = clean(campaign.subject)

    if (!subject) {
      return NextResponse.json(
        { error: 'Campaign subject is required before sending a test.' },
        { status: 400 },
      )
    }

    const rawHtml = clean(campaign.body_html) || buildFallbackHtml(campaign)
    const rawText = clean(campaign.body_text)

    if (!rawHtml && !rawText) {
      return NextResponse.json(
        { error: 'Campaign body is required before sending a test.' },
        { status: 400 },
      )
    }

    const siteUrl = siteUrlFromRequest(request)
    const replacements = buildTestReplacements(siteUrl)

    const html = replaceMergeFields(rawHtml, replacements)
    const text = replaceMergeFields(
      rawText ||
        `${subject}\n\nThis is a test email from Educated Appointments.\n\nUnsubscribe: {{unsubscribe_url}}`,
      replacements,
    )

    const result = await sendEmail({
      to: testEmail,
      from: formatFrom(campaign.sender_name, campaign.sender_email),
      subject: `[TEST] ${subject}`,
      html,
      text,
      replyTo:
        clean(campaign.reply_to) ||
        clean(campaign.sender_email) ||
        'noreply@send.educatedappointments.co.uk',
    })

    await supabase.from('marketing_events').insert({
      campaign_id: campaign.id,
      campaign_recipient_id: null,
      event_type: 'test_sent',
      event_payload: {
        to: testEmail,
        subject: `[TEST] ${subject}`,
        resend_result: result,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${testEmail}.`,
      result,
    })
  } catch (error: any) {
    console.error('Marketing campaign test send error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not send test email.' },
      { status: 500 },
    )
  }
}