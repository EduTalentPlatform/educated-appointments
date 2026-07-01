import { NextRequest, NextResponse } from 'next/server'
import { createRequire } from 'module'

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

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse/lib/pdf-parse.js')
const WordExtractor = require('word-extractor')

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

type ParsedCvResult = {
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  linkedin: string | null
  postcode: string | null
  job_title: string | null
  preferred_location: string | null
  notes: string | null
  actively_looking: boolean
}

function cleanText(value: unknown) {
  return String(value ?? '')
    .replace(/\u0000/g, '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function getEmail(text: string) {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return match?.[0]?.toLowerCase() ?? null
}

function getPhone(text: string) {
  const matches = text.match(/(?:\+44\s?|0)(?:\d[\s().-]?){9,12}\d/g)
  if (!matches?.length) return null
  return matches[0].replace(/\s+/g, ' ').trim()
}

function getLinkedIn(text: string) {
  const match = text.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_%\-/.]+/i,
  )

  if (!match?.[0]) return null

  const url = match[0].startsWith('http')
    ? match[0]
    : `https://${match[0]}`

  return url.replace(/[),.;]+$/, '')
}

function getPostcode(text: string) {
  const match = text.match(/\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i)
  return match?.[1]?.toUpperCase().replace(/\s+/, ' ') ?? null
}

function getLikelyName(text: string) {
  const email = getEmail(text)
  const linkedIn = getLinkedIn(text)

  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, 12)
    .filter(line => {
      const lower = line.toLowerCase()

      if (email && line.includes(email)) return false
      if (linkedIn && line.includes(linkedIn)) return false

      return (
        !lower.includes('@') &&
        !lower.includes('linkedin') &&
        !lower.includes('curriculum vitae') &&
        !lower.includes('resume') &&
        !lower.includes('tel') &&
        !lower.includes('phone') &&
        !lower.includes('mobile') &&
        !lower.includes('email') &&
        !/\d{3,}/.test(line)
      )
    })

  const likely = lines.find(line => {
    const words = line
      .replace(/[^A-Za-zÀ-ÿ' -]/g, '')
      .split(/\s+/)
      .filter(Boolean)

    return words.length >= 2 && words.length <= 4
  })

  if (!likely) {
    return {
      first_name: null,
      last_name: null,
    }
  }

  const words = likely
    .replace(/[^A-Za-zÀ-ÿ' -]/g, '')
    .split(/\s+/)
    .filter(Boolean)

  return {
    first_name: words[0] ?? null,
    last_name: words.length > 1 ? words.slice(1).join(' ') : null,
  }
}

function getLikelyJobTitle(text: string) {
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, 20)

  const badWords = [
    '@',
    'linkedin',
    'phone',
    'mobile',
    'email',
    'address',
    'postcode',
    'curriculum vitae',
    'resume',
  ]

  const likely = lines.find(line => {
    const lower = line.toLowerCase()

    if (badWords.some(word => lower.includes(word))) return false
    if (/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i.test(line)) return false
    if (line.length < 4 || line.length > 80) return false

    return [
      'manager',
      'consultant',
      'assessor',
      'trainer',
      'tutor',
      'coach',
      'account',
      'business development',
      'sales',
      'director',
      'lead',
      'specialist',
      'advisor',
      'adviser',
      'executive',
    ].some(word => lower.includes(word))
  })

  return likely ?? null
}

async function extractPdfText(buffer: Buffer) {
  const result = await pdfParse(buffer)
  return cleanText(result?.text || '')
}

async function extractDocxText(buffer: Buffer) {
  const mammothModule = await import('mammoth')
  const mammoth = mammothModule.default ?? mammothModule

  const result = await mammoth.extractRawText({ buffer })

  return cleanText(result.value || '')
}

async function extractDocText(buffer: Buffer) {
  const extractor = new WordExtractor()
  const document = await extractor.extract(buffer)

  return cleanText(document?.getBody?.() || '')
}

function extractTxtText(buffer: Buffer) {
  return cleanText(buffer.toString('utf8'))
}

async function extractTextFromFile(file: File) {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const fileName = file.name.toLowerCase()
  const fileType = file.type.toLowerCase()

  if (fileName.endsWith('.pdf') || fileType.includes('pdf')) {
  return extractPdfText(buffer)
}

if (
  fileName.endsWith('.doc') ||
  fileType.includes('application/msword')
) {
  return extractDocText(buffer)
}

if (
  fileName.endsWith('.docx') ||
  fileType.includes(
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  )
) {
  return extractDocxText(buffer)
}

  if (fileName.endsWith('.txt') || fileType.includes('text/plain')) {
    return extractTxtText(buffer)
  }

  return ''
}

function parseCvText(text: string): ParsedCvResult {
  const cleaned = cleanText(text)
  const name = getLikelyName(cleaned)

  return {
    first_name: name.first_name,
    last_name: name.last_name,
    email: getEmail(cleaned),
    phone: getPhone(cleaned),
    linkedin: getLinkedIn(cleaned),
    postcode: getPostcode(cleaned),
    job_title: getLikelyJobTitle(cleaned),
    preferred_location: null,
    notes: cleaned.slice(0, 4000),
    actively_looking: true,
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json(
        { error: 'No CV file was uploaded.' },
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
        {
          error:
  'Unsupported file type. Please upload a PDF, DOC, DOCX or TXT file.',
        },
        { status: 400 },
      )
    }

    const text = await extractTextFromFile(file)

    if (!text.trim()) {
      return NextResponse.json(
        {
          error:
            'Could not extract text from this CV. It may be a scanned PDF or image-based document.',
        },
        { status: 422 },
      )
    }

    const result = parseCvText(text)

    return NextResponse.json({
      result,
      extracted_text_length: text.length,
    })
  } catch (error: any) {
    console.error('Basic CV parse error:', error)

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Something went wrong parsing the CV without AI.',
      },
      { status: 500 },
    )
  }
}