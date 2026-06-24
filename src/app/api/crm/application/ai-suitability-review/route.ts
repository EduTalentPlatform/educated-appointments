import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callAIJson } from '@/lib/ai-client'

export const runtime = 'nodejs'

const MAX_SOURCE_CHARS_FOR_SUMMARY = 60000
const MAX_REVIEW_EXTRA_CHARS = 8000
const MAX_OUTPUT_TOKENS = 1200

type SummaryJson = {
  summary: string
  key_requirements?: string[]
  key_experience?: string[]
  qualifications?: string[]
  risks_or_gaps?: string[]
  screening_priorities?: string[]
}

type ReviewJson = {
  overall_fit: string
  score: number | null
  summary: string
  strengths: string[]
  missing_or_unclear: string[]
  risks: string[]
  candidate_questions: string[]
  client_questions: string[]
  recommended_next_action: string
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function cleanText(value: unknown) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/\n{4,}/g, '\n\n')
    .trim()
}

function limitText(text: string, maxChars: number) {
  const cleaned = cleanText(text)
  if (cleaned.length <= maxChars) return cleaned

  const headLength = Math.floor(maxChars * 0.75)
  const tailLength = maxChars - headLength

  return [
    cleaned.slice(0, headLength),
    '\n\n[...middle content trimmed to control AI cost...]\n\n',
    cleaned.slice(-tailLength),
  ].join('')
}

function estimateTokensFromChars(text: string) {
  return Math.ceil(text.length / 4)
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(item => String(item)).filter(Boolean)
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()]
  }

  return []
}

function normaliseReview(raw: ReviewJson) {
  return {
    overall_fit: String(raw?.overall_fit || 'Unclear'),
    score: Number.isFinite(Number(raw?.score)) ? Number(raw.score) : null,
    summary: String(raw?.summary || ''),
    strengths: toArray(raw?.strengths),
    missing_or_unclear: toArray(raw?.missing_or_unclear),
    risks: toArray(raw?.risks),
    candidate_questions: toArray(raw?.candidate_questions),
    client_questions: toArray(raw?.client_questions),
    recommended_next_action: String(raw?.recommended_next_action || ''),
  }
}

function getExtensionFromUrlOrName(fileUrl?: string | null, name?: string | null) {
  const source = fileUrl || name || ''
  const clean = source.split('?')[0].toLowerCase()
  return clean.split('.').pop() || ''
}

async function extractPdfWithAnthropicFromBuffer(buffer: Buffer) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'

  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY in environment variables.')
  }

  const base64 = buffer.toString('base64')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 6000,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64,
              },
            },
            {
              type: 'text',
              text:
                'Extract the full useful text from this document. Preserve headings, bullet points, job titles, dates, qualifications, responsibilities and requirements. Return extracted text only.',
            },
          ],
        },
      ],
    }),
  })

  const json = await res.json()

  if (!res.ok) {
    throw new Error(
      json?.error?.message || `Anthropic document extraction failed with ${res.status}`,
    )
  }

  return cleanText(
    json?.content
      ?.map((part: any) => part?.text)
      .filter(Boolean)
      .join('\n') || '',
  )
}

async function extractDocxTextFromBuffer(buffer: Buffer) {
  const mammothModule: any = await import('mammoth')
  const mammoth = mammothModule.default || mammothModule

  const result = await mammoth.extractRawText({ buffer })
  return cleanText(result.value || '')
}

function getDocumentExtension(doc: any) {
  const candidates = [doc?.name, doc?.storage_path, doc?.file_url]

  for (const candidate of candidates) {
    const raw = String(candidate || '')
      .split('?')[0]
      .toLowerCase()
      .trim()

    const match = raw.match(/\.([a-z0-9]+)$/)

    if (match?.[1]) {
      return match[1]
    }
  }

  return ''
}

