import {
  createGroupAction,
  updateGroupAction,
  deleteGroupAction,
  createTagAction,
  updateTagAction,
  deleteTagAction,
} from './actions'
import { createClient } from '@/lib/supabase/server'
import ConfirmForm from '@/components/ConfirmForm'

export default async function AdminMetaPage() {
  const supabase = await createClient()

  const { data: groups, error: groupsErr } = await supabase
    .from('article_groups')
    .select('id, slug, name, sort_order, created_at')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (groupsErr) throw groupsErr

  const { data: tags, error: tagsErr } = await supabase
    .from('tags')
    .select('id, slug, name, created_at')
    .order('name', { ascending: true })

  if (tagsErr) throw tagsErr

  return (
    <div className="w-full mx-auto max-w-[140rem] px-4 md:px-6 pb-10">
      <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900 p-4 md:p-6">
        <div className="flex flex-col gap-2">
          <div className="text-lg font-semibold">Admin • Tags & Groups</div>
          <div className="text-sm text-zinc-400">
            Manage article organization. Changes affect filtering on /articles.
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* GROUPS */}
          <section className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold">Groups</div>
                <div className="text-xs text-zinc-500 mt-1">
                  Used for grouping + ordering (sort_order lower shows first).
                </div>
              </div>
            </div>

            {/* Create */}
            <form action={createGroupAction} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                name="name"
                placeholder="New group name"
                className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
              />
              <input
                name="slug"
                placeholder="slug (optional)"
                className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
              />
              <div className="flex gap-2">
                <input
                  name="sort_order"
                  placeholder="sort (default 1000)"
                  className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                />
                <button className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700">
                  Add
                </button>
              </div>
            </form>

            {/* List */}
            <div className="mt-4 space-y-3">
              {(groups || []).length === 0 ? (
                <div className="text-sm text-zinc-400">No groups yet.</div>
              ) : (
                (groups || []).map(g => {
                  const updateFormId = `update-group-${g.id}`

                  return (
                    <div
                      key={g.id}
                      className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        {/* UPDATE FORM (inputs only) */}
                        <form id={updateFormId} action={updateGroupAction} className="contents">
                          <input type="hidden" name="id" value={g.id} />

                          <input
                            name="name"
                            defaultValue={g.name}
                            className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                          />
                          <input
                            name="slug"
                            defaultValue={g.slug}
                            className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                          />
                          <input
                            name="sort_order"
                            defaultValue={String(g.sort_order ?? 1000)}
                            className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                          />
                        </form>

                        {/* ACTIONS CELL (Save + Delete side-by-side, no nesting) */}
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            form={updateFormId}
                            className="flex-1 rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700"
                          >
                            Save
                          </button>

                          <ConfirmForm
                            action={deleteGroupAction}
                            confirmMessage="Delete this group? Articles in this group will be set to no group."
                            className="flex-1"
                          >
                            <input type="hidden" name="id" value={g.id} />
                            <button
                              type="submit"
                              className="w-full rounded border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-200 hover:bg-red-950/50"
                              title="Delete group (articles will be set to no group)"
                            >
                              Delete
                            </button>
                          </ConfirmForm>
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-zinc-500">
                        slug: <span className="text-zinc-300">{g.slug}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>

          {/* TAGS */}
          <section className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-4">
            <div>
              <div className="text-base font-semibold">Tags</div>
              <div className="text-xs text-zinc-500 mt-1">
                Used for filtering. Deleting a tag removes it from articles automatically.
              </div>
            </div>

            {/* Create */}
            <form action={createTagAction} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                name="name"
                placeholder="New tag name"
                className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
              />
              <input
                name="slug"
                placeholder="slug (optional)"
                className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
              />
              <button className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700">
                Add
              </button>
            </form>

            {/* List */}
            <div className="mt-4 space-y-3">
              {(tags || []).length === 0 ? (
                <div className="text-sm text-zinc-400">No tags yet.</div>
              ) : (
                (tags || []).map(t => {
                  const updateFormId = `update-tag-${t.id}`

                  return (
                    <div
                      key={t.id}
                      className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {/* UPDATE FORM (inputs only) */}
                        <form id={updateFormId} action={updateTagAction} className="contents">
                          <input type="hidden" name="id" value={t.id} />

                          <input
                            name="name"
                            defaultValue={t.name}
                            className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                          />
                          <input
                            name="slug"
                            defaultValue={t.slug}
                            className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                          />
                        </form>

                        {/* ACTIONS CELL */}
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            form={updateFormId}
                            className="flex-1 rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700"
                          >
                            Save
                          </button>

                          <ConfirmForm
                            action={deleteTagAction}
                            confirmMessage="Delete this tag? It will be removed from all articles."
                            className="flex-1"
                          >
                            <input type="hidden" name="id" value={t.id} />
                            <button
                              type="submit"
                              className="w-full rounded border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-200 hover:bg-red-950/50"
                              title="Delete tag"
                            >
                              Delete
                            </button>
                          </ConfirmForm>
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-zinc-500">
                        slug: <span className="text-zinc-300">{t.slug}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
