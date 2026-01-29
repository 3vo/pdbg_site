import { NextResponse } from 'next/server'
import { fetchFilteredCards } from '@/lib/cardQueries'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const paramsObj = Object.fromEntries(searchParams.entries())

  // parse offset/limit with sane defaults
  const offset = Number(paramsObj.offset ?? 0)
  const limit = Number(paramsObj.limit ?? 72)
  delete paramsObj.offset
  delete paramsObj.limit

  const { data, count } = await fetchFilteredCards(paramsObj, { offset, limit })

  const res = NextResponse.json({ data, count })

  // CDN caching: cache 1 day, allow SWR for a week
  res.headers.set(
    'Cache-Control',
    'public, s-maxage=86400, stale-while-revalidate=604800'
  )

  return res
}
