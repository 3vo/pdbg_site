import { fetchFilteredCards } from '@/lib/cardQueries'
import { unstable_cache } from 'next/cache'

// Cards basically never change.
// Data Cache revalidate window (seconds). You can make this longer if you want.
const DATA_CACHE_REVALIDATE = 31536000 // 1 year

// IMPORTANT:
// Do NOT force-static for this route. We need the handler to run per-request so
// different querystrings (filters + offset) can produce different responses.
// Caching is handled by unstable_cache + Cache-Control below.
export const dynamic = 'force-dynamic'

function toPosInt(n, fallback) {
  const x = Number(n)
  return Number.isFinite(x) && x > 0 ? Math.floor(x) : fallback
}

function toNonNegInt(n, fallback) {
  const x = Number(n)
  return Number.isFinite(x) && x >= 0 ? Math.floor(x) : fallback
}

function normalizeSearchParams(url) {
  const sp = url.searchParams

  // ----------------------------
  // Pagination (support BOTH styles)
  // ----------------------------
  const hasOffset = sp.has('offset')
  const hasLimit = sp.has('limit')

  // New style
  let offset = hasOffset ? toNonNegInt(sp.get('offset'), 0) : NaN
  let limit = hasLimit ? toPosInt(sp.get('limit'), 72) : NaN

  // Legacy style
  const page = sp.has('page') ? toPosInt(sp.get('page'), 1) : NaN
  const pageSize = sp.has('pageSize') ? toPosInt(sp.get('pageSize'), 72) : NaN

  // If offset/limit not provided, derive from page/pageSize.
  if (!Number.isFinite(offset)) {
    const p = Number.isFinite(page) ? page : 1
    const ps = Number.isFinite(pageSize) ? pageSize : 72
    offset = (p - 1) * ps
    if (!Number.isFinite(limit)) limit = ps
  }

  // Final safety clamps
  offset = toNonNegInt(offset, 0)
  limit = toPosInt(limit, 72)

  // ----------------------------
  // Filters: build params object excluding pagination + legacy paging keys
  // ----------------------------
  const params = {}
  for (const [k, v] of sp.entries()) {
    if (k === 'offset' || k === 'limit' || k === 'page' || k === 'pageSize') continue
    if (v == null) continue
    const s = String(v).trim()
    if (!s) continue
    params[k] = s
  }

  // stable sort for a deterministic cache key
  const sortedEntries = Object.entries(params).sort(([a], [b]) => a.localeCompare(b))
  const qs = new URLSearchParams(sortedEntries).toString()

  return { offset, limit, qs }
}

// Cache the Supabase-backed result by *normalized querystring + offset/limit*.
// This is the Next.js Data Cache (persists across requests on the server).
//
// NOTE: bump the namespace key to avoid serving stale cached values from prior versions.
const cachedFetch = unstable_cache(
  async (qs, offset, limit) => {
    const params = Object.fromEntries(new URLSearchParams(qs).entries())
    return await fetchFilteredCards(params, { offset, limit })
  },
  ['cards-api-v2'], // <-- bumped from v1
  { revalidate: DATA_CACHE_REVALIDATE }
)

export async function GET(req) {
  const url = new URL(req.url)
  const { offset, limit, qs } = normalizeSearchParams(url)

  const { data, count } = await cachedFetch(qs, offset, limit)

  const headers = new Headers({
    'Content-Type': 'application/json',
    // CDN cache: 7 days fresh, 1 year SWR
    // CDN caching *will* vary by full URL including querystring on typical deployments.
    'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=31536000',
    // Debug key to confirm requests are varying as expected
    'X-Cards-Cache-Key': `${qs}&offset=${offset}&limit=${limit}`,
  })

  return new Response(JSON.stringify({ data, count }), { headers })
}
