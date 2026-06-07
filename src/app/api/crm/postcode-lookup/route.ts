import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { postcode } = await request.json()
    if (!postcode) return NextResponse.json({ error: 'No postcode provided.' }, { status: 400 })

    const clean = postcode.replace(/\s/g, '').toUpperCase()
    const res = await fetch(`https://api.postcodes.io/postcodes/${clean}`)
    const data = await res.json()

    if (data.status !== 200 || !data.result) {
      return NextResponse.json({ error: 'Invalid postcode.' }, { status: 400 })
    }

    return NextResponse.json({
      lat: data.result.latitude,
      lng: data.result.longitude,
      region: data.result.region,
      district: data.result.admin_district,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Postcode lookup failed.' }, { status: 500 })
  }
}