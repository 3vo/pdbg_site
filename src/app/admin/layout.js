// src/app/admin/layout.js
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }) {
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

  const role = editorRow.role || 'author'
  const isAdmin = role === 'admin'

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="w-full mx-auto max-w-6xl px-4 md:px-6 pb-10">
        {/* Tiny admin nav */}
        <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 flex flex-wrap items-center justify-between gap-3 mt-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-[11px] tracking-widest text-zinc-300">
              {String(role).toUpperCase()}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/articles"
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold tracking-wide text-zinc-200 hover:bg-zinc-800 hover:text-white"
            >
              ARTICLES
            </Link>

            {isAdmin ? (
              <Link
                href="/admin/meta"
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold tracking-wide text-zinc-200 hover:bg-zinc-800 hover:text-white"
              >
                META
              </Link>
            ) : null}
          </div>
        </div>

        {children}
      </div>
    </div>
  )
}
