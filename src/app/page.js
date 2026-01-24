// src/app/page.js
import Link from 'next/link'
import SiteBanner from '@/components/SiteBanner'

function CardSection({ title, subtitle, children }) {
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4 md:p-6">
      <div className="mb-4">
        <div className="text-lg font-semibold text-zinc-100">{title}</div>
        {subtitle ? <div className="text-sm text-zinc-400 mt-1">{subtitle}</div> : null}
      </div>
      {children}
    </div>
  )
}

function QuickLinkCard({ href, title, desc, badge }) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 hover:border-blue-500 transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-zinc-100">{title}</div>
          {desc ? <div className="text-sm text-zinc-400 mt-1">{desc}</div> : null}
        </div>
        {badge ? (
          <span className="shrink-0 text-[11px] rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-200">
            {badge}
          </span>
        ) : null}
      </div>
    </Link>
  )
}

export default function HomePage() {
  // Static featured list (edit anytime)
  const featuredArticles = [
    { title: 'WCS Primer', slug: 'wcs-primer', blurb: 'Introduction to the World Championships game mode.' },
    { title: 'WCS Strategy 101', slug: 'wcs-strategy-101', blurb: 'Core fundamentals for leveling up your game.' },
    { title: 'Trainer Draft & Popular Combinations', slug: 'trainer-draft-and-popular-combinations', blurb: 'Drafting priorities + synergy packages.',
    },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="w-full mx-auto max-w-[140rem] px-4 md:px-6 pb-10">
        <SiteBanner />

        <div className="mt-4 space-y-4">
          {/* Hero */}
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-5 md:p-8">
            <div className="flex flex-col gap-3">
              <div className="text-2xl md:text-3xl font-semibold text-zinc-100">
                Pokémon Deckbuilding Game
              </div>
              <div className="text-sm md:text-base text-zinc-300 max-w-4xl leading-relaxed">
                Browse the full card database, read strategy and development articles, and find rules and resources for this fan project.
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/cards"
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition"
                >
                  Browse Cards →
                </Link>
                <Link
                  href="/articles"
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950/40 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-900 transition"
                >
                  Read Articles →
                </Link>
                <Link
                  href="/resources"
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950/40 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-900 transition"
                >
                  Resources →
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950/40 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-900 transition"
                >
                  Contact →
                </Link>
              </div>

              <div className="text-xs text-zinc-500 mt-1">
              </div>
            </div>
          </div>

          {/* Featured Articles (static) */}
          <CardSection
            title="Featured Articles"
            subtitle=""
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {featuredArticles.map(a => (
                <Link
                  key={a.slug}
                  href={`/articles/${encodeURIComponent(a.slug)}`}
                  className="block rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 hover:border-blue-500 transition"
                >
                  <div className="font-semibold text-zinc-100 truncate">{a.title}</div>
                  {a.blurb ? <div className="text-sm text-zinc-400 mt-1">{a.blurb}</div> : null}
                  <div className="mt-3 text-sm text-zinc-300">Read →</div>
                </Link>
              ))}
            </div>
          </CardSection>

          {/* Disclaimer */}
          <CardSection title="Disclaimer" subtitle="">
            <div className="text-sm text-zinc-300 leading-relaxed space-y-2">
              <p>
                Pokémon and related trademarks are the property of their respective owners. This
                project is a fan-made resource and is not affiliated with or endorsed by Nintendo,
                Game Freak, The Pokémon Company, or any of their subsidiaries.
              </p>
            </div>
          </CardSection>
        </div>
      </div>
    </div>
  )
}
