import { supabase } from './supabase'

/**
 * Apply advanced text search to a given field
 * @param {object} query - Supabase query object
 * @param {string} field - Database field name
 * @param {string} include - Comma-separated terms to include
 * @param {string} exclude - Comma-separated terms to exclude
 * @param {string} phrase - Exact phrase to match
 */
function applyTextFilters(query, field, include, exclude, phrase) {
  // Include multiple comma-separated terms
  if (include) {
    include
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
      .forEach(word => {
        query = query.ilike(field, `%${word}%`)
      })
  }

  // Exclude multiple comma-separated terms
  if (exclude) {
    exclude
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
      .forEach(word => {
        query = query.not(field, 'ilike', `%${word}%`)
      })
  }

  // Exact phrase
  if (phrase) {
    const p = phrase.trim()
    if (p) query = query.ilike(field, `%${p}%`)
  }

  return query
}

/**
 * Effect/Highlight text search with scope control.
 *
 * effect_scope:
 *  - '' (default): only cards_flat.effect
 *  - 'all': effect OR highlight_effect
 *  - 'highlight': ONLY highlight_effect
 *
 * Include terms/phrase:
 *  - default/highlight: AND across terms on the chosen field
 *  - all: for each term/phrase, must appear in EITHER field (OR), AND across terms
 *
 * Exclude terms:
 *  - default/highlight: not present in chosen field
 *  - all: not present in EITHER field (i.e. must be absent from both)
 */
function applyEffectScopeFilters(query, effect_scope, include, exclude, phrase) {
  const scope = String(effect_scope || '').trim()

  // ONLY highlight_effect
  if (scope === 'highlight') {
    return applyTextFilters(query, 'highlight_effect', include, exclude, phrase)
  }

  // effect OR highlight_effect
  if (scope === 'all') {
    // Include (each term must match in either field)
    if (include) {
      include
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
        .forEach(word => {
          // For THIS word, match in either column
          query = query.or(`effect.ilike.%${word}%,highlight_effect.ilike.%${word}%`)
        })
    }

    // Exclude (must be absent from BOTH fields)
    if (exclude) {
      exclude
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
        .forEach(word => {
          query = query.not('effect', 'ilike', `%${word}%`)
          query = query.not('highlight_effect', 'ilike', `%${word}%`)
        })
    }

    // Phrase (must match in either field)
    if (phrase) {
      const p = phrase.trim()
      if (p) query = query.or(`effect.ilike.%${p}%,highlight_effect.ilike.%${p}%`)
    }

    return query
  }

  // DEFAULT: only effect
  return applyTextFilters(query, 'effect', include, exclude, phrase)
}

export async function fetchCardById(cardId) {
  const { data, error } = await supabase
    .from('cards_flat')
    .select('*')
    .eq('card_id', String(cardId))

  if (error) throw error
  return data?.[0] ?? null
}

// Used by Related Cards gallery, variants, etc.
export async function fetchCardsByCardIds(cardIds = []) {
  const ids = Array.isArray(cardIds) ? cardIds.map(String).filter(Boolean) : []
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('cards_flat')
    .select('card_id,name,image_path,wcs_tier')
    .in('card_id', ids)

  if (error) throw error

  // Preserve input order (Supabase .in() doesn't guarantee order)
  const byId = new Map((data || []).map(r => [r.card_id, r]))
  return ids.map(id => byId.get(id)).filter(Boolean)
}

/**
 * Fetch cards from Supabase with filters and pagination
 * @param {object} params - Filter parameters
 * @param {number} page - Pagination page (1-based)
 * @param {number} pageSize - Number of cards per page
 */
