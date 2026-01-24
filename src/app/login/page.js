'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/browser'

export default function LoginPage() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [message, setMessage] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    const clean = email.trim()
    if (!clean) return

    setStatus('sending')
    setMessage('')

    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: {
        // Prevent random users from registering accounts
        shouldCreateUser: false,
        emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(
          '/admin/articles'
        )}`,
      },
    })

    if (error) {
      setStatus('error')

      // Avoid leaking whether an email exists
      setMessage(
        'Unable to send a sign-in link. If you already have an account, double-check the email or contact an admin.'
      )
      return
    }

    setStatus('sent')
    setMessage('Check your email for a sign-in link.')
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="w-full mx-auto max-w-3xl px-4 md:px-6 pb-10">
        <div className="w-full bg-zinc-900 border border-zinc-700 px-4 py-4 rounded-lg mt-4">
          <div className="text-center">
            <div className="text-xl font-semibold">Author / Editor Login</div>
            <div className="text-sm text-zinc-400 mt-1">We’ll email you a magic link.</div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900 p-4 md:p-6">
          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block text-sm text-zinc-300">Email</label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
            />

            <button
              disabled={status === 'sending'}
              className="rounded bg-zinc-800 px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
            >
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </button>

            {message ? (
              <div className={`text-sm ${status === 'error' ? 'text-red-300' : 'text-zinc-300'}`}>
                {message}
              </div>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  )
}
