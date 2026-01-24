import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SiteBanner from '@/components/SiteBanner'
import { avatarPublicUrl } from '@/lib/avatars'
import ArticleBody from '@/app/articles/[slug]/ArticleBody'


function isUuid(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(s || '')
  )
}

export default async function AuthorPage({ params }) {
  const { slug } = await params
  const raw = String(slug || '').trim()

  const supabase = await createClient()

  // 1) Load profile by vanity slug (preferred), or id fallback
  let profile = null

  if (raw) {
    const bySlug = await supabase
      .from('profiles')
      .select('id, slug, display_name, avatar_path, bio')
      .eq('slug', raw)
      .maybeSingle()

    if (bySlug.error) throw bySlug.error
    profile = bySlug.data || null

    if (!profile && isUuid(raw)) {
      const byId = await supabase
        .from('profiles')
        .select('id, slug, display_name, avatar_path, bio')
        .eq('id', raw)
        .maybeSingle()

      if (byId.error) throw byId.error
      profile = byId.data || null
    }
  }

  if (!profile) return notFound()

  // 2) Load published articles for this author
  const { data: rows, error } = await supabase
    .from('article_authors')
    .select(
      `
      position,
      articles:articles!inner(
        id, slug, title, excerpt, published_at, status,
        group:article_groups(id, slug, name)
      )
    `
    )
    .eq('profile_id', profile.id)
    .eq('articles.status', 'published')
    .order('published_at', { foreignTable: 'articles', ascending: false, nullsFirst: false })

  if (error) throw error

  const articles = (rows || []).map(r => r.articles).filter(Boolean)

  const avatarUrl = avatarPublicUrl(profile.avatar_path)
  const bio = String(profile.bio || '').trim()

  // For CardRef back-navigation from card pages
  const authorPathForCards = `/authors/${encodeURIComponent(profile.slug || profile.id)}`


  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="w-full mx-auto max-w-[80rem] px-4 md:px-6 pb-10">
        <SiteBanner />

        <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900 p-4 md:p-6">
          <div className="mb-4">
            <Link
              href="/articles"
              className="inline-flex items-center text-sm text-blue-300 hover:text-blue-200"
            >
              ← Back to articles
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={profile.display_name}
                className="h-14 w-14 rounded-full border border-zinc-800 object-cover bg-zinc-950"
                loading="lazy"
              />
            ) : (
              <div className="h-14 w-14 rounded-full border border-zinc-800 bg-zinc-950 flex items-center justify-center text-xl text-zinc-300">
                {String(profile.display_name || '?').trim().slice(0, 1).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <div className="text-2xl font-semibold truncate">{profile.display_name}</div>
              <div className="text-sm text-zinc-400">Author profile</div>
            </div>
          </div>

          {/* Bio */}
		{bio ? (
		  <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/30 p-4">
		    <div className="text-xs uppercase tracking-widest text-zinc-400 mb-2">Bio</div>
		    <ArticleBody mdx={bio} fromPath={authorPathForCards} />
		  </div>
		) : null}


          <div className="mt-6">
            <div className="text-sm font-semibold text-zinc-100">Articles</div>
            <div className="mt-3 space-y-3">
              {articles.length === 0 ? (
                <div className="text-sm text-zinc-400">No published articles yet.</div>
              ) : (
                articles.map(a => (
                  <Link
                    key={a.id}
                    href={`/articles/${encodeURIComponent(a.slug)}`}
                    className="block rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-3 hover:border-blue-500 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{a.title}</div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {a.group?.name ? <span>{a.group.name}</span> : null}
                          {a.published_at ? (
                            <>
                              {a.group?.name ? ' • ' : ''}
                              {new Date(a.published_at).toLocaleDateString()}
                            </>
                          ) : null}
                        </div>
                        {a.excerpt ? (
                          <div className="text-sm text-zinc-300 mt-2 line-clamp-2">{a.excerpt}</div>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-sm text-zinc-300">Read →</div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
