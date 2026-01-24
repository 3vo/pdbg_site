import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // In Server Components, Next.js forbids writing cookies.
          // Supabase may still attempt to refresh session cookies — so we
          // swallow the error here to avoid crashing public pages.
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set({ name, value, ...options })
            }
          } catch {
            // no-op (Server Component render)
          }
        },
      },
    }
  )
}
