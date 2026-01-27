import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cardImageUrlFromPath } from '@/lib/cardAssets'

export async function POST(req) {
  let payload = null
  try {
    payload = await req.json()
  } catch {
    payload = null
  }

  const rawIds = Array.isArray(payload?.ids) ? payload.ids : []
  const ids = rawIds.map(v => String(v || '').trim()).filter(Boolean)

  if (ids.length === 0) {
    return NextResponse.json({ cards: [] }, { status: 200 })
  }
  if (ids.length > 100) {
    return NextResponse.json({ error: 'Too many ids (max 100)' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cards')
    .select('card_id, name, set, image_url, image_path, wcs_tier')
    .in('card_id', ids)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const cards = (data || []).map(c => {
    const resolvedImageUrl = c.image_path
      ? cardImageUrlFromPath(c.image_path)
      : c.image_url || ''

    return {
      card_id: c.card_id,
      name: c.name,
      set: c.set,
      wcs_tier: c.wcs_tier ?? null,
      image_url: resolvedImageUrl,
      image_path: c.image_path ?? null,
    }
  })

  const res = NextResponse.json({ cards }, { status: 200 })

  res.headers.set(
    'Cache-Control',
    'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
  )
  return res
}
