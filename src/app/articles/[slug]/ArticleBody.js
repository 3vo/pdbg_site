'use client'

import React from 'react'
import { useMemo } from 'react'
import { MDXRemote } from 'next-mdx-remote'
import { serialize } from 'next-mdx-remote/serialize'
import remarkGfm from 'remark-gfm'

import CardRef from '@/components/CardRef'
import { setManyCards } from '@/lib/cardRefCache'
import SupabaseImage from '@/components/SupabaseImage'
import CardImage from '@/components/CardImage'
import CardInlineRow from '@/components/CardInlineRow'

export default function ArticleBody({ mdx, fromPath = '' }) {
  const source = String(mdx || '')

  const CARD_ID_RE = /\[\[([^\]]+)\]\]/g
  const DASHES_RE = /[–—−]/g // en dash, em dash, minus
  const CARD_ID_STRICT = /^[A-Z&]{3}-\d{3}$/

  function replaceCardRefsOutsideCodeFences(text) {
    // Split by fenced code blocks ```...```
    const parts = String(text).split(/(```[\s\S]*?```)/g)

    return parts
      .map(part => {
        // If this chunk is a fenced code block, leave it untouched
        if (part.startsWith('```')) return part

        // Otherwise, replace [[CARD_ID]] with <CardRef ... />
        return part.replace(CARD_ID_RE, (m, raw) => {
          const normalized = String(raw)
            .trim()
            .toUpperCase()
            .replace(DASHES_RE, '-') // ✅ normalize fancy dashes to '-'

          if (!CARD_ID_STRICT.test(normalized)) return m

          const safeFrom = JSON.stringify(fromPath || '')
          return `<CardRef id="${normalized}" from=${safeFrom} />`
        })
      })
      .join('')
  }

  // Batch-prefetch helper (extract IDs outside code fences, same normalization rules)
  function extractCardIdsOutsideCodeFences(text) {
    const ids = []
    const seen = new Set()

    const parts = String(text).split(/(```[\s\S]*?```)/g)

    for (const part of parts) {
      if (part.startsWith('```')) continue

      for (const match of part.matchAll(CARD_ID_RE)) {
        const raw = match?.[1]
        const normalized = String(raw)
          .trim()
          .toUpperCase()
          .replace(DASHES_RE, '-')

        if (!CARD_ID_STRICT.test(normalized)) continue
        if (seen.has(normalized)) continue

        seen.add(normalized)
        ids.push(normalized)
      }
    }

    return ids
  }

  const preprocessed = replaceCardRefsOutsideCodeFences(source)

  // One batch request on page load to seed cache for all pills
  React.useEffect(() => {
    const ids = extractCardIdsOutsideCodeFences(source)
    if (ids.length === 0) return

    let cancelled = false

    ;(async () => {
      try {
        const res = await fetch('/api/cards/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        })

        if (!res.ok) return
        const json = await res.json()
        if (cancelled) return

        setManyCards(json?.cards || [])
      } catch {
        // ignore — CardRef still lazy-loads on hover as fallback
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source])

  const compiled = useMemo(() => {
    let cancelled = false

    const run = async () => {
      const mdxSource = await serialize(preprocessed, {
        mdxOptions: {
          remarkPlugins: [remarkGfm],
        },
      })
      if (cancelled) return null
      return mdxSource
    }

    const promise = run()
    return { promise, cancel: () => (cancelled = true) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, preprocessed])

  // Simple async-render wrapper without suspense
  const [state, setState] = React.useState({ mdx: null, error: null })
  React.useEffect(() => {
    let alive = true
    compiled.promise
      .then(res => alive && setState({ mdx: res, error: null }))
      .catch(err => alive && setState({ mdx: null, error: err }))
    return () => {
      alive = false
      compiled.cancel?.()
    }
  }, [compiled])

  if (state.error) {
    return <div className="text-sm text-red-300">Failed to render article.</div>
  }
  if (!state.mdx) {
    return <div className="text-sm text-zinc-400">Loading…</div>
  }

  return (
    <div className="prose prose-invert max-w-none prose-p:text-zinc-200 prose-headings:text-zinc-100 prose-a:text-blue-300 hover:prose-a:text-blue-200">
      <MDXRemote
        {...state.mdx}
        components={{
          // Existing
          CardRef,
          CardImage,
          CardInlineRow,
          SupabaseImage,

          // MDX shorthand aliases
          Card: props => <CardImage {...props} />,
          CardInline: props => <CardImage {...props} variant="inline" />,
          CardRow: props => <CardInlineRow {...props} />,

          // Optional: super short image tag for Storage images
          Img: props => <SupabaseImage {...props} />,
        }}
      />
    </div>
  )
}
