import { NextResponse } from 'next/server'
import { initTable, insertSubmission } from '@/lib/db'

export async function POST(request: Request) {
  const body = await request.json() as {
    name:        string
    email:       string
    serviceType: string
    message:     string
  }

  if (!body.name || !body.email) {
    return NextResponse.json({ error: 'name and email are required' }, { status: 400 })
  }

  try {
    await initTable()
    const result = await insertSubmission(body)
    return NextResponse.json({ ok: true, id: result[0]?.id })
  } catch (err) {
    console.error('DB error:', err)
    // Return 200 so the client knows Pixel events fired; DB setup may be pending
    return NextResponse.json({ ok: false, reason: 'db_not_configured' }, { status: 503 })
  }
}
