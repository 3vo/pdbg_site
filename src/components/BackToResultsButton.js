'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

function normalizeFallbackHref(raw) {
  const href = (raw ?? '/cards').toString().trim()
  if (!href) return '/cards'
  if (href.startsWith('/')) return href
  return `/cards?${href}`
}

function canUseBackToCards(targetHref) {
  try {
    // Only attempt this heuristic for /cards destinations
    if (!targetHref.startsWith('/cards')) return false

    const ref = document.referrer || ''
    if (!ref) return false

    const refUrl = new URL(ref)
    const curUrl = new URL(window.location.href)

    // Same-origin referrer + it was a /cards page
    return refUrl.origin === curUrl.origin && refUrl.pathname.startsWith('/cards')
  } catch {
    return false
  }
}

export default function BackToResultsButton({ fallbackHref = '/cards' }) {
  const router = useRouter()
  const [leaving, setLeaving] = useState(false)

  const targetHref = useMemo(() => normalizeFallbackHref(fallbackHref), [fallbackHref])
  const isArticleBack = useMemo(() => targetHref.startsWith('/articles/'), [targetHref])

  const [preferBack, setPreferBack] = useState(false)
  useEffect(() => {
    setPreferBack(canUseBackToCards(targetHref))
  }, [targetHref])

  function handleClick() {
    if (leaving) return
    setLeaving(true)

    if (preferBack) {
      router.back()
      return
    }

    router.push(targetHref)
  }

  const disabled = leaving
  const label = isArticleBack ? '← Back to article' : '← Back to results'
  const title = isArticleBack ? 'Back to article' : 'Back to results'

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