async function getStoredDocumentBuffer({
  supabase,
  table,
  doc,
}: {
  supabase: ReturnType<typeof getServiceClient>
  table: 'candidate_documents' | 'vacancy_documents'
  doc: any
}) {
  const storagePath = cleanText(doc?.storage_path)

  if (storagePath) {
    const preferredBuckets =
      table === 'candidate_documents'
        ? ['candidate-documents', 'cvs']
        : ['vacancy-documents']

    const buckets = Array.from(
      new Set(
        [cleanText(doc?.storage_bucket), ...preferredBuckets].filter(Boolean),
      ),
    )

    for (const bucket of buckets) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(storagePath)

      if (!error && data) {
        return Buffer.from(await data.arrayBuffer())
      }
    }

    console.error('Could not download document from Supabase storage:', {
      document_id: doc?.id,
      document_name: doc?.name,
      storage_bucket: doc?.storage_bucket,
      storage_path: storagePath,
      tried_buckets: buckets,
    })
  }

  const fileUrl = cleanText(doc?.file_url)

  if (fileUrl) {
    const res = await fetch(fileUrl)

    if (!res.ok) {
      console.error('Could not fetch document from file_url:', {
        document_id: doc?.id,
        document_name: doc?.name,
        file_url: fileUrl,
        status: res.status,
      })
      return null
    }

    return Buffer.from(await res.arrayBuffer())
  }

  return null
}

async function extractTextFromStoredFile({
  supabase,
  table,
  doc,
}: {
  supabase: ReturnType<typeof getServiceClient>
  table: 'candidate_documents' | 'vacancy_documents'
  doc: any
}) {
  const buffer = await getStoredDocumentBuffer({
    supabase,
    table,
    doc,
  })

  if (!buffer) return ''

  const extension = getDocumentExtension(doc)

  if (extension === 'txt' || extension === 'md') {
    return cleanText(buffer.toString('utf8'))
  }

  if (extension === 'docx') {
    return extractDocxTextFromBuffer(buffer)
  }

  if (extension === 'doc') {
    console.warn(
      'Old .doc files are not currently supported for AI suitability extraction. Please upload as .docx, PDF or TXT.',
      {
        document_id: doc?.id,
        document_name: doc?.name,
      },
    )
    return ''
  }

  return extractPdfWithAnthropicFromBuffer(buffer)
}

async function ensureExtractedText({
  supabase,
  table,
  doc,
}: {
  supabase: ReturnType<typeof getServiceClient>
  table: 'candidate_documents' | 'vacancy_documents'
  doc: any
}) {
  if (!doc?.id) return ''

  if (doc.extracted_text) {
    return cleanText(doc.extracted_text)
  }

  const extractedText = await extractTextFromStoredFile({
  supabase,
  table,
  doc,
})

  if (!extractedText) return ''

  await supabase
    .from(table)
    .update({
      extracted_text: extractedText,
    })
    .eq('id', doc.id)

  return extractedText
}

function formatSummaryJson(summary: SummaryJson) {
  const sections = [
    summary.summary ? `Summary:\n${summary.summary}` : '',
    summary.key_requirements?.length
      ? `Key requirements:\n- ${summary.key_requirements.join('\n- ')}`
      : '',
    summary.key_experience?.length
      ? `Key experience:\n- ${summary.key_experience.join('\n- ')}`
      : '',
    summary.qualifications?.length
      ? `Qualifications:\n- ${summary.qualifications.join('\n- ')}`
      : '',
    summary.risks_or_gaps?.length
      ? `Risks or gaps:\n- ${summary.risks_or_gaps.join('\n- ')}`
      : '',
    summary.screening_priorities?.length
      ? `Screening priorities:\n- ${summary.screening_priorities.join('\n- ')}`
      : '',
  ]

  return sections.filter(Boolean).join('\n\n')
}

