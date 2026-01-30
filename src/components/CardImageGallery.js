'use client'

import { useMemo, useState } from 'react'
import { cardImageUrlFromPath } from '@/lib/cardAssets'

function normalizeToUrl(maybeUrlOrPath) {
  const raw = (maybeUrlOrPath ?? '').toString().trim()
  if (!raw) return ''

  // If it's already a full URL, keep it.
  if (/^https?:\/\//i.test(raw)) return raw

  // Otherwise treat as an R2 path like "AIU/Alexa.webp"
  return cardImageUrlFromPath(raw)
}

export default function CardImageGallery({
  imageUrl, // legacy full URL
  imagePath, // NEW: R2 path like "AIU/Alexa.webp"
  variants = [], // can be URLs OR paths
  alt = 'Card image',
}) {
  const images = useMemo(() => {
    const base = imagePath ? normalizeToUrl(imagePath) : normalizeToUrl(imageUrl)

    const list = [base, ...(Array.isArray(variants) ? variants : [])]
      .map(normalizeToUrl)
      .filter(Boolean)

    // de-dupe while preserving order
    const seen = new Set()
    return list.filter(u => (seen.has(u) ? false : (seen.add(u), true)))
  }, [imageUrl, imagePath, variants])

  const [active, setActive] = useState(images[0] || '')

  // Keep active image valid if images list changes (filters/route changes)
  useMemo(() => {
    if (!active || !images.includes(active)) {
      setActive(images[0] || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.join('|')])

  if (!images.length) return null

  return (
    <div className="space-y-3">
      <img src={active} crossOrigin="anonymous" alt={alt} className="w-full rounded-lg" />

      {images.length > 1 && (
        <div className="pt-1">
          <div className="text-sm font-semibold text-zinc-200 mb-2">Image Variants</div>

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {images.map((url, idx) => {
              const selected = url === active
              return (
                <button
                  key={`${url}:${idx}`}
                  onClick={() => setActive(url)}
                  className={[
                    'rounded border bg-zinc-900 p-1 transition',
                    selected ? 'border-blue-500' : 'border-zinc-800 hover:border-zinc-600',
                  ].join(' ')}
                  title={selected ? 'Selected' : `View variant ${idx + 1}`}
                  type="button"
                >
                  <img src={url} crossOrigin="anonymous" alt={`Variant ${idx + 1}`} className="w-full h-auto rounded" />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
