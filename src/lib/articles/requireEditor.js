import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function requireEditor() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: row, error } = await supabase
    .from('article_editors')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) throw error
  if (!row) redirect('/articles') // or make a /not-authorized page

  return { supabase, user }
}
