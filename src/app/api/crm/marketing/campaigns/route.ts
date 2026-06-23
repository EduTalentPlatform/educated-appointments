import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  renderMarketingEmailHtml,
  renderMarketingEmailPlainText,
} from '@/lib/email/marketingEmailTemplate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_STATUSES = new Set([
  'draft',
  'ready',
  'sending',
  'sent',
  'paused',
  'cancelled',
])

const VALID_AUDIENCE_TYPES = new Set([
  'client_contacts',
  'lead_contacts',
  'mixed',
])

const VALID_CAMPAIGN_TYPES = new Set([
  'candidate_availability',
  'client_newsletter',
  'sector_insight',
  'hiring_advice',
  'crm_portal_update',
  'compliance_update',
  'event_invite',
  'case_study',
  'general',
])

const DEFAULT_MARKETING_FOOTER_TEXT = `
You can unsubscribe from these emails at any time here: {{unsubscribe_url}}

But before you go…

We use these emails to share genuinely useful updates from Educated Appointments. That may include candidate availability, recruitment insight, sector updates, employer portal improvements, compliance support, or practical advice that could save you time.

Sometimes it might be the perfect candidate for a role you’re struggling to fill. Other times it might simply be something that makes recruitment, safer hiring or document chasing a little less painful.

No waffle. No spam. No “just checking in for the 47th time this week.”
`.trim()

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function clean(value: unknown) {
  return String(value ?? '').trim()
}

function nullableText(value: unknown) {
  const text = clean(value)
  return text || null
}

function safeStatus(value: unknown) {
  const status = clean(value) || 'draft'
  return VALID_STATUSES.has(status) ? status : 'draft'
}

function safeAudienceType(value: unknown) {
  const audienceType = clean(value) || 'client_contacts'
  return VALID_AUDIENCE_TYPES.has(audienceType)
    ? audienceType
    : 'client_contacts'
}

function safeCampaignType(value: unknown) {
  const campaignType = clean(value) || 'general'
  return VALID_CAMPAIGN_TYPES.has(campaignType) ? campaignType : 'general'
}

function ensureMarketingFooter(body: unknown) {
  const cleanBody = clean(body)

  if (!cleanBody) return DEFAULT_MARKETING_FOOTER_TEXT

  if (cleanBody.includes('{{unsubscribe_url}}')) {
    return cleanBody
  }

  return `${cleanBody}\n\n---\n\n${DEFAULT_MARKETING_FOOTER_TEXT}`
}

function buildHtml(input: {
  campaign_type?: string | null
  header_label?: string | null
  hero_title?: string | null
  preview_text?: string | null
  subject?: string | null
  body_text: string
  cta_text?: string | null
  cta_url?: string | null
}) {
  return renderMarketingEmailHtml({
    campaignType: input.campaign_type,
    headerLabel: input.header_label,
    heroTitle: input.hero_title,
    previewText: input.preview_text,
    subject: input.subject,
    bodyText: input.body_text,
    ctaText: input.cta_text,
    ctaUrl: input.cta_url,
  })
}

