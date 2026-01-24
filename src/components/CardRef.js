'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { cardCache, subscribeCardCache } from '@/lib/cardRefCache'

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

export default function CardRef({ id, from }) {
  const router = useRouter()

  const cardId = String(id || '').trim()
  const [open, setOpen] = useState(false)
  const [card, setCard] = useState(() => cardCache.get(cardId) || null)
  const [error, setError] = useState(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const anchorRef = useRef(null)
  const didPrefetchRef = useRef(false)

  const href = useMemo(() => {
    const base = `/cards/${encodeURIComponent(cardId)}`
    if (!from) return base
    const sep = base.includes('?') ? '&' : '?'
    return `${base}${sep}from=${encodeURIComponent(from)}`
  }, [cardId, from])

  // ✅ Keep CardRef state in sync with the shared cache (batch prefetch will trigger this)
  useEffect(() => {
    if (!cardId) return

    // If we already have it, sync immediately
    const cached = cardCache.get(cardId)
    if (cached) setCard(cached)

    // Subscribe to future cache updates
    return subscribeCardCache(updatedIds => {
      if (updatedIds.includes(cardId)) {
        const next = cardCache.get(cardId) || null
        setCard(next)
      }
    })
  }, [cardId])

  async function load() {
    if (!cardId) return

    // If cache was seeded (batch), use it
    if (cardCache.has(cardId)) {
      setCard(cardCache.get(cardId))
      return
    }

    try {
      setError(null)
      const res = await fetch(`/api/cards/${encodeURIComponent(cardId)}`, {
        cache: 'force-cache',
      })
      if (!res.ok) throw new Error(`Lookup failed (${res.status})`)
      const data = await res.json()
      cardCache.set(cardId, data)
      setCard(data)
    } catch (e) {
      setError(e.message || 'Failed to load card')
    }
  }

  function positionTooltip() {
    const el = anchorRef.current
    if (!el) return

    const r = el.getBoundingClientRect()

    const tooltipW = 260
    const tooltipH = 370
    const margin = 12

    let left = r.right + 10
    if (left + tooltipW > window.innerWidth - margin) {
      left = r.left - tooltipW - 10
    }

    let top = r.top - 20
    top = clamp(top, margin, window.innerHeight - tooltipH - margin)

    setPos({ top, left })
  }

  function prefetchRoute() {
    if (didPrefetchRef.current) return
    didPrefetchRef.current = true

    try {
      router.prefetch(href)
    } catch {}

    if (card?.image_url) {
      const img = new Image()
      img.src = card.image_url
    }
  }

  function onEnter() {
    setOpen(true)
    positionTooltip()
    prefetchRoute()
    load()
  }

  function onLeave() {
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return

    const onWin = () => positionTooltip()
    window.addEventListener('scroll', onWin, true)
    window.addEventListener('resize', onWin)

    return () => {
      window.removeEventListener('scroll', onWin, true)
      window.removeEventListener('resize', onWin)
    }
  }, [open])

  useEffect(() => {
    if (!card?.image_url) return
    const img = new Image()
    img.src = card.image_url
  }, [card?.image_url])

  const tooltip =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed z-[9999] w-[260px] rounded-lg border border-zinc-700 bg-zinc-950/95 shadow-xl backdrop-blur p-2"
            style={{ top: `${pos.top}px`, left: `${pos.left}px` }}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={onLeave}
          >
            {error ? (
              <div className="text-sm text-red-300 p-2">
                Couldn’t load <span className="font-semibold">{cardId}</span>
                <div className="text-xs text-zinc-400 mt-1">{error}</div>
              </div>
            ) : !card ? (
              <div className="text-sm text-zinc-300 p-2">Loading…</div>
            ) : (
              <div className="space-y-2">
                <div className="px-1">
                  <div className="text-sm font-semibold text-zinc-100 truncate">{card.name}  {card.set}</div>
                </div>

                <div className="rounded-md border border-zinc-800 bg-black overflow-hidden">
                  <img
                    src={card.image_url}
                    alt={card.name}
                    className="w-full h-auto block"
                    loading="lazy"
                  />
                </div>

                <div className="px-1 text-xs text-zinc-400">Click to open detailed view.</div>
              </div>
            )}
          </div>,
          document.body
        )
      : null

  const hasNiceLabel = Boolean(card?.name && card?.set)

  return (
    <>
      <span className="inline">
        <Link
          ref={anchorRef}
          href={href}
          className="
            inline-flex items-center gap-1.5
            rounded
            border border-blue-500/30
            bg-blue-950/40
            px-1 py-0.5
            text-blue-100
            shadow-sm shadow-black/30
            transition
            hover:border-blue-400
            hover:bg-blue-950/70
            hover:shadow-black/50
            no-underline hover:no-underline
          "
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          onFocus={onEnter}
          onBlur={onLeave}
          title={hasNiceLabel ? `${card.name} ${card.set}` : cardId}
        >
          {hasNiceLabel ? (
            <>
              <span className="text-base text-zinc-300 font-semibold leading-none">{card.name}</span>
              <span className="text-sm text-zinc-300 leading-none">{card.set}</span>
            </>
          ) : (
            <span className="text-sm font-medium leading-none">{cardId}</span>
          )}
        </Link>
      </span>

      {tooltip}
    </>
  )
}
