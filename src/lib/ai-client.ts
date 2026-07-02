// ─────────────────────────────────────────────────────────────────────────────
// Educated Appointments — AI client
// Anthropic + OpenAI router
// ─────────────────────────────────────────────────────────────────────────────

type AIProvider = 'anthropic' | 'openai'

type AITaskType =
  | 'default'
  | 'email'
  | 'outreach'
  | 'sms'
  | 'linkedin'
  | 'matching'
  | 'json'
  | 'cv_parse'
  | 'profile_builder'
  | 'web_search'

type AIOptions = {
  maxTokens?: number
  temperature?: number
  useWebSearch?: boolean
  webSearchContextSize?: 'low' | 'medium' | 'high'
  system?: string
  autoContinue?: boolean
  maxContinuations?: number
  provider?: AIProvider
  taskType?: AITaskType
  model?: string
  cachePrompt?: boolean
  route?: string
  metadata?: Record<string, any>
  logUsage?: boolean
}

type AIUsage = {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
}

type AIResult = {
  text: string
  provider: AIProvider
  model?: string
  finishReason?: string
  usage?: AIUsage
}

type ProviderResult = AIResult

const DEFAULT_MAX_TOKENS = 3000

const DEFAULT_ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'

const DEFAULT_OPENAI_LOW_COST_MODEL =
  process.env.OPENAI_LOW_COST_MODEL ||
  process.env.OPENAI_MODEL ||
  'gpt-5.4-mini'

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
  return ['max_tokens', 'max_output_tokens'].includes(reason)
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

function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY)
}

function hasAnthropicKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

function resolveProvider(options: RequiredResolvedOptions): AIProvider {
  if (options.provider) {
    if (options.provider === 'openai' && hasOpenAIKey()) return 'openai'
    if (options.provider === 'anthropic' && hasAnthropicKey()) return 'anthropic'
  }

  // Prefer OpenAI for web search when available to keep BD search costs down.
  if (options.useWebSearch && hasOpenAIKey()) {
    return 'openai'
  }

  if (options.useWebSearch && hasAnthropicKey()) {
    return 'anthropic'
  }

  // Low-risk, high-volume writing/filtering tasks can use OpenAI if configured.
  if (
    hasOpenAIKey() &&
    ['email', 'outreach', 'sms', 'linkedin', 'matching'].includes(
      options.taskType,
    )
  ) {
    return 'openai'
  }

  return 'anthropic'
}

function resolveOpenAIModel(options: RequiredResolvedOptions) {
  if (options.model) return options.model

  if (
    ['email', 'outreach', 'sms', 'linkedin', 'matching'].includes(
      options.taskType,
    )
  ) {
    return DEFAULT_OPENAI_LOW_COST_MODEL
  }

  return DEFAULT_OPENAI_LOW_COST_MODEL
}

type RequiredResolvedOptions = Required<
  Pick<
    AIOptions,
    | 'maxTokens'
    | 'temperature'
    | 'system'
    | 'useWebSearch'
    | 'autoContinue'
    | 'maxContinuations'
    | 'taskType'
    | 'cachePrompt'
    | 'logUsage'
    | 'webSearchContextSize'
  >
> &
  Pick<AIOptions, 'provider' | 'model' | 'route' | 'metadata'>

async function callAnthropic(
  prompt: string,
  options: RequiredResolvedOptions,
): Promise<ProviderResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY')
  }

  const body: any = {
    model: options.model || DEFAULT_ANTHROPIC_MODEL,
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

  // Anthropic supports prompt caching via cache_control. Keep this optional
  // because we only want to enable it for stable repeated prompts.
  if (options.cachePrompt) {
    body.cache_control = { type: 'ephemeral' }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  }

  if (options.useWebSearch) {
    headers['anthropic-beta'] = 'web-search-2025-03-05'
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(
      data?.error?.message ?? `Anthropic error ${res.status}`,
    )
  }

  const text = (data.content ?? [])
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('')

  return {
    text: cleanText(text),
    provider: 'anthropic',
    model: body.model,
    finishReason: data.stop_reason,
    usage: {
      inputTokens: data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens,
      totalTokens:
        typeof data.usage?.input_tokens === 'number' &&
        typeof data.usage?.output_tokens === 'number'
          ? data.usage.input_tokens + data.usage.output_tokens
          : undefined,
    },
  }
}

