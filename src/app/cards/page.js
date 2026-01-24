import { Suspense } from 'react'
import CardsClientPage from './CardsClientPage'

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 text-zinc-100">
          <div className="w-full mx-auto max-w-[140rem] px-4 md:px-6 pb-10">
            <div className="mt-6 text-zinc-400">Loading…</div>
          </div>
        </div>
      }
    >
      <CardsClientPage />
    </Suspense>
  )
}