// Shared client-side cache for card refs (used by ArticleBody + CardRef)

export const cardCache = new Map()

const listeners = new Set()

export function setManyCards(cards = []) {
  const updatedIds = []

  for (const c of cards) {
    if (!c?.card_id) continue
    const id = String(c.card_id).trim()
    if (!id) continue
    cardCache.set(id, c)
    updatedIds.push(id)
  }

  if (updatedIds.length > 0) {
    for (const fn of listeners) {
      try {
        fn(updatedIds)
      } catch {}
    }
  }
}

export function subscribeCardCache(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
