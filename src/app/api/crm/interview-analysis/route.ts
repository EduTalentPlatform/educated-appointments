import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai-client'

export async function POST(request: NextRequest) {
  try {
    const { transcript, candidate } = await request.json()

    if (!transcript) {
      return NextResponse.json(
        { error: 'No transcript provided.' },
        { status: 400 },
      )
    }

    const prompt = `You are reviewing notes from an internal EA interview at Educated Appointments, a specialist recruitment agency for Further Education, Skills, Training Providers and Apprenticeships.

Your task is to turn the interview transcript into a comprehensive recruitment interview overview.

Important rules:
- Do not invent information.
- If something was not discussed, write "Not discussed".
- Be detailed and useful for a recruiter reading the record later.
- Capture confirmations clearly: salary, notice, DBS, location, right to work, qualifications, delivery areas and standards.
- Identify key findings from the conversation, not just a short summary.
- Keep the tone professional, factual and recruitment-focused.
- Return ONLY valid JSON. No markdown. No commentary outside the JSON.

Candidate:
Name: ${candidate?.name || 'Not specified'}
Current role: ${candidate?.job_title || 'Not specified'}
Role type seeking: ${candidate?.seeking_role_type || 'Not specified'}

Interview transcript / notes:
"""
${transcript}
"""

Return this exact JSON structure:

{
  "candidate_confirmation": "Clear bullet-style confirmation of key factual details discussed: current role, location, travel/remote preference, salary/current salary, salary expectation, notice period/availability, DBS status, right to work, qualifications, apprenticeship standards/sectors they can deliver, documents mentioned. Use 'Not discussed' where needed.",
  "interview_summary": "Comprehensive narrative overview of the interview. This should be several detailed paragraphs, not 3 short sentences.",
  "key_findings": "The most important findings from the interview. Include anything commercially useful, unusual, strong, concerning or important for matching.",
  "relevant_experience": "Detailed breakdown of the candidate's relevant FE, Skills, Apprenticeship, training, tutoring, assessing, commercial, quality, curriculum, leadership or sector experience.",
  "qualifications_mentioned": "Qualifications, certificates, assessor/IQA/teaching awards, industry tickets, degrees, professional memberships or apprenticeship standards mentioned. Use 'Not discussed' if none.",
  "apprenticeship_standards_or_sectors": "Any apprenticeship standards, sectors, subject areas or programmes the candidate said they can deliver, assess, tutor, coach or manage. Use 'Not discussed' if none.",
  "salary_discussed": "Current salary, salary expectation, day rate, minimum salary, flexibility or package requirements mentioned. Use 'Not discussed' if none.",
  "availability": "Notice period, availability, immediate start, interview availability or restrictions mentioned. Use 'Not discussed' if none.",
  "work_type_preference": "Office, hybrid, remote, travel radius, location preferences or working pattern discussed. Use 'Not discussed' if none.",
  "motivation_and_preferences": "Why the candidate is looking, what they want next, what they want to avoid, career motivations and role preferences.",
  "candidate_strengths": "Key strengths and selling points. Be specific and recruiter-useful.",
  "candidate_concerns": "Any concerns, gaps, risks, missing information, contradictions or areas to clarify. Use 'None identified from the interview' if none.",
  "fit_assessment": "Which types of roles, employers, training providers, sectors and environments this candidate is likely to suit best.",
  "employer_facing_summary": "A polished employer-facing summary that could be reused later in a candidate profile. Keep it factual and positive, but do not oversell beyond the transcript.",
  "recommended_roles": "Specific role types this candidate should be matched against.",
  "next_steps": "Practical next actions for Educated Appointments: documents to request, checks to complete, standards to add, roles to match, employers to approach, follow-up questions.",
  "internal_notes": "Internal-only notes or recruiter observations that should not be sent to an employer.",
  "verdict": "Strong candidate — present widely OR Good candidate — selective roles OR Borderline — specific roles only OR Not suitable at this time"
}`

    const { text } = await callAI(prompt, { maxTokens: 5000 })

    const clean = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    const match = clean.match(/\{[\s\S]*\}/)

    if (!match) {
      return NextResponse.json(
        { error: 'Could not analyse interview.' },
        { status: 422 },
      )
    }

    return NextResponse.json({ result: JSON.parse(match[0]) })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Something went wrong.' },
      { status: 500 },
    )
  }
}