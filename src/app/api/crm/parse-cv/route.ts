import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const ALLOWED_FILE_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'txt'])

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
])

function getFileExtension(fileName: string) {
  const parts = String(fileName || '').toLowerCase().split('.')
  return parts.length > 1 ? parts.pop() || '' : ''
}

function isAllowedCvFile(file: File) {
  const extension = getFileExtension(file.name)
  const mimeType = String(file.type || '').toLowerCase()

  return (
    ALLOWED_FILE_EXTENSIONS.has(extension) ||
    ALLOWED_MIME_TYPES.has(mimeType)
  )
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file || file.size <= 0) {
      return NextResponse.json(
        { error: 'No file provided.' },
        { status: 400 },
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `${file.name} is too large. Maximum file size is 10MB.` },
        { status: 400 },
      )
    }

    if (!isAllowedCvFile(file)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Upload PDF, Word or TXT.' },
        { status: 400 },
      )
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'AI CV parsing is not configured.' },
        { status: 500 },
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const ext = file.name.split('.').pop()?.toLowerCase()

    const extractPrompt = `You are parsing a CV for a UK FE & Skills recruitment agency called Educated Appointments. They recruit assessors, IQAs, skills coaches, tutors, curriculum managers, BDMs and other FE & Skills professionals.

Extract the candidate's details from this CV and return ONLY valid JSON (no markdown):

{
  "first_name": "First name",
  "last_name": "Last name",
  "email": "Email address or null",
  "phone": "Phone number or null",
  "job_title": "Current or most recent job title",
  "seeking_role_type": "The most appropriate role type from this list: Assessor, IQA, Lead IQA, End-Point Assessor (EPA), Skills Coach, Tutor / Trainer, Distance Learning Tutor, Functional Skills Tutor (Maths), Functional Skills Tutor (English), Business Development Manager, Employer Engagement Manager, Apprenticeship Advisor, Recruitment Consultant, Curriculum Manager, Quality Manager, Compliance Manager, Operations Manager, MIS Officer, Other",
  "preferred_location": "Their location / region based on address or work history — use one of: East of England, East Midlands, West Midlands, North West, North East, Yorkshire & Humber, South East, South West, London, Wales, Scotland, Northern Ireland, or null",
  "postcode": "Their postcode if visible in the CV, or null",
  "notes": "2-3 sentence professional summary of their background, key qualifications and experience relevant to FE & Skills",
  "actively_looking": true
}`

    // PDF — send as document block to Claude
    if (ext === 'pdf') {
      const base64 = buffer.toString('base64')
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
              { type: 'text', text: extractPrompt },
            ],
          }],
        }),
      })
      const data = await response.json()
      const text = (data.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
      return parseAndReturn(text)
    }

    // DOCX — extract text first, then parse
    if (ext === 'docx' || ext === 'doc') {
      let cvText = ''
      try {
        const { default: JSZip } = await import('jszip')
        const zip = await JSZip.loadAsync(buffer)
        const docXml = await zip.file('word/document.xml')?.async('string')
        if (docXml) {
          cvText = docXml
            .replace(/<w:p[ >]/g, '\n<w:p>')
            .replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/\n{3,}/g, '\n\n').trim()
        }
      } catch {}
      if (!cvText) return NextResponse.json({ error: 'Could not read Word document.' }, { status: 422 })
      return await parseText(cvText, extractPrompt)
    }

    // TXT
    if (ext === 'txt') {
      return await parseText(buffer.toString('utf-8'), extractPrompt)
    }

    return NextResponse.json({ error: 'Unsupported file type. Upload PDF, Word or TXT.' }, { status: 400 })
  } catch (err: any) {
    console.error('CV parse error:', err)
    return NextResponse.json({ error: 'Something went wrong parsing the CV.' }, { status: 500 })
  }
}

async function parseText(text: string, prompt: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: `${prompt}\n\nCV text:\n\n${text}` }],
    }),
  })
  const data = await response.json()
  const responseText = (data.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
  return parseAndReturn(responseText)
}

function parseAndReturn(text: string) {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return NextResponse.json({ error: 'Could not extract details from CV.' }, { status: 422 })
  try {
    const result = JSON.parse(match[0])
    return NextResponse.json({ result })
  } catch {
    return NextResponse.json({ error: 'Could not parse CV response.' }, { status: 422 })
  }
}