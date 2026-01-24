'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

export default function CardRef({ id, label }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [card, setCard] = useState(null)
  const [err, setErr] = useState(null)
  const hoverTimer = useRef(null)

  const display = label || id

  async function ensureLoaded() {
    if (card || loading) return
    setLoading(true)
    setErr(null)

    try {
      const res = await fetch(`/api/cards/lookup?card_id=${encodeURIComponent(id)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to load card')
      setCard(json)
    } catch (e) {
      setErr(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  function onEnter() {
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(async () => {
      await ensureLoaded()
      setOpen(true)
    }, 120)
  }

  function onLeave() {
    clearTimeout(hoverTimer.current)
    setOpen(false)
  }

  useEffect(() => {
    return () => clearTimeout(hoverTimer.current)
  }, [])

  return (
    <span className="relative inline-block" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <Link
        href={`/cards/${encodeURIComponent(id)}`}
        className="underline decoration-zinc-500 hover:decoration-blue-400 text-zinc-100"
        title={`Open card ${id}`}
      >
        {display}
      </Link>

      {open && (
        <span
          className="
            absolute left-1/2 top-full mt-2 -translate-x-1/2
            z-50
            w-[220px]
            rounded-lg border border-zinc-700 bg-zinc-950
            shadow-xl
            p-2
          "
        >
          {loading ? (
            <span className="block text-xs text-zinc-400">Loading…</span>
          ) : err ? (
            <span className="block text-xs text-red-300">{err}</span>
          ) : card?.image_url ? (
            <>
              <img
                src={card.image_url}
                alt={card.name || id}
                className="w-full h-auto rounded"
              />
              <span className="block mt-2 text-xs text-zinc-300 truncate">
                {card.name || id}
              </span>
            </>
          ) : (
            <span className="block text-xs text-zinc-400">No preview.</span>
          )}
        </span>
      )}
    </span>
  )
}
