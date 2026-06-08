import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type InsightStatus = 'draft' | 'published' | 'archived'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  )
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function cleanStatus(value: unknown): InsightStatus {
  const status = cleanText(value)

  if (status === 'published' || status === 'archived') {
    return status
  }

  return 'draft'
}

function cleanBool(value: unknown) {
  return value === true
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
}

async function makeUniqueSlug(
  supabase: ReturnType<typeof getServiceClient>,
  baseSlug: string,
  existingId?: string,
) {
  const base = slugify(baseSlug) || 'insight'
  let slug = base
  let i = 2

  while (true) {
    let query = supabase
      .from('website_insights')
      .select('id')
      .eq('slug', slug)
      .limit(1)

    if (existingId) {
      query = query.neq('id', existingId)
    }

    const { data, error } = await query

    if (error) throw error

    if (!data || data.length === 0) {
      return slug
    }

    slug = `${base}-${i}`
    i += 1
  }
}

function buildPayload(body: any, slug: string, publishedAt: string | null) {
  const status = cleanStatus(body.status)

  return {
    title: cleanText(body.title),
    slug,
    excerpt: cleanText(body.excerpt),
    body: cleanText(body.body),
    category: cleanText(body.category) || 'hiring_advice',
    audience: cleanText(body.audience) || 'employer',
    status,
    featured: cleanBool(body.featured),
    target_keyword: cleanText(body.target_keyword),
    seo_title: cleanText(body.seo_title),
    seo_description: cleanText(body.seo_description),
    linkedin_post: cleanText(body.linkedin_post),
    author_name: cleanText(body.author_name) || 'Joseph Sutton',
    updated_at: new Date().toISOString(),
    published_at: status === 'published' ? publishedAt : null,
  }
}

export async function GET() {
  try {
    const supabase = getServiceClient()

    const { data, error } = await supabase
      .from('website_insights')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ insights: data ?? [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Could not load insights.' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    const title = cleanText(body.title)
    const articleBody = cleanText(body.body)

    if (!title) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
    }

    if (!articleBody) {
      return NextResponse.json({ error: 'Article body is required.' }, { status: 400 })
    }

    const slug = await makeUniqueSlug(
      supabase,
      cleanText(body.slug) || title,
    )

    const status = cleanStatus(body.status)
    const publishedAt = status === 'published' ? new Date().toISOString() : null

    const { data, error } = await supabase
      .from('website_insights')
      .insert(buildPayload(body, slug, publishedAt))
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({ insight: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Could not save insight.' },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    const id = cleanText(body.id)

    if (!id) {
      return NextResponse.json({ error: 'Insight ID is required.' }, { status: 400 })
    }

    const { data: existing, error: existingError } = await supabase
      .from('website_insights')
      .select('id, title, slug, status, published_at')
      .eq('id', id)
      .maybeSingle()

    if (existingError) throw existingError

    if (!existing) {
      return NextResponse.json({ error: 'Insight not found.' }, { status: 404 })
    }

    const title = cleanText(body.title)
    const articleBody = cleanText(body.body)

    if (!title) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
    }

    if (!articleBody) {
      return NextResponse.json({ error: 'Article body is required.' }, { status: 400 })
    }

    const slug = await makeUniqueSlug(
      supabase,
      cleanText(body.slug) || title,
      id,
    )

    const nextStatus = cleanStatus(body.status)
    const publishedAt =
      nextStatus === 'published'
        ? existing.published_at || new Date().toISOString()
        : null

    const { data, error } = await supabase
      .from('website_insights')
      .update(buildPayload(body, slug, publishedAt))
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({ insight: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Could not update insight.' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const id = cleanText(body.id)

    if (!id) {
      return NextResponse.json({ error: 'Insight ID is required.' }, { status: 400 })
    }

    const supabase = getServiceClient()

    const { error } = await supabase
      .from('website_insights')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Could not delete insight.' },
      { status: 500 },
    )
  }
}