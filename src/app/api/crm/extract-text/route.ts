import { NextRequest, NextResponse } from 'next/server'
import { createRequire } from 'module'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15MB

function cleanText(value: string) {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
}

function getFileExtension(fileName: string) {
  const cleanName = String(fileName || '').toLowerCase()
  const parts = cleanName.split('.')

  return parts.length > 1 ? parts.pop() || '' : ''
}

function getFileType(file: File) {
  const extension = getFileExtension(file.name)
  const mimeType = String(file.type || '').toLowerCase()

  if (extension === 'txt' || mimeType.includes('text/plain')) return 'txt'
  if (extension === 'pdf' || mimeType.includes('application/pdf')) return 'pdf'

  if (
    extension === 'docx' ||
    mimeType.includes(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )
  ) {
    return 'docx'
  }

  if (extension === 'doc' || mimeType.includes('application/msword')) {
    return 'doc'
  }

  return 'unknown'
}

async function extractPdfText(buffer: Buffer) {
  /*
    Do not import "pdf-parse" from the package root.
    In Next/Turbopack this can trigger the package's test/debug file path.
  */
  const require = createRequire(import.meta.url)
  const pdfParseModule = require('pdf-parse/lib/pdf-parse.js')
  const pdfParse = pdfParseModule.default || pdfParseModule

  const result = await pdfParse(buffer)

  return cleanText(result?.text || '')
}

async function extractDocxText(buffer: Buffer) {
  const mammothModule: any = await import('mammoth')
  const mammoth = mammothModule.default || mammothModule

  const result = await mammoth.extractRawText({ buffer })

  return cleanText(result?.value || '')
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file || file.size <= 0) {
      return NextResponse.json(
        { error: 'No file selected.' },
        { status: 400 },
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `${file.name} is too large. Maximum file size is 15MB.` },
        { status: 400 },
      )
    }

    const fileType = getFileType(file)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let text = ''

    if (fileType === 'txt') {
      text = cleanText(buffer.toString('utf8'))
    }

    if (fileType === 'pdf') {
      text = await extractPdfText(buffer)
    }

    if (fileType === 'docx') {
      text = await extractDocxText(buffer)
    }

    if (fileType === 'doc') {
      return NextResponse.json(
        {
          error:
            'Older .doc files are not supported by the free parser. Please save the document as .docx, PDF or TXT and upload it again.',
        },
        { status: 400 },
      )
    }

    if (fileType === 'unknown') {
      return NextResponse.json(
        {
          error:
            'Unsupported file type. Please upload a PDF, DOCX or TXT file.',
        },
        { status: 400 },
      )
    }

    if (!text.trim()) {
      return NextResponse.json(
        {
          error:
            'No readable text could be extracted from this file. If this is a scanned PDF, please copy and paste the job description into the text box instead.',
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      text,
      method: 'free_text_extraction',
      file_name: file.name,
      file_type: fileType,
      character_count: text.length,
    })
  } catch (error: any) {
    console.error('Extract text error:', error)

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Something went wrong extracting text from this file.',
      },
      { status: 500 },
    )
  }
}