async function ensureDocumentSummary({
  supabase,
  table,
  doc,
  sourceKind,
  fallbackText,
}: {
  supabase: ReturnType<typeof getServiceClient>
  table: 'candidate_documents' | 'vacancy_documents'
  doc: any
  sourceKind: 'candidate_cv' | 'job_description'
  fallbackText: string
}) {
    const existingExtractedText = cleanText(doc?.extracted_text)

  const extractedText = doc?.id
    ? await ensureExtractedText({ supabase, table, doc })
    : ''

  if (doc?.ai_summary && existingExtractedText) {
    return cleanText(doc.ai_summary)
  }

  const sourceText = limitText(
    [extractedText, fallbackText].filter(Boolean).join('\n\n'),
    MAX_SOURCE_CHARS_FOR_SUMMARY,
  )

  if (!sourceText.trim()) return ''

  const prompt =
    sourceKind === 'candidate_cv'
      ? `
You are summarising a candidate CV for a UK FE, Skills and Apprenticeships recruiter.

Create a detailed but concise structured recruitment summary.
Do not invent information.
If something is unclear, include it as a gap.

Return JSON only:
{
  "summary": "clear candidate overview",
  "key_requirements": ["roles/role types the candidate appears suitable for"],
  "key_experience": ["specific relevant experience, sectors, standards, delivery, assessing, training, IQA, management etc"],
  "qualifications": ["qualifications, certificates, memberships"],
  "risks_or_gaps": ["missing or unclear points, gaps, risks"],
  "screening_priorities": ["questions/points to check with candidate"]
}

CV TEXT:
${sourceText}
`.trim()
      : `
You are summarising a client job description for a UK FE, Skills and Apprenticeships recruiter.

Create a detailed but concise structured vacancy summary.
Do not invent information.
Separate must-haves, desirables and unclear points.

Return JSON only:
{
  "summary": "clear vacancy overview",
  "key_requirements": ["must-have and desirable requirements"],
  "key_experience": ["responsibilities, experience, sector, standards, caseload, delivery etc"],
  "qualifications": ["required or desirable qualifications"],
  "risks_or_gaps": ["unclear points, missing salary/location/qualification/client details"],
  "screening_priorities": ["candidate screening priorities for this vacancy"]
}

JOB DESCRIPTION:
${sourceText}
`.trim()

  const summaryJson = await callAIJson<SummaryJson>(prompt, {
    maxTokens: 1800,
    temperature: 0.1,
    system:
      'You return valid JSON only. Be detailed, practical and recruitment-focused. Do not include markdown or code fences.',
  })

  const summaryText = formatSummaryJson(summaryJson)

  if (doc?.id && summaryText) {
    await supabase
      .from(table)
      .update({
        ai_summary: summaryText,
        ai_summary_updated_at: new Date().toISOString(),
      })
      .eq('id', doc.id)
  }

  return summaryText
}

