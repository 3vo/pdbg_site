import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cardImageUrlFromPath } from '@/lib/cardAssets'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const cardId = (searchParams.get('card_id') || '').trim()

  if (!cardId) {
    return NextResponse.json({ error: 'Missing card_id' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cards_flat')
    .select('card_id,name,image_url,image_path,wcs_tier')
    .eq('card_id', cardId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const r2Url = data.image_path ? cardImageUrlFromPath(data.image_path) : ''
  const resolvedImageUrl = r2Url || data.image_url || ''

  return NextResponse.json({
    card_id: data.card_id,
    name: data.name,
    image_url: resolvedImageUrl,
    image_path: data.image_path ?? null,
  })
}
