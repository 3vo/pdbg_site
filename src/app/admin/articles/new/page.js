import { createDraftArticleAction } from '../[id]/actions'

export default function NewArticlePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="w-full mx-auto max-w-3xl px-4 md:px-6 pb-10">
        <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900 p-4 md:p-6">
          <div className="text-lg font-semibold">New article</div>
          <div className="text-sm text-zinc-400 mt-1">
            This will create a draft and take you to the editor.
          </div>

          <form action={createDraftArticleAction} className="mt-4">
            <button className="rounded bg-zinc-800 px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-700">
              Create draft →
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
