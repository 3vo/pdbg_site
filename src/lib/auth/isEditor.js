import { createClient } from '@/lib/supabase/server'

const ROLE_RANK = { author: 1, editor: 2, admin: 3 }

export async function requireEditor(minRole = 'author') {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, reason: 'not_signed_in' }

  const { data: row, error } = await supabase
    .from('article_editors')
    .select('user_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return { ok: false, reason: 'db_error', error }
  if (!row) return { ok: false, reason: 'not_editor' }

  const have = ROLE_RANK[row.role] ?? 0
  const need = ROLE_RANK[minRole] ?? 1
  if (have < need) return { ok: false, reason: 'insufficient_role', role: row.role }

  return { ok: true, user, role: row.role }
}
