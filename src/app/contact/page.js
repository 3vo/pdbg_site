import Link from 'next/link'
import SiteBanner from '@/components/SiteBanner'

function InfoRow({ label, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
      <div className="text-xs uppercase tracking-widest text-zinc-400 shrink-0 sm:w-32">
        {label}
      </div>
      <div className="text-sm text-zinc-200 leading-relaxed min-w-0">{children}</div>
    </div>
  )
}

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

function SupportLinkCard({ title, subtitle, href, badge, accentClass }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={[
        'group block rounded-lg border border-zinc-800 bg-zinc-950/30 p-4',
        'hover:border-blue-500/60 hover:bg-zinc-950/45 transition',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-zinc-100 group-hover:text-white transition">
              {title}
            </div>
            {badge ? (
              <span
                className={[
                  'text-[10px] rounded-full px-2 py-0.5 border',
                  accentClass || 'border-blue-500/30 bg-blue-950/30 text-blue-200',
                ].join(' ')}
              >
                {badge}
              </span>
            ) : null}
          </div>
          {subtitle ? (
            <div className="mt-1 text-xs text-zinc-400 leading-relaxed">
              {subtitle}
            </div>
          ) : null}
        </div>

        <div className="shrink-0 text-sm text-zinc-300 group-hover:text-zinc-100 transition">
          Support →
        </div>
      </div>
    </a>
  )
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="w-full mx-auto max-w-[140rem] px-4 md:px-6 pb-10">
        {/* Banner */}
        <SiteBanner />

        <div className="mt-4 space-y-4">
          {/* About */}
          <CardSection title="About" subtitle="What this site is and what can be found here.">
            <div className="space-y-3">
              <p className="text-sm text-zinc-200 leading-relaxed">
                This site hosts resources for the{' '}
                <span className="font-semibold">Pokémon Deckbuilding Game</span> fan project —
                including articles, a full card browser, tutorial videos, and rules documents.
              </p>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-4">
                <InfoRow label="Articles">
                  Read developer and community written articles, discussing design philosophy and
                  game strategy.
                </InfoRow>
                <div className="h-3" />
                <InfoRow label="Card Browser">
                  Browse the full card database and filter by set, type, cost, XP, keywords, and
                  more.
                </InfoRow>

                <div className="h-3" />
                <InfoRow label="Resources">Find tutorial videos, rules PDFs, and other documents.</InfoRow>
              </div>

              <div className="text-sm text-zinc-300">
                Quick links:{' '}
                <Link
                  href="/articles"
                  className="text-zinc-100 underline underline-offset-4 hover:text-white"
                >
                  Articles
                </Link>
                {' · '}
                <Link
                  href="/cards"
                  className="text-zinc-100 underline underline-offset-4 hover:text-white"
                >
                  Card Browser
                </Link>
                {' · '}
                <Link
                  href="/resources"
                  className="text-zinc-100 underline underline-offset-4 hover:text-white"
                >
                  Resources
                </Link>
              </div>
            </div>
          </CardSection>

          {/* Contact */}
          <CardSection title="Contact" subtitle="Questions, feedback, or corrections? Reach out here.">
            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-4 space-y-3">
                <InfoRow label="Discord">
                  <span className="text-zinc-300">
                    <a
                      href="https://discord.com/users/210943567613394956"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-100 underline underline-offset-4 decoration-zinc-500 hover:text-white hover:decoration-zinc-300 transition"
                    >
                      @3vo
                    </a>
                  </span>
                </InfoRow>

                <InfoRow label=" ">
                  <span className="text-zinc-300">
                    <a
                      href="https://discord.gg/PrYZPJ2"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-100 underline underline-offset-4 decoration-zinc-500 hover:text-white hover:decoration-zinc-300 transition"
                    >
                      Discord Community Server
                    </a>
                  </span>
                </InfoRow>

                <InfoRow label="GitHub">
                  <span className="text-zinc-300">
                    <a
                      href="https://github.com/3vo/pdbg_site"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-100 underline underline-offset-4 decoration-zinc-500 hover:text-white hover:decoration-zinc-300 transition"
                    >
                      GitHub Repository
                    </a>
                  </span>
                </InfoRow>
              </div>

              <details className="rounded-lg border border-zinc-800 bg-zinc-950/30">
                <summary className="cursor-pointer select-none px-4 py-3 flex items-center justify-between">
                  <div className="font-semibold text-zinc-100">Report an issue</div>
                  <div className="text-xs text-zinc-400">Tips</div>
                </summary>
                <div className="px-4 pb-4 text-sm text-zinc-300 space-y-2 leading-relaxed">
                  <div>When reporting card data issues, include:</div>
                  <ul className="list-disc pl-5 space-y-1 text-zinc-300">
                    <li>The card name and set and/or the card ID</li>
                    <li>What data is incorrect (cost/XP/rules text/etc.)</li>
                    <li>A screenshot if possible</li>
                  </ul>
                  <div className="text-zinc-400 text-xs">
                    This helps fix issues quickly without back-and-forth.
                  </div>
                </div>
              </details>
            </div>
          </CardSection>

          {/* Support / Donate */}
          <CardSection
            title="Support this project"
            subtitle="If you enjoy the site or the game series and want to help keep it going, here are a couple ways to support development."
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <SupportLinkCard
                  title="Ko-fi"
                  badge="One-time"
                  subtitle="Buy me a coffee ☕ — great for one-off support."
                  href="https://ko-fi.com/3vogaming"
                  accentClass="border-emerald-500/30 bg-emerald-950/30 text-emerald-200"
                />

                <SupportLinkCard
                  title="Patreon"
                  badge="Monthly"
                  subtitle="Support on an ongoing basis — helps plan features and cover recurring costs."
                  href="https://www.patreon.com/3vo"
                  accentClass="border-amber-500/30 bg-amber-950/30 text-amber-200"
                />
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-4">
                <div className="text-sm text-zinc-200 font-semibold">Where support goes</div>
                <div className="mt-2 text-sm text-zinc-300 leading-relaxed">
                  Hosting, storage, and ongoing development time — including game updates, new articles, scripting improvements, and more. 
                </div>
                <div className="mt-3 text-xs text-zinc-500">
                  Thank you for helping keep this fan project going!
                </div>
              </div>
            </div>
          </CardSection>
		
          {/* Legal / Credits */}
          <CardSection title="Credits & Disclaimer" subtitle="">
            <div className="space-y-3 text-sm text-zinc-300 leading-relaxed">
              <p>
                Pokémon and related trademarks are the property of their respective owners. This
                project is a fan-made resource and is not affiliated with or endorsed by Nintendo,
                Game Freak, or The Pokémon Company.
              </p>
            </div>
          </CardSection>
        </div>
      </div>
    </div>
  )
}
