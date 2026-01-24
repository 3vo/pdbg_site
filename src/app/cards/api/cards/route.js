import { fetchFilteredCards } from '@/lib/cardQueries'

export async function GET(req) {
  const url = new URL(req.url)
  const params = Object.fromEntries(url.searchParams)
  const page = Number(params.page) || 1
  delete params.page

  const { data, count } = await fetchFilteredCards(params, page)

  return new Response(JSON.stringify({ data, count }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
