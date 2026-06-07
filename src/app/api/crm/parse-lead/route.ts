import { NextRequest, NextResponse } from 'next/server'
import { callAIJson } from '@/lib/ai-client'

export async function POST(request: NextRequest) {
  try {
    const { website } = await request.json()
    if (!website) return NextResponse.json({ error: 'No URL provided' }, { status: 400 })

    const url = website.startsWith('http') ? website : `https://${website}`

    const prompt = `Research this organisation for a UK FE & Skills recruitment agency CRM.

Website: ${url}

Search for: the website, their UKPRN on ESFA register, Ofsted inspection grade and date, ESFA funding allocation, apprenticeship standards they deliver, team/contacts page.

Return ONLY valid JSON:
{
  "company_name": "Full trading name",
  "contacts": [{ "name": "string", "title": "string", "email": "string or null", "phone": "string or null", "linkedin": "string or null", "role_type": "Decision Maker or Influencer or Day-to-day or Finance or HR" }],
  "email": "general contact email or null",
  "phone": "main number or null",
  "sector": "one of: Independent Training Provider, Further Education College, Sixth Form College, University / Higher Education, School / Academy, Local Authority Provider, Third Sector / Charity Provider, Employer Provider (Levy Payer), Pre-Employment / Employability Provider, End-Point Assessment Organisation (EPAO), Awarding Organisation, Apprenticeship Aggregator, Other",
  "region": "one of: East of England, East Midlands, West Midlands, North West, North East, Yorkshire & Humber, South East, South West, London, Wales, Scotland, Northern Ireland, National (Multi-site)",
  "ukprn": "8-digit string or null",
  "ofsted_grade": "Outstanding or Good or Requires Improvement or Inadequate or null",
  "ofsted_date": "YYYY-MM-DD or null",
  "esfa_funding": "annual funding as integer in pounds or null",
  "frameworks": "comma-separated apprenticeship standards or null",
  "linkedin_company": "LinkedIn company URL or null",
  "current_agencies": "any known agencies or null",
  "notes": "one sentence about what they do"
}`

    const result = await callAIJson(prompt, { maxTokens: 2000, useWebSearch: true })
    return NextResponse.json({ result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Could not parse that URL.' }, { status: 500 })
  }
}