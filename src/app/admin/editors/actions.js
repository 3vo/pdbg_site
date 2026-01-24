'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(v || '').trim()
  )
}

async function requireAdmin(supabase) {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    throw new Error('Not authenticated')
  }

  const { data: row, error: rowErr } = await supabase
    .from('article_editors')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (rowErr) throw rowErr
  if (!row || row.role !== 'admin') {
    throw new Error('Not authorized')
  }

  return user
}

function cleanRole(role) {
  const r = String(role || '').trim()
  if (r === 'author' || r === 'editor' || r === 'admin') return r
  return null
}

export async function createEditorAction(formData) {
  const supabase = await createClient()
  await requireAdmin(supabase)

  const userId = String(formData.get('user_id') || '').trim()
  const role = cleanRole(formData.get('role'))

  if (!isUuid(userId)) throw new Error('user_id must be a valid UUID')
  if (!role) throw new Error('Invalid role')

  const { error } = await supabase.from('article_editors').insert({
    user_id: userId,
    role,
  })

  if (error) throw error

  revalidatePath('/admin/editors')
}

export async function updateEditorAction(formData) {
  const supabase = await createClient()
  await requireAdmin(supabase)

  const userId = String(formData.get('user_id') || '').trim()
  const role = cleanRole(formData.get('role'))

  if (!isUuid(userId)) throw new Error('user_id must be a valid UUID')
  if (!role) throw new Error('Invalid role')

  const { error } = await supabase
    .from('article_editors')
    .update({ role })
    .eq('user_id', userId)

  if (error) throw error

  revalidatePath('/admin/editors')
}

export async function deleteEditorAction(formData) {
  const supabase = await createClient()
  await requireAdmin(supabase)

  const userId = String(formData.get('user_id') || '').trim()
  if (!isUuid(userId)) throw new Error('user_id must be a valid UUID')

  const { error } = await supabase.from('article_editors').delete().eq('user_id', userId)
  if (error) throw error

  revalidatePath('/admin/editors')
}
