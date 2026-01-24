'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function AdminArticlesFilters({ initialQ = '', initialStatus = '' }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [q, setQ] = useState(initialQ)
  const [status, setStatus] = useState(initialStatus)

  const debounceRef = useRef(null)
  const ignoreNextUrlSyncRef = useRef(false)

  const qsKey = searchParams?.toString?.() || ''

  function pushNext(nextQ, nextStatus) {
    const params = new URLSearchParams(searchParams?.toString() || '')

    const cleanQ = String(nextQ || '').trim()
    const cleanStatus = String(nextStatus || '').trim()

    if (cleanQ) params.set('q', cleanQ)
    else params.delete('q')

    if (cleanStatus) params.set('status', cleanStatus)
    else params.delete('status')

    const nextQs = params.toString()

    ignoreNextUrlSyncRef.current = true
    router.push(nextQs ? `/admin/articles?${nextQs}` : '/admin/articles')

    window.setTimeout(() => {
      ignoreNextUrlSyncRef.current = false
    }, 0)
  }

  // ✅ URL -> state sync (Back/Forward, external navigation)
  useEffect(() => {
    if (ignoreNextUrlSyncRef.current) return

    const sp = new URLSearchParams(qsKey)

    const nextQ = (sp.get('q') || '').toString()
    const nextStatus = (sp.get('status') || '').toString()

    setQ(prev => (prev === nextQ ? prev : nextQ))
    setStatus(prev => (prev === nextStatus ? prev : nextStatus))
  }, [qsKey])

  // status: immediate
  useEffect(() => {
    pushNext(q, status)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // q: debounced
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      pushNext(q, status)
    }, 300)

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const hasAny = Boolean(q.trim() || status)

  return (
    <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Search title / excerpt / slug…"
        className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
      />

      <select
        value={status}
        onChange={e => setStatus(e.target.value)}
        className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
      >
        <option value="">All statuses</option>
        <option value="draft">Draft</option>
        <option value="published">Published</option>
      </select>

      <div className="flex gap-2 items-center">
        <Link
          href="/admin/articles"
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800"
        >
          Reset
        </Link>

        {hasAny ? (
          <div className="text-xs text-zinc-500">Typing updates automatically (short delay).</div>
        ) : null}
      </div>
    </div>
  )
}
