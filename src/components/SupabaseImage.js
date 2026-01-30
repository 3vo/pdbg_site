'use client'

export default function SupabaseImage({
  path,
  alt = '',
  caption,
  bucket = 'site_images',
  className = '',
}) {
  const p = String(path || '').trim()
  if (!p) return null

  // Support accidentally-pasted full URLs too
  const src = /^https?:\/\//i.test(p)
    ? p
    : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodeURIComponent(p)}`

  return (
    <figure className="my-6">
      <img
        src={src}
        crossOrigin="anonymous"
        alt={alt}
        loading="lazy"
        className={[
          'w-full h-auto rounded-lg border border-zinc-800 bg-zinc-950',
          className,
        ].join(' ')}
      />
      {caption ? (
        <figcaption className="mt-2 text-sm text-zinc-400">{caption}</figcaption>
      ) : null}
    </figure>
  )
}