export async function fetchFilteredCards(params = {}, page = 1, pageSize = 24) {
  const {
    set, // legacy single-set param
    sets, // new multi-set param: CSV
    primary_type, // legacy single-type param
    primary_types, // new multi-type param: CSV

    cost_min,
    cost_max,
    cost_include_null,
    cost_only_null,

    xp_min,
    xp_max,
    xp_include_null,
    xp_only_null,
    xp_include_variable,
    xp_only_variable,

    attack_multi,
    card_location,

    // WCS tier numeric range (only applies when your UI has enabled it)
    wcs_tier_min,
    wcs_tier_max,

    // NEW: sorting
    sort_by,
    sort_dir,

    keywords,
    subtypes,
    symbols,
    q,
    name_include,
    name_exclude,
    name_phrase,

    effect_include,
    effect_exclude,
    effect_phrase,

    // ✅ NEW: Effect scope toggle(s)
    // '' | 'all' | 'highlight'
    effect_scope,
  } = params

  let query = supabase.from('cards_flat').select('*', { count: 'exact' })

  // -------------------------
  // Set filter (supports OR)
  // -------------------------
  const setList = []
  if (set) setList.push(set)
  if (sets) setList.push(...String(sets).split(',').map(s => s.trim()).filter(Boolean))

  const uniqueSets = [...new Set(setList)]
  if (uniqueSets.length > 0) {
    query = query.in('set', uniqueSets)
  }

  // WCS Tier (nullable column; normal gte/lte naturally excludes nulls)
  if (wcs_tier_min !== undefined && wcs_tier_min !== '') {
    query = query.gte('wcs_tier', Number(wcs_tier_min))
  }
  if (wcs_tier_max !== undefined && wcs_tier_max !== '') {
    query = query.lte('wcs_tier', Number(wcs_tier_max))
  }

  // -----------------------------------
  // Primary Types filter (supports OR)
  // cards_flat.primary_types is text[]
  // -----------------------------------
  const typeList = []
  if (primary_type) typeList.push(primary_type)
  if (primary_types) {
    typeList.push(...String(primary_types).split(',').map(s => s.trim()).filter(Boolean))
  }

  const uniqueTypes = [...new Set(typeList)]
  if (uniqueTypes.length > 0) {
    // NOTE: this is AND behavior (card must contain all selected)
    // If you want OR behavior instead, use: query = query.overlaps('primary_types', uniqueTypes)
    query = query.contains('primary_types', uniqueTypes)
  }

  // -------------------------
  // Location filter
  // -------------------------
  if (card_location) {
    const loc = String(card_location).trim()
    if (loc) query = query.eq('card_location', loc)
  }

  // -------------------------
  // Numeric filters
  // -------------------------

  // COST (supports: range, include-null, only-null)
  const costOnlyNull = params.cost_only_null === '1'
  const costIncludeNull = params.cost_include_null === '1'

  const hasCostMin = cost_min !== undefined && cost_min !== ''
  const hasCostMax = cost_max !== undefined && cost_max !== ''
  const costMinNum = hasCostMin ? Number(cost_min) : 0
  const costMaxNum = hasCostMax ? Number(cost_max) : null

  if (costOnlyNull) {
    query = query.is('cost', null)
  } else if (hasCostMin || hasCostMax) {
    const minOk = Number.isFinite(costMinNum) ? costMinNum : 0
    const maxOk = costMaxNum !== null && Number.isFinite(costMaxNum) ? costMaxNum : null

    let numericCond = `cost.gte.${minOk}`
    if (maxOk !== null) numericCond += `,cost.lte.${maxOk}`

    const shouldIncludeNull = costIncludeNull && minOk === 0

    if (shouldIncludeNull) {
      const andPart = maxOk !== null ? `and(${numericCond})` : numericCond
      query = query.or(`cost.is.null,${andPart}`)
    } else {
      query = query.gte('cost', minOk)
      if (maxOk !== null) query = query.lte('cost', maxOk)
    }
  }

  // XP (supports: range, include-null, only-null, include-variable, only-variable)
  const xpOnlyNull = params.xp_only_null === '1'
  const xpOnlyVariable = params.xp_only_variable === '1'
  const xpIncludeNull = params.xp_include_null === '1'
  const xpIncludeVariable = params.xp_include_variable === '1'

  const hasXpMin = xp_min !== undefined && xp_min !== ''
  const hasXpMax = xp_max !== undefined && xp_max !== ''
  const xpMinNum = hasXpMin ? Number(xp_min) : -2
  const xpMaxNum = hasXpMax ? Number(xp_max) : null

  const xpRangeIncludesZero =
    Number.isFinite(xpMinNum) &&
    (xpMaxNum === null || Number.isFinite(xpMaxNum)) &&
    xpMinNum <= 0 &&
    (xpMaxNum === null ? true : xpMaxNum >= 0)

  if (xpOnlyVariable) {
    query = query.eq('xp_is_variable', true)
  } else if (xpOnlyNull) {
    query = query.is('xp_value', null).eq('xp_is_variable', false)
  } else if (hasXpMin || hasXpMax || xpIncludeNull || xpIncludeVariable) {
    const minOk = Number.isFinite(xpMinNum) ? xpMinNum : -2
    const maxOk = xpMaxNum !== null && Number.isFinite(xpMaxNum) ? xpMaxNum : null

    const parts = [`xp_is_variable.eq.false`, `xp_value.gte.${minOk}`]
    if (maxOk !== null) parts.push(`xp_value.lte.${maxOk}`)

    const numericAnd = `and(${parts.join(',')})`

    const shouldIncludeNull = xpIncludeNull && xpRangeIncludesZero
    const shouldIncludeVariable = xpIncludeVariable

    const orParts = [numericAnd]

    if (shouldIncludeNull) {
      orParts.push(`and(xp_value.is.null,xp_is_variable.eq.false)`)
    }

    if (shouldIncludeVariable) {
      orParts.push(`xp_is_variable.eq.true`)
    }

    query = query.or(orParts.join(','))
  }

  // Multiple Attacks filter (attack_count > 1)
  const multipleAttacks = attack_multi === '1'
  if (multipleAttacks) {
    query = query.gt('attack_count', 1)
  }

  // -------------------------
  // Generic search
  // -------------------------
  if (q) {
    const term = String(q).trim()
    if (term) query = query.or(`name.ilike.%${term}%,effect.ilike.%${term}%`)
  }

  // -------------------------
  // Array filters
  // -------------------------
  if (keywords) {
    String(keywords)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(k => {
        query = query.contains('keywords', [k])
      })
  }

  if (subtypes) {
    String(subtypes)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(s => {
        query = query.contains('subtypes', [s])
      })
  }

  // Symbols filter with No Symbol support (cards_flat.symbols is text[])
  if (symbols) {
    const sym = String(symbols).trim()
    if (sym === '__none__') {
      query = query.eq('symbols', '{}')
    } else if (sym) {
      query = query.contains('symbols', [sym])
    }
  }

  // -------------------------
  // Advanced text search
  // -------------------------
  query = applyTextFilters(query, 'name', name_include, name_exclude, name_phrase)

  // ✅ UPDATED: Effect text search now supports effect_scope
  query = applyEffectScopeFilters(query, effect_scope, effect_include, effect_exclude, effect_phrase)

  // -------------------------
  // Ordering (supports sort_by/sort_dir) + tie-break by set_sort
  // Tie-break order: set_sort ASC, then card_id ASC.
  // -------------------------
  const dir = String(sort_dir || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc'
  const asc = dir === 'asc'

  if (sort_by === 'name') {
    query = query.order('name', { ascending: asc })
    query = query.order('set_sort', { ascending: true })
    query = query.order('card_id', { ascending: true })
  } else if (sort_by === 'cost') {
    query = query.order('cost', { ascending: asc, nullsFirst: false })
    query = query.order('set_sort', { ascending: true })
    query = query.order('card_id', { ascending: true })
  } else if (sort_by === 'xp') {
    // Keep variable XP at the end regardless of asc/desc:
    query = query.order('xp_is_variable', { ascending: true }) // false first, true last
    query = query.order('xp_value', { ascending: asc, nullsFirst: false })
    query = query.order('set_sort', { ascending: true })
    query = query.order('card_id', { ascending: true })
  } else {
    // Default ordering
    query = query.order('set_sort', { ascending: true })
    query = query.order('card_id', { ascending: true })
  }

  // -------------------------
  // Pagination
  // -------------------------
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, count, error } = await query
  if (error) throw error

  return { data, count }
}
