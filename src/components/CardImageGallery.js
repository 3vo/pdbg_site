'use client'

import { useMemo, useState } from 'react'

export default function CardImageGallery({ imageUrl, variants = [], alt = 'Card image' }) {
  const images = useMemo(() => {
    const list = [imageUrl, ...(Array.isArray(variants) ? variants : [])]
      .map(v => (v ?? '').toString().trim())
      .filter(Boolean)

    // de-dupe while preserving order
    const seen = new Set()
    return list.filter(u => (seen.has(u) ? false : (seen.add(u), true)))
  }, [imageUrl, variants])

  const [active, setActive] = useState(images[0] || imageUrl)

  if (!images.length) return null

  return (
    <div className="space-y-3">
      <img src={active} alt={alt} className="w-full rounded-lg" />

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
                >
                  <img src={url} alt={`Variant ${idx + 1}`} className="w-full h-auto rounded" />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
