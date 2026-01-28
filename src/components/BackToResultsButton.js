'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

function normalizeFallbackHref(raw) {
  const href = (raw ?? '/cards').toString().trim()
  if (!href) return '/cards'
  if (href.startsWith('/')) return href
  return `/cards?${href}`
}

export default function BackToResultsButton({ fallbackHref = '/cards' }) {
  const router = useRouter()
  const [leaving, setLeaving] = useState(false)
  const [hasHistory, setHasHistory] = useState(false)

  const targetHref = useMemo(() => normalizeFallbackHref(fallbackHref), [fallbackHref])
  const isArticleBack = useMemo(() => targetHref.startsWith('/articles/'), [targetHref])

  useEffect(() => {
    // history length heuristic; also guard for SSR
    try {
      setHasHistory(window.history.length > 1)
    } catch {
      setHasHistory(false)
    }
  }, [])

  function handleClick() {
    if (leaving) return
    setLeaving(true)

    // Prefer browser history when it exists — preserves scroll/state best.
    if (hasHistory) {
      router.back()
      return
    }

    // Fallback when opened in a new tab / direct entry
    router.push(targetHref)
  }

  const disabled = leaving
  const label = isArticleBack ? '← Back to article' : '← Back to results'
  const title = isArticleBack
    ? hasHistory
      ? 'Back to article'
      : 'Go to article'
    : hasHistory
      ? 'Back to results'
      : 'Go to results'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-disabled={disabled}
      className={[
        'text-sm text-blue-400 hover:underline',
        'transition-opacity duration-150',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
      ].join(' ')}
      title={title}
    >
      {label}
    </button>
  )
}
