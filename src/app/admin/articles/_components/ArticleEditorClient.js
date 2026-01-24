'use client'

import { useMemo, useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import {
  updateArticleAction,
  publishArticleAction,
  unpublishArticleAction,
  deleteArticleAction,
} from '../actions'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

export default function ArticleEditorClient({ article, groups, tags }) {
  const [title, setTitle] = useState(article?.title || '')
  const [excerpt, setExcerpt] = useState(article?.excerpt || '')
  const [groupId, setGroupId] = useState(article?.group_id || '')
  const [body, setBody] = useState(article?.body_mdx || '')

  const initialTagIds = useMemo(() => {
    const list = article?.article_tags || []
    return list.map(at => at.tag?.id).filter(Boolean)
  }, [article])

  const [selectedTags, setSelectedTags] = useState(new Set(initialTagIds))

  const [saving, startSaving] = useTransition()
  const [publishing, startPublishing] = useTransition()
  const [deleting, startDeleting] = useTransition()

  const [statusMsg, setStatusMsg] = useState('')

  function toggleTag(id) {
    setSelectedTags(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function onSave() {
    setStatusMsg('')
    startSaving(async () => {
      try {
        await updateArticleAction(article.id, {
          title,
          excerpt,
          group_id: groupId || null,
          body_mdx: body,
          tags: Array.from(selectedTags),
        })
        setStatusMsg('Saved.')
      } catch (e) {
        setStatusMsg(e?.message || 'Save failed.')
      }
    })
  }

  async function onPublishToggle() {
    setStatusMsg('')
    startPublishing(async () => {
      try {
        if (article.status === 'published') {
          await unpublishArticleAction(article.id)
          setStatusMsg('Unpublished.')
        } else {
          await publishArticleAction(article.id)
          setStatusMsg('Published.')
        }
        // We don’t auto-refresh here; easiest is to reload after publish/unpublish.
        // If you want auto-refresh, tell me and I’ll add router.refresh().
        window.location.reload()
      } catch (e) {
        setStatusMsg(e?.message || 'Publish toggle failed.')
      }
    })
  }

  async function onDelete() {
    const ok = window.confirm('Delete this article permanently? This cannot be undone.')
    if (!ok) return

    startDeleting(async () => {
      try {
        await deleteArticleAction(article.id)
      } catch (e) {
        setStatusMsg(e?.message || 'Delete failed.')
      }
    })
  }

  const isPublished = article.status === 'published'

  return (
    <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold">Edit Article</div>
          <div className="text-sm text-zinc-400 mt-1">
            Status:{' '}
            <span className={isPublished ? 'text-green-300' : 'text-yellow-300'}>
              {article.status}
            </span>
            {article.published_at ? (
              <span className="text-zinc-500"> • {new Date(article.published_at).toLocaleString()}</span>
            ) : null}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Slug: <span className="text-zinc-300">{article.slug}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onSave}
            disabled={saving}
            className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>

          <button
            onClick={onPublishToggle}
            disabled={publishing}
            className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
            title={isPublished ? 'Set back to draft' : 'Publish now'}
          >
            {publishing ? 'Working…' : isPublished ? 'Unpublish' : 'Publish'}
          </button>

          <a
            href={`/articles/${encodeURIComponent(article.slug)}`}
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800"
            target="_blank"
            rel="noreferrer"
          >
            View public →
          </a>

          <button
            onClick={onDelete}
            disabled={deleting}
            className="rounded border border-red-500/40 bg-zinc-900 px-3 py-2 text-sm text-red-200 hover:bg-zinc-800 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      {statusMsg ? <div className="mt-3 text-sm text-zinc-300">{statusMsg}</div> : null}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Title */}
        <div className="md:col-span-2">
          <label className="block text-xs text-zinc-400 mb-1">Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
          />
        </div>

        {/* Group */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Group</label>
          <select
            value={groupId || ''}
            onChange={e => setGroupId(e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="">(No group)</option>
            {(groups || []).map(g => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Excerpt */}
        <div className="md:col-span-3">
          <label className="block text-xs text-zinc-400 mb-1">Excerpt</label>
          <textarea
            value={excerpt}
            onChange={e => setExcerpt(e.target.value)}
            rows={3}
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            placeholder="Optional short summary used on the list page."
          />
        </div>
      </div>

      {/* Tags */}
      <div className="mt-6">
        <div className="text-sm font-semibold">Tags</div>
        <div className="text-xs text-zinc-400 mt-1">Click to toggle.</div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(tags || []).map(t => {
            const active = selectedTags.has(t.id)
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTag(t.id)}
                className={`text-xs rounded-full border px-2 py-1 transition ${
                  active
                    ? 'border-blue-500 bg-blue-500/10 text-zinc-100'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                }`}
                title={t.slug}
              >
                {t.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* MDX Body */}
      <div className="mt-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Body (MDX)</div>
            <div className="text-xs text-zinc-400 mt-1">
              Write MDX. (We’ll add card hover previews in the render step next.)
            </div>
          </div>

          <button
            onClick={onSave}
            disabled={saving}
            className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        <div className="mt-3 rounded-lg border border-zinc-800 overflow-hidden">
          <MonacoEditor
            height="520px"
            defaultLanguage="markdown"
            value={body}
            onChange={v => setBody(v ?? '')}
            options={{
              minimap: { enabled: false },
              wordWrap: 'on',
              fontSize: 14,
              scrollBeyondLastLine: false,
            }}
            theme="vs-dark"
          />
        </div>
      </div>
    </div>
  )
}
