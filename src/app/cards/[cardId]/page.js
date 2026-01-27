import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchCardById, fetchCardsByCardIds } from '@/lib/cardQueries'
import { cardImageUrlFromPath } from '@/lib/cardAssets'
import BackToResultsButton from '@/components/BackToResultsButton'
import FadeIn from '@/components/FadeIn'
import CardImageGallery from '@/components/CardImageGallery'

export default async function CardDetailPage({ params, searchParams }) {
  const { cardId: rawCardId } = await params
  const sp = await searchParams

  if (!rawCardId) notFound()

  // cardId in the URL is encoded (e.g. S%26M-001). Decode before querying.
  let cardId = String(rawCardId)
  try {
    cardId = decodeURIComponent(cardId)
  } catch {
    // If it’s somehow malformed, fall back to the raw value.
    cardId = String(rawCardId)
  }

  const card = await fetchCardById(cardId)
  if (!card) notFound()

  const from = typeof sp?.from === 'string' ? sp.from.trim() : ''

  // If "from" is a path (ex: "/articles/my-post"), go back there.
  // Otherwise treat it as a /cards querystring restore key (ex: "q=pikachu&cost_min=2").
  const isPathFrom = from.startsWith('/')
  const backHref = from ? (isPathFrom ? from : `/cards?${from}`) : '/cards'

  const hasHighlightEffect =
    typeof card.highlight_effect === 'string' && card.highlight_effect.trim().length > 0

  const hasEffect = typeof card.effect === 'string' && card.effect.trim().length > 0

  const hasRules = typeof card.rules === 'string' && card.rules.trim().length > 0

  const hasWcsTier = card.wcs_tier != null

  const highlightBorderClassMap = {
    blue: 'border-blue-500',
    yellow: 'border-yellow-500',
    red: 'border-red-500',
  }

  const highlightBorderClass = highlightBorderClassMap[card.highlight_color] ?? 'border-zinc-500'

  // Related cards (from DB column text[])
  const relatedIds = Array.isArray(card.related)
    ? card.related.map(v => String(v).trim()).filter(Boolean)
    : []

  // De-dupe + avoid self-reference
  const selfId = String(card.card_id).trim()
  const filteredRelatedIds = [...new Set(relatedIds)].filter(id => id !== selfId)

  const relatedCards =
    filteredRelatedIds.length > 0 ? await fetchCardsByCardIds(filteredRelatedIds) : []

  const relatedHref = rid => {
    const safeId = encodeURIComponent(String(rid))
    return from ? `/cards/${safeId}?from=${encodeURIComponent(from)}` : `/cards/${safeId}`
  }

  const primaryTypes = Array.isArray(card.primary_types) ? card.primary_types.filter(Boolean) : []
  const hasSubtypes = Array.isArray(card.subtypes) && card.subtypes.length > 0

  // Add extra spacing between Primary Type and XP when Primary Type exists but Sub-Types do not
  const primaryTypeSpacingClass = primaryTypes.length > 0 && !hasSubtypes ? 'mb-4' : 'mb-2'

  return (
    <FadeIn className="max-w-4xl mx-auto p-6">
      {from && isPathFrom ? (
        <Link
          href={backHref}
          className="inline-flex items-center text-sm text-blue-300 hover:text-blue-200"
        >
          ← Back to article
        </Link>
      ) : (
        <BackToResultsButton fallbackHref={backHref} />
      )}

      <div className="mt-4 grid md:grid-cols-2 gap-8 space-y-1">
        <CardImageGallery
          imageUrl={card.image_path ? cardImageUrlFromPath(card.image_path) : card.image_url}
          variants={card.image_variants}
          alt={card.name}
        />

        <div className="space-y-5">
          <h1 className="text-2xl font-bold">{card.name}</h1>

          <div className="text-sm text-zinc-300 space-y-2">
            <div>
              <strong>Set:</strong> {card.set}
            </div>

            {primaryTypes.length > 0 && (
              <div>
                <strong>Primary Type:</strong>
                <div className={`flex flex-wrap gap-2 mt-1 ${primaryTypeSpacingClass}`}>
                  {primaryTypes.map(pt => (
                    <span key={pt} className="px-2 py-0.5 rounded bg-zinc-800 text-xs">
                      {pt}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {hasSubtypes && (
              <div>
                <strong>Sub-Types:</strong>
                <div className="flex flex-wrap gap-2 mt-1 mb-4">
                  {card.subtypes.map(st => (
                    <span key={st} className="px-2 py-0.5 rounded bg-zinc-800 text-xs">
                      {st}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(card.xp_is_variable === true || card.xp_value != null || card.xp_display != null) && (
              <div>
                <strong>XP:</strong>{' '}
                {card.xp_is_variable === true
                  ? '*'
                  : card.xp_display != null
                    ? card.xp_display
                    : card.xp_value}
              </div>
            )}

            {card.cost != null && (
              <div>
                <strong>Cost:</strong> {card.cost}
              </div>
            )}
          </div>

          {/* Effect label (show once) */}
          {(hasHighlightEffect || hasEffect) && (
            <div className="pt-2">
              <div className="font-semibold">Effect:</div>
            </div>
          )}

          {/* Highlight Effect */}
          {hasHighlightEffect && (
            <div className="space-y-2">
              <div className={`border-l-4 ${highlightBorderClass} pl-3 py-1`}>
                <div className="whitespace-pre-line text-zinc-200">{card.highlight_effect}</div>
              </div>

              {/* Normal effect shown under highlight when both exist */}
              {hasEffect && <div className="whitespace-pre-line text-zinc-200">{card.effect}</div>}
            </div>
          )}

          {/* Effect only (when no highlight effect) */}
          {!hasHighlightEffect && hasEffect && (
            <div className="whitespace-pre-line text-zinc-200">{card.effect}</div>
          )}

          {/* WCS Tier (prominent tile) */}
          {hasWcsTier && (
            <div className="mt-8">
              <div
                className="
               inline-flex items-center gap-4
               rounded-xl border border-blue-500/40
               bg-zinc-900
               px-4 py-3
               shadow-lg shadow-black/30
             "
              >
                {/* Label */}
                <div className="min-w-0">
                  <div className="text-xl uppercase">WCS Tier :</div>
                </div>
                {/* Big tier number (yellow with blue border) */}
                <div
                  className="
                flex items-center justify-center
                h-14 w-14
                rounded-xl
                text-yellow-400
                font-black
                text-4xl
                border-4 border-blue-500
                drop-shadow-[0_4px_0.4px_rgba(0,0,255,1)]
               "
                >
                  {card.wcs_tier}
                </div>
              </div>
            </div>
          )}

          {/* Related Cards Gallery */}
          {relatedCards.length > 0 && (
            <div className="mt-10">
              <div className="text-lg font-semibold mb-3">Related Cards</div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {relatedCards.map(rc => (
                  <Link
                    key={rc.card_id}
                    href={relatedHref(rc.card_id)}
                    scroll={false}
                    className="group relative flex flex-col rounded-md border border-zinc-800 bg-zinc-900 p-2 hover:border-blue-500 transition"
                  >
                    {/* Card image */}
                    <img
                      src={rc.image_path ? cardImageUrlFromPath(rc.image_path) : rc.image_url}
                      alt={rc.name}
                      className="w-full h-auto rounded"
                    />


                    {/* Hover name tooltip */}
                    <div
                      className="
                        pointer-events-none
                        absolute left-1/2 top-full mt-2
                        -translate-x-1/2
                        z-20
                        max-w-[14rem]
                        rounded-md bg-black/90 px-3 py-2
                        text-sm text-white text-center leading-snug
                        shadow-lg
                        opacity-0 translate-y-1
                        group-hover:opacity-100 group-hover:translate-y-0
                        transition
                      "
                    >
                      {rc.name}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* FAQ / Rules Clarifications */}
          {hasRules && (
            <div className="mt-10">
              <div className="text-lg font-semibold mb-3">Rules Clarifications</div>

              <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
                <div className="whitespace-pre-line text-zinc-200 leading-relaxed">{card.rules}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </FadeIn>
  )
}
