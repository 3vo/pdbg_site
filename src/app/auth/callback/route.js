import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') || '/'

  // Helper to build a redirect response (so we can always attach cookies)
  function makeRedirect(pathOrUrl) {
    const redirectUrl = new URL(pathOrUrl, url.origin)
    return NextResponse.redirect(redirectUrl)
  }

  // If no code, just bounce to login (or you can keep your old behavior)
  if (!code) {
    return makeRedirect('/login?error=missing_code')
  }

  // Create response up front so we can attach cookies to it (required by @supabase/ssr)
  const response = makeRedirect(next)

  // Route Handlers must write auth cookies onto the *response*.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    }
  )

  // 1) Exchange code for session (sets auth cookies on `response`)
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    const r = makeRedirect('/login?error=auth_exchange_failed')
    return r
  }

  // 2) Read user
  const { data: userData, error: userError } = await supabase.auth.getUser()
  const user = userData?.user

  if (userError || !user) {
    // Ensure no lingering session cookie
    await supabase.auth.signOut()
    return makeRedirect('/login?error=no_user')
  }

  // 3) Authorization gate: must exist in article_editors
  const { data: editorRow, error: editorError } = await supabase
    .from('article_editors')
    .select('user_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (editorError || !editorRow) {
    // Sign out so cookies are cleared
    await supabase.auth.signOut()
    return makeRedirect('/login?error=unauthorized')
  }

  // Authorized → proceed to `next`
  return response
}
