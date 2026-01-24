'use client'

import { useEffect, useState } from 'react'

function getBp(w) {
  if (w >= 1536) return '2xl'
  if (w >= 1280) return 'xl'
  if (w >= 1024) return 'lg'
  if (w >= 768) return 'md'
  if (w >= 640) return 'sm'
  return 'base'
}

export default function DebugViewport({
  enabled = process.env.NODE_ENV !== 'production',
  containerRef, // optional
}) {
  const [w, setW] = useState(0)
  const [cw, setCw] = useState(null)

  useEffect(() => {
    const onResize = () => {
      setW(window.innerWidth)
      if (containerRef?.current) setCw(containerRef.current.getBoundingClientRect().width)
    }

    onResize()
    window.addEventListener('resize', onResize)

    // Also observe container size changes (not just window)
    let ro = null
    if (containerRef?.current && 'ResizeObserver' in window) {
      ro = new ResizeObserver(() => onResize())
      ro.observe(containerRef.current)
    }

    return () => {
      window.removeEventListener('resize', onResize)
      ro?.disconnect?.()
    }
  }, [containerRef])

  if (!enabled) return null

  const bp = getBp(w)

  return (
    <div className="fixed bottom-3 left-3 z-[9999] rounded-md border border-zinc-700 bg-zinc-950/90 px-3 py-2 text-xs text-zinc-200 shadow-lg">
      <div className="font-semibold">Debug</div>
      <div className="mt-1 flex gap-2">
        <span className="text-zinc-400">vw:</span>
        <span>{w}px</span>
      </div>
      <div className="flex gap-2">
        <span className="text-zinc-400">bp:</span>
        <span className="font-medium">{bp}</span>
      </div>
      {cw != null ? (
        <div className="flex gap-2">
          <span className="text-zinc-400">filters:</span>
          <span>{Math.round(cw)}px</span>
        </div>
      ) : null}
    </div>
  )
}
