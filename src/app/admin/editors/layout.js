import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminEditorsLayout({ children }) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) redirect('/login')

  const { data: editorRow, error: editorErr } = await supabase
    .from('article_editors')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (editorErr || !editorRow) redirect('/login')

  // ✅ Only admins can manage editors
  if (editorRow.role !== 'admin') redirect('/login')

  return <div className="min-h-screen bg-zinc-950 text-zinc-100">{children}</div>
}
