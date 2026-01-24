//src/app/admin/articles/actions.js

'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

async function requireEditor(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data: editorRow } = await supabase
    .from('article_editors')
    .select('user_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!editorRow) throw new Error('Not authorized')

  return { user, editorRow }
}

async function uniqueSlug(supabase, desiredSlug) {
  const base = slugify(desiredSlug)
  if (!base) return 'article'

  // Check if base exists
  const { data: hit } = await supabase.from('articles').select('id').eq('slug', base).maybeSingle()
  if (!hit) return base

  // Find first free suffix
  for (let i = 2; i < 500; i++) {
    const candidate = `${base}-${i}`
    const { data } = await supabase
      .from('articles')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()
    if (!data) return candidate
  }

  // Extremely unlikely fallback
  return `${base}-${Date.now()}`
}

export async function createArticleAction(formData) {
  const supabase = await createClient()
  const { user } = await requireEditor(supabase)

  const title = String(formData.get('title') || '').trim()
  const excerpt = String(formData.get('excerpt') || '').trim() || null
  const body_mdx = String(formData.get('body_mdx') || '').trim()
  const group_id = String(formData.get('group_id') || '').trim() || null

  // tags[] comes in multiple values
  const tags = formData.getAll('tags').map(String).filter(Boolean)

  if (!title) throw new Error('Title is required')
  if (!body_mdx) throw new Error('Body (MDX) is required')

  const slug = await uniqueSlug(supabase, title)

  const { data: inserted, error } = await supabase
    .from('articles')
    .insert({
      slug,
      title,
      excerpt,
      body_mdx,
      group_id,
      created_by: user.id,
      status: 'draft',
      published_at: null,
    })
    .select('id')
    .single()

  if (error) throw error

  if (tags.length > 0) {
    const rows = tags.map(tag_id => ({ article_id: inserted.id, tag_id }))
    const { error: tagErr } = await supabase.from('article_tags').insert(rows)
    if (tagErr) throw tagErr
  }

  redirect(`/admin/articles/${inserted.id}`)
}

export async function updateArticleAction(articleId, payload) {
  const supabase = await createClient()
  await requireEditor(supabase)

  const title = String(payload.title || '').trim()
  const excerpt = String(payload.excerpt || '').trim() || null
  const body_mdx = String(payload.body_mdx || '').trim()
  const group_id = String(payload.group_id || '').trim() || null
  const tags = Array.isArray(payload.tags) ? payload.tags.map(String).filter(Boolean) : []

  if (!articleId) throw new Error('Missing article id')
  if (!title) throw new Error('Title is required')
  if (!body_mdx) throw new Error('Body (MDX) is required')

  // Update main article
  const { error: upErr } = await supabase
    .from('articles')
    .update({
      title,
      excerpt,
      body_mdx,
      group_id,
    })
    .eq('id', articleId)

  if (upErr) throw upErr

  // Replace tags (simple + reliable)
  const { error: delErr } = await supabase.from('article_tags').delete().eq('article_id', articleId)
  if (delErr) throw delErr

  if (tags.length > 0) {
    const rows = tags.map(tag_id => ({ article_id: articleId, tag_id }))
    const { error: insErr } = await supabase.from('article_tags').insert(rows)
    if (insErr) throw insErr
  }

  return { ok: true }
}

export async function publishArticleAction(articleId) {
  const supabase = await createClient()
  await requireEditor(supabase)

  const { error } = await supabase
    .from('articles')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', articleId)

  if (error) throw error
  return { ok: true }
}

export async function unpublishArticleAction(articleId) {
  const supabase = await createClient()
  await requireEditor(supabase)

  const { error } = await supabase
    .from('articles')
    .update({
      status: 'draft',
      published_at: null,
    })
    .eq('id', articleId)

  if (error) throw error
  return { ok: true }
}

export async function deleteArticleAction(articleId) {
  const supabase = await createClient()
  await requireEditor(supabase)

  // article_tags has ON DELETE CASCADE, so just delete article
  const { error } = await supabase.from('articles').delete().eq('id', articleId)
  if (error) throw error

  redirect('/admin/articles')
}
