// lib/auth/getUserRole.ts
import { createServerClient } from '@supabase/ssr'

export async function getUserRole(supabase) {
  const { data } = await supabase
    .from('article_editors')
    .select('role')
    .single()

  return data?.role ?? null
}