function extractOpenAIText(data: any) {
  if (typeof data.output_text === 'string') {
    return data.output_text
  }

  const chunks: string[] = []

  for (const item of data.output ?? []) {
    for (const content of item.content ?? []) {
      if (content?.type === 'output_text' && content?.text) {
        chunks.push(content.text)
      }

      if (content?.type === 'text' && content?.text) {
        chunks.push(content.text)
      }
    }
  }

  return chunks.join('')
}

function getOpenAIFinishReason(data: any) {
  if (data?.status === 'incomplete') {
    return data?.incomplete_details?.reason || 'max_output_tokens'
  }

  return data?.status || undefined
}

async function callOpenAI(
  prompt: string,
  options: RequiredResolvedOptions,
): Promise<ProviderResult> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY')
  }

  const model = resolveOpenAIModel(options)

  const body: any = {
    model,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: options.system,
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: prompt,
          },
        ],
      },
    ],
    max_output_tokens: options.maxTokens,
  }

  if (options.useWebSearch) {
    body.tools = [
      {
        type: 'web_search',
        search_context_size: options.webSearchContextSize,
        user_location: {
          type: 'approximate',
          country: 'GB',
        },
      },
    ]
    body.tool_choice = 'required'
  }

  // Some OpenAI models accept temperature, some do not. Add it first, and if
  // the API rejects it, retry once without temperature.
  if (typeof options.temperature === 'number') {
    body.temperature = options.temperature
  }

  async function send(payload: any) {
    return fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })
  }

  let res = await send(body)
  let data = await res.json().catch(() => ({}))

  if (!res.ok && data?.error?.message?.toLowerCase?.().includes('temperature')) {
    const retryBody = { ...body }
    delete retryBody.temperature

    res = await send(retryBody)
    data = await res.json().catch(() => ({}))
  }

  if (!res.ok) {
    throw new Error(data?.error?.message ?? `OpenAI error ${res.status}`)
  }

  const text = extractOpenAIText(data)

  return {
    text: cleanText(text),
    provider: 'openai',
    model,
    finishReason: getOpenAIFinishReason(data),
    usage: {
      inputTokens: data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens,
      totalTokens: data.usage?.total_tokens,
    },
  }
}

async function callProvider(
  prompt: string,
  options: RequiredResolvedOptions,
): Promise<ProviderResult> {
  const provider = resolveProvider(options)

  if (provider === 'openai') {
    return callOpenAI(prompt, options)
  }

  return callAnthropic(prompt, options)
}

function getSupabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''
  ).replace(/\/$/, '')
}

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || ''
}

async function logAIUsage(payload: {
  route?: string
  taskType?: string
  provider: AIProvider
  model?: string
  finishReason?: string
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  maxTokens?: number
  temperature?: number
  success: boolean
  errorMessage?: string
  metadata?: Record<string, any>
}) {
  const supabaseUrl = getSupabaseUrl()
  const serviceRoleKey = getSupabaseServiceRoleKey()

  if (!supabaseUrl || !serviceRoleKey) {
    return
  }

  try {
    await fetch(`${supabaseUrl}/rest/v1/ai_usage_logs`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        route: payload.route || null,
        task_type: payload.taskType || null,
        provider: payload.provider,
        model: payload.model || null,
        finish_reason: payload.finishReason || null,
        input_tokens: payload.inputTokens ?? null,
        output_tokens: payload.outputTokens ?? null,
        total_tokens: payload.totalTokens ?? null,
        max_tokens: payload.maxTokens ?? null,
        temperature: payload.temperature ?? null,
        success: payload.success,
        error_message: payload.errorMessage || null,
        metadata: payload.metadata || {},
      }),
    })
  } catch (error) {
    console.error('AI usage logging failed:', error)
  }
}

