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
    String(value || 'vacancy-analysis')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'vacancy-analysis'
  )
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(item => clean(item)).filter(Boolean)
  }

  const text = clean(value)
  return text ? [text] : []
}

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
) {
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

async function buildPdf({
  vacancy,
  client,
}: {
  vacancy: any
  client: any
}) {
  const pdfDoc = await PDFDocument.create()

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 50
  const contentWidth = pageWidth - margin * 2

  const brandDark = rgb(0.07, 0.08, 0.16)
  const brandBlue = rgb(0.16, 0.12, 0.95)
  const brandCyan = rgb(0.35, 0.82, 0.84)
  const muted = rgb(0.42, 0.44, 0.5)
  const lightBg = rgb(0.97, 0.97, 0.99)
  const border = rgb(0.88, 0.89, 0.92)

  const analysis = vacancy.vacancy_analysis || {}

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - 70

  function newPage() {
    page = pdfDoc.addPage([pageWidth, pageHeight])
    y = pageHeight - 70
    drawPageHeader(page)
  }

  function ensureSpace(requiredHeight: number) {
    if (y - requiredHeight < 80) {
      newPage()
    }
  }

  function drawPageHeader(pdfPage: PDFPage) {
    pdfPage.drawText('Educated Appointments', {
      x: margin,
      y: pageHeight - 38,
      size: 12,
      font: boldFont,
      color: brandDark,
    })

    pdfPage.drawText('FE & SKILLS RECRUITMENT', {
      x: margin,
      y: pageHeight - 52,
      size: 7.5,
      font: boldFont,
      color: brandBlue,
    })

    pdfPage.drawRectangle({
      x: margin,
      y: pageHeight - 62,
      width: contentWidth,
      height: 1.5,
      color: brandCyan,
    })
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
    const colour = options?.colour || brandDark
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

      if (paragraphIndex < paragraphs.length - 1) y -= 4
    })

    y -= 6
  }

  function sectionTitle(text: string) {
    ensureSpace(45)

    y -= 8

    page.drawText(text, {
      x: margin,
      y,
      size: 15,
      font: boldFont,
      color: brandDark,
    })

    y -= 8

    page.drawRectangle({
      x: margin,
      y,
      width: 75,
      height: 2,
      color: brandCyan,
    })

    y -= 22
  }

  function bulletList(items: string[]) {
    const safeItems = items.filter(Boolean)

    if (safeItems.length === 0) {
      drawText('No detail included.', {
        colour: muted,
      })
      return
    }

    safeItems.forEach(item => {
      const lines = wrapText(item, regularFont, 10.3, contentWidth - 18)

      ensureSpace(lines.length * 16 + 8)

      page.drawText('-', {
        x: margin,
        y,
        size: 10.3,
        font: boldFont,
        color: brandBlue,
      })

      lines.forEach((line, index) => {
        page.drawText(line, {
          x: margin + 16,
          y: y - index * 16,
          size: 10.3,
          font: regularFont,
          color: brandDark,
        })
      })

      y -= lines.length * 16 + 5
    })

    y -= 8
  }

  function infoBox(label: string, value: string, x: number, yPos: number) {
    const boxWidth = 150

    page.drawRectangle({
      x,
      y: yPos,
      width: boxWidth,
      height: 72,
      color: rgb(1, 1, 1),
      borderColor: border,
      borderWidth: 1,
    })

    page.drawText(label.toUpperCase(), {
      x: x + 12,
      y: yPos + 48,
      size: 7.5,
      font: boldFont,
      color: muted,
    })

    const lines = wrapText(value || 'Not specified', boldFont, 11.5, boxWidth - 24).slice(
      0,
      2,
    )

    lines.forEach((line, index) => {
      page.drawText(line, {
        x: x + 12,
        y: yPos + 29 - index * 14,
        size: 11.5,
        font: boldFont,
        color: brandDark,
      })
    })
  }

  // Cover page
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    color: lightBg,
  })

  page.drawText('Educated Appointments', {
    x: margin,
    y: pageHeight - 75,
    size: 18,
    font: boldFont,
    color: brandDark,
  })

  page.drawText('FE & SKILLS RECRUITMENT', {
    x: margin,
    y: pageHeight - 93,
    size: 8.5,
    font: boldFont,
    color: brandBlue,
  })

  page.drawRectangle({
    x: margin,
    y: pageHeight - 112,
    width: 120,
    height: 4,
    color: brandCyan,
  })

  page.drawText('VACANCY ANALYSIS', {
    x: margin,
    y: pageHeight - 175,
    size: 14,
    font: boldFont,
    color: muted,
  })

  const title = clean(vacancy.title) || 'Vacancy'
  const titleLines = wrapText(title, boldFont, 34, 460)
  let coverY = pageHeight - 225

  titleLines.forEach(line => {
    page.drawText(line, {
      x: margin,
      y: coverY,
      size: 34,
      font: boldFont,
      color: brandDark,
    })

    coverY -= 39
  })

  const clientName = clean(client?.company_name) || 'Client not specified'
  const subtitle = `${clientName}${vacancy.location ? ` - ${vacancy.location}` : ''}`

  const subtitleLines = wrapText(subtitle, regularFont, 14, 460)
  coverY -= 6

  subtitleLines.forEach(line => {
    page.drawText(line, {
      x: margin,
      y: coverY,
      size: 14,
      font: regularFont,
      color: muted,
    })

    coverY -= 20
  })

  const boxY = 390
  infoBox('Client', clientName, margin, boxY)
  infoBox(
    'Location',
    [vacancy.location, vacancy.region].filter(Boolean).join(', ') ||
      vacancy.postcode ||
      'Not specified',
    margin + 165,
    boxY,
  )
  infoBox(
    'Salary',
    clean(vacancy.salary_display) ||
      [vacancy.salary_min, vacancy.salary_max].filter(Boolean).join(' - ') ||
      'Not specified',
    margin + 330,
    boxY,
  )

  const generatedDate = vacancy.vacancy_analysis_updated_at
    ? new Date(vacancy.vacancy_analysis_updated_at).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB')

  page.drawRectangle({
    x: margin,
    y: 260,
    width: contentWidth,
    height: 70,
    color: rgb(1, 1, 1),
    borderColor: border,
    borderWidth: 1,
  })

  page.drawText('Prepared by Educated Appointments', {
    x: margin + 16,
    y: 302,
    size: 12,
    font: boldFont,
    color: brandDark,
  })

  page.drawText(`Generated: ${generatedDate}`, {
    x: margin + 16,
    y: 282,
    size: 10,
    font: regularFont,
    color: muted,
  })

  page.drawText('Confidential recruitment briefing document.', {
    x: margin + 16,
    y: 264,
    size: 10,
    font: regularFont,
    color: muted,
  })

  // Main content
  newPage()

  sectionTitle('Market Position')
  bulletList(toArray(analysis.market_position))

  sectionTitle('What Looks Good')
  bulletList(toArray(analysis.what_looks_good))

  sectionTitle('Risks / Red Flags')
  bulletList(toArray(analysis.risks))

  sectionTitle('Recruiter Recommendations')
  bulletList(toArray(analysis.recommendations))

  sectionTitle('Questions to Ask the Client')
  bulletList(toArray(analysis.questions_to_ask))

  sectionTitle('Search Difficulty')
  drawText(clean(analysis.search_difficulty) || 'No search difficulty returned.')

  sectionTitle('Vacancy Snapshot')
  bulletList([
    `Role title: ${clean(vacancy.title) || 'Not specified'}`,
    `Client: ${clientName}`,
    `Location: ${
      [vacancy.location, vacancy.region].filter(Boolean).join(', ') ||
      clean(vacancy.postcode) ||
      'Not specified'
    }`,
    `Salary: ${clean(vacancy.salary_display) || 'Not specified'}`,
    `Contract type: ${clean(vacancy.type) || 'Not specified'}`,
    `Role type: ${clean(vacancy.role_type) || clean(vacancy.sector) || 'Not specified'}`,
    `Target fill: ${
      vacancy.target_fill_type === 'asap'
        ? 'ASAP'
        : clean(vacancy.target_fill_date) || 'Not specified'
    }`,
  ])

  // Footer on all pages
  const pages = pdfDoc.getPages()

  pages.forEach((pdfPage: PDFPage, index: number) => {
    pdfPage.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: 58,
      color: rgb(0.09, 0.09, 0.18),
    })

    pdfPage.drawText(
      `VACANCY ANALYSIS - ${title.toUpperCase()} - CONFIDENTIAL`,
      {
        x: margin,
        y: 34,
        size: 7.3,
        font: regularFont,
        color: rgb(0.8, 0.8, 0.86),
      },
    )

    pdfPage.drawText(`Page ${index + 1}`, {
      x: pageWidth - margin - 45,
      y: 34,
      size: 7.3,
      font: regularFont,
      color: rgb(0.8, 0.8, 0.86),
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
      .select('*')
      .eq('id', id)
      .single()

    if (error || !vacancy) {
      return NextResponse.json(
        { error: error?.message || 'Vacancy not found.' },
        { status: 404 },
      )
    }

    if (!vacancy.vacancy_analysis) {
      return NextResponse.json(
        { error: 'No vacancy analysis has been generated yet.' },
        { status: 400 },
      )
    }

    let client = null

    if (vacancy.client_id) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('id', vacancy.client_id)
        .maybeSingle()

      client = clientData
    }

    const pdfBytes = await buildPdf({ vacancy, client })
    const pdfBody = new Uint8Array(pdfBytes)

    const filename = `${safeFilename(vacancy.title)}-vacancy-analysis.pdf`

    return new NextResponse(pdfBody, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('Vacancy analysis PDF error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not download vacancy analysis.' },
      { status: 500 },
    )
  }
}