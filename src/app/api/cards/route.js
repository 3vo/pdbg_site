import { fetchFilteredCards } from '@/lib/cardQueries'

export async function GET(req) {
  const url = new URL(req.url)
  const params = Object.fromEntries(url.searchParams.entries())

  const offset = Number(params.offset ?? 0)
  const limit = Number(params.limit ?? 72)

  delete params.offset
  delete params.limit
  delete params.page // just in case old links exist

  const { data, count } = await fetchFilteredCards(params, { offset, limit })

  return new Response(JSON.stringify({ data, count }), {
    headers: {
      'Content-Type': 'application/json',
      // CDN cache: 1 day fresh, 7 days SWR
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  })
}
