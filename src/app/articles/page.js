import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SiteBanner from '@/components/SiteBanner'
import ArticlesFilters from './ArticlesFilters'
import { avatarPublicUrl } from '@/lib/avatars'

function sortAuthors(article) {
  const rows = Array.isArray(article?.article_authors) ? article.article_authors : []
  return rows
    .slice()
    .sort((a, b) => (a?.position ?? 999999) - (b?.position ?? 999999))
    .map(r => r?.profile)
    .filter(Boolean)
}

function normalizeSort(sp) {
  const raw = String(sp?.sort || 'date_asc').trim().toLowerCase()
  return raw === 'date_desc' ? 'date_desc' : 'date_asc'
}

export default async function ArticlesPage({ searchParams }) {
  const supabase = await createClient()

  const sp =
    searchParams && typeof searchParams.then === 'function' ? await searchParams : searchParams

  const q = (sp?.q || '').toString().trim()
  const tagSlug = (sp?.tag || '').toString().trim()
  const groupSlug = (sp?.group || '').toString().trim()

  const sort = normalizeSort(sp)
  const authorParam = (sp?.author || '').toString().trim() // author slug (preferred) or profile id

  const currentQueryString = new URLSearchParams(
    Object.entries(sp || {}).reduce((acc, [k, v]) => {
      if (typeof v === 'string') acc[k] = v
      else if (Array.isArray(v)) acc[k] = v.join(',')
      return acc
    }, {})
  ).toString()

  // Filters UI data
  const { data: groups } = await supabase
    .from('article_groups')
    .select('id, slug, name, sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  const { data: tags } = await supabase.from('tags').select('id, slug, name').order('name')

  // Authors list for filter UI (requires profiles.slug for vanity slugs)
  const { data: authorsList } = await supabase
    .from('profiles')
    .select('id, slug, display_name')
    .order('display_name', { ascending: true })

  // Resolve tagId and groupId
  let tagId = null
  if (tagSlug) {
    const { data } = await supabase.from('tags').select('id').eq('slug', tagSlug).maybeSingle()
    tagId = data?.id ?? null
  }

  let groupId = null
  if (groupSlug) {
    const { data } = await supabase
      .from('article_groups')
      .select('id')
      .eq('slug', groupSlug)
      .maybeSingle()
    groupId = data?.id ?? null
  }

  // Resolve author -> profile_id (prefer slug; allow direct uuid)
  let authorProfileId = null
  if (authorParam) {
    const maybeUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        authorParam
      )

    if (maybeUuid) {
      authorProfileId = authorParam
    } else {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('slug', authorParam)
        .maybeSingle()
      authorProfileId = data?.id ?? null
    }
  }

  // If tag filter is set, get matching article IDs
  let articleIdsForTag = null
  if (tagId) {
    const { data } = await supabase.from('article_tags').select('article_id').eq('tag_id', tagId)
    articleIdsForTag = (data || []).map(r => r.article_id)
    if (articleIdsForTag.length === 0) articleIdsForTag = []
  }

  // If author filter is set, get matching article IDs (via join table)
  let articleIdsForAuthor = null
  if (authorProfileId) {
    const { data } = await supabase
      .from('article_authors')
      .select('article_id')
      .eq('profile_id', authorProfileId)

    articleIdsForAuthor = (data || []).map(r => r.article_id)
    if (articleIdsForAuthor.length === 0) articleIdsForAuthor = []
  }

  let query = supabase
    .from('articles')
    .select(
      `
      id, slug, title, excerpt, published_at,
      article_authors:article_authors(position, profile:profiles(id, slug, display_name, avatar_path)),
      group_id, group:article_groups(id, slug, name, sort_order),
      article_tags:article_tags(tag:tags(id, slug, name))
    `
    )
    .eq('status', 'published')
    // default fetch order (we'll sort in JS for date_asc)
    .order('published_at', { ascending: false, nullsFirst: false })
    // nested author rows ordered
    .order('position', { foreignTable: 'article_authors', ascending: true })

  if (q) query = query.or(`title.ilike.%${q}%,slug.ilike.%${q}%,excerpt.ilike.%${q}%`)
  if (groupId) query = query.eq('group_id', groupId)
  if (articleIdsForTag) query = query.in('id', articleIdsForTag)
  if (articleIdsForAuthor) query = query.in('id', articleIdsForAuthor)

  const { data: articles, error } = await query
  if (error) throw error

  // Sorting (date only):
  // - date_desc/date_asc: by published_at
  const sorted = (articles || []).slice().sort((a, b) => {
    const ap = a.published_at ? new Date(a.published_at).getTime() : 0
    const bp = b.published_at ? new Date(b.published_at).getTime() : 0
    return sort === 'date_asc' ? ap - bp : bp - ap
  })

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="w-full mx-auto max-w-[140rem] px-4 md:px-6 pb-10">
        <SiteBanner />

        <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900 p-4 md:p-6">
          <div className="flex flex-col gap-2">
            <div className="text-lg font-semibold">Articles</div>
            <div className="text-sm text-zinc-400">News, Strategy, and More</div>
          </div>

          <ArticlesFilters
            initialQ={q}
            initialGroup={groupSlug}
            initialTag={tagSlug}
            initialSort={sort}
            initialAuthor={authorParam}
            groups={groups || []}
            tags={tags || []}
            authors={authorsList || []}
          />

          <div className="mt-6 space-y-3">
            {sorted.length === 0 ? (
              <div className="text-sm text-zinc-400">No published articles found.</div>
            ) : (
              sorted.map(a => {
                const authors = sortAuthors(a)
                const href = currentQueryString
                  ? `/articles/${encodeURIComponent(a.slug)}?from=${encodeURIComponent(
                      currentQueryString
                    )}`
                  : `/articles/${encodeURIComponent(a.slug)}`

                // ✅ Interleaved author display: (avatar + name) chips
                const shown = authors.slice(0, 3)
                const remaining = Math.max(0, authors.length - shown.length)
                const remainingNames = authors
                  .slice(shown.length)
                  .map(p => String(p?.display_name || '').trim())
                  .filter(Boolean)
                  .join(', ')

                return (
                  <Link
                    key={a.id}
                    href={href}
                    className="block rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-3 hover:border-blue-500 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-semibold text-lg truncate">{a.title}</div>

                        <div className="text-sm text-zinc-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          {a.group?.name ? <span>{a.group.name}</span> : null}
                          {a.published_at ? (
                            <>
                              {a.group?.name ? ' • ' : ''}
                              <span>{new Date(a.published_at).toLocaleDateString()}</span>
                            </>
                          ) : null}

                          {authors.length > 0 ? (
                            <>
                              <span className="text-zinc-600">•</span>

                              <span className="inline-flex items-center gap-2 min-w-0 flex-wrap">
                                {shown.map(p => {
                                  const name = String(p?.display_name || '').trim()+('  ') || 'Unknown'
                                  const url = avatarPublicUrl(p?.avatar_path)

                                  return (
                                    <span
                                      key={p.id}
                                      className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/30 px-2 py-1"
                                      title={name}
                                    >
                                      {url ? (
                                        <img
                                          src={url}
                                          crossOrigin="anonymous"
                                          alt={name}
                                          className="h-6 w-6 rounded-full border border-zinc-800 object-cover bg-zinc-900"
                                          loading="lazy"
                                        />
                                      ) : (
                                        <span className="h-6 w-6 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center text-[10px] text-zinc-300">
                                          {name.slice(0, 1).toUpperCase()}
                                        </span>
                                      )}

                                      <span className="max-w-[12rem] truncate text-base font-medium text-zinc-200">
                                        {name}
                                      </span>
                                    </span>
                                  )
                                })}

                                {remaining > 0 ? (
                                  <span
                                    className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300"
                                    title={remainingNames}
                                  >
                                    +{remaining}
                                  </span>
                                ) : null}
                              </span>
                            </>
                          ) : null}
                        </div>

                        {a.excerpt ? (
                          <div className="text-sm text-zinc-300 mt-2 line-clamp-2">{a.excerpt}</div>
                        ) : null}

                        <div className="mt-2 flex flex-wrap gap-2">
                          {(a.article_tags || [])
                            .map(at => at.tag)
                            .filter(Boolean)
                            .map(t => (
                              <span
                                key={t.id}
                                className="text-xs rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-200"
                              >
                                {t.name}
                              </span>
                            ))}
                        </div>
                      </div>

                      <div className="shrink-0 text-sm text-zinc-300">Read →</div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
