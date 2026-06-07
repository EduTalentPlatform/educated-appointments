import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai-client'

export async function POST(request: NextRequest) {
  try {
    const { candidate } = await request.json()

    const prompt = `You are a specialist FE & Skills recruitment consultant at Educated Appointments. Find potential employers for a candidate.

Candidate profile:
- Name: ${candidate.name}
- Current role: ${candidate.job_title || 'Not specified'}
- Role type seeking: ${candidate.seeking_role_type || 'Not specified'}
- Region: ${candidate.preferred_location || 'UK'}
- Standards they can deliver: ${candidate.can_deliver || 'Not specified'}

Search for apprenticeship training providers and colleges in ${candidate.preferred_location || 'the UK'} that:
1. Deliver the apprenticeship standards this candidate works with
2. Would likely need someone with their role type and background
3. Are active ESFA-registered providers

For each potential employer found, return structured data. Return ONLY valid JSON:

{
  "employers": [
    {
      "name": "Provider name",
      "type": "Independent Training Provider or FE College or other",
      "region": "Their region",
      "website": "Website URL or null",
      "standards_match": ["standards they deliver that match candidate"],
      "why_good_fit": "One sentence on why this is a good match for the candidate",
      "contact_approach": "Suggested approach for reaching out"
    }
  ],
  "search_summary": "Brief summary of what was found and the opportunity landscape"
}`

    const { text } = await callAI(prompt, { maxTokens: 3000, useWebSearch: true })
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const match = clean.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'No results found.' }, { status: 422 })
    return NextResponse.json({ result: JSON.parse(match[0]) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Something went wrong.' }, { status: 500 })
  }
}