import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req) {
  let payload = null
  try {
    payload = await req.json()
  } catch {
    payload = null
  }

  const rawIds = Array.isArray(payload?.ids) ? payload.ids : []
  const ids = rawIds
    .map(v => String(v || '').trim())
    .filter(Boolean)

  // Keep this reasonable (articles shouldn’t need more than this)
  if (ids.length === 0) {
    return NextResponse.json({ cards: [] }, { status: 200 })
  }
  if (ids.length > 100) {
    return NextResponse.json({ error: 'Too many ids (max 100)' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cards')
    .select('card_id, name, set, image_url, wcs_tier')
    .in('card_id', ids)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const res = NextResponse.json(
    { cards: data || [] },
    { status: 200 }
  )

  // Cache at the edge/browser (tune as you like)
  res.headers.set('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400')
  return res
}
