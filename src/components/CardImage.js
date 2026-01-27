'use client'

import { useEffect, useMemo, useState } from 'react'

// Simple in-memory cache so repeated renders don’t refetch
const cardImageCache = new Map()

// Unified size system (px)
const SIZE_MAP = {
  xs: 100,
  sm: 150,
  md: 200,
  base: 200,
  lg: 300,
  xl: 400,
}

export default function CardImage({
  id,
  caption, // undefined = auto, "" = suppress, "tier" = only tier badge, string = custom
  alt,

  className = '',
  style = {},
  imgClassName = '',
  imgStyle = {},

  variant = 'block', // 'block' | 'inline'
  size = 'md',
  align = 'center',
  showCaption = true,

  link = false, // false | true | string
}) {
  const cardId = useMemo(() => String(id || '').trim().toUpperCase(), [id])
  const widthPx = SIZE_MAP[size] ?? SIZE_MAP.md

  const [card, setCard] = useState(() => cardImageCache.get(cardId) || null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    if (!cardId) return

    if (cardImageCache.has(cardId)) {
      setCard(cardImageCache.get(cardId))
      return
    }

    ;(async () => {
      try {
        setError(null)
        const res = await fetch(`/api/cards/${encodeURIComponent(cardId)}`, {
          cache: 'force-cache',
        })
        if (!res.ok) throw new Error(`Lookup failed (${res.status})`)
        const data = await res.json()
        cardImageCache.set(cardId, data)
        if (alive) setCard(data)
      } catch (e) {
        if (alive) setError(e?.message || 'Failed to load card')
      }
    })()

    return () => {
      alive = false
    }
  }, [cardId])

  if (!cardId) return null

  if (error) {
    return (
      <span className="inline-flex rounded border border-red-900/40 bg-red-950/20 px-2 py-1 text-xs text-red-200">
        Couldn’t load {cardId}
      </span>
    )
  }

  if (!card) {
    return (
      <span className="inline-flex rounded border border-zinc-800 bg-zinc-950/40 px-2 py-1 text-xs text-zinc-300">
        Loading…
      </span>
    )
  }

  const displayAlt = alt || card.name || card.card_id || cardId
  const hasWcsTier = card?.wcs_tier != null && String(card.wcs_tier).trim() !== ''

  /**
   * Caption logic:
   * - caption === ""         → suppress caption entirely
   * - caption === undefined  → auto caption (card name)
   * - caption === "tier"     → show ONLY the tier badge (if present)
   * - caption === string     → custom caption (that exact string)
   */
  const suppressCaption = caption === ''
  const tierOnly = caption === 'tier'

  const captionText =
    suppressCaption || tierOnly
      ? ''
      : caption === undefined
        ? card.name || card.card_id || cardId
        : typeof caption === 'string'
          ? caption
          : ''

  const shouldRenderCaption =
    showCaption && !suppressCaption && (tierOnly ? hasWcsTier : captionText || hasWcsTier)

  const baseImgStyle = {
    width: widthPx,
    maxWidth: '100%',
    height: 'auto',
    ...imgStyle,
  }

  // Resolve link target
  const linkHref =
    link === true
      ? `/cards/${encodeURIComponent(cardId)}`
      : typeof link === 'string'
        ? link
        : null

  // Force the image to be block-level (no baseline gap) in BOTH cases
  
  const imgSrc = card.image_path
  ? `${(process.env.NEXT_PUBLIC_CARD_ASSETS_HOST || '').replace(/\/+$/, '')}/${encodeURI(
      String(card.image_path).replace(/^\/+/, '')
    )}`
  : card.image_url

  const ImageNode = (
    <img
      src={imgSrc}
      alt={displayAlt}
      loading="lazy"
      className={[
        'block mx-auto rounded-lg border border-zinc-800 bg-zinc-950 shadow-md shadow-black/40',
        linkHref ? 'cursor-pointer hover:shadow-lg transition' : '',
        imgClassName,
      ].join(' ')}
      style={baseImgStyle}
    />
  )

  // Wrap ONLY the image in a link (so the rest of the row is not clickable)
  // IMPORTANT: make the non-link case match the link case (inline-block + line-height:0)
  const ClickableImageEl = linkHref ? (
    <a
      href={linkHref}
      target="_blank"
      rel="noopener noreferrer"
      title={`View ${card.name || cardId}`}
      className="inline-block"
      style={{ lineHeight: 0 }} // consistent baseline behavior
    >
      {ImageNode}
    </a>
  ) : (
    <span className="inline-block" style={{ lineHeight: 0 }}>
      {ImageNode}
    </span>
  )

  // Shared caption block (used by BOTH block + inline variants now)
  const CaptionEl = shouldRenderCaption ? (
    <figcaption className="text-xs leading-none text-zinc-400 text-center">
      <span className="inline-flex items-center justify-center gap-2 flex-wrap">
        {captionText ? <span>{captionText}</span> : null}

        {hasWcsTier ? (
          <span
            className="-translate-y-10 rounded bg-zinc-800 px-2 py-1 text-[14px] text-zinc-200 border border-zinc-700"
            title="World Championships Draft Tier"
          >
            WCS Tier {card.wcs_tier}
          </span>
        ) : null}
      </span>
    </figcaption>
  ) : null

  // ----------------------------
  // Inline mode (same styling + captions as block)
  // ----------------------------
  if (variant === 'inline') {
    const alignClass =
      align === 'top'
        ? 'align-top'
        : align === 'bottom'
          ? 'align-bottom'
          : 'align-middle'

    return (
      <figure
        className={['inline-block m-0 align-middle text-center', alignClass, className].join(' ')}
        style={style}
      >
        {ClickableImageEl}
        {CaptionEl}
      </figure>
    )
  }

  // ----------------------------
  // Block mode
  // ----------------------------
  return (
    <figure className={['my-6 m-0 text-center', className].join(' ')} style={style}>
      {ClickableImageEl}
      {CaptionEl}
    </figure>
  )
}
