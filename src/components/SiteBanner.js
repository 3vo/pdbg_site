'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function SiteBanner() {
  const pathname = usePathname()

  const navItems = [
    { href: '/articles', label: 'ARTICLES' },
    { href: '/cards', label: 'CARD BROWSER' },
    { href: '/resources', label: 'RESOURCES' },
    { href: '/contact', label: 'CONTACT' },
  ]

  const isActive = href => pathname === href || (href !== '/' && pathname?.startsWith(href + '/'))

  return (
    <div className="w-full bg-zinc-900 border border-zinc-700 px-4 py-4 rounded-lg mt-4">
      <div className="grid grid-cols-1 items-center">
        {/* Logo (clickable -> home) */}
        <Link href="/" className="justify-self-center" aria-label="Go to home page">
          <img
            src="/pdbg_logo-transparent.png"
            alt="Pokémon Deckbuilding Game"
            className="h-28 md:h-32 object-contain"
          />
        </Link>

        <div className="mt-2" />

        {/* Navigation */}
        <nav className="justify-self-center mt-4">
          <div className="flex flex-wrap justify-center gap-2">
            {navItems.map(item => {
              const active = isActive(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'rounded-md border px-4 py-2 text-sm font-semibold tracking-wide transition',
                    active
                      ? 'border-blue-500 bg-zinc-800 text-white'
                      : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white',
                  ].join(' ')}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
