import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const cardId = (searchParams.get('card_id') || '').trim()
  if (!cardId) return NextResponse.json({ error: 'Missing card_id' }, { status: 400 })

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cards_flat')
    .select('card_id, name, image_url, wcs_tier')
    .eq('card_id', cardId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(data)
}
