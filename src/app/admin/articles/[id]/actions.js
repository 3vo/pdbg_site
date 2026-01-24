'use server'

// src/app/admin/articles/[id]/actions.js
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Role order: author < editor < admin
const ROLE_RANK = { author: 1, editor: 2, admin: 3 }

async function getEditorRole(supabase, userId) {
  const { data, error } = await supabase
    .from('article_editors')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data?.role || null
}

async function requireEditor(supabase, opts = {}) {
  const { minRole = 'author' } = opts

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) redirect('/login')

  const role = await getEditorRole(supabase, user.id)
  if (!role) redirect('/login')

  const rank = ROLE_RANK[role] || 0
  const need = ROLE_RANK[minRole] || 0
  if (rank < need) {
    // Don’t leak details — bounce to /admin/articles as a safe default
    redirect('/admin/articles')
  }

  return { user, role }
}

async function requireCanEditArticle(supabase, userId, articleId) {
  const { data, error } = await supabase
    .from('article_authors')
    .select('article_id')
    .eq('article_id', articleId)
    .eq('profile_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('You do not have permission to edit this article.')
}

function uniqStrings(arr) {
  const out = []
  const seen = new Set()
  for (const v of Array.isArray(arr) ? arr : []) {
    const s = String(v || '').trim()
    if (!s) continue
    if (seen.has(s)) continue
    seen.add(s)
    out.push(s)
  }
  return out
}

function sameMembers(a, b) {
  const A = new Set(a)
  const B = new Set(b)
  if (A.size !== B.size) return false
  for (const x of A) if (!B.has(x)) return false
  return true
}

async function getArticleSlugById(supabase, id) {
  const { data, error } = await supabase.from('articles').select('slug').eq('id', id).single()
  if (error) throw error
  return data?.slug || null
}

export async function createDraftArticleAction() {
  const supabase = await createClient()
  const { user } = await requireEditor(supabase, { minRole: 'author' })

  const { data, error } = await supabase
    .from('articles')
    .insert({
      title: 'Untitled Draft',
      slug: `draft-${Date.now()}`,
      excerpt: '',
      body_mdx: '# New Draft\n\nStart writing…',
      status: 'draft',
      group_id: null,
    })
    .select('id')
    .single()

  if (error) throw error

  // Ensure the creator is listed as an author on their own draft.
  const { error: aaErr } = await supabase.from('article_authors').insert({
    article_id: data.id,
    profile_id: user.id,
    position: 1,
    role: 'author',
  })

  if (aaErr) throw aaErr


  redirect(`/admin/articles/${data.id}`)
}

export async function updateArticleAction(payload) {
  const supabase = await createClient()
  const { user, role } = await requireEditor(supabase, { minRole: 'author' })

  const {
    id,
    title,
    slug,
    excerpt,
    body_mdx,
    group_id,
    tag_ids = [],
    author_ids = [],
  } = payload || {}

  if (!id) throw new Error('Missing article id')
  if (!title?.trim()) throw new Error('Title is required')
  if (!slug?.trim()) throw new Error('Slug is required')

  // Author can only edit articles they are listed on.
  if (role === 'author') {
    await requireCanEditArticle(supabase, user.id, id)
  }

  // Load existing state (needed for permission checks + safe comparisons)
  const [{ data: existingAuthors, error: existingAuthorsErr }, { data: existingTags, error: existingTagsErr }, { data: existingArticle, error: existingArticleErr }] =
    await Promise.all([
      supabase
        .from('article_authors')
        .select('profile_id, position')
        .eq('article_id', id)
        .order('position', { ascending: true }),
      supabase.from('article_tags').select('tag_id').eq('article_id', id),
      supabase.from('articles').select('group_id').eq('id', id).single(),
    ])

  if (existingAuthorsErr) throw existingAuthorsErr
  if (existingTagsErr) throw existingTagsErr
  if (existingArticleErr) throw existingArticleErr

  const existingAuthorIds = (existingAuthors || []).map(r => r.profile_id).filter(Boolean)
  const existingTagIds = (existingTags || []).map(r => r.tag_id).filter(Boolean)

  const nextTagIds = uniqStrings(tag_ids)
  const nextAuthorIds = uniqStrings(author_ids)

  if (role === 'author') {
    // Authors cannot change group
    const existingGroupId = existingArticle?.group_id || null
    const incomingGroupId = group_id || null
    if (incomingGroupId !== existingGroupId) {
      throw new Error('Not permitted: authors cannot change an article’s group.')
    }

    // Authors cannot change tags
    if (nextTagIds.length && !sameMembers(nextTagIds, existingTagIds)) {
      throw new Error('Not permitted: authors cannot change an article’s tags.')
    }

    // Authors cannot add/remove/reorder authors (and also: cannot touch article_authors at all)
    // If the client sends author_ids, it must be the exact same ordered list (or empty).
    if (nextAuthorIds.length > 0) {
      const sameOrder =
        nextAuthorIds.length === existingAuthorIds.length &&
        nextAuthorIds.every((v, i) => v === existingAuthorIds[i])

      if (!sameOrder) {
        throw new Error('Not permitted: authors cannot change the author list.')
      }
    }

    // Also ensure the author is listed (defensive)
    if (!existingAuthorIds.includes(user.id)) {
      throw new Error('You do not have permission to edit this article.')
    }
  } else {
    // editor/admin: require at least one author if author_ids was provided
    if (Array.isArray(author_ids) && author_ids.length > 0 && nextAuthorIds.length === 0) {
      throw new Error('An article must have at least one author.')
    }
  }

  // --- Update article fields ---
  // Authors can still update body/title/slug/excerpt.
  const { error: updateErr } = await supabase
    .from('articles')
    .update({
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt ?? null,
      body_mdx: body_mdx ?? '',
      // group_id only applied for editor/admin (authors already validated it matches)
      group_id: role === 'author' ? existingArticle?.group_id ?? null : group_id || null,
    })
    .eq('id', id)

  if (updateErr) throw updateErr

  // --- Tags ---
  // Editors/admins can replace. Authors cannot change tags, so do nothing.
  if (role !== 'author') {
    await supabase.from('article_tags').delete().eq('article_id', id)

    if (nextTagIds.length) {
      const { error: tagInsertErr } = await supabase.from('article_tags').insert(
        nextTagIds.map(tag_id => ({
          article_id: id,
          tag_id,
        }))
      )
      if (tagInsertErr) throw tagInsertErr
    }
  }

  // --- Authors ---
  // Editors/admins can replace. Authors cannot change authors, so do nothing.
  if (role !== 'author' && Array.isArray(author_ids) && nextAuthorIds.length) {
    await supabase.from('article_authors').delete().eq('article_id', id)

    const { error: authorsInsertErr } = await supabase.from('article_authors').insert(
      nextAuthorIds.map((profile_id, idx) => ({
        article_id: id,
        profile_id,
        position: idx + 1,
        role: 'author',
      }))
    )
    if (authorsInsertErr) throw authorsInsertErr
  }

  revalidatePath('/admin/articles')
  revalidatePath(`/admin/articles/${id}`)
  revalidatePath('/articles')

  return { ok: true }
}


export async function publishArticleAction({ id }) {
  const supabase = await createClient()
  await requireEditor(supabase, { minRole: 'editor' })

  const slug = await getArticleSlugById(supabase, id)

  const { error } = await supabase
    .from('articles')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw error

  revalidatePath('/admin/articles')
  revalidatePath('/articles')
  if (slug) revalidatePath(`/articles/${slug}`)

  return { ok: true }
}

export async function unpublishArticleAction({ id }) {
  const supabase = await createClient()
  await requireEditor(supabase, { minRole: 'editor' })

  const slug = await getArticleSlugById(supabase, id)

  const { error } = await supabase
    .from('articles')
    .update({
      status: 'draft',
      published_at: null,
    })
    .eq('id', id)

  if (error) throw error

  revalidatePath('/admin/articles')
  revalidatePath('/articles')
  if (slug) revalidatePath(`/articles/${slug}`)

  return { ok: true }
}

// -------------------------
// Fetching (server)
// -------------------------

export async function getEditorArticlesAction() {
  const supabase = await createClient()
  const { user, role } = await requireEditor(supabase, { minRole: 'author' })

  const authorsJoin =
    role === 'author'
      ? 'article_authors!inner(profile_id, position, profiles(id, display_name, slug))'
      : 'article_authors(profile_id, position, profiles(id, display_name, slug))'

  let query = supabase
    .from('articles')
    .select(
      `
      id,
      title,
      slug,
      status,
      published_at,
      updated_at,
      created_at,
      created_by,
      group_id,
      article_groups(id, name, slug),
      ${authorsJoin}
    `
    )
    .order('updated_at', { ascending: false })

  if (role === 'author') {
    query = query.eq('article_authors.profile_id', user.id)
  }

  const { data, error } = await query
  if (error) throw error

  return data || []
}

export async function getEditorArticleAction(id) {
  const supabase = await createClient()
  const { user, role } = await requireEditor(supabase, { minRole: 'author' })

  if (role === 'author') {
    await requireCanEditArticle(supabase, user.id, id)
  }

  const { data, error } = await supabase
    .from('articles')
    .select(
      `
      id,
      title,
      slug,
      excerpt,
      body_mdx,
      status,
      published_at,
      group_id,
      updated_at,
      article_groups(id, name, slug),
      article_tags(tag_id),
      article_authors(profile_id, position, profiles(id, display_name, slug))
    `
    )
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}
