// ─────────────────────────────────────────────────────────────────────────────
// Educated Appointments — AI client
// Anthropic / Claude only
// ─────────────────────────────────────────────────────────────────────────────

type AIProvider = 'anthropic'

type AIOptions = {
  maxTokens?: number
  temperature?: number
  useWebSearch?: boolean
  system?: string
  autoContinue?: boolean
  maxContinuations?: number
}

type AIResult = {
  text: string
  provider: AIProvider
  finishReason?: string
}

type ProviderResult = {
  text: string
  provider: AIProvider
  finishReason?: string
}

const DEFAULT_MAX_TOKENS = 3000

const EA_BRAND_VOICE = `
Educated Appointments brand voice and AI writing rules:

Educated Appointments is a specialist UK recruitment business for the Further Education, Skills, Apprenticeships and Training sector.

Write like a consultative, likeable and knowledgeable FE & Skills recruitment specialist.

Core tone:
- Human, warm, credible and commercially sensible.
- Consultative rather than pushy.
- Confident, but not cocky.
- Friendly, but not cheesy.
- Sector-aware, practical and useful.
- Clear UK English.

Sales principles:
- Every sale should feel mutually beneficial.
- The outcome should be right for the customer, the candidate and Educated Appointments.
- Focus on fit, timing, trust, value and solving genuine recruitment problems.
- Position Educated Appointments as a partner, not a vendor.
- Never pressure people into decisions.
- Never overpromise.
- Never invent facts.

Avoid:
- Greasy sales language.
- Robotic recruiter language.
- Generic mass outreach.
- Fake urgency.
- Hype, clichés or exaggerated claims.
- Phrases like "game-changer", "perfect fit", "exciting opportunity", "just touching base", or anything that sounds like a bulk LinkedIn automation campaign.
- Overly long, fluffy openings.

The writing should sound like a real person with sector knowledge and something relevant to say.
`.trim()

const DEFAULT_SYSTEM_PROMPT = `
You are an expert UK recruitment copywriter for Educated Appointments.

Write complete, polished, professional content for the Further Education, Skills, Apprenticeships and Training sector.

Do not be brief unless explicitly asked.
Do not stop after one or two sentences unless the requested format is naturally short, such as SMS or LinkedIn connection messages.

When writing emails, produce a complete email with:
- a clear opening
- useful context
- relevant detail
- a natural call to action
- a professional sign-off

When writing LinkedIn messages, SMS messages, notes, candidate profiles, vacancy summaries, interview summaries or outreach:
- keep the format appropriate to the channel
- be concise where the channel requires it
- stay natural and human
- avoid over-selling

Always follow the Educated Appointments brand voice.
`.trim()

function buildSystemPrompt(systemPrompt?: string) {
  const taskSystem = systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT

  return `
${EA_BRAND_VOICE}

${taskSystem}
`.trim()
}

function isTokenLimitFinishReason(reason?: string) {
  if (!reason) return false
  return ['max_tokens'].includes(reason)
}

function cleanText(text: string) {
  return text.replace(/\n{4,}/g, '\n\n').trim()
}

function buildContinuationPrompt(originalPrompt: string, previousText: string) {
  return `
You were writing the response below, but it stopped before it was complete.

Original instruction:
${originalPrompt}

Current draft:
${previousText}

Continue from exactly where it stopped.
Do not restart. Do not repeat the opening.
Finish the response properly.
`.trim()
}

async function callAnthropic(
  prompt: string,
  options: Required<
    Pick<
      AIOptions,
      'maxTokens' | 'temperature' | 'system' | 'useWebSearch'
    >
  >,
): Promise<ProviderResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY')
  }

  const body: any = {
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: options.maxTokens,
    temperature: options.temperature,
    system: options.system,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  }

  if (options.useWebSearch) {
    body.tools = [
      {
        type: 'web_search_20250305',
        name: 'web_search',
      },
    ]
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))

    throw new Error(
      err?.error?.message ?? `Anthropic error ${res.status}`,
    )
  }

  const data = await res.json()

  const text = (data.content ?? [])
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('')

  return {
    text: cleanText(text),
    provider: 'anthropic',
    finishReason: data.stop_reason,
  }
}

export async function callAI(
  prompt: string,
  options: AIOptions = {},
): Promise<AIResult> {
  const resolvedOptions = {
    maxTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
    temperature: options.temperature ?? 0.7,
    useWebSearch: options.useWebSearch ?? false,
    system: buildSystemPrompt(options.system),
    autoContinue: options.autoContinue ?? true,
    maxContinuations: options.maxContinuations ?? 2,
  }

  let result = await callAnthropic(prompt, resolvedOptions)

  if (!result.text) {
    throw new Error('Anthropic returned empty text')
  }

  let finalText = result.text
  let finishReason = result.finishReason
  let continuations = 0

  while (
    resolvedOptions.autoContinue &&
    isTokenLimitFinishReason(finishReason) &&
    continuations < resolvedOptions.maxContinuations
  ) {
    continuations++

    const continued = await callAnthropic(
      buildContinuationPrompt(prompt, finalText),
      resolvedOptions,
    )

    if (!continued.text) break

    finalText = cleanText(`${finalText}\n\n${continued.text}`)
    finishReason = continued.finishReason
  }

  return {
    text: finalText,
    provider: 'anthropic',
    finishReason,
  }
}

export async function callAIEmail(prompt: string): Promise<AIResult> {
  return callAI(prompt, {
    maxTokens: 3500,
    temperature: 0.7,
    autoContinue: true,
    maxContinuations: 2,
    system: DEFAULT_SYSTEM_PROMPT,
  })
}

export async function callAIJson<T = any>(
  prompt: string,
  options: AIOptions = {},
): Promise<T> {
  const { text } = await callAI(prompt, {
    ...options,
    maxTokens: options.maxTokens ?? 2500,
    temperature: options.temperature ?? 0.2,
    autoContinue: false,
    system:
      options.system ??
      `
You return valid JSON only.
Do not include markdown, commentary, explanations or code fences.
The JSON content must still follow the Educated Appointments brand voice where any written copy is included.
`.trim(),
  })

  const clean = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  const match = clean.match(/\{[\s\S]*\}/)

  if (!match) {
    throw new Error('No JSON found in AI response')
  }

  return JSON.parse(match[0]) as T
}