function buildCandidateFallbackText(candidate: any) {
  return [
    candidate.formatted_cv,
    candidate.notes ? `Candidate notes:\n${candidate.notes}` : '',
    candidate.qualifications ? `Qualifications:\n${candidate.qualifications}` : '',
    candidate.can_deliver ? `Can deliver:\n${candidate.can_deliver}` : '',
    Array.isArray(candidate.looking_for_roles)
      ? `Looking for:\n${candidate.looking_for_roles.join(', ')}`
      : '',
    candidate.job_title ? `Current role:\n${candidate.job_title}` : '',
    candidate.sub_role_type || candidate.seeking_role_type
      ? `Role type:\n${candidate.sub_role_type || candidate.seeking_role_type}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}

function buildVacancyFallbackText(vacancy: any) {
  return [
    vacancy.employer_job_description
      ? `Employer job description / source brief:\n${vacancy.employer_job_description}`
      : '',
    vacancy.description ? `Generated advert / vacancy description:\n${vacancy.description}` : '',
    vacancy.anonymous_description
      ? `Anonymous candidate-facing description:\n${vacancy.anonymous_description}`
      : '',
    vacancy.briefing_notes ? `Briefing notes:\n${vacancy.briefing_notes}` : '',
    vacancy.title ? `Vacancy title:\n${vacancy.title}` : '',
    vacancy.sector ? `Sector:\n${vacancy.sector}` : '',
    vacancy.role_type ? `Role type:\n${vacancy.role_type}` : '',
    vacancy.type ? `Contract type:\n${vacancy.type}` : '',
    vacancy.location || vacancy.region
      ? `Location:\n${[vacancy.location, vacancy.region].filter(Boolean).join(', ')}`
      : '',
    vacancy.salary_display ? `Salary:\n${vacancy.salary_display}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const applicationId = body.application_id
    const force = body.force === true
    const deep = body.deep === true

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Missing application id.' },
        { status: 400 },
      )
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Missing ANTHROPIC_API_KEY in environment variables.' },
        { status: 500 },
      )
    }

    const supabase = getServiceClient()

    if (!force && !deep) {
      const { data: existingReview } = await supabase
        .from('application_ai_reviews')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingReview) {
        return NextResponse.json({
          data: existingReview,
          cached: true,
        })
      }
    }

    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        *,
        candidates (
          id,
          first_name,
          last_name,
          email,
          phone,
          job_title,
          main_role_type,
          sub_role_type,
          seeking_role_type,
          looking_for_roles,
          formatted_cv,
          notes,
          qualifications,
          can_deliver,
          cv_url
        ),
        vacancies (
          id,
          title,
          sector,
          role_type,
          type,
          location,
          region,
          salary_display,
          employer_job_description,
          description,
          anonymous_description,
          briefing_notes,
          clients (
            id,
            company_name
          )
        )
      `)
      .eq('id', applicationId)
      .single()

    if (appError || !application) {
      return NextResponse.json(
        { error: appError?.message || 'Application not found.' },
        { status: 404 },
      )
    }

    const candidate = application.candidates as any
    const vacancy = application.vacancies as any

    if (!candidate?.id || !vacancy?.id) {
      return NextResponse.json(
        { error: 'Application is missing candidate or vacancy details.' },
        { status: 400 },
      )
    }

    const [{ data: candidateDocuments }, { data: vacancyDocuments }] =
      await Promise.all([
        supabase
          .from('candidate_documents')
          .select('*')
          .eq('candidate_id', candidate.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('vacancy_documents')
          .select('*')
          .eq('vacancy_id', vacancy.id)
          .order('created_at', { ascending: false }),
      ])

    const cvDoc =
  candidateDocuments?.find((doc: any) =>
    ['cv', 'formatted_cv', 'candidate_cv'].includes(doc.doc_type),
  ) ??
  candidateDocuments?.find((doc: any) =>
    ['pdf', 'docx', 'txt', 'md'].includes(getDocumentExtension(doc)),
  ) ??
  candidateDocuments?.[0]

    const jdDoc =
      vacancyDocuments?.find((doc: any) => doc.doc_type === 'job_description') ??
      vacancyDocuments?.[0]

    const candidateFallback = buildCandidateFallbackText(candidate)
    const vacancyFallback = buildVacancyFallbackText(vacancy)

    const employerJobDescription = cleanText(vacancy.employer_job_description)

    const candidateSummary = await ensureDocumentSummary({
      supabase,
      table: 'candidate_documents',
      doc: cvDoc,
      sourceKind: 'candidate_cv',
      fallbackText: candidateFallback,
    })

    const vacancySummary = await ensureDocumentSummary({
      supabase,
      table: 'vacancy_documents',
      doc: jdDoc,
      sourceKind: 'job_description',
      fallbackText: vacancyFallback,
    })

    const candidateRawExtra =
      deep && cvDoc
        ? limitText(
            [
              cvDoc.extracted_text ||
                (await ensureExtractedText({
                  supabase,
                  table: 'candidate_documents',
                  doc: cvDoc,
                })),
              candidateFallback,
            ]
              .filter(Boolean)
              .join('\n\n'),
            MAX_REVIEW_EXTRA_CHARS,
          )
        : ''

    const vacancyRawExtra =
      deep
        ? limitText(
            [
              jdDoc
                ? jdDoc.extracted_text ||
                  (await ensureExtractedText({
                    supabase,
                    table: 'vacancy_documents',
                    doc: jdDoc,
                  }))
                : '',
              employerJobDescription,
              vacancyFallback,
            ]
              .filter(Boolean)
              .join('\n\n'),
            MAX_REVIEW_EXTRA_CHARS,
          )
        : ''

    const candidateReviewText = [
      candidateSummary,
      !candidateSummary ? candidateFallback : '',
      candidateRawExtra ? `Extra candidate source extract:\n${candidateRawExtra}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    const vacancyReviewText = [
      employerJobDescription
        ? `EMPLOYER JOB DESCRIPTION / SOURCE BRIEF:\n${limitText(
            employerJobDescription,
            MAX_REVIEW_EXTRA_CHARS,
          )}`
        : '',
      vacancySummary,
      !vacancySummary ? vacancyFallback : '',
      vacancyRawExtra ? `Extra vacancy source extract:\n${vacancyRawExtra}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    if (!candidateReviewText.trim()) {
      return NextResponse.json(
        {
          error:
            'No candidate CV/profile text found. Add a CV document, formatted CV, CV summary or extracted CV text before running the review.',
        },
        { status: 400 },
      )
    }

    if (!vacancyReviewText.trim()) {
      return NextResponse.json(
        {
          error:
            'No job description text found. Paste and save the employer job description in the vacancy Description tab, or upload the client JD first.',
        },
        { status: 400 },
      )
    }

    const reviewInput = `
CANDIDATE SUMMARY:
${candidateReviewText}

VACANCY / EMPLOYER JOB DESCRIPTION:
${vacancyReviewText}
`.trim()

    const estimatedInputTokens = estimateTokensFromChars(reviewInput)

    const reviewPrompt = `
You are an expert UK FE, Skills and Apprenticeships recruitment consultant.

Compare the candidate ONLY against the employer job description / vacancy brief.
Do not compare this candidate to other candidates.
Prioritise the EMPLOYER JOB DESCRIPTION / SOURCE BRIEF where provided.
Do not invent information.
Where evidence is missing, mark it as missing or unclear.
Be specific, practical and useful for recruiter screening.

Return valid JSON only:
{
  "overall_fit": "Strong fit | Possible fit | Weak fit | Unclear",
  "score": 0,
  "summary": "2-4 sentence practical summary",
  "strengths": ["specific strength"],
  "missing_or_unclear": ["missing or unclear point"],
  "risks": ["risk or concern"],
  "candidate_questions": ["question to ask candidate"],
  "client_questions": ["question to ask client"],
  "recommended_next_action": "Progress / Hold for screening / Reject / Needs more information"
}

${reviewInput}
`.trim()

    const reviewRaw = await callAIJson<ReviewJson>(reviewPrompt, {
      maxTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.1,
      system:
        'You return valid JSON only. You are practical, specific and recruitment-focused. Do not include markdown or code fences.',
    })

    const review = normaliseReview(reviewRaw)

    const { data: savedReview, error: saveError } = await supabase
      .from('application_ai_reviews')
      .insert({
        application_id: application.id,
        candidate_id: candidate.id,
        vacancy_id: vacancy.id,

        overall_fit: review.overall_fit,
        score: review.score,
        summary: review.summary,

        strengths: review.strengths,
        missing_or_unclear: review.missing_or_unclear,
        risks: review.risks,
        candidate_questions: review.candidate_questions,
        client_questions: review.client_questions,

        recommended_next_action: review.recommended_next_action,
        raw_response: {
          ...reviewRaw,
          meta: {
            deep,
            used_employer_job_description: Boolean(employerJobDescription),
            employer_job_description_chars: employerJobDescription.length,
            candidate_doc_id: cvDoc?.id || null,
            vacancy_doc_id: jdDoc?.id || null,
            candidate_summary_chars: candidateSummary.length,
            vacancy_summary_chars: vacancySummary.length,
            estimated_input_tokens: estimatedInputTokens,
            max_output_tokens: MAX_OUTPUT_TOKENS,
          },
        },
      })
      .select()
      .single()

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 400 })
    }

    return NextResponse.json({
      data: savedReview,
      cached: false,
      deep,
      used_employer_job_description: Boolean(employerJobDescription),
      estimated_input_tokens: estimatedInputTokens,
    })
  } catch (error: any) {
    console.error('AI suitability review error:', error)

    return NextResponse.json(
      {
        error:
          error?.message || 'Something went wrong running the AI suitability review.',
      },
      { status: 500 },
    )
  }
}