export async function callAI(
  prompt: string,
  options: AIOptions = {},
): Promise<AIResult> {
  const resolvedOptions: RequiredResolvedOptions = {
    maxTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
    temperature: options.temperature ?? 0.7,
    useWebSearch: options.useWebSearch ?? false,
    system: buildSystemPrompt(options.system),
    autoContinue: options.autoContinue ?? true,
    maxContinuations: options.maxContinuations ?? 2,
    provider: options.provider,
    taskType: options.taskType ?? 'default',
    model: options.model,
    cachePrompt: options.cachePrompt ?? false,
    route: options.route,
    metadata: options.metadata,
    logUsage: options.logUsage ?? true,
    webSearchContextSize: options.webSearchContextSize ?? 'low',
  }

  let selectedProvider: AIProvider | undefined
  let selectedModel: string | undefined

  try {
    const firstProvider = resolveProvider(resolvedOptions)
    selectedProvider = firstProvider
    selectedModel =
      firstProvider === 'openai'
        ? resolveOpenAIModel(resolvedOptions)
        : resolvedOptions.model || DEFAULT_ANTHROPIC_MODEL

    let result = await callProvider(prompt, resolvedOptions)

    if (!result.text) {
      throw new Error(`${result.provider} returned empty text`)
    }

    let finalText = result.text
    let finishReason = result.finishReason
    let continuations = 0
    const provider = result.provider
    const model = result.model
    const usage = result.usage

    while (
      resolvedOptions.autoContinue &&
      isTokenLimitFinishReason(finishReason) &&
      continuations < resolvedOptions.maxContinuations
    ) {
      continuations++

      const continued = await callProvider(
        buildContinuationPrompt(prompt, finalText),
        {
          ...resolvedOptions,
          provider,
          model,
        },
      )

      if (!continued.text) break

      finalText = cleanText(`${finalText}\n\n${continued.text}`)
      finishReason = continued.finishReason
    }

    if (resolvedOptions.logUsage) {
      await logAIUsage({
        route: resolvedOptions.route,
        taskType: resolvedOptions.taskType,
        provider,
        model,
        finishReason,
        inputTokens: usage?.inputTokens,
        outputTokens: usage?.outputTokens,
        totalTokens: usage?.totalTokens,
        maxTokens: resolvedOptions.maxTokens,
        temperature: resolvedOptions.temperature,
        success: true,
        metadata: {
          ...(resolvedOptions.metadata || {}),
          continuations,
          use_web_search: resolvedOptions.useWebSearch,
        },
      })
    }

    return {
      text: finalText,
      provider,
      model,
      finishReason,
      usage,
    }
  } catch (error: any) {
    if (resolvedOptions.logUsage) {
      await logAIUsage({
        route: resolvedOptions.route,
        taskType: resolvedOptions.taskType,
        provider: selectedProvider || resolvedOptions.provider || 'anthropic',
        model: selectedModel || resolvedOptions.model,
        maxTokens: resolvedOptions.maxTokens,
        temperature: resolvedOptions.temperature,
        success: false,
        errorMessage: error?.message || 'AI request failed.',
        metadata: {
          ...(resolvedOptions.metadata || {}),
          use_web_search: resolvedOptions.useWebSearch,
        },
      })
    }

    throw error
  }
}

export async function callAIEmail(prompt: string): Promise<AIResult> {
  return callAI(prompt, {
    maxTokens: 3500,
    temperature: 0.7,
    autoContinue: true,
    maxContinuations: 2,
    taskType: 'email',
    system: DEFAULT_SYSTEM_PROMPT,
  })
}

export async function callAIJson<T = any>(
  prompt: string,
  options: AIOptions = {},
): Promise<T> {
  const { text } = await callAI(prompt, {
    ...options,
    provider: options.provider ?? 'anthropic',
    taskType: options.taskType ?? 'json',
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