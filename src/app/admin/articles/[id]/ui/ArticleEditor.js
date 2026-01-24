'use client'

//src/app/admin/articles/[id]/ui/ArticleEditor.js

import { useMemo, useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  saveArticle,
  publishArticle,
  unpublishArticle,
  deleteArticle,
} from '@/app/admin/articles/actions'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

function joinTagNames(tags) {
  return (tags || []).map(t => t.name).join(', ')
}

export default function ArticleEditor({ article, allTags, groups, selectedTags }) {
  const [isPending, startTransition] = useTransition()

  const [title, setTitle] = useState(article.title || '')
  const [slug, setSlug] = useState(article.slug || '')
  const [excerpt, setExcerpt] = useState(article.excerpt || '')
  const [status, setStatus] = useState(article.status || 'draft')
  const [groupId, setGroupId] = useState(article.group_id || '')
  const [tagsText, setTagsText] = useState(joinTagNames(selectedTags))
  const [body, setBody] = useState(article.body_mdx || '')

  const knownTagsHint = useMemo(() => (allTags || []).map(t => t.name).slice(0, 12), [allTags])

  function onSave() {
    const fd = new FormData()
    fd.set('id', article.id)
    fd.set('title', title)
    fd.set('slug', slug)
    fd.set('excerpt', excerpt)
    fd.set('status', status)
    fd.set('group_id', groupId || '')
    fd.set('tags', tagsText)
    fd.set('body_mdx', body)

    startTransition(async () => {
      await saveArticle(fd)
    })
  }

  function onPublish() {
    startTransition(async () => {
      await publishArticle(article.id)
    })
  }

  function onUnpublish() {
    startTransition(async () => {
      await unpublishArticle(article.id)
    })
  }

  function onDelete() {
    const ok = confirm('Delete this article? This cannot be undone.')
    if (!ok) return
    startTransition(async () => {
      await deleteArticle(article.id)
    })
  }

  return (
    <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900 p-4 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-lg font-semibold truncate">{article.title}</div>
          <div className="text-xs text-zinc-400 mt-1">
            Status: <span className="text-zinc-200 font-semibold">{article.status}</span>
            {article.published_at ? (
              <>
                {' '}
                • Published {new Date(article.published_at).toLocaleString()}
              </>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 flex flex-wrap gap-2 justify-end">
          <Link
            href="/admin/articles"
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800"
          >
            Back
          </Link>

          <button
            onClick={onSave}
            disabled={isPending}
            className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700 disabled:opacity-60"
          >
            {isPending ? 'Saving…' : 'Save'}
          </button>

          {article.status === 'published' ? (
            <button
              onClick={onUnpublish}
              disabled={isPending}
              className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700 disabled:opacity-60"
            >
              Unpublish
            </button>
          ) : (
            <button
              onClick={onPublish}
              disabled={isPending}
              className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700 disabled:opacity-60"
            >
              Publish
            </button>
          )}

          <button
            onClick={onDelete}
            disabled={isPending}
            className="rounded border border-red-500/40 bg-zinc-900 px-3 py-2 text-sm text-red-300 hover:bg-zinc-800 disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Metadata form */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-zinc-300 mb-1">Title</label>
          <input
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-300 mb-1">Slug</label>
          <input
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            value={slug}
            onChange={e => setSlug(e.target.value)}
          />
          <div className="text-[11px] text-zinc-500 mt-1">Public URL: /articles/{slug}</div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs text-zinc-300 mb-1">Excerpt</label>
          <textarea
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            rows={3}
            value={excerpt}
            onChange={e => setExcerpt(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-300 mb-1">Status</label>
          <select
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-zinc-300 mb-1">Group</label>
          <select
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            value={groupId}
            onChange={e => setGroupId(e.target.value)}
          >
            <option value="">No group</option>
            {(groups || []).map(g => (
              <option key={g.id} value={g.id}>
                {g.name ?? g.slug ?? g.id}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs text-zinc-300 mb-1">
            Tags (comma-separated)
          </label>
          <input
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            value={tagsText}
            onChange={e => setTagsText(e.target.value)}
            placeholder="e.g. Strategy, Beginner, Drafting"
          />
          {!!knownTagsHint.length && (
            <div className="text-[11px] text-zinc-500 mt-1">
              Existing tags: {knownTagsHint.join(', ')}{allTags.length > 12 ? '…' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Monaco */}
      <div className="mt-6">
        <div className="flex items-end justify-between gap-3 mb-2">
          <div>
            <div className="text-sm font-semibold">Body (MDX)</div>
            <div className="text-xs text-zinc-400">
              Use Markdown + your card hover syntax later (we’ll add it in the public renderer).
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <MonacoEditor
            height="70vh"
            defaultLanguage="markdown"
            value={body}
            onChange={v => setBody(v ?? '')}
            theme="vs-dark"
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
  )
}
