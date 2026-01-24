export function avatarPublicUrl(avatarPath) {
  const p = String(avatarPath || '').trim()
  if (!p) return null

  if (/^https?:\/\//i.test(p)) return p

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL

  // Encode each segment but preserve slashes
  const safePath = p
    .split('/')
    .map(encodeURIComponent)
    .join('/')

  return `${base}/storage/v1/object/public/avatars/${safePath}`
}