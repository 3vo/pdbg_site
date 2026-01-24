'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

async function assertEditor(supabase) {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) throw new Error('Not authenticated')

  const { data: editorRow } = await supabase
    .from('article_editors')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!editorRow) throw new Error('Not authorized')
  return user
}

/* -------------------------
   GROUPS
------------------------- */

export async function createGroupAction(formData) {
  const supabase = await createClient()
  await assertEditor(supabase)

  const name = String(formData.get('name') || '').trim()
  const slugRaw = String(formData.get('slug') || '').trim()
  const sortOrderRaw = String(formData.get('sort_order') || '').trim()

  if (!name) throw new Error('Group name is required.')

  const slug = slugRaw ? slugify(slugRaw) : slugify(name)
  const sort_order = sortOrderRaw ? Number(sortOrderRaw) : 1000

  const { error } = await supabase.from('article_groups').insert([{ name, slug, sort_order }])
  if (error) throw error

  revalidatePath('/admin/meta')
}

export async function updateGroupAction(formData) {
  const supabase = await createClient()
  await assertEditor(supabase)

  const id = String(formData.get('id') || '').trim()
  const name = String(formData.get('name') || '').trim()
  const slug = slugify(String(formData.get('slug') || '').trim())
  const sort_order = Number(String(formData.get('sort_order') || '1000').trim())

  if (!id) throw new Error('Missing group id.')
  if (!name) throw new Error('Group name is required.')
  if (!slug) throw new Error('Group slug is required.')
  if (!Number.isFinite(sort_order)) throw new Error('Sort order must be a number.')

  const { error } = await supabase
    .from('article_groups')
    .update({ name, slug, sort_order })
    .eq('id', id)

  if (error) throw error

  revalidatePath('/admin/meta')
}

export async function deleteGroupAction(formData) {
  const supabase = await createClient()
  await assertEditor(supabase)

  const id = String(formData.get('id') || '').trim()
  if (!id) throw new Error('Missing group id.')

  // FK is ON DELETE SET NULL in articles table (per your schema)
  const { error } = await supabase.from('article_groups').delete().eq('id', id)
  if (error) throw error

  revalidatePath('/admin/meta')
}

/* -------------------------
   TAGS
------------------------- */

export async function createTagAction(formData) {
  const supabase = await createClient()
  await assertEditor(supabase)

  const name = String(formData.get('name') || '').trim()
  const slugRaw = String(formData.get('slug') || '').trim()
  if (!name) throw new Error('Tag name is required.')

  const slug = slugRaw ? slugify(slugRaw) : slugify(name)

  const { error } = await supabase.from('tags').insert([{ name, slug }])
  if (error) throw error

  revalidatePath('/admin/meta')
}

export async function updateTagAction(formData) {
  const supabase = await createClient()
  await assertEditor(supabase)

  const id = String(formData.get('id') || '').trim()
  const name = String(formData.get('name') || '').trim()
  const slug = slugify(String(formData.get('slug') || '').trim())

  if (!id) throw new Error('Missing tag id.')
  if (!name) throw new Error('Tag name is required.')
  if (!slug) throw new Error('Tag slug is required.')

  const { error } = await supabase.from('tags').update({ name, slug }).eq('id', id)
  if (error) throw error

  revalidatePath('/admin/meta')
}

export async function deleteTagAction(formData) {
  const supabase = await createClient()
  await assertEditor(supabase)

  const id = String(formData.get('id') || '').trim()
  if (!id) throw new Error('Missing tag id.')

  // article_tags has ON DELETE CASCADE to tags, so it cleans up automatically
  const { error } = await supabase.from('tags').delete().eq('id', id)
  if (error) throw error

  revalidatePath('/admin/meta')
}
