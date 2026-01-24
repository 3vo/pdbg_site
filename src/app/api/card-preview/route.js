import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const cardId = (searchParams.get('card_id') || '').trim()

  if (!cardId) {
    return NextResponse.json({ error: 'Missing card_id' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cards_flat')
    .select('card_id,name,image_url,wcs_tier')
    .eq('card_id', cardId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    card_id: data.card_id,
    name: data.name,
    image_url: data.image_url,
  })
}
