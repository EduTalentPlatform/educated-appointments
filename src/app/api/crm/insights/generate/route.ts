import { NextResponse } from 'next/server'
import { callAI } from '@/lib/ai-client'

export const dynamic = 'force-dynamic'

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
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

function extractJson(text: string) {
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')

  if (first === -1 || last === -1 || last <= first) {
    throw new Error('AI response did not include valid JSON.')
  }

  return JSON.parse(text.slice(first, last + 1))
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const topic = cleanText(body.topic)
    const audience = cleanText(body.audience) || 'employer'
    const category = cleanText(body.category) || 'hiring_advice'
    const targetKeyword = cleanText(body.target_keyword)
    const angle = cleanText(body.angle)
    const callToAction = cleanText(body.call_to_action)

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required.' },
        { status: 400 },
      )
    }

    const prompt = `
Create a publish-ready insight article for the Educated Appointments website.

Business context:
Educated Appointments is a specialist recruitment business for Further Education, Skills, Apprenticeships and Training providers across the UK.

Topic:
${topic}

Audience:
${audience}

Category:
${category}

Target keyword:
${targetKeyword || 'Use a natural FE & Skills recruitment keyword.'}

Angle / notes:
${angle || 'Make this practical, useful and commercially sensible.'}

Call to action:
${callToAction || 'Encourage the reader to speak with Educated Appointments if they need recruitment support or are considering their next role.'}

Rules:
- Write in UK English.
- Sound like a knowledgeable FE & Skills recruitment specialist.
- Be practical, consultative and useful.
- Avoid hype, clickbait and greasy sales language.
- Do not invent statistics, laws, policy changes or named organisations.
- If discussing policy or funding, keep it general unless specific source text has been provided.
- Body should be plain text paragraphs separated by blank lines.
- Do not use markdown tables.
- Do not include citations.
- Return ONLY valid JSON.

Return this exact JSON shape:
{
  "title": "Article title",
  "slug": "url-friendly-slug",
  "excerpt": "Short summary for the /insights card",
  "body": "Full article body with paragraphs separated by blank lines",
  "seo_title": "SEO title under 60 characters",
  "seo_description": "SEO description under 160 characters",
  "linkedin_post": "LinkedIn post to promote the article, with a natural CTA and no spammy tone",
  "suggested_hashtags": "#FurtherEducation #Apprenticeships"
}
`.trim()

    const result = await callAI(prompt, {
      maxTokens: 4200,
      temperature: 0.65,
      system:
        'You generate high-quality FE & Skills recruitment insight articles and LinkedIn posts for Educated Appointments. Return valid JSON only.',
    })

    const parsed = extractJson(result.text)

    const title = cleanText(parsed.title)
    const generatedSlug = cleanText(parsed.slug) || slugify(title || topic)

    return NextResponse.json({
      article: {
        title,
        slug: slugify(generatedSlug),
        excerpt: cleanText(parsed.excerpt),
        body: cleanText(parsed.body),
        seo_title: cleanText(parsed.seo_title),
        seo_description: cleanText(parsed.seo_description),
        linkedin_post: cleanText(parsed.linkedin_post),
        target_keyword: targetKeyword,
        category,
        audience,
        status: 'draft',
        featured: false,
      },
      suggested_hashtags: cleanText(parsed.suggested_hashtags),
      provider: result.provider,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Could not generate insight.' },
      { status: 500 },
    )
  }
}