import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

function nullableText(value: unknown) {
  const text = clean(value)
  return text.length > 0 ? text : null
}

export async function GET() {
  try {
    const supabase = getServiceClient()

    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('template_type', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (error: any) {
    console.error('Email templates GET error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not load email templates.' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    const name = clean(body.name)
    const templateType = clean(body.template_type)
    const subject = clean(body.subject)
    const templateBody = clean(body.body)

    if (!name) {
      return NextResponse.json(
        { error: 'Template name is required.' },
        { status: 400 },
      )
    }

    if (!templateType) {
      return NextResponse.json(
        { error: 'Template type is required.' },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from('email_templates')
      .insert({
        name,
        template_type: templateType,
        subject,
        body: templateBody,
        description: nullableText(body.description),
        is_active: body.is_active !== false,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Email templates POST error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not create email template.' },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    const id = clean(body.id)

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required.' },
        { status: 400 },
      )
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if ('name' in body) updates.name = clean(body.name)
    if ('template_type' in body) updates.template_type = clean(body.template_type)
    if ('subject' in body) updates.subject = clean(body.subject)
    if ('body' in body) updates.body = clean(body.body)
    if ('description' in body) updates.description = nullableText(body.description)
    if ('is_active' in body) updates.is_active = body.is_active === true

    const { data, error } = await supabase
      .from('email_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Email templates PATCH error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not update email template.' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    const id = clean(body.id)

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required.' },
        { status: 400 },
      )
    }

    // Soft delete only. Keeps old usage history safe.
    const { data, error } = await supabase
      .from('email_templates')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Email templates DELETE error:', error)

    return NextResponse.json(
      { error: error?.message || 'Could not deactivate email template.' },
      { status: 500 },
    )
  }
}