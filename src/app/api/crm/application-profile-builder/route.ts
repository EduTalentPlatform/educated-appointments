import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function safeText(value: unknown, maxLength = 12000) {
  const text = String(value ?? '').trim()
  if (!text) return ''
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

function getCandidateName(candidate: any, anonymous: boolean) {
  if (anonymous) return 'Candidate'

  const name = `${candidate?.first_name ?? ''} ${candidate?.last_name ?? ''}`.trim()
  return name || 'Candidate'
}

function getEmployerName(client: any) {
  return client?.company_name || 'Employer'
}

function getVacancyTitle(vacancy: any) {
  return vacancy?.title || 'the role'
}

function getCandidateLocation(candidate: any) {
  if (candidate?.preferred_location) return candidate.preferred_location
  if (candidate?.location) return candidate.location
  if (candidate?.region) return candidate.region

  const locationParts = [
    candidate?.town_city,
    candidate?.county,
    candidate?.postcode,
  ].filter(Boolean)

  return locationParts.length > 0 ? locationParts.join(', ') : 'Not specified'
}

function getNoticePeriod(candidate: any, application: any) {
  return (
    candidate?.notice_period ||
    application?.notice_period ||
    application?.availability ||
    'Not specified'
  )
}

function formatDbsStatus(value: unknown) {
  const dbs = String(value ?? '').trim()

  if (!dbs) return 'Not specified'

  const labels: Record<string, string> = {
    not_completed: 'Not completed',
    not_completed_happy_to_undertake_no_issues:
      'Not completed but happy to undertake — no issues',
    completed_clear: 'Completed — clear',
    completed_disclosures: 'Completed — disclosures',
    on_update_service: 'On update service',
  }

  return labels[dbs] || dbs
}

function getDbs(candidate: any, application: any) {
  return formatDbsStatus(
    candidate?.dbs_status ||
      candidate?.dbs ||
      application?.dbs_status ||
      application?.dbs,
  )
}

function getSalaryExpected(candidate: any, application: any) {
  const expected =
    candidate?.salary_expected ||
    candidate?.salary_expectation ||
    candidate?.desired_salary ||
    application?.salary_expected ||
    application?.salary_expectation ||
    ''

  const current = candidate?.current_salary || ''
  const notes = candidate?.salary_notes || ''

  const parts = [
    expected ? expected : '',
    current ? `Currently earning ${current}` : '',
    notes ? notes : '',
  ].filter(Boolean)

  return parts.length > 0 ? parts.join('. ') : 'Not specified'
}

function buildDocumentEvidence(documents: any[], maxLength = 18000) {
  if (!Array.isArray(documents) || documents.length === 0) {
    return ''
  }

  const text = documents
    .map(doc => {
      const parts = [
        `Document name: ${doc?.name || 'Unnamed document'}`,
        `Document type: ${doc?.doc_type || 'unknown'}`,
        doc?.ai_summary ? `AI summary:\n${doc.ai_summary}` : '',
        doc?.extracted_text ? `Extracted text:\n${doc.extracted_text}` : '',
      ].filter(Boolean)

      return parts.join('\n')
    })
    .filter(Boolean)
    .join('\n\n---\n\n')

  return safeText(text, maxLength)
}

async function runClaude(prompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is missing.')
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 3200,
      temperature: 0.1,
      system:
        'You are a UK recruitment consultant at Educated Appointments writing a candidate summary to a client. Write like a real recruiter: clear, direct, professional and human. Use British English. Accuracy is more important than persuasion. Do not invent facts, do not exaggerate, and do not turn transferable skills into direct experience.',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error?.message || 'Claude profile generation failed.')
  }

  return (data.content || [])
    .map((part: any) => (part.type === 'text' ? part.text : ''))
    .join('\n')
    .trim()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const candidate = body.candidate || {}
    const vacancy = body.vacancy || {}
    const client = body.client || {}
    const application = body.application || {}
    const coverNote = safeText(body.cover_note || body.coverNote, 4000)
    const profileBuilderContext = safeText(
      body.profile_builder_context || body.profileBuilderContext,
      6000,
    )
    const anonymous = Boolean(body.anonymous)

        const candidateDocuments = Array.isArray(body.candidate_documents)
      ? body.candidate_documents
      : []

    const vacancyDocuments = Array.isArray(body.vacancy_documents)
      ? body.vacancy_documents
      : []

    const candidateActivities = Array.isArray(body.candidate_activities)
      ? body.candidate_activities
      : []

    const candidateDocumentEvidence = buildDocumentEvidence(
      candidateDocuments,
      22000,
    )

    const vacancyDocumentEvidence = buildDocumentEvidence(vacancyDocuments, 18000)

    const candidateName = getCandidateName(candidate, anonymous)
    const employerName = getEmployerName(client)
    const vacancyTitle = getVacancyTitle(vacancy)

    const location = getCandidateLocation(candidate)
    const noticePeriod = getNoticePeriod(candidate, application)
    const dbs = getDbs(candidate, application)
    const salaryExpected = getSalaryExpected(candidate, application)

    const vacancyEvidence =
      vacancyDocumentEvidence ||
      safeText(
        [
          vacancy?.employer_job_description,
          vacancy?.description,
          vacancy?.anonymous_description,
          vacancy?.briefing_notes,
        ]
          .filter(Boolean)
          .join('\n\n'),
        18000,
      ) ||
      'No vacancy/job description evidence provided.'

    const candidateEvidence =
      candidateDocumentEvidence ||
      safeText(
        [
          candidate?.formatted_cv,
          candidate?.notes,
          candidate?.qualifications,
          candidate?.can_deliver,
        ]
          .filter(Boolean)
          .join('\n\n'),
        22000,
      ) ||
      'No candidate CV/document evidence provided.'

    const eaInterviewEvidence = safeText(
      [
        application?.ea_interview_notes
          ? `EA interview notes:\n${application.ea_interview_notes}`
          : '',
        application?.ea_interview_verdict
          ? `EA interview verdict:\n${application.ea_interview_verdict}`
          : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
      10000,
    )

    const prompt = `
Write an employer-ready candidate introduction profile for Educated Appointments.

This profile must be based ONLY on the supplied evidence:
- Candidate CRM data
- EA interview notes
- Candidate CV/document evidence
- Vacancy/job description evidence
- Recruiter cover note
- Recruiter profile builder context notes

PROFILE WRITING RULES:
- Write like a recruiter who has spoken with or interviewed the candidate, where the supplied notes support that.
- The profile should feel warm, confident, human and positive.
- The aim is to help the employer see why the candidate is worth a conversation.
- Do not invent information.
- Do not exaggerate direct experience, qualifications, systems, standards or achievements.
- Do not say the candidate has delivered a sector, standard, qualification or role unless the evidence supports it.
- You may use phrasing such as "Having spoken with the candidate..." or "From our conversation..." only where interview notes, activity notes or recruiter context support it.
- Use recruiter judgement to present the candidate positively, but stay grounded in the evidence.
- If something is missing or unclear, do not automatically highlight it negatively.
- Only include a caveat if it is genuinely important for the employer to know before interview.
- Phrase caveats constructively, for example "This would be worth exploring further at interview" rather than "this is not evidenced".
- Avoid defensive phrases such as "not evidenced", "unclear", "no evidence", "does not appear" or "cannot confirm" unless absolutely necessary.
- If direct experience is not shown, focus on relevant transferable experience without pretending it is direct.
- Do not use phrases like "perfect fit", "guaranteed", "expert" or "extensive" unless the evidence clearly supports them.
- Keep it professional, positive and employer-facing.
- Use British English.
- Return only the finished profile text.
- Do not include markdown.
- Do not include headings such as Paragraph 1, Paragraph 2 or Paragraph 3.
- Treat recruiter profile builder context notes as guidance on emphasis, tone and caveats.
- Do not use the context notes to invent experience, qualifications, achievements, salary, DBS status, notice period or sector exposure.
- If context notes conflict with the CV, interview notes or application data, favour the evidenced candidate data and phrase carefully.

The profile must follow this exact structure and tone:

Hi ${employerName},

Please find below a summary of ${candidateName}, a/an [short professional description matched to the vacancy, employer and sector, but only using evidenced information].

Location: ${location}
Notice Period: ${noticePeriod}
DBS: ${dbs}
Salary Expected: ${salaryExpected}

[Paragraph 1: give a clear summary of the candidate's relevant background. Focus only on what is evidenced and what matters for this role.]

[Paragraph 2: explain what they are doing now or have done recently that matches the vacancy. If current/recent experience is not clear, say this is not clear from the information available.]

[Paragraph 3: explain how they match ${employerName}'s ${vacancyTitle} role. Be specific about direct matches. If direct sector experience is not evidenced, say that and focus on transferable skills instead.]

[Paragraph 4: close positively by explaining why the candidate could be worth a conversation. Only include a point to explore at interview if it is genuinely useful and phrase it constructively.]

Would you like me to book in for a call?

Kind regards,

Candidate data:
${safeText(JSON.stringify(candidate, null, 2), 10000)}

Application data:
${safeText(JSON.stringify(application, null, 2), 9000)}

EA interview evidence:
${eaInterviewEvidence || 'No EA interview evidence provided.'}

Candidate activity / recruiter conversation notes:
${safeText(JSON.stringify(candidateActivities, null, 2), 10000)}

Candidate CV / document evidence:
${candidateEvidence}

Vacancy data:
${safeText(JSON.stringify(vacancy, null, 2), 12000)}

Vacancy / job description evidence:
${vacancyEvidence}

Client/employer data:
${safeText(JSON.stringify(client, null, 2), 6000)}

Recruiter's cover note / extra instruction:
${coverNote || 'None provided'}

Recruiter profile builder context notes:
${profileBuilderContext || 'None provided'}

Final check before writing:
- Identify the strongest evidenced reasons this candidate could suit the role.
- Identify what we know from speaking with the candidate or from recruiter notes.
- Identify any transferable experience that can be positioned positively.
- Do not include unevidenced claims.
- Do not include negative caveats unless genuinely important.
- Do not include this final check in the output.
`

    const profile = await runClaude(prompt)

    return NextResponse.json({
      profile,
    })
  } catch (error: any) {
    console.error('Application profile builder error:', error)

    return NextResponse.json(
      {
        error: error?.message || 'Could not build application profile.',
      },
      { status: 500 },
    )
  }
}