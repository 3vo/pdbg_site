'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ArticlesFilters({
  initialQ = '',
  initialGroup = '',
  initialTag = '',
  initialSort = 'date_asc', // 'date_asc' | 'date_desc'
  initialAuthor = '', // author slug (preferred) or profile id
  groups = [],
  tags = [],
  authors = [],
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [q, setQ] = useState(initialQ)
  const [group, setGroup] = useState(initialGroup)
  const [tag, setTag] = useState(initialTag)
  const [sort, setSort] = useState(initialSort)
  const [author, setAuthor] = useState(initialAuthor)

  const debounceRef = useRef(null)
  const ignoreNextUrlSyncRef = useRef(false)

  const qsKey = searchParams?.toString?.() || ''

  function pushNext(nextQ, nextGroup, nextTag, nextSort, nextAuthor) {
    const params = new URLSearchParams(searchParams?.toString() || '')

    const cleanQ = String(nextQ || '').trim()
    const cleanGroup = String(nextGroup || '').trim()
    const cleanTag = String(nextTag || '').trim()

    const cleanSort = String(nextSort || 'date_asc').trim().toLowerCase()
    const sortVal = cleanSort === 'date_desc' ? 'date_desc' : 'date_asc'

    const cleanAuthor = String(nextAuthor || '').trim()

    cleanQ ? params.set('q', cleanQ) : params.delete('q')
    cleanGroup ? params.set('group', cleanGroup) : params.delete('group')
    cleanTag ? params.set('tag', cleanTag) : params.delete('tag')

    // Keep URLs clean: omit defaults
    sortVal !== 'date_asc' ? params.set('sort', sortVal) : params.delete('sort')
    cleanAuthor ? params.set('author', cleanAuthor) : params.delete('author')

    ignoreNextUrlSyncRef.current = true
    const qs = params.toString()
    router.push(qs ? `/articles?${qs}` : '/articles')

    window.setTimeout(() => {
      ignoreNextUrlSyncRef.current = false
    }, 0)
  }

  // URL -> state sync
  useEffect(() => {
    if (ignoreNextUrlSyncRef.current) return

    const sp = new URLSearchParams(qsKey)

    setQ(sp.get('q') || '')
    setGroup(sp.get('group') || '')
    setTag(sp.get('tag') || '')
    setSort(sp.get('sort') === 'date_desc' ? 'date_desc' : 'date_asc')
    setAuthor(sp.get('author') || '')
  }, [qsKey])

  // group/tag/sort/author: immediate
  useEffect(() => {
    pushNext(q, group, tag, sort, author)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, tag, sort, author])

  // search: debounced
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      pushNext(q, group, tag, sort, author)
    }, 300)

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const hasAny = Boolean(q.trim() || group || tag || author) || sort !== 'date_asc'

  return (
    <div className="mt-5 space-y-3">
      <div className="grid grid-cols-1 gap-3 mid:grid-cols-[minmax(0,1fr)_auto] mid:items-stretch">
        {/* Left filters */}
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,400px)_190px_100px] gap-3 items-stretch">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search..."
            className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 w-full md:max-w-[400px]"
          />

          <select
            value={group}
            onChange={e => setGroup(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            title="Group"
          >
            <option value="">Group</option>
            {groups.map(g => (
              <option key={g.id} value={g.slug}>
                {g.name}
              </option>
            ))}
          </select>

          <select
            value={tag}
            onChange={e => setTag(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            title="Tag"
          >
            <option value="">Tag</option>
            {tags.map(t => (
              <option key={t.id} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sort controls:
            - default: left aligned and stacked under (since outer grid is 1 col)
            - mid+: pinned to the far right column */}
        <div className="flex items-center gap-2 justify-start mid:justify-self-end mid:justify-end">
          <span className="text-xs uppercase tracking-widest text-zinc-400 shrink-0">Sort</span>

          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 w-[120px] shrink-0"
            title="Sort by date"
          >
            <option value="date_asc">Date ↓</option>
            <option value="date_desc">Date ↑</option>
          </select>

          {/* Author */}
          <select
            value={author}
            onChange={e => setAuthor(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 w-[320px] shrink-1"
            title="Filter by author"
          >
            <option value="">All authors</option>
            {authors.map(a => (
              <option key={a.id} value={a.slug || a.id}>
                {a.display_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Actions row */}
      <div className="flex gap-2 items-center">
        <Link
          href="/articles"
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800"
        >
          Reset Filters
        </Link>

        {hasAny ? (
          <div className="text-xs text-zinc-500">
            Tip: filters update automatically (typing has a short delay).
          </div>
        ) : null}
      </div>
    </div>
  )
}
