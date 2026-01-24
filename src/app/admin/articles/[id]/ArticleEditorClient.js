'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useMemo, useState, useTransition } from 'react'
import { avatarPublicUrl } from '@/lib/avatars'
import { updateArticleAction, publishArticleAction, unpublishArticleAction } from './actions'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function initials(name) {
  const s = String(name || '').trim()
  if (!s) return '?'
  const parts = s.split(/\s+/).slice(0, 2)
  return parts.map(p => p[0]?.toUpperCase()).join('')
}

export default function ArticleEditorClient({
  article,
  groups,
  tags,
  selectedTagIds,
  profiles,
  initialAuthorIds,
  editorRole = null, // 'author' | 'editor' | 'admin' | null
}) {
  const [isPending, startTransition] = useTransition()
  const [notice, setNotice] = useState('')

  const [title, setTitle] = useState(article.title || '')
  const [slug, setSlug] = useState(article.slug || '')
  const [excerpt, setExcerpt] = useState(article.excerpt || '')
  const [groupId, setGroupId] = useState(article.group_id || '')
  const [body, setBody] = useState(article.body_mdx || '')

  const [tagIds, setTagIds] = useState(() => new Set(selectedTagIds || []))

  // Authors (ordered)
  const [authorIds, setAuthorIds] = useState(() => Array.from(initialAuthorIds || []))
  const [authorToAdd, setAuthorToAdd] = useState('')

  const status = article.status
  const updatedAt = article.updated_at ? new Date(article.updated_at).toLocaleString() : ''

  const tagOptions = useMemo(() => tags || [], [tags])

  const profilesById = useMemo(() => {
    const m = new Map()
    for (const p of profiles || []) m.set(p.id, p)
    return m
  }, [profiles])

  const availableAuthors = useMemo(() => {
    const chosen = new Set(authorIds)
    return (profiles || []).filter(p => !chosen.has(p.id))
  }, [profiles, authorIds])

  const canPublish = editorRole === 'editor' || editorRole === 'admin'
  const canManageAuthors = editorRole === 'editor' || editorRole === 'admin'
  const isAuthor = editorRole === 'author'

  function onTagsChange(e) {
    const next = new Set()
    for (const opt of Array.from(e.target.selectedOptions)) next.add(opt.value)
    setTagIds(next)
  }

  function addAuthor() {
    if (!canManageAuthors) return
    const id = String(authorToAdd || '').trim()
    if (!id) return
    if (authorIds.includes(id)) return
    setAuthorIds(prev => [...prev, id])
    setAuthorToAdd('')
  }

  function removeAuthor(id) {
    if (!canManageAuthors) return
    setAuthorIds(prev => prev.filter(x => x !== id))
  }

  function moveAuthor(id, dir) {
    if (!canManageAuthors) return
    setAuthorIds(prev => {
      const i = prev.indexOf(id)
      if (i === -1) return prev
      const j = dir === 'up' ? i - 1 : i + 1
      if (j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      const tmp = next[i]
      next[i] = next[j]
      next[j] = tmp
      return next
    })
  }

  async function onSave() {
    setNotice('')
    startTransition(async () => {
      try {
        await updateArticleAction({
          id: article.id,
          title,
          slug,
          excerpt,
          body_mdx: body,
          group_id: groupId || null,
          tag_ids: Array.from(tagIds),
          author_ids: authorIds,
        })
        setNotice('Saved.')
      } catch (err) {
        setNotice(err?.message || 'Save failed.')
      }
    })
  }

  async function onPublish() {
    setNotice('')
    startTransition(async () => {
      try {
        await publishArticleAction({ id: article.id })
        setNotice('Published.')
        location.reload()
      } catch (err) {
        setNotice(err?.message || 'Publish failed.')
      }
    })
  }

  async function onUnpublish() {
    setNotice('')
    startTransition(async () => {
      try {
        await unpublishArticleAction({ id: article.id })
        setNotice('Unpublished (draft).')
        location.reload()
      } catch (err) {
        setNotice(err?.message || 'Unpublish failed.')
      }
    })
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="w-full mx-auto max-w-[140rem] px-4 md:px-6 pb-10">
        <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900 p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">Admin • Edit Article</div>
              <div className="text-sm text-zinc-400 mt-1">
                Status:{' '}
                <span className={status === 'published' ? 'text-green-300' : 'text-yellow-300'}>
                  {status}
                </span>
                {updatedAt ? <span className="text-zinc-500"> • Updated {updatedAt}</span> : null}
                {editorRole ? (
                  <span className="text-zinc-500">
                    {' '}
                    • Role <span className="text-zinc-300">{editorRole}</span>
                  </span>
                ) : null}
              </div>

              {isAuthor ? (
                <div className="text-xs text-zinc-500 mt-2">
                  Only editors/admins can change tags/group/authors.
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/articles"
                className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800"
              >
                ← Back
              </Link>

              <button
                onClick={onSave}
                disabled={isPending}
                className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
              >
                {isPending ? 'Saving…' : 'Save'}
              </button>

              <Link
                href={`/articles/preview/${encodeURIComponent(article.id)}`}
                className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800"
              >
                Preview
              </Link>

              {canPublish ? (
                status !== 'published' ? (
                  <button
                    onClick={onPublish}
                    disabled={isPending}
                    className="rounded bg-green-900/40 border border-green-800 px-3 py-2 text-sm text-green-100 hover:bg-green-900/60 disabled:opacity-50"
                  >
                    Publish
                  </button>
                ) : (
                  <button
                    onClick={onUnpublish}
                    disabled={isPending}
                    className="rounded bg-yellow-900/40 border border-yellow-800 px-3 py-2 text-sm text-yellow-100 hover:bg-yellow-900/60 disabled:opacity-50"
                  >
                    Unpublish
                  </button>
                )
              ) : (
                null
              )}
            </div>
          </div>

          {notice ? <div className="mt-3 text-sm text-zinc-300">{notice}</div> : null}

          {/* Fields */}
          <div
            className={[
              'mt-6 grid grid-cols-1 gap-3',
              isAuthor ? 'lg:grid-cols-1' : 'lg:grid-cols-3',
            ].join(' ')}
          >
            {/* Left: Main fields */}
            <div className={[isAuthor ? 'lg:col-span-1' : 'lg:col-span-1', 'space-y-3'].join(' ')}>
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Title</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm text-zinc-300 mb-1">Slug</label>
                  <input
                    value={slug}
                    onChange={e => setSlug(e.target.value)}
                    className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                  />
                </div>

                <div className="pt-6">
                  <button
                    type="button"
                    onClick={() => setSlug(slugify(title))}
                    className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700"
                    title="Generate slug from title"
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-300 mb-1">Excerpt (optional)</label>
                <textarea
                  value={excerpt}
                  onChange={e => setExcerpt(e.target.value)}
                  rows={3}
                  className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                />
              </div>
            </div>

            {/* Middle + Right are hidden for authors */}
            {!isAuthor ? (
              <>
                {/* Middle: Group + Tags */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-zinc-300 mb-1">Group</label>
                    <select
                      value={groupId || ''}
                      onChange={e => setGroupId(e.target.value)}
                      className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                    >
                      <option value="">(none)</option>
                      {(groups || []).map(g => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-300 mb-1">Tags</label>
                    <select
                      multiple
                      value={Array.from(tagIds)}
                      onChange={onTagsChange}
                      className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                      size={Math.min(10, Math.max(6, tagOptions.length))}
                    >
                      {tagOptions.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <div className="text-xs text-zinc-500 mt-1">
                      Hold Ctrl / Cmd to select multiple.
                    </div>
                  </div>
                </div>

                {/* Right: Authors */}
                <div className="space-y-3">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-3 mt-5">
                    <div className="text-sm font-semibold text-zinc-200">Authors</div>
                    <div className="text-xs text-zinc-500 mt-1">
                      Primary author is first.{' '}
                      {canManageAuthors ? 'Use arrows to reorder.' : 'Author list is restricted.'}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <select
                        value={authorToAdd}
                        onChange={e => setAuthorToAdd(e.target.value)}
                        disabled={!canManageAuthors}
                        className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 disabled:opacity-60"
                      >
                        <option value="">Add author…</option>
                        {availableAuthors.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.display_name} ({p.id.slice(0, 8)}…)
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={addAuthor}
                        disabled={!canManageAuthors}
                        className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>

                    <div className="mt-3 space-y-2">
                      {authorIds.length === 0 ? (
                        <div className="text-xs text-zinc-500">No authors selected.</div>
                      ) : (
                        authorIds.map((pid, idx) => {
                          const p = profilesById.get(pid)
                          const name = p?.display_name || pid
                          const avatar = avatarPublicUrl(p?.avatar_path)

                          return (
                            <div
                              key={pid}
                              className="flex items-center justify-between gap-2 rounded-md border border-zinc-800 bg-zinc-950/40 px-2 py-2"
                            >
                              <div className="min-w-0 flex items-center gap-2">
                                {avatar ? (
                                  <img
                                    src={avatar}
                                    alt={name}
                                    className="h-7 w-7 rounded-full border border-zinc-700 object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="h-7 w-7 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center text-[11px] text-zinc-300">
                                    {initials(name)}
                                  </div>
                                )}

                                <div className="min-w-0">
                                  <div className="text-sm text-zinc-100 truncate">
                                    {idx === 0 ? (
                                      <span className="text-blue-200 font-semibold">{name}</span>
                                    ) : (
                                      name
                                    )}
                                  </div>
                                  <div className="text-[11px] text-zinc-500 truncate">
                                    {idx === 0 ? 'Primary author' : 'Co-author'} • {pid}
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => moveAuthor(pid, 'up')}
                                  disabled={!canManageAuthors || idx === 0}
                                  className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 hover:bg-zinc-800 disabled:opacity-40"
                                  title="Move up"
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveAuthor(pid, 'down')}
                                  disabled={!canManageAuthors || idx === authorIds.length - 1}
                                  className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 hover:bg-zinc-800 disabled:opacity-40"
                                  title="Move down"
                                >
                                  ↓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeAuthor(pid)}
                                  disabled={!canManageAuthors}
                                  className="rounded border border-red-900/60 bg-red-950/30 px-2 py-1 text-xs text-red-200 hover:bg-red-950/50 disabled:opacity-40"
                                  title="Remove author"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* MDX Editor */}
          <div className="mt-6">
            <div className="flex items-end justify-between gap-3 mb-2">
              <div>
                <div className="text-sm font-semibold text-zinc-200">Body (MDX)</div>
                <div className="text-xs text-zinc-500">
                  You can reference cards like <code>[[PDB-010]]</code>.
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 overflow-hidden bg-zinc-950/40">
              <MonacoEditor
                height="65vh"
                defaultLanguage="markdown"
                value={body}
                onChange={v => setBody(v ?? '')}
                options={{
                  wordWrap: 'on',
                  minimap: { enabled: false },
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
