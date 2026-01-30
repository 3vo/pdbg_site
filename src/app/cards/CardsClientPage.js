'use client'

import SiteBanner from '@/components/SiteBanner'
import CardFilters from '@/components/CardFilters'
import { fetchFilteredCards } from '@/lib/cardQueries'
import { cardImageUrlFromPath } from '@/lib/cardAssets'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

function getPageSizeForPage(page) {
  if (page <= 1) return 24
  if (page <= 3) return 72
  return 144
}

export default function CardsClientPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [cards, setCards] = useState([])
  const [total, setTotal] = useState(0)
  const [totalKnown, setTotalKnown] = useState(false)
  const [loading, setLoading] = useState(false)

  // ----------------------------------------
  // Query string 
  // ----------------------------------------
  const queryString = useMemo(() => searchParams.toString(), [searchParams])

  // Force sentinel remount when query changes
  const sentinelKey = useMemo(() => `sentinel:${queryString}`, [queryString])

  // ----------------------------------------
  // Filters panel (persisted)
  // ----------------------------------------
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cards:filtersOpen')
      if (saved === '1') setFiltersOpen(true)
      if (saved === '0') setFiltersOpen(false)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('cards:filtersOpen', filtersOpen ? '1' : '0')
    } catch {}
  }, [filtersOpen])

  // ----------------------------------------
  // Mobile sticky controls collapse
  // ----------------------------------------
  const [mobileControlsCollapsed, setMobileControlsCollapsed] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cards:mobileControlsCollapsed')
      if (saved === '1') setMobileControlsCollapsed(true)
      if (saved === '0') setMobileControlsCollapsed(false)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(
        'cards:mobileControlsCollapsed',
        mobileControlsCollapsed ? '1' : '0'
      )
    } catch {}
  }, [mobileControlsCollapsed])

  // ----------------------------------------
  // View (URL + localStorage)
  // ----------------------------------------
  const VIEW_OPTIONS = [
    { value: 'full', label: 'Full' },
    { value: 'thumb', label: 'Thumbnail' },
    { value: 'text', label: 'Text' },
  ]

  const urlViewRaw = searchParams.get('view')
  const urlView =
    urlViewRaw === 'full' || urlViewRaw === 'thumb' || urlViewRaw === 'text'
      ? urlViewRaw
      : null

  const [view, setView] = useState(urlView || 'full')

  useEffect(() => {
    if (urlView) {
      setView(urlView)
      try {
        localStorage.setItem('cards:view', urlView)
      } catch {}
      return
    }

    try {
      const saved = localStorage.getItem('cards:view')
      if (saved === 'full' || saved === 'thumb' || saved === 'text') {
        setView(saved)
      } else {
        setView('full')
      }
    } catch {
      setView('full')
    }
  }, [urlViewRaw])

  function setViewMode(next) {
    const nextView =
      next === 'full' || next === 'thumb' || next === 'text' ? next : 'full'

    setView(nextView)

    try {
      localStorage.setItem('cards:view', nextView)
    } catch {}

    const params = new URLSearchParams(searchParams.toString())
    if (nextView === 'full') params.delete('view')
    else params.set('view', nextView)

    params.delete('page')
    const qs = params.toString()
    router.push(qs ? `/cards?${qs}` : '/cards')
  }

  // ----------------------------------------
  // Refs
  // ----------------------------------------
  const observerRef = useRef(null)
  const scrollRef = useRef(null)
  const gridRef = useRef(null)

  const pagingRef = useRef(false)
  const loadingRef = useRef(false)
  const pageRef = useRef(1)

  const cardsRef = useRef([])
  useEffect(() => {
    cardsRef.current = cards
  }, [cards])

  // ----------------------------------------
  // Restore state
  // ----------------------------------------
  const suppressPersistRef = useRef(false)
  const restoringRef = useRef(false)
  const pendingRestoreRef = useRef(null)
  const didRestoreScrollRef = useRef(false)

  const restoreKey = useMemo(() => {
    const p = new URLSearchParams(searchParams.toString())
    p.delete('page')
    p.delete('from')
    p.delete('view')

    const entries = Array.from(p.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    )
    return `cardsGridRestore:${new URLSearchParams(entries).toString()}`
  }, [searchParams])

  // ----------------------------------------
  // Params object for fetch
  // ----------------------------------------
  const paramsObj = useMemo(() => {
    const obj = {}
    for (const [k, v] of searchParams.entries()) obj[k] = v
    return obj
  }, [searchParams])

  // ----------------------------------------
  // Load restore snapshot
  // ----------------------------------------
  useEffect(() => {
    didRestoreScrollRef.current = false
    pendingRestoreRef.current = null

    try {
      const saved = JSON.parse(sessionStorage.getItem(restoreKey) || 'null')
      if (saved?.count > 0 && Number.isFinite(saved.scrollTop)) {
        pendingRestoreRef.current = saved
        restoringRef.current = true
        suppressPersistRef.current = true
      } else {
        restoringRef.current = false
        suppressPersistRef.current = false
      }
    } catch {
      restoringRef.current = false
      suppressPersistRef.current = false
    }
  }, [restoreKey])

  function persistNow() {
    const scroller = scrollRef.current
    if (!scroller) return

    try {
      sessionStorage.setItem(
        restoreKey,
        JSON.stringify({
          scrollTop: scroller.scrollTop,
          count: cardsRef.current.length,
        })
      )
    } catch {}
  }

  function persistBeforeNav() {
    if (!restoringRef.current) persistNow()
  }

  // ----------------------------------------
  // Fetch helpers
  // ----------------------------------------
  function mergeAppendDedupe(prev, next) {
    if (!next?.length) return prev
    const seen = new Set(prev.map(r => r.card_id))
    const out = [...prev]
    for (const r of next) {
      if (!seen.has(r.card_id)) {
        seen.add(r.card_id)
        out.push(r)
      }
    }
    return out
  }

  async function loadMore({ untilCount } = {}) {
    if (loadingRef.current || pagingRef.current) return
    if (totalKnown && cardsRef.current.length >= total) return
    if (restoringRef.current && !untilCount) return

    pagingRef.current = true
    loadingRef.current = true
    setLoading(true)

    try {
      let safety = 0
      while (++safety < 20) {
        const currentLen = cardsRef.current.length
        if (untilCount && currentLen >= untilCount) break
        if (totalKnown && currentLen >= total) break

        const offset = currentLen
        const limit = untilCount
          ? Math.min(400, Math.max(50, untilCount - currentLen))
          : getPageSizeForPage(pageRef.current)

        const { data, count } = await fetchFilteredCards(paramsObj, { offset, limit })

        setTotal(count ?? 0)
        setTotalKnown(true)

        if (!data?.length) break

        setCards(prev => {
          const merged = mergeAppendDedupe(prev, data)
          cardsRef.current = merged
          return merged
        })

        if (!untilCount) {
          pageRef.current += 1
          break
        }
      }
    } finally {
      loadingRef.current = false
      pagingRef.current = false
      setLoading(false)
    }
  }

  // ----------------------------------------
  // Reset on query change
  // ----------------------------------------
  useEffect(() => {
    pageRef.current = 1
    setCards([])
    cardsRef.current = []
    setTotal(0)
    setTotalKnown(false)

    const pending = pendingRestoreRef.current
    if (pending?.count) {
      loadMore({ untilCount: pending.count })
    } else {
      loadMore()
    }
  }, [queryString])

  // ----------------------------------------
  // Restore scroll
  // ----------------------------------------
  useLayoutEffect(() => {
    const scroller = scrollRef.current
    const pending = pendingRestoreRef.current
    if (!scroller || !pending || didRestoreScrollRef.current) return
    if (cards.length < pending.count) return

    didRestoreScrollRef.current = true
    pendingRestoreRef.current = null

    scroller.scrollTop = pending.scrollTop || 0
    restoringRef.current = false
    suppressPersistRef.current = false
    persistNow()
  }, [cards.length, restoreKey])

  // ----------------------------------------
  // Infinite scroll observer
  // ----------------------------------------
  useEffect(() => {
    const root = scrollRef.current
    const target = observerRef.current
    if (!root || !target) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore()
      },
      { root, rootMargin: '400px', threshold: 0.01 }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [sentinelKey, totalKnown, total])

  // ----------------------------------------
  // Render helpers
  // ----------------------------------------
  function cardHref(cardId) {
    const safe = encodeURIComponent(String(cardId))
    return queryString
      ? `/cards/${safe}?from=${encodeURIComponent(queryString)}`
      : `/cards/${safe}`
  }

  const gridClassName =
    view === 'thumb'
      ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 p-4'
      : view === 'text'
      ? 'grid grid-cols-1 md:grid-cols-2 gap-3 p-4'
      : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4'

  return (
    <div className="flex flex-col md:grid md:grid-cols-[22rem_1fr] h-screen overflow-hidden">
      <aside className="hidden md:block overflow-y-auto p-4">
        {filtersOpen && <CardFilters />}
      </aside>

      <div className="flex flex-col h-full overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <SiteBanner />

          <main ref={gridRef} className={gridClassName}>
            {cards.map(card => (
              <Link
                key={card.card_id}
                data-card-id={card.card_id}
                href={cardHref(card.card_id)}
                scroll={false}
                onPointerDown={persistBeforeNav}
                className="bg-zinc-900 rounded-lg p-2 hover:outline hover:outline-2 hover:outline-blue-500"
              >
                <img
                  src={
                    card.image_path
                      ? cardImageUrlFromPath(card.image_path)
                      : card.image_url
                  }
                  alt={card.name}
                  className="w-full h-auto rounded"
                />
              </Link>
            ))}

            <div key={sentinelKey} ref={observerRef} className="h-px col-span-full" />

            {loading && (
              <div className="col-span-full text-center py-4 text-zinc-400">
                Loading…
              </div>
            )}

            {totalKnown && total === 0 && !loading && (
              <div className="col-span-full text-center py-8 text-zinc-400">
                No cards match these filters.
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
