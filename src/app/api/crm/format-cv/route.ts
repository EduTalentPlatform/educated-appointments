import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai-client'

export async function POST(request: NextRequest) {
  try {
    const { rawCv, candidate } = await request.json()
    if (!rawCv) return NextResponse.json({ error: 'No CV content provided.' }, { status: 400 })

    const prompt = `You are formatting a CV for Educated Appointments — a specialist FE & Skills recruitment agency. Format this candidate's CV into a clean, professional format ready to send to clients.

Candidate: ${candidate.first_name} ${candidate.last_name}
Role type: ${candidate.seeking_role_type || 'FE & Skills Professional'}

Raw CV content:
"""
${rawCv}
"""

Format this into a polished, consistently structured CV using this format:

**[CANDIDATE NAME]**
[Role title] | [Location] | [Email] | [Phone]

---

**PROFESSIONAL SUMMARY**
[2-3 sentence compelling summary]

---

**KEY SKILLS & QUALIFICATIONS**
- [Skill/qualification 1]
- [Skill/qualification 2]
[etc]

---

**PROFESSIONAL EXPERIENCE**

**[Job Title]** | [Employer] | [Dates]
- [Achievement/responsibility]
- [Achievement/responsibility]

[Repeat for each role]

---

**EDUCATION & QUALIFICATIONS**
[List qualifications]

---

**REFERENCES**
Available on request

Rules:
- Keep all facts exactly as in the original — do not invent or change anything
- Remove personal details like full address, date of birth, nationality
- Use bold headings with ** **
- Keep bullet points concise — one line each
- Professional tone throughout
- Do not include a photo placeholder
- Return only the formatted CV text`

    const { text } = await callAI(prompt, { maxTokens: 3000 })
    return NextResponse.json({ formatted: text })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Something went wrong.' }, { status: 500 })
  }
}