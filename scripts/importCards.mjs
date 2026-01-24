import 'dotenv/config'
import fs from 'node:fs'
import { parse } from 'csv-parse/sync'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const CSV_PATH = process.argv[2] || 'data/cards_import.csv'

// Customize if you prefer a different delimiter for “array” fields:
const LIST_DELIM = '|'

// These must match your DB tables:
const LOOKUP_TABLES = {
  primary_types: { table: 'primary_types', idCol: 'id', nameCol: 'name' },
  keywords: { table: 'keywords', idCol: 'id', nameCol: 'name' },
  subtypes: { table: 'subtypes', idCol: 'id', nameCol: 'name' },
  symbols: { table: 'symbols', idCol: 'id', nameCol: 'name' },
}

// Join tables (replace mode will delete these rows for the card)
const JOIN_TABLES = {
  primary_types: { table: 'card_primary_types', cardFk: 'card_id', lookupFk: 'primary_type_id' },
  keywords: { table: 'card_keywords', cardFk: 'card_id', lookupFk: 'keyword_id' },
  subtypes: { table: 'card_subtypes', cardFk: 'card_id', lookupFk: 'subtype_id' },
  symbols: { table: 'card_symbols', cardFk: 'card_id', lookupFk: 'symbol_id' },
}

function parseXp(v) {
  const raw = (v ?? '').toString().trim()
  if (!raw) return { xp_value: null, xp_is_variable: false }

  // Variable XP marker
  if (raw === '*') return { xp_value: null, xp_is_variable: true }

  // Numeric XP (can be negative)
  const n = Number(raw)
  if (Number.isFinite(n)) return { xp_value: Math.trunc(n), xp_is_variable: false }

  // If something unexpected shows up, fail loudly so it doesn't silently become null
  throw new Error(`Invalid XP value in CSV: "${raw}" (expected number, "*", or blank)`)
}

function toIntOrNull(v) {
  const s = (v ?? '').toString().trim()
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function toTextOrNull(v) {
  const s = (v ?? '').toString()
  if (s.trim() === '') return null

  return s
    .replace(/\r\n/g, '\n')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
}

function parseList(v) {
  const raw = (v ?? '').toString().trim()
  if (!raw) return []
  if (raw === '__none__') return []
  return raw
    .split(LIST_DELIM)
    .map(x => x.trim())
    .filter(Boolean)
    .filter(x => x !== '__none__')
}

function normalizeMultiline(v) {
  if (v == null) return null
  const s = String(v)
  const cleaned = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  return cleaned.length ? cleaned : null
}

function countAttacks(effect) {
  const text = (effect ?? '').toString()
  // Count exact occurrences of "Attack:" (case-sensitive)
  return (text.match(/Attack:/g) || []).length
}

/**
 * parse "related" into a JS array of card_id strings for Postgres text[].
 *
 * Supports:
 *  - Postgres array literal: {"PDB-011","GLI-003"}
 *  - Pipe-delimited: PDB-011|GLI-003
 *  - Comma-delimited: PDB-011, GLI-003
 */
function parseRelated(v) {
  const raw = (v ?? '').toString().trim()
  if (!raw) return []

  // Postgres array literal
  if (raw.startsWith('{') && raw.endsWith('}')) {
    const inner = raw.slice(1, -1).trim()
    if (!inner) return []
    return inner
      .split(',')
      .map(x => x.trim())
      .filter(Boolean)
      .map(x => x.replace(/^"+|"+$/g, '')) // strip surrounding quotes
      .map(x => x.trim())
      .filter(Boolean)
  }

  // Prefer your list delimiter if present
  if (raw.includes(LIST_DELIM)) {
    return raw
      .split(LIST_DELIM)
      .map(x => x.trim())
      .filter(Boolean)
  }

  // Fallback: commas
  return raw
    .split(',')
    .map(x => x.trim())
    .filter(Boolean)
}

function uniq(arr) {
  return [...new Set(arr)]
}

async function upsertLookups(kind, names) {
  const { table, nameCol } = LOOKUP_TABLES[kind]
  const unique = uniq(names).filter(Boolean)
  if (unique.length === 0) return

  const rows = unique.map(name => ({ [nameCol]: name }))
  const { error } = await supabase.from(table).upsert(rows, { onConflict: nameCol })
  if (error) throw error
}

async function loadLookupMap(kind, names) {
  const { table, idCol, nameCol } = LOOKUP_TABLES[kind]
  const unique = uniq(names).filter(Boolean)
  if (unique.length === 0) return new Map()

  const { data, error } = await supabase
    .from(table)
    .select(`${idCol},${nameCol}`)
    .in(nameCol, unique)

  if (error) throw error

  const m = new Map()
  for (const row of data || []) {
    m.set(row[nameCol], row[idCol])
  }

  const missing = unique.filter(n => !m.has(n))
  if (missing.length) {
    throw new Error(`Lookup resolution failed for ${kind}: missing [${missing.join(', ')}]`)
  }

  return m
}

async function upsertCards(cards) {
  const payload = cards.map(c => ({
    card_id: c.card_id,
    name: c.name,
    cost: c.cost,
    xp_value: c.xp_value,
    xp_is_variable: c.xp_is_variable,
    effect: c.effect,
    highlight_effect: c.highlight_effect,
    set: c.set,
    card_location: c.card_location,
    image_url: c.image_url,
    highlight_color: c.highlight_color,
    related: c.related,
    image_variants: c.image_variants,
    rules: c.rules,
    wcs_tier: c.wcs_tier,
    attack_count: c.attack_count,
  }))

  const { error } = await supabase.from('cards').upsert(payload, { onConflict: 'card_id' })
  if (error) throw error
}

async function fetchCardIdsByCardId(cardIds) {
  const unique = uniq(cardIds)
  const { data, error } = await supabase
    .from('cards')
    .select('id,card_id')
    .in('card_id', unique)

  if (error) throw error

  const map = new Map()
  for (const row of data || []) {
    map.set(row.card_id, row.id)
  }

  const missing = unique.filter(cid => !map.has(cid))
  if (missing.length) {
    throw new Error(`After upsert, these cards were not found in cards table: ${missing.join(', ')}`)
  }

  return map
}

async function replaceJoinRows(kind, cardUuid, lookupIds) {
  const { table, cardFk, lookupFk } = JOIN_TABLES[kind]

  const del = await supabase.from(table).delete().eq(cardFk, cardUuid)
  if (del.error) throw del.error

  if (!lookupIds.length) return

  const rows = lookupIds.map(id => ({
    [cardFk]: cardUuid,
    [lookupFk]: id,
  }))

  const ins = await supabase.from(table).insert(rows)
  if (ins.error) throw ins.error
}

function readCsv(path) {
  const csvText = fs.readFileSync(path, 'utf8')
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true,
  })
  return records
}

