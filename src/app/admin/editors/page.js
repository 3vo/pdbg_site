import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConfirmForm from '@/components/ConfirmForm'
import { createEditorAction, updateEditorAction, deleteEditorAction } from './actions'

export default async function AdminEditorsPage() {
  const supabase = await createClient()

  // Must be logged in
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) redirect('/login')

  // Must be admin in article_editors
  const { data: me, error: meErr } = await supabase
    .from('article_editors')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (meErr || !me || me.role !== 'admin') redirect('/login')

  // Load editors list
  const { data: editors, error } = await supabase
    .from('article_editors')
    .select('user_id, role, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error

  return (
    <div className="w-full mx-auto max-w-[140rem] px-4 md:px-6 pb-10">
      <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Admin • Editors</div>
            <div className="text-sm text-zinc-400 mt-1">
              Manage who can create/edit articles. Only <span className="text-zinc-200">admin</span>{' '}
              editors can access this page.
            </div>
          </div>

          <Link
            href="/admin/articles"
            className="inline-flex items-center justify-center rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800"
          >
            ← Back to Articles
          </Link>
        </div>

        {/* Add editor */}
        <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950/30 p-4">
          <div className="text-base font-semibold">Add editor</div>
          <div className="text-xs text-zinc-500 mt-1">
            Enter the user’s UUID (auth user id). If you want email-based management, we can add a
            profiles table next.
          </div>

          <form action={createEditorAction} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              name="user_id"
              placeholder="user_id UUID"
              className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            />

            <select
              name="role"
              defaultValue="editor"
              className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="author">author</option>
              <option value="editor">editor</option>
              <option value="admin">admin</option>
            </select>

            <button className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700">
              Add
            </button>
          </form>
        </div>

        {/* List */}
        <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950/30 p-4">
          <div className="text-base font-semibold">Current editors</div>

          <div className="mt-4 space-y-3">
            {(editors || []).length === 0 ? (
              <div className="text-sm text-zinc-400">No editors found.</div>
            ) : (
              (editors || []).map(e => (
                <div
                  key={e.user_id}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3"
                >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                    {/* UPDATE (single form) */}
                    <form action={updateEditorAction} className="contents">
                      <input type="hidden" name="user_id" value={e.user_id} />

                      <div className="text-xs md:text-sm text-zinc-300 truncate">
                        <span className="text-zinc-500">user_id:</span> {e.user_id}
                      </div>

                      <select
                        name="role"
                        defaultValue={e.role}
                        className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                      >
                        <option value="author">author</option>
                        <option value="editor">editor</option>
                        <option value="admin">admin</option>
                      </select>

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="flex-1 rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700"
                        >
                          Save
                        </button>

                        {/* DELETE (separate form, not nested) */}
                        <ConfirmForm
                          action={deleteEditorAction}
                          confirmMessage="Remove this editor? They will immediately lose access to admin article pages."
                          className=""
                        >
                          <input type="hidden" name="user_id" value={e.user_id} />
                          <button
                            className="rounded border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-200 hover:bg-red-950/50"
                            title="Remove editor"
                          >
                            Delete
                          </button>
                        </ConfirmForm>
                      </div>
                    </form>
                  </div>

                  <div className="mt-2 text-xs text-zinc-500">
                    created:{' '}
                    <span className="text-zinc-300">
                      {e.created_at ? new Date(e.created_at).toLocaleString() : ''}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
