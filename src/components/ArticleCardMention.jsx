'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { cardImageUrlFromPath } from '@/lib/cardAssets'

export default function ArticleCardMention({ id, children }) {
  const cardId = String(id || '').trim()
  const [card, setCard] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let ignore = false
    async function load() {
      if (!cardId) return
      const res = await fetch(`/api/cards/lookup?card_id=${encodeURIComponent(cardId)}`)
      const json = await res.json()
      if (!ignore) setCard(json.card || null)
    }
    load()
    return () => {
      ignore = true
    }
  }, [cardId])

  const label = children || card?.name || cardId

  const imgSrc = useMemo(() => {
    if (!card) return ''
    if (card.image_path) return cardImageUrlFromPath(card.image_path)
    return card.image_url || ''
  }, [card])

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href={`/cards/${encodeURIComponent(cardId)}`}
        className="text-blue-300 hover:text-blue-200 underline decoration-blue-500/40 hover:decoration-blue-300"
      >
        {label}
      </Link>

      {open && imgSrc && (
        <div
          className="
            absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2
            w-56
            rounded-lg border border-zinc-700 bg-zinc-900 p-2
            shadow-xl
          "
        >
          <img src={imgSrc} alt={card?.name || cardId} className="w-full h-auto rounded" />
          <div className="mt-2 text-xs text-zinc-200 font-semibold truncate">{card?.name}</div>
          <div className="text-[10px] text-zinc-400 truncate">{card?.card_id}</div>
        </div>
      )}
    </span>
  )
}
