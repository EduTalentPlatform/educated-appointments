import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type DocumentSummaryRequest = {
  text?: string
  content?: string
  documentText?: string
  fileName?: string
  filename?: string
  documentType?: string
  title?: string
}

function getDocumentText(body: DocumentSummaryRequest) {
  return (
    body.text ||
    body.content ||
    body.documentText ||
    ''
  ).trim()
}

function getFileName(body: DocumentSummaryRequest) {
  return body.fileName || body.filename || body.title || 'Uploaded document'
}

function extractAnthropicText(data: any): string {
  const content = data?.content

  if (!Array.isArray(content)) return ''

  return content
    .filter((item) => item?.type === 'text' && typeof item?.text === 'string')
    .map((item) => item.text)
    .join('\n')
    .trim()
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing ANTHROPIC_API_KEY environment variable.' },
        { status: 500 },
      )
    }

    const body = (await request.json()) as DocumentSummaryRequest
    const documentText = getDocumentText(body)
    const fileName = getFileName(body)
    const documentType = body.documentType || 'document'

    if (!documentText) {
      return NextResponse.json(
        { error: 'No document text was provided.' },
        { status: 400 },
      )
    }

    const trimmedText =
      documentText.length > 18000
        ? `${documentText.slice(0, 18000)}\n\n[Document truncated for summary generation]`
        : documentText

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest',
        max_tokens: 1200,
        temperature: 0.2,
        system:
          'You are an expert recruitment and FE/apprenticeship document analyst. Summarise documents clearly, practically and without inventing information.',
        messages: [
          {
            role: 'user',
            content: `
Please summarise this ${documentType} for a recruitment CRM.

File name:
${fileName}

Return the summary in this structure:

1. Document overview
2. Key details
3. Candidate/client/vacancy relevance
4. Risks, gaps or missing information
5. Recommended next action

Document text:
${trimmedText}
            `.trim(),
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()

      return NextResponse.json(
        {
          error: 'Anthropic document summary request failed.',
          details: errorText,
        },
        { status: response.status },
      )
    }

    const data = await response.json()
    const summary = extractAnthropicText(data)

    if (!summary) {
      return NextResponse.json(
        { error: 'No summary was returned by Anthropic.' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      summary,
      documentSummary: summary,
      fileName,
      documentType,
    })
  } catch (error) {
    console.error('Document summary route error:', error)

    return NextResponse.json(
      {
        error: 'Failed to generate document summary.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}