export function injectCardRefsIntoMdx(source) {
  // Turns [[card:XYZ]] into an MDX component usage.
  // Keeps it simple: card id is anything up to the closing ]]
  return String(source || '').replace(/\[\[card:([^\]]+)\]\]/g, (_m, idRaw) => {
    const id = String(idRaw).trim().replace(/"/g, '&quot;')
    return `<CardRef cardId="${id}" />`
  })
}
