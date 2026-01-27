export function cardImageUrlFromPath(imagePath) {
  const host = (process.env.NEXT_PUBLIC_CARD_ASSETS_HOST || '').replace(/\/+$/, '')
  const p = String(imagePath || '').replace(/^\/+/, '') // remove leading "/"
  if (!host || !p) return ''
  return `${host}/${encodeURI(p)}`
}