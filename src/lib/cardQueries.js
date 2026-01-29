import { supabase } from './supabase'

function applyTextFilters(query, field, include, exclude, phrase) {
  if (include) {
    include
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
      .forEach(word => {
        query = query.ilike(field, `%${word}%`)
      })
  }

  if (exclude) {
    exclude
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
      .forEach(word => {
        query = query.not(field, 'ilike', `%${word}%`)
      })
  }

  if (phrase) {
    const p = phrase.trim()
    if (p) query = query.ilike(field, `%${p}%`)
  }

  return query
}

function applyEffectScopeFilters(query, effect_scope, include, exclude, phrase) {
  const scope = String(effect_scope || '').trim()

  if (scope === 'highlight') {
    return applyTextFilters(query, 'highlight_effect', include, exclude, phrase)
  }

  if (scope === 'all') {
    if (include) {
      include
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
        .forEach(word => {
          query = query.or(`effect.ilike.%${word}%,highlight_effect.ilike.%${word}%`)
        })
    }

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

    if (phrase) {
      const p = phrase.trim()
      if (p) query = query.or(`effect.ilike.%${p}%,highlight_effect.ilike.%${p}%`)
    }

    return query
  }

  return applyTextFilters(query, 'effect', include, exclude, phrase)
}

// Supabase .not() expects a string value for array operators (cs/ov/etc).
// Build a Postgres array literal like: {"Attack","Stack Ongoing"}
function toPgArrayLiteral(items) {
  const arr = Array.isArray(items) ? items : []
  const escaped = arr
    .map(v => String(v ?? '').trim())
    .filter(Boolean)
    .map(v => `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
  return `{${escaped.join(',')}}`
}

export async function fetchCardById(cardId) {
  const { data, error } = await supabase
    .from('cards_flat')
    .select('*')
    .eq('card_id', String(cardId))

  if (error) throw error
  return data?.[0] ?? null
}

export async function fetchCardsByCardIds(cardIds = []) {
  const ids = Array.isArray(cardIds) ? cardIds.map(String).filter(Boolean) : []
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('cards_flat')
    .select('card_id,name,image_path,wcs_tier')
    .in('card_id', ids)

  if (error) throw error

  const byId = new Map((data || []).map(r => [r.card_id, r]))
  return ids.map(id => byId.get(id)).filter(Boolean)
}

/**
 * Fetch cards from Supabase with filters and pagination.
 *
 * Backward compatible signatures:
 *  - fetchFilteredCards(params, page, pageSize)
 * New signature:
 *  - fetchFilteredCards(params, { offset, limit })
 *
 * IMPORTANT:
 *  - In the browser, this function calls /api/cards (cached) to reduce PostgREST egress.
 *  - On the server, it queries Supabase directly.
 */
export async function fetchFilteredCards(params = {}, pageOrOpts = 1, pageSize = 24) {
  // ============================================================
  // CLIENT PATH: call our cached API route instead of PostgREST
  // ============================================================
  if (typeof window !== 'undefined') {
    const qs = new URLSearchParams()

    // Copy params into querystring
    for (const [k, v] of Object.entries(params || {})) {
      if (v == null) continue
      const s = String(v)
      if (!s) continue
      qs.set(k, s)
    }

    // Normalize pagination into offset/limit
    let offset = 0
    let limit = pageSize

    if (typeof pageOrOpts === 'object' && pageOrOpts) {
      offset = Number(pageOrOpts.offset ?? 0)
      limit = Number(pageOrOpts.limit ?? pageSize)
    } else {
      const page = Number(pageOrOpts || 1)
      offset = (page - 1) * pageSize
      limit = pageSize
    }

    qs.set('offset', String(Number.isFinite(offset) ? Math.max(0, offset) : 0))
    qs.set('limit', String(Number.isFinite(limit) ? Math.max(1, limit) : Math.max(1, pageSize)))

    const res = await fetch(`/api/cards?${qs.toString()}`)
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Cards API failed: ${res.status} ${res.statusText}${body ? ` — ${body}` : ''}`)
    }

    const json = await res.json()
    return {
      data: Array.isArray(json?.data) ? json.data : [],
      count: typeof json?.count === 'number' ? json.count : 0,
    }
  }

  // ============================================================
  // SERVER PATH: query Supabase directly (original behavior)
  // ============================================================
  const {
    set,
    sets,

    // legacy (compat)
    primary_type,
    primary_types,

    // NEW
    primary_types_inc,
    primary_types_exc,
    primary_types_inc_mode,
    primary_types_exc_mode,

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

    wcs_tier_min,
    wcs_tier_max,

    sort_by,
    sort_dir,

    // legacy (compat)
    keywords,

    // NEW
    keywords_inc,
    keywords_exc,

    subtypes,
    symbols,
    q,
    name_include,
    name_exclude,
    name_phrase,

    effect_include,
    effect_exclude,
    effect_phrase,
    effect_scope,
  } = params

  let query = supabase.from('cards_flat').select('*', { count: 'exact' })

  // Set filter
  const setList = []
  if (set) setList.push(set)
  if (sets) setList.push(...String(sets).split(',').map(s => s.trim()).filter(Boolean))

  const uniqueSets = [...new Set(setList)]
  if (uniqueSets.length > 0) {
    query = query.in('set', uniqueSets)
  }

  // WCS Tier
  if (wcs_tier_min !== undefined && wcs_tier_min !== '') {
    query = query.gte('wcs_tier', Number(wcs_tier_min))
  }
  if (wcs_tier_max !== undefined && wcs_tier_max !== '') {
    query = query.lte('wcs_tier', Number(wcs_tier_max))
  }

  // ============================================================
  // Primary Types (text[] column)
  //
  // INCLUDE:
  //  - mode=and => must include ALL selected
  //  - mode=or  => must include ANY selected
  //
  // EXCLUDE:
  //  - mode=or  => exclude if it matches ANY excluded type
  //  - mode=and => exclude only if it matches ALL excluded types
  // ============================================================
  const incMode = String(primary_types_inc_mode || 'and').toLowerCase() === 'or' ? 'or' : 'and'
  const excMode = String(primary_types_exc_mode || 'or').toLowerCase() === 'and' ? 'and' : 'or'

  const incList = []
  const excList = []

  // legacy include -> incList (treat as INCLUDE+AND)
  if (primary_type) incList.push(String(primary_type).trim())
  if (primary_types) {
    incList.push(
      ...String(primary_types)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    )
  }

  // new include/exclude
  if (primary_types_inc) {
    incList.push(
      ...String(primary_types_inc)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    )
  }
  if (primary_types_exc) {
    excList.push(
      ...String(primary_types_exc)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    )
  }

  const uniqueInc = [...new Set(incList)].filter(Boolean)
  const uniqueExc = [...new Set(excList)].filter(Boolean)

  // INCLUDE
  if (uniqueInc.length > 0) {
    if (incMode === 'or') query = query.overlaps('primary_types', uniqueInc)
    else query = query.contains('primary_types', uniqueInc)
  }

  // EXCLUDE
  if (uniqueExc.length > 0) {
    const lit = toPgArrayLiteral(uniqueExc)
    if (excMode === 'or') {
      query = query.not('primary_types', 'ov', lit)
    } else {
      query = query.not('primary_types', 'cs', lit)
    }
  }

  // Location filter
  if (card_location) {
    const loc = String(card_location).trim()
    if (loc) query = query.eq('card_location', loc)
  }

  // COST
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

  // XP
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

  // Multiple Attacks
  const multipleAttacks = attack_multi === '1'
  if (multipleAttacks) {
    query = query.gt('attack_count', 1)
  }

  // Generic search
  if (q) {
    const term = String(q).trim()
    if (term) query = query.or(`name.ilike.%${term}%,effect.ilike.%${term}%`)
  }

  // ============================================================
  // Keywords (text[] column)
  //
  // Include semantics: AND across included keywords (must have each)
  // Exclude semantics: must not have each excluded keyword
  // ============================================================
  const kwIncList = []
  if (keywords) {
    kwIncList.push(
      ...String(keywords)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    )
  }
  if (keywords_inc) {
    kwIncList.push(
      ...String(keywords_inc)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    )
  }

  const kwExcList = keywords_exc
    ? String(keywords_exc)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : []

  const uniqueKwInc = [...new Set(kwIncList)].filter(Boolean)
  const uniqueKwExc = [...new Set(kwExcList)].filter(Boolean)

  for (const k of uniqueKwInc) {
    query = query.contains('keywords', [k])
  }

  for (const k of uniqueKwExc) {
    query = query.not('keywords', 'cs', toPgArrayLiteral([k]))
  }

  // Subtypes
  if (subtypes) {
    String(subtypes)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(s => {
        query = query.contains('subtypes', [s])
      })
  }

  // Symbols
  if (symbols) {
    const sym = String(symbols).trim()
    if (sym === '__none__') {
      query = query.eq('symbols', '{}')
    } else if (sym) {
      query = query.contains('symbols', [sym])
    }
  }

  // Advanced text search
  query = applyTextFilters(query, 'name', name_include, name_exclude, name_phrase)
  query = applyEffectScopeFilters(query, effect_scope, effect_include, effect_exclude, effect_phrase)

  // Ordering
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
    query = query.order('xp_is_variable', { ascending: true })
    query = query.order('xp_value', { ascending: asc, nullsFirst: false })
    query = query.order('set_sort', { ascending: true })
    query = query.order('card_id', { ascending: true })
  } else {
    query = query.order('set_sort', { ascending: true })
    query = query.order('card_id', { ascending: true })
  }

  // Pagination: support both signatures
  let from = 0
  let to = 0

  if (typeof pageOrOpts === 'object' && pageOrOpts) {
    const offset = Number(pageOrOpts.offset ?? 0)
    const limit = Number(pageOrOpts.limit ?? pageSize)
    from = Math.max(0, offset)
    to = Math.max(from, from + Math.max(1, limit) - 1)
  } else {
    const page = Number(pageOrOpts || 1)
    from = (page - 1) * pageSize
    to = from + pageSize - 1
  }

  query = query.range(from, to)

  const { data, count, error } = await query
  if (error) throw error

  return { data, count }
}
