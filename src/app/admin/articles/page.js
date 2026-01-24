import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AdminArticlesFilters from './AdminArticlesFilters'

export default async function AdminArticlesPage({ searchParams }) {
  const sp = (await searchParams) || {}

  const q = String(sp.q || '').trim()
  const status = String(sp.status || '').trim() // '', 'draft', 'published'

  const supabase = await createClient()

  // Identify current user + role
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If no user, show nothing (you may already redirect in middleware)
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="w-full mx-auto max-w-[140rem] px-4 md:px-6 pb-10">
          <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900 p-4 md:p-6">
            <div className="text-sm text-zinc-400">You must be signed in to view admin pages.</div>
          </div>
        </div>
      </div>
    )
  }

  const { data: editorRow } = await supabase
    .from('article_editors')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  const role = String(editorRow?.role || '').toLowerCase() // 'author' | 'editor' | 'admin' | ''

  // Base query
  let query = supabase
    .from('articles')
    .select('id, slug, title, excerpt, status, published_at, updated_at, created_at')
    .order('updated_at', { ascending: false })

  // Author role: only articles where this user is listed in article_authors
  // (including multi-author articles)
  if (role === 'author') {
    query = supabase
      .from('articles')
      .select(
        'id, slug, title, excerpt, status, published_at, updated_at, created_at, article_authors!inner(profile_id)'
      )
      .eq('article_authors.profile_id', user.id)
      .order('updated_at', { ascending: false })
  }

  if (status === 'draft' || status === 'published') query = query.eq('status', status)

  if (q) {
    query = query.or(`title.ilike.%${q}%,slug.ilike.%${q}%,excerpt.ilike.%${q}%`)
  }

  const { data, error } = await query
  if (error) throw error

  // Strip join field so the rendering stays consistent
  const articles = (data || []).map(a => {
    // eslint-disable-next-line no-unused-vars
    const { article_authors, ...rest } = a
    return rest
  })

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="w-full mx-auto max-w-[140rem] px-4 md:px-6 pb-10">
        <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900 p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">Articles</div>
              <div className="text-sm text-zinc-400 mt-1">Create and manage articles.</div>

              <div className="text-xs text-zinc-500 mt-1">
                Role: <span className="text-zinc-300">{role || 'unknown'}</span>
              </div>
            </div>

            <Link
              href="/admin/articles/new"
              className="inline-flex items-center justify-center rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700"
            >
              + New article
            </Link>
          </div>

          {/* Filters (live) */}
          <AdminArticlesFilters initialQ={q} initialStatus={status} />

          {/* List */}
          <div className="mt-6 space-y-3">
            {articles.length === 0 ? (
              <div className="text-sm text-zinc-400">No articles found.</div>
            ) : (
              articles.map(a => (
                <Link
                  key={a.id}
                  href={`/admin/articles/${a.id}`}
                  className="block rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-3 hover:border-blue-500 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{a.title}</div>

                      <div className="text-xs text-zinc-500 mt-1">
                        <span
                          className={a.status === 'published' ? 'text-green-300' : 'text-yellow-300'}
                        >
                          {a.status}
                        </span>
                        {' • '}
                        Updated {new Date(a.updated_at).toLocaleString()}
                        {a.published_at ? (
                          <span className="text-zinc-500">
                            {' '}
                            • Published {new Date(a.published_at).toLocaleDateString()}
                          </span>
                        ) : null}
                      </div>

                      {a.excerpt ? (
                        <div className="text-sm text-zinc-300 mt-2 line-clamp-2">{a.excerpt}</div>
                      ) : null}

                      <div className="text-xs text-zinc-500 mt-2 truncate">
                        slug: <span className="text-zinc-300">{a.slug}</span>
                      </div>
                    </div>

                    <div className="shrink-0 text-sm text-zinc-300">Edit →</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
