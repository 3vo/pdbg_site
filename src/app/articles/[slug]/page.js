import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SiteBanner from '@/components/SiteBanner'
import ArticleBody from './ArticleBody'
import { avatarPublicUrl } from '@/lib/avatars'

function sortAuthors(article) {
  const rows = Array.isArray(article?.article_authors) ? article.article_authors : []
  return rows
    .slice()
    .sort((a, b) => (a?.position ?? 999999) - (b?.position ?? 999999))
    .map(r => r?.profile)
    .filter(Boolean)
}

export default async function ArticlePage({ params, searchParams }) {
  const { slug } = await params

  const sp =
    searchParams && typeof searchParams.then === 'function' ? await searchParams : searchParams

  const listFrom = typeof sp?.from === 'string' ? sp.from.trim() : ''

  const supabase = await createClient()

  const { data: article, error } = await supabase
    .from('articles')
    .select(
      `
      id, slug, title, excerpt, body_mdx, status, published_at,
      group:article_groups(id, slug, name),
      article_tags:article_tags(tag:tags(id, slug, name)),
      article_authors:article_authors(position, profile:profiles(id, slug, display_name, avatar_path))
    `
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (error) throw error
  if (!article) return notFound()

  const tags = (article.article_tags || []).map(at => at.tag).filter(Boolean) || []
  const authors = sortAuthors(article)

  const backToArticlesHref = listFrom ? `/articles?${listFrom}` : '/articles'

  const articlePathForCards = listFrom
    ? `/articles/${encodeURIComponent(article.slug)}?from=${encodeURIComponent(listFrom)}`
    : `/articles/${encodeURIComponent(article.slug)}`

  const shown = authors.slice(0, 6)
  const remaining = Math.max(0, authors.length - shown.length)

  const groupHref = article.group?.slug
    ? `/articles?group=${encodeURIComponent(article.group.slug)}`
    : ''

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="w-full mx-auto max-w-[140rem] px-4 md:px-6 pb-10">
        <SiteBanner />

        <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900 p-4 md:p-6">
          <div className="mb-4">
            <Link
              href={backToArticlesHref}
              className="inline-flex items-center text-sm text-blue-300 hover:text-blue-200"
            >
              ← Back to articles
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-2xl font-semibold">{article.title}</div>

            <div className="text-sm text-zinc-400 flex flex-wrap items-center gap-x-2 gap-y-1">
              {article.group?.name ? (
                <Link
                  href={groupHref}
                  className="text-zinc-200 hover:text-white underline underline-offset-4 decoration-zinc-500 hover:decoration-zinc-300 transition"
                  title={`Filter by group: ${article.group.name}`}
                >
                  {article.group.name}
                </Link>
              ) : null}

              {article.published_at ? (
                <>
                  {article.group?.name ? ' • ' : ''}
                  {new Date(article.published_at).toLocaleDateString()}
                </>
              ) : null}

              {authors.length > 0 ? (
                <>
                  <span className="text-zinc-600">•</span>

                  {/* Author chips */}
                  <span className="inline-flex flex-wrap items-center gap-2 min-w-0">
                    {shown.map(p => {
                      const name = String(p.display_name || '').trim()+'  '|| 'Unknown'
                      const url = avatarPublicUrl(p.avatar_path)
                      const authorHref = `/authors/${encodeURIComponent(p.slug || p.id)}`

                      return (
                        <Link
                          key={p.id}
                          href={authorHref}
                          className="inline-flex items-center gap-2.5 rounded-full border border-zinc-800 bg-zinc-950/30 px-3 py-1.5 hover:border-zinc-600 transition"
                          title={`Author: ${name}`}
                        >
                          {url ? (
                            <img
                              src={url}
                              crossOrigin="anonymous"
                              alt={name}
                              className="h-7 w-7 rounded-full border border-zinc-800 object-cover bg-zinc-900"
                              loading="lazy"
                            />
                          ) : (
                            <span
                              className="h-7 w-7 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center text-[11px] text-zinc-300"
                              aria-label={name}
                            >
                              {name.slice(0, 1).toUpperCase()}
                            </span>
                          )}

                          <span className="max-w-[14rem] truncate text-[15px] font-medium text-zinc-200 hover:text-white">
                            {name}
                          </span>
                        </Link>
                      )
                    })}

                    {remaining > 0 ? (
                      <span
                        className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-[11px] text-zinc-300"
                        title={authors
                          .slice(shown.length)
                          .map(p => p.display_name)
                          .filter(Boolean)
                          .join(', ')}
                      >
                        +{remaining}
                      </span>
                    ) : null}
                  </span>
                </>
              ) : null}
            </div>

            {tags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map(t => (
                  <Link
                    key={t.id}
                    href={`/articles?tag=${encodeURIComponent(t.slug)}`}
                    className="text-xs rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-200 hover:border-blue-500 hover:bg-zinc-900/70 transition"
                    title={`Filter by tag: ${t.name}`}
                  >
                    {t.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            <ArticleBody mdx={article.body_mdx || ''} fromPath={articlePathForCards} />
          </div>
        </div>
      </div>
    </div>
  )
}
