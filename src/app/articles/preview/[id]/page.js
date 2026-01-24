import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SiteBanner from '@/components/SiteBanner'
import ArticleBody from '../../[slug]/ArticleBody'

export default async function ArticlePreviewPage({ params }) {
  const { id } = await params
  if (!id) return notFound()

  const supabase = await createClient()

  // Must be logged in
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) redirect('/login')

  // Must be in allow-list (article_editors)
  const { data: editorRow, error: editorErr } = await supabase
    .from('article_editors')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (editorErr || !editorRow) redirect('/login')

  // Load article by ID (ANY status)
  const { data: article, error } = await supabase
    .from('articles')
    .select(
      `
      id, slug, title, excerpt, body_mdx, status, published_at,
      group:article_groups(id, slug, name),
      article_tags:article_tags(tag:tags(id, slug, name))
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!article) return notFound()

  const tags =
    (article.article_tags || [])
      .map(at => at.tag)
      .filter(Boolean) || []

  const from = `/articles/preview/${encodeURIComponent(article.id)}`

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="w-full mx-auto max-w-[140rem] px-4 md:px-6 pb-10">
        <SiteBanner />
		<div className="mt-4">
		  <a
		    href={`/admin/articles/${encodeURIComponent(article.id)}`}
		    className="text-sm text-blue-300 hover:text-blue-200"
		  >
		    ← Back to editor
		  </a>
		</div>

        <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900 p-4 md:p-6">
          <div className="flex flex-col gap-2">
            <div className="text-2xl font-semibold">{article.title}</div>

            <div className="text-sm text-zinc-400">
              <span
                className={
                  article.status === 'published' ? 'text-green-300' : 'text-yellow-300'
                }
              >
                {article.status}
              </span>

              {article.group?.name ? (
                <>
                  {' '}
                  • <span>{article.group.name}</span>
                </>
              ) : null}

              {article.published_at ? (
                <>
                  {' '}
                  • {new Date(article.published_at).toLocaleDateString()}
                </>
              ) : null}
            </div>

            {tags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map(t => (
                  <span
                    key={t.id}
                    className="text-xs rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-200"
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {/* Body */}
          <div className="mt-6">
            <ArticleBody mdx={article.body_mdx || ''} from={from} />
          </div>
        </div>
      </div>
    </div>
  )
}