async function main() {
  console.log(`Reading CSV: ${CSV_PATH}`)
  const rows = readCsv(CSV_PATH)

  // For quick validation: which card_ids exist in this import file?
  const importCardIdSet = new Set(rows.map(r => (r.card_id ?? '').toString().trim()).filter(Boolean))

  const cards = rows.map((r, idx) => {
    const card_id = (r.card_id ?? '').toString().trim()
    if (!card_id) throw new Error(`CSV row ${idx + 2} missing card_id`)

    const related = uniq(parseRelated(r.related)).filter(x => x !== card_id) // prevent self-link

    // Optional: warn if related points to a card_id not in this CSV
    const missingLocal = related.filter(x => !importCardIdSet.has(x))
    if (missingLocal.length) {
      console.warn(
        `Warning row ${idx + 2} (${card_id}): related ids not found in this CSV: ${missingLocal.join(', ')}`
      )
    }

    const xp = parseXp(r.xp)
    const effect = toTextOrNull(r.effect)

    return {
      card_id,
      name: toTextOrNull(r.name),
      cost: toIntOrNull(r.cost),

      xp_value: xp.xp_value,
      xp_is_variable: xp.xp_is_variable,

      effect,
      highlight_effect: toTextOrNull(r.highlight_effect),
      set: toTextOrNull(r.set),
      card_location: toTextOrNull(r.card_location),
      image_url: toTextOrNull(r.image_url),
      highlight_color: toTextOrNull(r.highlight_color),
      image_variants: parseList(r.image_variants),

      related,

      primary_types: parseList(r.primary_types),
      keywords: parseList(r.keywords),
      subtypes: parseList(r.subtypes),
      symbols: parseList(r.symbols),

      rules: normalizeMultiline(r.rules),
	    wcs_tier: toIntOrNull(r.wcs_tier),
      attack_count: countAttacks(effect),
    }
  })

  console.log(`Upserting ${cards.length} cards...`)
  await upsertCards(cards)

  const cardIdToUuid = await fetchCardIdsByCardId(cards.map(c => c.card_id))

  const allPrimaryTypes = cards.flatMap(c => c.primary_types)
  const allKeywords = cards.flatMap(c => c.keywords)
  const allSubtypes = cards.flatMap(c => c.subtypes)
  const allSymbols = cards.flatMap(c => c.symbols)

  console.log('Upserting lookup values...')
  await upsertLookups('primary_types', allPrimaryTypes)
  await upsertLookups('keywords', allKeywords)
  await upsertLookups('subtypes', allSubtypes)
  await upsertLookups('symbols', allSymbols)

  console.log('Loading lookup maps...')
  const primaryTypeMap = await loadLookupMap('primary_types', allPrimaryTypes)
  const keywordMap = await loadLookupMap('keywords', allKeywords)
  const subtypeMap = await loadLookupMap('subtypes', allSubtypes)
  const symbolMap = await loadLookupMap('symbols', allSymbols)

  console.log('Replacing join rows per card...')
  for (const c of cards) {
    const cardUuid = cardIdToUuid.get(c.card_id)

    const ptIds = uniq(c.primary_types).map(n => primaryTypeMap.get(n)).filter(Boolean)
    const kwIds = uniq(c.keywords).map(n => keywordMap.get(n)).filter(Boolean)
    const stIds = uniq(c.subtypes).map(n => subtypeMap.get(n)).filter(Boolean)
    const symIds = uniq(c.symbols).map(n => symbolMap.get(n)).filter(Boolean)

    await replaceJoinRows('primary_types', cardUuid, ptIds)
    await replaceJoinRows('keywords', cardUuid, kwIds)
    await replaceJoinRows('subtypes', cardUuid, stIds)
    await replaceJoinRows('symbols', cardUuid, symIds)
  }

  console.log('Import complete.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
