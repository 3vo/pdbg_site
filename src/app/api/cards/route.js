// src/app/api/cards/route.js
import { fetchFilteredCards } from '@/lib/cardQueries'
import { unstable_cache } from 'next/cache'

// Cards basically never change.
// Data Cache revalidate window (seconds). You can make this longer if you want.
export const revalidate = 31536000 // 1 year
// Ensure Next treats this as cacheable (not forced dynamic).
export const dynamic = 'force-static'

function normalizeSearchParams(url) {
  const sp = url.searchParams

  // pull paging
  const offset = Number(sp.get('offset') ?? 0)
  const limit = Number(sp.get('limit') ?? 72)

  // build params object excluding paging + legacy page
  const params = {}
  for (const [k, v] of sp.entries()) {
    if (k === 'offset' || k === 'limit' || k === 'page') continue
    if (v == null) continue
    const s = String(v).trim()
    if (!s) continue
    params[k] = s
  }

  // stable sort for a deterministic cache key
  const sortedEntries = Object.entries(params).sort(([a], [b]) => a.localeCompare(b))
  const qs = new URLSearchParams(sortedEntries).toString()

  return { params, offset, limit, qs }
}

// Cache the Supabase-backed result by *normalized querystring + offset/limit*.
// This is the Next.js Data Cache (persists across requests on the server).
const cachedFetch = unstable_cache(
  async (qs, offset, limit) => {
    const params = Object.fromEntries(new URLSearchParams(qs).entries())
    return await fetchFilteredCards(params, { offset, limit })
  },
  // base key namespace (Next combines this with args)
  ['cards-api-v1'],
  { revalidate }
)

export async function GET(req) {
  const url = new URL(req.url)

  const { params, offset, limit, qs } = normalizeSearchParams(url)

  // Fetch via Data Cache
  const { data, count } = await cachedFetch(qs, offset, limit)

  // Optional: helpful debug headers (remove if you prefer)
  // Note: you won’t get an explicit “HIT/MISS” header from Data Cache,
  // but keeping the normalized key visible can help while validating.
  const headers = new Headers({
    'Content-Type': 'application/json',
    // CDN/edge cache: 1 day fresh, 7 days SWR (keep as you had)
    'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=31536000',
    'X-Cards-Cache-Key': `${qs}&offset=${offset}&limit=${limit}`,
  })

  return new Response(JSON.stringify({ data, count }), { headers })
}
