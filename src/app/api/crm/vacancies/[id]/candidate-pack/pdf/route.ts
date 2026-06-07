import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  PDFDocument,
  PDFPage,
  PDFFont,
  StandardFonts,
  rgb,
} from 'pdf-lib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function clean(value: unknown) {
  return String(value ?? '').trim()
}

function safeFilename(value: unknown) {
  return (
    String(value || 'candidate-vacancy-pack')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'candidate-vacancy-pack'
  )
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number) {
  const words = clean(text).split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let currentLine = ''

  words.forEach(word => {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const width = font.widthOfTextAtSize(testLine, fontSize)

    if (width <= maxWidth) {
      currentLine = testLine
      return
    }

    if (currentLine) lines.push(currentLine)
    currentLine = word
  })

  if (currentLine) lines.push(currentLine)

  return lines
}

async function buildPdf(pack: any) {
  const pdfDoc = await PDFDocument.create()

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 50
  const contentWidth = pageWidth - margin * 2

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - 80

  const title = clean(pack?.cover?.title) || 'Vacancy'
  const subtitle = clean(pack?.cover?.subtitle)

  function newPage() {
    page = pdfDoc.addPage([pageWidth, pageHeight])
    y = pageHeight - 65
  }

  function ensureSpace(requiredHeight: number) {
    if (y - requiredHeight < 80) {
      newPage()
    }
  }

  function drawText(
    text: string,
    options?: {
      font?: PDFFont
      size?: number
      colour?: ReturnType<typeof rgb>
      lineHeight?: number
      width?: number
      x?: number
    },
  ) {
    const font = options?.font || regularFont
    const size = options?.size || 10.5
    const colour = options?.colour || rgb(0.07, 0.09, 0.14)
    const lineHeight = options?.lineHeight || size + 5
    const width = options?.width || contentWidth
    const x = options?.x || margin

    const paragraphs = clean(text)
      .split(/\n+/)
      .map(item => item.trim())
      .filter(Boolean)

    paragraphs.forEach((paragraph, paragraphIndex) => {
      const lines = wrapText(paragraph, font, size, width)

      lines.forEach(line => {
        ensureSpace(lineHeight + 4)

        page.drawText(line, {
          x,
          y,
          size,
          font,
          color: colour,
        })

        y -= lineHeight
      })

      if (paragraphIndex < paragraphs.length - 1) {
        y -= 4
      }
    })

    y -= 8
  }

  function sectionTitle(text: string) {
    ensureSpace(42)

    y -= 8

    page.drawText(text, {
      x: margin,
      y,
      size: 16,
      font: boldFont,
      color: rgb(0.07, 0.09, 0.14),
    })

    y -= 26
  }

  function subTitle(text: string) {
    ensureSpace(28)

    page.drawText(text, {
      x: margin,
      y,
      size: 12,
      font: boldFont,
      color: rgb(0.07, 0.09, 0.14),
    })

    y -= 20
  }

  function bulletList(items: string[]) {
    items.filter(Boolean).forEach(item => {
      const bulletText = `- ${item}`
      const lines = wrapText(bulletText, regularFont, 10.2, contentWidth)

      lines.forEach(line => {
        ensureSpace(18)

        page.drawText(line, {
          x: margin,
          y,
          size: 10.2,
          font: regularFont,
          color: rgb(0.07, 0.09, 0.14),
        })

        y -= 16
      })

      y -= 2
    })

    y -= 8
  }

  // Cover page
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    color: rgb(0.97, 0.97, 0.99),
  })

  page.drawText('CANDIDATE VACANCY PACK', {
    x: margin,
    y: pageHeight - 95,
    size: 14,
    font: boldFont,
    color: rgb(0.07, 0.09, 0.14),
  })

  const titleLines = wrapText(title, boldFont, 34, 440)
  let coverY = pageHeight - 145

  titleLines.forEach(line => {
    page.drawText(line, {
      x: margin,
      y: coverY,
      size: 34,
      font: boldFont,
      color: rgb(0.07, 0.09, 0.14),
    })

    coverY -= 40
  })

  if (subtitle) {
    const subtitleLines = wrapText(subtitle, regularFont, 14, 440)
    coverY -= 8

    subtitleLines.forEach(line => {
      page.drawText(line, {
        x: margin,
        y: coverY,
        size: 14,
        font: regularFont,
        color: rgb(0.22, 0.25, 0.32),
      })

      coverY -= 20
    })
  }

  const boxes = [
    ['LOCATION', clean(pack?.cover?.location) || 'Not specified'],
    ['REPORTS TO', clean(pack?.cover?.reports_to) || 'Not specified'],
    ['CONTRACT', clean(pack?.cover?.contract) || 'Not specified'],
  ]

  const boxY = 430
  const boxWidth = 150
  const boxGap = 15

  boxes.forEach(([label, value], index) => {
    const x = margin + index * (boxWidth + boxGap)

    page.drawRectangle({
      x,
      y: boxY,
      width: boxWidth,
      height: 75,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.9, 0.91, 0.93),
      borderWidth: 1,
    })

    page.drawText(label, {
      x: x + 12,
      y: boxY + 50,
      size: 8,
      font: boldFont,
      color: rgb(0.42, 0.45, 0.5),
    })

    const valueLines = wrapText(value, boldFont, 12, boxWidth - 24).slice(0, 2)

    valueLines.forEach((line, lineIndex) => {
      page.drawText(line, {
        x: x + 12,
        y: boxY + 30 - lineIndex * 15,
        size: 12,
        font: boldFont,
        color: rgb(0.07, 0.09, 0.14),
      })
    })
  })

  const confidentiality =
    'This document is confidential and intended for shortlisted candidates only. The employing organisation will be disclosed prior to interview.'

  const confidentialityLines = wrapText(confidentiality, regularFont, 9, 480)

  let confidentialityY = 360

  confidentialityLines.forEach(line => {
    page.drawText(line, {
      x: margin,
      y: confidentialityY,
      size: 9,
      font: regularFont,
      color: rgb(0.29, 0.33, 0.39),
    })

    confidentialityY -= 13
  })

  // Main content
  newPage()

  sectionTitle('About the Organisation')
  drawText(pack.about_organisation)

  sectionTitle('Why join now?')
  drawText(pack.why_join_now)

  sectionTitle('The Role')
  drawText(pack.role_overview)

  newPage()

  sectionTitle('Key Responsibilities')

  if (Array.isArray(pack.key_responsibilities)) {
    pack.key_responsibilities.forEach((section: any) => {
      subTitle(section.heading || 'Responsibilities')
      bulletList(Array.isArray(section.bullets) ? section.bullets : [])
    })
  }

  newPage()

  sectionTitle('Person Specification')

  subTitle('Essential Criteria')
  bulletList(
    Array.isArray(pack.person_specification?.essential)
      ? pack.person_specification.essential
      : [],
  )

  subTitle('Desirable Criteria')
  bulletList(
    Array.isArray(pack.person_specification?.desirable)
      ? pack.person_specification.desirable
      : [],
  )

  subTitle('Key Attributes')
  bulletList(
    Array.isArray(pack.person_specification?.key_attributes)
      ? pack.person_specification.key_attributes
      : [],
  )

  newPage()

  sectionTitle('How to Apply')
  bulletList(Array.isArray(pack.how_to_apply) ? pack.how_to_apply : [])

  sectionTitle('Safeguarding Notice')
  drawText(pack.safeguarding_notice)

  sectionTitle('Equal Opportunities')
  drawText(pack.equal_opportunities)

  // Footer on all pages
  const pages = pdfDoc.getPages()

  pages.forEach((pdfPage: PDFPage, index: number) => {
    pdfPage.drawText(
      `CANDIDATE VACANCY PACK - ${title.toUpperCase()} - CONFIDENTIAL`,
      {
        x: margin,
        y: 35,
        size: 7.5,
        font: regularFont,
        color: rgb(0.4, 0.4, 0.4),
      },
    )

    pdfPage.drawText(`Page ${index + 1}`, {
      x: pageWidth - margin - 45,
      y: 35,
      size: 7.5,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.4),
    })
  })

  return pdfDoc.save()
}

type Context = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Context) {
  try {
    const { id } = await params
    const supabase = getServiceClient()

    const { data: vacancy, error } = await supabase
      .from('vacancies')
      .select('id, title, candidate_pack_json')
      .eq('id', id)
      .single()

    if (error || !vacancy) {
      return NextResponse.json(
        { error: error?.message || 'Vacancy not found.' },
        { status: 404 },
      )
    }

    if (!vacancy.candidate_pack_json) {
      return NextResponse.json(
        { error: 'No candidate vacancy pack has been generated yet.' },
        { status: 400 },
      )
    }

    const pdfBytes = await buildPdf(vacancy.candidate_pack_json)
    const pdfBody = new Uint8Array(pdfBytes)

    const filename = `${safeFilename(vacancy.title)}-candidate-pack.pdf`

    return new NextResponse(pdfBody, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('Candidate vacancy pack PDF error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not download candidate vacancy pack.' },
      { status: 500 },
    )
  }
}