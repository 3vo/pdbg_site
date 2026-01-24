import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function requireAuthor() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login') // or whatever your login route is

  const { data: row, error } = await supabase
    .from('article_authors')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) throw error
  if (!row) redirect('/articles') // or a “not authorized” page

  return { supabase, user }
}
