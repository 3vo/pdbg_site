'use client'

import SiteBanner from '@/components/SiteBanner'
import CardFilters from '@/components/CardFilters'
import { fetchFilteredCards } from '@/lib/cardQueries'
import { cardImageUrlFromPath } from '@/lib/cardAssets'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import ViewportScrollbar from '@/components/ViewportScrollbar'

function getPageSizeForPage(page) {
  // page 1: 24 (fast initial paint)
  // pages 2-3: 72
  // page 4+: 144
  if (page <= 1) return 24
  if (page <= 3) return 72
  return 144
}

/**
 * IMPORTANT:
 * Variable page sizes break "page-based offset pagination" (page * pageSize),
 * because the implied offsets change when pageSize changes.
 *
 * Fix: fetch using an ever-growing LIMIT from the beginning:
 * - page=1, limit = 24
 * - page=2, limit = 24+72
 * - page=3, limit = 24+72+72
 * - page=4, limit = 24+72+72+144
 * etc.
 */
function getCumulativeLimit(page) {
  let total = 0
  for (let p = 1; p <= page; p++) total += getPageSizeForPage(p)
  return total
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

export default function CardsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [cards, setCards] = useState([])
  const [total, setTotal] = useState(0)
  const [totalKnown, setTotalKnown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)

  // Collapsible Filters Panel (persisted)
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cards:filtersOpen')
      if (saved === '0') setFiltersOpen(false)
      if (saved === '1') setFiltersOpen(true)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('cards:filtersOpen', filtersOpen ? '1' : '0')
    } catch {}
  }, [filtersOpen])

  // -------------------------
  // View (URL + localStorage)
  // -------------------------
  const VIEW_OPTIONS = useMemo(
    () => [
      { value: 'full', label: 'Full' },
      { value: 'thumb', label: 'Thumbnail' },
      { value: 'text', label: 'Text' },
    ],
    []
  )

  const urlViewRaw = searchParams.get('view')
  const urlView =
    urlViewRaw === 'full' || urlViewRaw === 'thumb' || urlViewRaw === 'text' ? urlViewRaw : null

  const [view, setView] = useState(urlView || 'full')

  // On mount / when URL changes (back/forward), prefer URL.
  // Otherwise fall back to localStorage, else default.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlViewRaw])

  function setViewMode(next) {
    const nextView = next === 'thumb' || next === 'text' || next === 'full' ? next : 'full'

    // Persist to localStorage
    try {
      localStorage.setItem('cards:view', nextView)
    } catch {}

    // Persist to URL (shareable)
    const params = new URLSearchParams(searchParams.toString())
    if (nextView === 'full') {
      params.delete('view') // keep URLs clean for default
    } else {
      params.set('view', nextView)
    }
    params.delete('page')
    const qs = params.toString()
    router.push(qs ? `/cards?${qs}` : '/cards')
  }

  const observerRef = useRef(null) // sentinel div
  const gridRef = useRef(null)

  const [isMdUp, setIsMdUp] = useState(true)

  // Prevent runaway paging when the sentinel stays intersecting (common on mobile)
  const pagingRef = useRef(false)
  const loadingRef = useRef(false)


  // Handle should align with top of the results card
  const resultsTopRef = useRef(null)
  const [handleTopPx, setHandleTopPx] = useState(null)

  // Persist/restore controls
  const suppressPersistRef = useRef(false)
  const restoringRef = useRef(false)
  const pendingRestoreRef = useRef(null) // { scrollTop:number, count:number, lastVisibleId?:string|null }
  const didRestoreScrollRef = useRef(false)

  const queryString = useMemo(() => searchParams.toString(), [searchParams])

  const restoreKey = useMemo(() => {
    const p = new URLSearchParams(searchParams.toString())
    p.delete('page')
    p.delete('from')
    p.delete('view')
  
    // Canonicalize param ordering (URLSearchParams preserves insertion order)
    const entries = Array.from(p.entries())
    entries.sort(([aKey, aVal], [bKey, bVal]) => {
      if (aKey !== bKey) return aKey.localeCompare(bKey)
      return String(aVal).localeCompare(String(bVal))
    })
  
    const canonical = new URLSearchParams(entries).toString()
    return `cardsGridRestore:${canonical}`
  }, [searchParams])



  // Convert URLSearchParams -> plain object
  const paramsObj = useMemo(() => {
    const obj = {}
    for (const [key, value] of searchParams.entries()) obj[key] = value
    return obj
  }, [searchParams])

  const currentQueryString = queryString
  const shownCount = cards.length

  // count is considered "available" even when it's 0, as long as we know it
  const hasTotal = totalKnown
  const currentLimit = useMemo(() => getCumulativeLimit(page), [page])

  const showProgress = hasTotal && total > currentLimit
  const progressText =
    hasTotal && shownCount >= total ? 'All results loaded' : `Loaded ${shownCount} of ${total}`

  // don’t show loading row if we already know there are 0 results
  const shouldShowLoadingRow = loading && !(totalKnown && total === 0)

  function scrollGridToTop() {
    if (!isMdUp) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const el = gridRef.current
    if (!el) return
    el.scrollTo({ top: 0, behavior: 'smooth' })
  }


  // -------------------------
  // Sorting (URL-driven)
  // -------------------------
  const sortBy = searchParams.get('sort_by') || ''
  const sortDir = searchParams.get('sort_dir') || 'asc'
  const hasSort = Boolean(sortBy)

  function setSort(nextBy, nextDir) {
    const params = new URLSearchParams(searchParams.toString())

    if (!nextBy) {
      params.delete('sort_by')
      params.delete('sort_dir')
    } else {
      params.set('sort_by', nextBy)
      params.set('sort_dir', nextDir === 'desc' ? 'desc' : 'asc')
    }

    params.delete('page')
    const qs = params.toString()
    router.push(qs ? `/cards?${qs}` : '/cards')
  }

  function clearSort() {
    setSort('', 'asc')
  }

  // --- Load saved restore state (when arriving on /cards) ---
  useEffect(() => {
    didRestoreScrollRef.current = false
    pendingRestoreRef.current = null

    let saved = null
    try {
      saved = JSON.parse(sessionStorage.getItem(restoreKey) || 'null')
    } catch {
      saved = null
    }

    if (
      saved &&
      typeof saved.scrollTop === 'number' &&
      Number.isFinite(saved.scrollTop) &&
      typeof saved.count === 'number' &&
      Number.isFinite(saved.count) &&
      saved.count > 0
    ) {
      pendingRestoreRef.current = saved
      suppressPersistRef.current = true
      restoringRef.current = true
    } else {
      suppressPersistRef.current = false
      restoringRef.current = false
    }
  }, [restoreKey])
  
  function persistBeforeNav() {
    // don’t mutate restore during the actual restore pass
    if (restoringRef.current) return
    persistNow()
  }

  function persistNow() {
    const el = gridRef.current
    if (!el) return

    try {
      let lastVisibleId = null

      // Figure out what's visible
      const containerRect = isMdUp ? el.getBoundingClientRect() : { top: 0, bottom: window.innerHeight }
      const items = Array.from(el.querySelectorAll('[data-card-id]'))

      for (let i = items.length - 1; i >= 0; i--) {
        const node = items[i]
        const r = node.getBoundingClientRect()
        const isVisible = r.bottom > containerRect.top && r.top < containerRect.bottom
        if (isVisible) {
          lastVisibleId = node.getAttribute('data-card-id')
          break
        }
      }

      const scrollTop = isMdUp ? el.scrollTop : window.scrollY

      sessionStorage.setItem(
        restoreKey,
        JSON.stringify({
          scrollTop,
          count: cards.length,
          lastVisibleId,
        })
      )
    } catch {}
  }


  // --- Media Query
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 768px)') // Tailwind md
    const apply = () => setIsMdUp(mq.matches)
    apply()
    mq.addEventListener?.('change', apply)
    return () => mq.removeEventListener?.('change', apply)
  }, [])

  // --- Save scroll position + loaded count + last visible card id while user scrolls ---
  useEffect(() => {
    const el = gridRef.current
    if (!el) return

    let raf = null

    const persist = () => {
      if (suppressPersistRef.current) return
      try {
        let lastVisibleId = null

        const containerRect = isMdUp ? el.getBoundingClientRect() : { top: 0, bottom: window.innerHeight }
        const items = Array.from(el.querySelectorAll('[data-card-id]'))

        for (let i = items.length - 1; i >= 0; i--) {
          const node = items[i]
          const r = node.getBoundingClientRect()
          const isVisible = r.bottom > containerRect.top && r.top < containerRect.bottom
          if (isVisible) {
            lastVisibleId = node.getAttribute('data-card-id')
            break
          }
        }

        const scrollTop = isMdUp ? el.scrollTop : window.scrollY

        sessionStorage.setItem(
          restoreKey,
          JSON.stringify({
            scrollTop,
            count: cards.length,
            lastVisibleId,
          })
        )
      } catch {}
    }

    const onScroll = () => {
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        raf = null
        persist()
      })
    }

    const target = isMdUp ? el : window
    target.addEventListener('scroll', onScroll, { passive: true })
    if (!isMdUp) window.addEventListener('resize', onScroll)

    return () => {
      target.removeEventListener('scroll', onScroll)
      if (!isMdUp) window.removeEventListener('resize', onScroll)
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [restoreKey, cards.length, isMdUp])


  function buildChips(sp) {
    const chips = []
    const add = (key, label, value, opts = {}) => {
      chips.push({ key, label, value, removeValue: opts.removeValue ?? null })
    }

    for (const [key, raw] of sp.entries()) {
      if (!raw) continue
      if (key === 'page') continue
      if (key === 'from') continue
      if (key === 'sort_by' || key === 'sort_dir') continue
      if (key === 'view') continue // don't show view as a filter chip

      if (key === 'sets') {
        raw
          .split(',')
          .map(v => v.trim())
          .filter(Boolean)
          .forEach(v => add('sets', 'Set', v, { removeValue: v }))
        continue
      }

      if (key === 'set') {
        const v = String(raw).trim()
        if (v) add('set', 'Set', v)
        continue
      }

      if (key === 'keywords' || key === 'subtypes') {
        raw
          .split(',')
          .map(v => v.trim())
          .filter(Boolean)
          .forEach(v =>
            add(key, key === 'keywords' ? 'Keyword' : 'Sub-type', v, { removeValue: v })
          )
        continue
      }

      if (key === 'symbols') {
        add('symbols', 'Symbol', raw === '__none__' ? 'No Symbol' : raw)
        continue
      }

      const labelMap = {
        primary_type: 'Type',
        primary_types: 'Type',
        card_location: 'Location',
        name_include: 'Name includes',
        name_exclude: 'Name excludes',
        name_phrase: 'Name phrase',
        effect_include: 'Effect includes',
        effect_exclude: 'Effect excludes',
        effect_phrase: 'Effect phrase',
        q: 'Search',
        cost_min: 'Cost ≥',
        cost_max: 'Cost ≤',
        xp_min: 'XP ≥',
        xp_max: 'XP ≤',
      }

      add(key, labelMap[key] ?? key, raw)
    }

    return chips
  }

  const chips = buildChips(searchParams)

  function removeChip(chip) {
    const params = new URLSearchParams(searchParams.toString())

    if (chip.removeValue) {
      const current = (params.get(chip.key) || '')
        .split(',')
        .map(v => v.trim())
        .filter(Boolean)

      const next = current.filter(v => v !== chip.removeValue)
      if (next.length === 0) params.delete(chip.key)
      else params.set(chip.key, next.join(','))
    } else {
      params.delete(chip.key)
    }

    params.delete('page')
    const qs = params.toString()
    router.push(qs ? `/cards?${qs}` : '/cards')
  }

  function clearAllFilters() {
    const current = new URLSearchParams(searchParams.toString())
    const sortBy = current.get('sort_by')
    const sortDir = current.get('sort_dir')
    const view = current.get('view')

    const next = new URLSearchParams()
    if (sortBy) next.set('sort_by', sortBy)
    if (sortDir) next.set('sort_dir', sortDir)
    if (view) next.set('view', view)

    const qs = next.toString()
    router.push(qs ? `/cards?${qs}` : '/cards')
  }

  // Reset when filters change (including view)
  useEffect(() => {
    setPage(1)
    setCards([])
    setTotal(0)
    setTotalKnown(false) // mark unknown until fetch returns
  }, [queryString])

  // Fetch cards (ever-growing limit, page stays for scheduling only)
  useEffect(() => {
    let cancelled = false

    async function loadCards() {
      setLoading(true)
      loadingRef.current = true

      try {
        const pending = pendingRestoreRef.current
        const baseLimit = getCumulativeLimit(page)

        const effectiveLimit =
          page === 1 && pending?.count && pending.count > baseLimit ? pending.count : baseLimit

        // Always fetch from the start using page=1 and a growing limit.
        const { data, count } = await fetchFilteredCards(paramsObj, 1, effectiveLimit)

        if (cancelled) return

        setCards(data || [])
        setTotal(typeof count === 'number' ? count : 0)
        setTotalKnown(true)
      } catch (err) {
        console.error(err)
        if (!cancelled) {
          setTotal(0)
          setTotalKnown(true)
        }
      } finally {
        // Always reset guards (even on cancel/error)
        if (!cancelled) setLoading(false)
        loadingRef.current = false
        pagingRef.current = false
      }
    }

    loadCards()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, queryString])

  useLayoutEffect(() => {
    const el = gridRef.current
    const pending = pendingRestoreRef.current
    if (!el || !pending) return
    if (didRestoreScrollRef.current) return
  
    didRestoreScrollRef.current = true
    pendingRestoreRef.current = null
  
    window.requestAnimationFrame(() => {
      if (pending.lastVisibleId) {
        const safe =
          typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
            ? CSS.escape(pending.lastVisibleId)
            : pending.lastVisibleId.replace(/"/g, '\\"')
  
        const node = el.querySelector(`[data-card-id="${safe}"]`)
        if (node) {
          if (isMdUp) {
            // Desktop: scroll the container to the item's offset
            el.scrollTo({ top: node.offsetTop, behavior: 'auto' })
          } else {
            // Mobile: scroll the window to the item’s document position
            const y = window.scrollY + node.getBoundingClientRect().top - 12
            window.scrollTo({ top: y, behavior: 'auto' })
          }
        } else {
          if (isMdUp) el.scrollTop = pending.scrollTop
          else window.scrollTo({ top: pending.scrollTop, behavior: 'auto' })
        }
      } else {
        // No lastVisibleId — fall back to raw scrollTop restore
        if (isMdUp) el.scrollTop = pending.scrollTop
        else window.scrollTo({ top: pending.scrollTop, behavior: 'auto' })
      }
  
      suppressPersistRef.current = false
      restoringRef.current = false
      persistNow()
    })
  }, [cards.length, isMdUp])


  // Measure results card top for fixed filter handle alignment
  useLayoutEffect(() => {
    const update = () => {
      const el = resultsTopRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const top = Math.max(12, Math.round(rect.top) + 120)
      setHandleTopPx(top)
    }

    update()
    window.addEventListener('resize', update)

    return () => {
      window.removeEventListener('resize', update)
    }
  }, [])

  // Re-measure after the sidebar opens/closes (layout shift)
  useEffect(() => {
    window.requestAnimationFrame(() => {
      const el = resultsTopRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const top = Math.max(12, Math.round(rect.top) + 120)
      setHandleTopPx(top)
    })
  }, [filtersOpen])

  // Infinite scroll observer (blocked during restore)
  useEffect(() => {
    const rootEl = gridRef.current
    const targetEl = observerRef.current
    if (!targetEl) return
    if (isMdUp && !rootEl) return
  
    const observer = new IntersectionObserver(
      entries => {
        const hit = entries[0]?.isIntersecting
        if (!hit) return
  
        if (loadingRef.current) return
        if (pagingRef.current) return
        if (restoringRef.current) return
        if (totalKnown && cards.length >= total) return
  
        // IMPORTANT: prevent repeated fires while still intersecting
        observer.unobserve(targetEl)
  
        pagingRef.current = true
        setPage(p => p + 1)
      },
      {
        root: isMdUp ? rootEl : null,
        // Consider slightly smaller margin on mobile so it doesn't "always intersect"
        rootMargin: isMdUp ? '600px 0px 600px 0px' : '250px 0px 250px 0px',
        threshold: 0.01,
      }
    )
  
    observer.observe(targetEl)
    return () => observer.disconnect()
  }, [cards.length, total, totalKnown, isMdUp])


  // -------------------------
  // View rendering helpers
  // -------------------------
  const highlightBorderClassMap = useMemo(
    () => ({
      blue: 'border-blue-500',
      yellow: 'border-yellow-500',
      red: 'border-red-500',
    }),
    []
  )

  const gridClassName = useMemo(() => {
  if (view === 'text') {
    return [
      'mt-4',
      'grid',
      'grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3',
      'gap-3',
      'flex-1 md:overflow-y-auto',
      'pt-1 px-4 md:px-5',
      'items-start content-start',
      'pdbg-scrollbar pb-16',
    ].join(' ')
  }


    if (view === 'thumb') {
      return [
        'mt-4',
        'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10',
        'gap-2',
        'flex-1 md:overflow-y-auto',
        'pt-1 px-4 md:px-5',
        'items-start content-start',
        'pdbg-scrollbar pb-16',
      ].join(' ')
    }

    // full (default)
    return [
      'mt-4',
      'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
      'gap-4',
      'flex-1 md:overflow-y-auto',
      'pt-1 px-4 md:px-5',
      'items-start content-start',
      'pdbg-scrollbar pb-16',
    ].join(' ')
  }, [view])

  const cardLinkClassName = useMemo(() => {
    if (view === 'thumb') {
      return 'block self-start bg-zinc-900 rounded-lg p-1 transition hover:outline hover:outline-2 hover:outline-offset-2 hover:outline-blue-500'
    }
    if (view === 'text') {
      return [
        'block',
        'rounded-lg border border-zinc-800 bg-zinc-900',
        'p-3',
        'transition',
        'hover:border-blue-500 hover:bg-zinc-900/80',
        'hover:shadow-lg hover:shadow-black/20',
        'focus:outline-none focus:ring-2 focus:ring-blue-500',
      ].join(' ')
    }
    return 'block self-start bg-zinc-900 rounded-lg p-2 transition hover:outline hover:outline-2 hover:outline-offset-2 hover:outline-blue-500'
  }, [view])

  const imageClassName = useMemo(() => {
    if (view === 'thumb') return 'w-full h-auto rounded'
    return 'w-full h-auto rounded'
  }, [view])

  function cardHref(cardId) {
    const safeId = encodeURIComponent(String(cardId))
    return currentQueryString
      ? `/cards/${safeId}?from=${encodeURIComponent(currentQueryString)}`
      : `/cards/${safeId}`
  }

  return (
    <div
      className={`flex flex-col md:grid md:h-screen md:overflow-hidden ${
        filtersOpen ? 'md:grid-cols-[22rem_1fr]' : 'md:grid-cols-[0_1fr]'
      }`}
    >
      {/* LEFT: Filters (collapsible) */}
      <aside className="relative md:col-start-1 md:row-start-1 md:h-screen md:overflow-y-auto md:min-w-0 p-4">
        {filtersOpen && (
          <div className="min-w-0 w-full">
            <CardFilters />
          </div>
        )}
      </aside>

      {/* Collapse handle (Hide Filters) */}
      {filtersOpen && (
        <button
          type="button"
          onClick={() => setFiltersOpen(false)}
          style={{ top: handleTopPx != null ? `${handleTopPx}px` : '50%' }}
          className="
            hidden md:flex
            fixed left-[22rem] -translate-x-1/2
            z-40
            items-center justify-center
            h-36 w-8
            rounded-lg
            border border-zinc-700
            bg-zinc-900/95
            text-zinc-100
            shadow-lg
            hover:bg-zinc-800
            focus:outline-none focus:ring-2 focus:ring-blue-500
          "
          title="Hide filters"
          aria-label="Hide filters"
        >
          <span className="text-xs font-medium tracking-widest rotate-90 whitespace-nowrap select-none">
            Hide Filters
          </span>
        </button>
      )}

      {/* Collapsed "Show Filters" tab */}
      {!filtersOpen && (
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          style={{ top: handleTopPx != null ? `${handleTopPx}px` : '50%' }}
          className="
            hidden md:flex
            fixed left-0
            z-50
            items-center justify-center
            h-36 w-8
            rounded-r-lg
            border border-zinc-700
            bg-zinc-900/95
            text-zinc-100
            shadow-lg
            hover:bg-zinc-800
            focus:outline-none focus:ring-2 focus:ring-blue-500
          "
          title="Show filters"
          aria-label="Show filters"
        >
          <span className="text-xs font-medium tracking-widest rotate-90 whitespace-nowrap select-none">
            Show Filters
          </span>
        </button>
      )}

      {/* RIGHT: Content */}
      <div className="md:col-start-2 md:row-start-1 md:h-screen md:overflow-hidden md:min-w-0 flex flex-col">
        <div className="w-full mx-auto max-w-[140rem] px-4 md:px-6">
          <SiteBanner />

          <div
            ref={resultsTopRef}
            className="mt-4 flex flex-col md:h-[calc(100vh-2rem-8.5rem)] md:overflow-hidden"
          >
            <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 z-10 md:bg-zinc-900/95 md:backdrop-blur md:shadow-lg md:shrink-0">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-zinc-200">
                  <div>
                    Showing <span className="font-semibold">{shownCount}</span>
                    {hasTotal && (
                      <>
                        {' '}
                        of <span className="font-semibold">{total}</span>
                      </>
                    )}{' '}
                    cards
                  </div>

                  {showProgress && (
                    <div className="text-xs text-zinc-400 mt-1">
                      {loading ? `Loading… (${progressText})` : progressText}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 self-start sm:self-auto items-center">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-300">Sort</label>

                    <select
                      className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100"
                      value={sortBy}
                      onChange={e => setSort(e.target.value, sortDir)}
                      title="Sort by"
                    >
                      <option value="">Default</option>
                      <option value="name">Name</option>
                      <option value="cost">Cost</option>
                      <option value="xp">XP</option>
                    </select>

                    <select
                      className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100"
                      value={sortDir}
                      onChange={e => setSort(sortBy, e.target.value)}
                      disabled={!hasSort}
                      title="Sort direction"
                    >
                      <option value="asc">Asc</option>
                      <option value="desc">Desc</option>
                    </select>

                    <button
                      onClick={clearSort}
                      className="rounded bg-zinc-800 px-3 py-1 text-sm text-zinc-100 hover:bg-zinc-700 disabled:opacity-50 disabled:hover:bg-zinc-800"
                      disabled={!hasSort}
                      title={!hasSort ? 'No sort applied' : 'Clear Sort'}
                    >
                      Clear sort
                    </button>
                  </div>

                  {/* View toggle (between Clear sort and Show Filters) */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-300">View</label>
                    <select
                      className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100"
                      value={view}
                      onChange={e => setViewMode(e.target.value)}
                      title="View mode"
                    >
                      {VIEW_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => setFiltersOpen(o => !o)}
                    className="rounded bg-zinc-800 px-3 py-1 text-sm text-zinc-100 hover:bg-zinc-700"
                    title={filtersOpen ? 'Hide filters panel' : 'Show filters panel'}
                  >
                    {filtersOpen ? 'Hide Filters' : 'Show Filters'}
                  </button>

                  <button
                    onClick={scrollGridToTop}
                    className="rounded bg-zinc-800 px-3 py-1 text-sm text-zinc-100 hover:bg-zinc-700"
                    title="Scroll to the top of the page"
                  >
                    Scroll to Top
                  </button>
                </div>
              </div>

              {chips.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={clearAllFilters}
                    className="rounded bg-zinc-800 px-3 py-1 text-sm text-zinc-100 hover:bg-zinc-700"
                    title="Clear all filters"
                  >
                    Clear Filters
                  </button>

                  {chips.map((chip, idx) => (
                    <button
                      key={`${chip.key}:${chip.value}:${idx}`}
                      onClick={() => removeChip(chip)}
                      className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-100 hover:bg-zinc-700"
                      title="Remove this filter"
                    >
                      <span className="text-zinc-300">{chip.label}:</span>
                      <span className="font-medium">{chip.value}</span>
                      <span className="text-zinc-300">×</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <main ref={gridRef} className={gridClassName} style={{ scrollPaddingBottom: 64 }}>
              {view !== 'text' &&
                cards.map(card => (
                  <Link
                    scroll={false}
                    key={card.card_id}
                    data-card-id={card.card_id}
                    href={cardHref(card.card_id)}
                    className={cardLinkClassName}
                    onPointerDown={persistBeforeNav}
                    onMouseDown={persistBeforeNav}
                    onTouchStart={persistBeforeNav}
                  >
                    <img src={card.image_path ? cardImageUrlFromPath(card.image_path) : card.image_url} alt={card.name} className={imageClassName} />
                  </Link>
                ))}

              {view === 'text' &&
                cards.map(card => {
                  const hasHighlightEffect =
                    typeof card.highlight_effect === 'string' && card.highlight_effect.trim().length > 0
                  const hasEffect = typeof card.effect === 'string' && card.effect.trim().length > 0

                  const highlightBorderClass =
                    highlightBorderClassMap[card.highlight_color] ?? 'border-zinc-500'

                  const primaryTypes = Array.isArray(card.primary_types)
                    ? card.primary_types.filter(Boolean)
                    : []
                  const subtypes = Array.isArray(card.subtypes) ? card.subtypes.filter(Boolean) : []

                  const showEffectSection = hasHighlightEffect || hasEffect

                  return (
                    <Link
                      scroll={false}
                      key={card.card_id}
                      data-card-id={card.card_id}
                      href={cardHref(card.card_id)}
                      className={cardLinkClassName}
                      onPointerDown={persistBeforeNav}
                      onMouseDown={persistBeforeNav}
                      onTouchStart={persistBeforeNav}
                    >
                      <div className="flex flex-col gap-2">
                        {/* Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-base font-semibold text-zinc-100 truncate">
                              {card.name}
                            </div>
                            <div className="text-xs text-zinc-400">{card.set}</div>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-zinc-300">
                            {card.cost != null && (
                              <span className="rounded bg-zinc-800 px-2 py-0.5">
                                <span className="text-zinc-400">Cost</span> {card.cost}
                              </span>
                            )}
                            {card.xp_display != null && (
                              <span className="rounded bg-zinc-800 px-2 py-0.5">
                                <span className="text-zinc-400">XP</span> {card.xp_display}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Pills */}
                        {(primaryTypes.length > 0 || subtypes.length > 0) && (
                          <div className="flex flex-wrap gap-2">
                            {primaryTypes.map(pt => (
                              <span
                                key={`pt:${card.card_id}:${pt}`}
                                className="px-2 py-0.5 rounded bg-zinc-800 text-xs text-zinc-200"
                              >
                                {pt}
                              </span>
                            ))}
                            {subtypes.map(st => (
                              <span
                                key={`st:${card.card_id}:${st}`}
                                className="px-2 py-0.5 rounded bg-zinc-800 text-xs text-zinc-200"
                              >
                                {st}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Effect section (detail-page logic) */}
                        {showEffectSection && (
                          <div className="pt-1 space-y-2">
                            <div className="font-semibold text-sm text-zinc-200">Effect:</div>

                            {hasHighlightEffect && (
                              <div className={`border-l-4 ${highlightBorderClass} pl-3 py-1`}>
                                <div className="whitespace-pre-line text-zinc-200 text-sm leading-relaxed">
                                  {card.highlight_effect}
                                </div>
                              </div>
                            )}

                            {/* Normal effect shown under highlight when both exist */}
                            {hasEffect && (
                              <div className="whitespace-pre-line text-zinc-200 text-sm leading-relaxed">
                                {card.effect}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })}

              {/* Sentinel */}
              <div ref={observerRef} className="col-span-full h-6" aria-hidden="true" />

              {/* Extra spacer so the last row never sits flush against the bottom edge */}
              <div className="col-span-full h-10" aria-hidden="true" />

              {shouldShowLoadingRow && (
                 <div className="col-span-full text-center py-4 text-zinc-400">Loading…</div>
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
    </div>
  )
}
