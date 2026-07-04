import SiteBanner from '@/components/SiteBanner'

export default function PlayPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="w-full mx-auto max-w-[140rem] px-4 md:px-6 pb-10">
        {/* Banner */}
        <SiteBanner />
      </div>
    </div>
  )
}