function shouldRegenerateHtml(body: Record<string, any>) {
  return (
    'body_text' in body ||
    'campaign_type' in body ||
    'header_label' in body ||
    'hero_title' in body ||
    'preview_text' in body ||
    'subject' in body ||
    'cta_text' in body ||
    'cta_url' in body
  )
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    const { searchParams } = new URL(request.url)

    const id = clean(searchParams.get('id'))
    const status = clean(searchParams.get('status'))
    const search = clean(searchParams.get('search')).toLowerCase()

    let query = supabase
      .from('marketing_campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (id) {
      query = query.eq('id', id)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const rows = Array.isArray(data) ? data : []

    const filtered = search
      ? rows.filter(row => {
          return (
            String(row.name ?? '').toLowerCase().includes(search) ||
            String(row.subject ?? '').toLowerCase().includes(search) ||
            String(row.preview_text ?? '').toLowerCase().includes(search) ||
            String(row.audience_type ?? '').toLowerCase().includes(search) ||
            String(row.campaign_type ?? '').toLowerCase().includes(search) ||
            String(row.header_label ?? '').toLowerCase().includes(search) ||
            String(row.hero_title ?? '').toLowerCase().includes(search)
          )
        })
      : rows

    return NextResponse.json({ data: filtered })
  } catch (error: any) {
    console.error('Marketing campaigns GET error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not load marketing campaigns.' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    const name = clean(body.name)
    const subject = clean(body.subject)
    const bodyText = ensureMarketingFooter(body.body_text)
    const campaignType = safeCampaignType(body.campaign_type)

    const previewText = nullableText(body.preview_text)
    const headerLabel = nullableText(body.header_label)
    const heroTitle = nullableText(body.hero_title)
    const ctaText = nullableText(body.cta_text)
    const ctaUrl = nullableText(body.cta_url)

    if (!name) {
      return NextResponse.json(
        { error: 'Campaign name is required.' },
        { status: 400 },
      )
    }

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject line is required.' },
        { status: 400 },
      )
    }

    if (!bodyText) {
      return NextResponse.json(
        { error: 'Campaign body is required.' },
        { status: 400 },
      )
    }

    const bodyHtml = buildHtml({
      campaign_type: campaignType,
      header_label: headerLabel,
      hero_title: heroTitle,
      preview_text: previewText,
      subject,
      body_text: bodyText,
      cta_text: ctaText,
      cta_url: ctaUrl,
    })

    const { data, error } = await supabase
      .from('marketing_campaigns')
      .insert({
        name,
        subject,
        preview_text: previewText,
        body_text: renderMarketingEmailPlainText(bodyText),
        body_html: bodyHtml,
        template_id: nullableText(body.template_id),
        audience_type: safeAudienceType(body.audience_type),
        campaign_type: campaignType,
        header_label: headerLabel,
        hero_title: heroTitle,
        cta_text: ctaText,
        cta_url: ctaUrl,
        status: safeStatus(body.status),
        sender_name: nullableText(body.sender_name),
        sender_email: nullableText(body.sender_email),
        reply_to: nullableText(body.reply_to),
        scheduled_at: nullableText(body.scheduled_at),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Marketing campaigns POST error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not create marketing campaign.' },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    const id = clean(body.id)

    if (!id) {
      return NextResponse.json(
        { error: 'Campaign ID is required.' },
        { status: 400 },
      )
    }

    const { data: existing, error: existingError } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 400 })
    }

    if (!existing) {
      return NextResponse.json(
        { error: 'Campaign not found.' },
        { status: 404 },
      )
    }

    const updates: Record<string, any> = {}

    if ('name' in body) updates.name = clean(body.name)
    if ('subject' in body) updates.subject = clean(body.subject)
    if ('preview_text' in body) updates.preview_text = nullableText(body.preview_text)
    if ('template_id' in body) updates.template_id = nullableText(body.template_id)
    if ('audience_type' in body) updates.audience_type = safeAudienceType(body.audience_type)
    if ('campaign_type' in body) updates.campaign_type = safeCampaignType(body.campaign_type)
    if ('header_label' in body) updates.header_label = nullableText(body.header_label)
    if ('hero_title' in body) updates.hero_title = nullableText(body.hero_title)
    if ('cta_text' in body) updates.cta_text = nullableText(body.cta_text)
    if ('cta_url' in body) updates.cta_url = nullableText(body.cta_url)
    if ('status' in body) updates.status = safeStatus(body.status)
    if ('sender_name' in body) updates.sender_name = nullableText(body.sender_name)
    if ('sender_email' in body) updates.sender_email = nullableText(body.sender_email)
    if ('reply_to' in body) updates.reply_to = nullableText(body.reply_to)
    if ('scheduled_at' in body) updates.scheduled_at = nullableText(body.scheduled_at)

    if ('body_text' in body) {
      updates.body_text = renderMarketingEmailPlainText(
        ensureMarketingFooter(body.body_text),
      )
    }

    if (shouldRegenerateHtml(body)) {
      const next = {
        ...existing,
        ...updates,
      }

      const bodyText = ensureMarketingFooter(next.body_text)

      updates.body_text = renderMarketingEmailPlainText(bodyText)
      updates.body_html = buildHtml({
        campaign_type: next.campaign_type,
        header_label: next.header_label,
        hero_title: next.hero_title,
        preview_text: next.preview_text,
        subject: next.subject,
        body_text: bodyText,
        cta_text: next.cta_text,
        cta_url: next.cta_url,
      })
    }

    const { data, error } = await supabase
      .from('marketing_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Marketing campaigns PATCH error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not update marketing campaign.' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    const id = clean(body.id)

    if (!id) {
      return NextResponse.json(
        { error: 'Campaign ID is required.' },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from('marketing_campaigns')
      .update({
        status: 'cancelled',
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Marketing campaigns DELETE error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not cancel marketing campaign.' },
      { status: 500 },
    )
  }
}