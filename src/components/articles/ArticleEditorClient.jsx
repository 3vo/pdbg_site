'use client'

import { useState, useMemo, useTransition } from 'react'
import dynamic from 'next/dynamic'

const Monaco = dynamic(() => import('@monaco-editor/react'), { ssr: false })

export default function ArticleEditorClient({ initialArticle, allTags, onSave, onPublish, onUnpublish }) {
  const [article, setArticle] = useState(initialArticle)
  const [isPending, startTransition] = useTransition()

  const selectedTagIds = useMemo(
    () => new Set((article.tags || []).map(t => t.id)),
    [article.tags]
  )

  function toggleTag(tag) {
    setArticle(prev => {
      const has = selectedTagIds.has(tag.id)
      const nextTags = has
        ? (prev.tags || []).filter(t => t.id !== tag.id)
        : [...(prev.tags || []), tag]
      return { ...prev, tags: nextTags }
    })
  }

  function save() {
    startTransition(() => onSave(article))
  }

  return (
    <div className="space-y-4">
      {/* Title / slug / excerpt */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
          value={article.title || ''}
          onChange={e => setArticle(a => ({ ...a, title: e.target.value }))}
          placeholder="Title"
        />
        <input
          className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
          value={article.slug || ''}
          onChange={e => setArticle(a => ({ ...a, slug: e.target.value }))}
          placeholder="Slug"
        />
      </div>

      <textarea
        className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
        rows={3}
        value={article.excerpt || ''}
        onChange={e => setArticle(a => ({ ...a, excerpt: e.target.value }))}
        placeholder="Excerpt (optional)"
      />

      {/* Tags */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3">
        <div className="text-sm text-zinc-200 mb-2">Tags</div>
        <div className="flex flex-wrap gap-2">
          {allTags.map(tag => {
            const active = selectedTagIds.has(tag.id)
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  active
                    ? 'border-blue-500 bg-blue-500/20 text-zinc-100'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                }`}
              >
                {tag.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Monaco */}
      <div className="rounded-lg border border-zinc-700 overflow-hidden">
        <Monaco
          height="70vh"
          language="markdown"
          theme="vs-dark"
          value={article.body_mdx || ''}
          onChange={v => setArticle(a => ({ ...a, body_mdx: v ?? '' }))}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
          }}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="rounded bg-zinc-800 px-4 py-2 text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
        >
          Save
        </button>

        {article.status !== 'published' ? (
          <button
            type="button"
            onClick={() => startTransition(() => onPublish(article))}
            disabled={isPending}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
          >
            Publish
          </button>
        ) : (
          <button
            type="button"
            onClick={() => startTransition(() => onUnpublish(article))}
            disabled={isPending}
            className="rounded bg-zinc-800 px-4 py-2 text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
          >
            Unpublish
          </button>
        )}
      </div>
    </div>
  )
}
