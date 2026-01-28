import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cardImageUrlFromPath } from '@/lib/cardAssets'

// GET /api/cards/PDB-001
export async function GET(_req, ctx) {
  // Next 16/Turbopack: ctx.params can be "promise-like" in some cases
  const rawParams = ctx?.params
  const p = rawParams && typeof rawParams.then === 'function' ? await rawParams : rawParams

  const DASHES_RE = /[–—−]/g // en dash, em dash, minus
  const cardId = decodeURIComponent(p?.cardId ?? '')
    .trim()
    .toUpperCase()
    .replace(DASHES_RE, '-')

  if (!cardId) {
    return NextResponse.json({ error: 'Missing cardId' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cards')
    .select('card_id, name, image_path, set, wcs_tier')
    .eq('card_id', cardId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const resolvedImageUrl = data.image_path ? cardImageUrlFromPath(data.image_path) : ''

  return NextResponse.json(
    {
      card_id: data.card_id,
      name: data.name,
      // Back-compat: keep "image_url" but return the resolved URL
      image_url: resolvedImageUrl,
      // Keep both fields available during migration
      image_path: data.image_path ?? null,
      set: data.set,
      wcs_tier: data.wcs_tier,
    },
    {
      headers: {
        // Cache on the browser + CDN for fast hover previews
        'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  )
}
