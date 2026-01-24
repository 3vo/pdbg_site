'use client'

import { useEffect, useMemo, useState } from 'react'
import CardImage from '@/components/CardImage'

// Simple in-memory cache shared across rows
const cardMetaCache = new Map()

// Keep in sync with CardImage
const SIZE_MAP = {
  xs: 100,
  sm: 150,
  md: 200,
  lg: 300,
  xl: 400,
}

export default function CardInlineRow({
  ids = [],
  mode = 'full', // 'full' | 'compact'
  size, // optional override; if omitted, chosen from mode
  align = 'center',
  gap = 2,
  className = '',

  // Caption controls
  showCaptions = true,
  showLabelInCompact = false, // optional: keep tiny label even in compact
}) {
  const list = useMemo(() => {
    const arr = Array.isArray(ids)
      ? ids
      : String(ids || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)

    // normalize casing / whitespace
    return arr.map(s => String(s).trim().toUpperCase()).filter(Boolean)
  }, [ids])

  const isCompact = mode === 'compact'

  const effectiveSize =
    size ??
    (isCompact
      ? 'xs'
      : 'sm') // compact defaults to xs, full defaults to sm

  // Guard against typos (falls back to sm)
  const normalizedSize = SIZE_MAP[effectiveSize] ? effectiveSize : 'sm'

  const [meta, setMeta] = useState(() => {
    const initial = {}
    list.forEach(id => {
      if (cardMetaCache.has(id)) initial[id] = cardMetaCache.get(id)
    })
    return initial
  })

  useEffect(() => {
    let alive = true

    async function load() {
      const missing = list.filter(id => !cardMetaCache.has(id))
      if (missing.length === 0) return

      await Promise.all(
        missing.map(async id => {
          try {
            const res = await fetch(`/api/cards/${encodeURIComponent(id)}`, {
              cache: 'force-cache',
            })
            if (!res.ok) return
            const data = await res.json()
            cardMetaCache.set(id, data)
          } catch {
            /* ignore */
          }
        })
      )

      if (!alive) return

      const next = {}
      list.forEach(id => {
        if (cardMetaCache.has(id)) next[id] = cardMetaCache.get(id)
      })
      setMeta(next)
    }

    load()
    return () => {
      alive = false
    }
  }, [list.join('|')])

  const gapClass =
    gap === 1
      ? 'gap-1'
      : gap === 3
        ? 'gap-3'
        : gap === 4
          ? 'gap-4'
          : gap === 5
            ? 'gap-5'
            : 'gap-2'

  const shouldShowCaption = showCaptions && (!isCompact || showLabelInCompact)

  return (
    <span className={['inline-block align-middle my-2', className].join(' ')}>
      <span className={['inline-flex flex-wrap items-start', gapClass].join(' ')}>
        {list.map(id => {
          const card = meta[id]
          const label = card?.name && card?.set ? `${card.name} ${card.set}` : id

          return (
            <span key={id} className="inline-flex flex-col items-center">
              {/* Always keep tooltip so compact still has context */}
              <span title={label} className={isCompact ? 'leading-none' : ''}>
                <CardImage id={id} variant="inline" size={normalizedSize} align={align} />
              </span>

              {shouldShowCaption ? (
                <span
                  className={[
                    // closer to the image + slightly larger text
                    'mt-0.5 max-w-[10rem] text-center truncate leading-tight',
                    isCompact ? 'text-xs text-zinc-500' : 'text-sm text-zinc-300',
                  ].join(' ')}
                  title={label}
                >
                  {label}
                </span>
              ) : null}
            </span>
          )
        })}
      </span>
    </span>
  )
}
