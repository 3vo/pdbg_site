import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ArticleEditorClient from './ArticleEditorClient'

export default async function AdminArticleEditPage({ params }) {
  const { id } = await params
  const supabase = await createClient()

  // ✅ Current user + role
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const userId = user?.id || null

  // If you want to hard-require auth here, you can redirect instead.
  // For now, we'll just show a small message.
  if (!userId) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="w-full mx-auto max-w-3xl px-4 md:px-6 pb-10">
          <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900 p-4 md:p-6">
            <div className="text-lg font-semibold">Not signed in</div>
            <div className="text-sm text-zinc-400 mt-1">
              Please sign in to edit articles.
            </div>
            <div className="mt-4">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700"
              >
                Go to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { data: editorRow } = await supabase
    .from('article_editors')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()

  const editorRole = editorRow?.role || null // 'author' | 'editor' | 'admin' | null

  // ✅ If role is author, ensure they're an author of this article (prevents editing others)
  if (editorRole === 'author') {
    const { data: membership, error: membershipErr } = await supabase
      .from('article_authors')
      .select('profile_id')
      .eq('article_id', id)
      .eq('profile_id', userId)
      .maybeSingle()

    // If RLS blocks this query, you'll get an error — treat it as "not permitted"
    if (membershipErr || !membership) {
      return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100">
          <div className="w-full mx-auto max-w-3xl px-4 md:px-6 pb-10">
            <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900 p-4 md:p-6">
              <div className="text-lg font-semibold">Not permitted</div>
              <div className="text-sm text-zinc-400 mt-1">
                You can only edit articles where you are listed as an author.
              </div>
              <div className="mt-4">
                <Link
                  href="/admin/articles"
                  className="inline-flex items-center justify-center rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700"
                >
                  ← Back to Articles
                </Link>
              </div>
            </div>
          </div>
        </div>
      )
    }
  }

  // Load article
  const { data: article, error: articleErr } = await supabase
    .from('articles')
    .select('id, slug, title, excerpt, body_mdx, status, published_at, group_id, updated_at')
    .eq('id', id)
    .single()

  if (articleErr) throw articleErr

  // Load groups/tags for pickers
  const { data: groups } = await supabase
    .from('article_groups')
    .select('id, slug, name, sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  const { data: tags } = await supabase.from('tags').select('id, slug, name').order('name')

  // Load selected tags
  const { data: articleTags } = await supabase
    .from('article_tags')
    .select('tag_id')
    .eq('article_id', id)

  const selectedTagIds = (articleTags || []).map(r => r.tag_id)

  // Profiles for author picker
  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_path')
    .order('display_name', { ascending: true })

  if (profilesErr) throw profilesErr

  // Existing authors (ordered)
  const { data: articleAuthors, error: authorsErr } = await supabase
    .from('article_authors')
    .select('profile_id, position')
    .eq('article_id', id)
    .order('position', { ascending: true })

  if (authorsErr) throw authorsErr

  const initialAuthorIds = (articleAuthors || []).map(r => r.profile_id).filter(Boolean)

  return (
    <ArticleEditorClient
      article={article}
      groups={groups || []}
      tags={tags || []}
      selectedTagIds={selectedTagIds}
      profiles={profiles || []}
      initialAuthorIds={initialAuthorIds}
      editorRole={editorRole}
    />
  )
}
