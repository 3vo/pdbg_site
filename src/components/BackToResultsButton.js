'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

function normalizeFallbackHref(raw) {
  const href = (raw ?? '/cards').toString().trim()
  if (!href) return '/cards'

  // If it's already a path, use it as-is
  // e.g. "/cards?x=1" or "/articles/my-post"
  if (href.startsWith('/')) return href

  // Otherwise treat it like a /cards querystring
  // e.g. "q=pikachu&cost_min=2"
  return `/cards?${href}`
}

export default function BackToResultsButton({ fallbackHref = '/cards' }) {
  const router = useRouter()
  const [leaving, setLeaving] = useState(false)
  const [hasHistory, setHasHistory] = useState(false)

  const targetHref = useMemo(() => normalizeFallbackHref(fallbackHref), [fallbackHref])

  const isArticleBack = useMemo(() => targetHref.startsWith('/articles/'), [targetHref])

  useEffect(() => {
    setHasHistory(window.history.length > 1)
  }, [])

  function handleClick() {
    if (leaving) return
    setLeaving(true)

    window.setTimeout(() => {
      router.push(targetHref)
    }, 150)
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
