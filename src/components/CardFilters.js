'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Slider from 'rc-slider'
import 'rc-slider/assets/index.css'

function CollapsibleHeader({ title, isOpen, onToggle, rightSlot, subtitle }) {
  return (
    <div className="w-full flex items-center justify-between gap-3 mb-1" suppressHydrationWarning>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
        aria-expanded={isOpen}
        className="flex-1 min-w-0 text-left cursor-pointer select-none"
      >
        <div className="text-sm font-medium flex items-center gap-2">
          <span>{title}</span>
          <span className="text-zinc-400">{isOpen ? '▲' : '▼'}</span>
        </div>

        {subtitle ? <div className="text-xs text-zinc-400 mt-1">{subtitle}</div> : null}
      </div>

      {rightSlot ? <div onClick={e => e.stopPropagation()}>{rightSlot}</div> : null}
    </div>
  )
}

function csvToList(raw) {
  return String(raw || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

function listToCsv(list) {
  return Array.isArray(list) && list.length ? list.join(',') : ''
}

// Small debounce hook (no external deps)
function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

export default function CardFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [setsOpen, setSetsOpen] = useState(false)
  const setsRef = useRef(null)

  // Primary Types dropdown state + outside click
  const [typesOpen, setTypesOpen] = useState(false)
  const typesRef = useRef(null)

  // Collapsible sections
  const [subtypesOpen, setSubtypesOpen] = useState(false)
  const [keywordsOpen, setKeywordsOpen] = useState(false)
  const [costOpen, setCostOpen] = useState(false)
  const [xpOpen, setXpOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // ---- COST slider config ----
  const COST_MIN_LIMIT = 0
  const COST_MAX_LIMIT = 16

  // ---- XP slider config ----
  const XP_MIN_LIMIT = -2
  const XP_MAX_LIMIT = 10

  // ---- WCS TIER slider config ----
  const WCS_TIER_MIN_LIMIT = 2
  const WCS_TIER_MAX_LIMIT = 7

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n))
  }

  // marks (ticks only — no labels)
  const COST_MARKS = useMemo(() => {
    const m = {}
    for (let i = COST_MIN_LIMIT; i <= COST_MAX_LIMIT; i++) m[i] = ''
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const XP_MARKS = useMemo(() => {
    const m = {}
    for (let i = XP_MIN_LIMIT; i <= XP_MAX_LIMIT; i++) m[i] = ''
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const WCS_TIER_MARKS = useMemo(() => {
    const m = {}
    for (let i = WCS_TIER_MIN_LIMIT; i <= WCS_TIER_MAX_LIMIT; i++) m[i] = ''
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateParam(key, value) {
    const params = new URLSearchParams(searchParams.toString())

    if (!value || (Array.isArray(value) && value.length === 0)) {
      params.delete(key)
    } else if (Array.isArray(value)) {
      params.set(key, value.join(','))
    } else {
      params.set(key, value)
    }

    params.delete('page')
    const qs = params.toString()
    router.push(qs ? `/cards?${qs}` : '/cards')
  }

  function updateParams(mutator) {
    const params = new URLSearchParams(searchParams.toString())
    mutator(params)
    params.delete('page')
    const qs = params.toString()
    router.push(qs ? `/cards?${qs}` : '/cards')
  }

  function getMulti(key) {
    return searchParams.get(key)?.split(',') || []
  }

  function toggleMulti(key, value) {
    const current = getMulti(key)
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
    updateParam(key, next)
  }

  // Multiple Attacks checkbox (attack_count > 1)
  const multipleAttacks = searchParams.get('attack_multi') === '1'
  function toggleMultipleAttacks(checked) {
    updateParam('attack_multi', checked ? '1' : '')
  }

  // Auto-close sets panel on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (setsOpen && setsRef.current && !setsRef.current.contains(event.target)) {
        setSetsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [setsOpen])

  // Auto-close types panel on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (typesOpen && typesRef.current && !typesRef.current.contains(event.target)) {
        setTypesOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [typesOpen])

  const SET_OPTIONS = [
    { code: '[PDB]', name: 'Pokémon Deckbuilding Game' },
    { code: '[GLI]', name: "Gym Leaders' Challenge: Indigo League" },
    { code: '[JOJ]', name: 'The Johto Journeys' },
    { code: '[GLJ]', name: "Gym Leaders' Challenge: Johto League" },
    { code: '[THC]', name: 'The Hoenn Chapter' },
    { code: '[MEV]', name: 'Mega Evolved!' },
    { code: '[TSR]', name: 'The Sinnoh Region' },
    { code: '[GLS]', name: "Gym Leaders' Challenge: Sinnoh League" },
    { code: '[AIU]', name: 'Adventures in Unova' },
    { code: '[GLU]', name: "Gym Leaders' Challenge: Unova League" },
    { code: '[KAQ]', name: 'Kalos Quest' },
    { code: '[GLK]', name: "Gym Leaders' Challenge: Kalos League" },
    { code: '[S&M]', name: 'Sun & Moon' },
    { code: '[USM]', name: 'Ultra Sun & Moon' },
    { code: '[S&S]', name: 'Sword & Shield' },
    { code: '[WCS]', name: 'World Championships' },
  ]

  // NOTE: "__none__" is a sentinel meaning: primary_types IS NULL (per your request).
  const TYPE_OPTIONS = [
    { value: 'Pokemon', label: 'Pokemon' },
    { value: 'Move', label: 'Move' },
    { value: 'Item', label: 'Item' },
    { value: 'Trainer', label: 'Trainer' },
    { value: 'Challenge', label: 'Challenge' },
    { value: 'Encounter', label: 'Encounter' },
    { value: 'Starter', label: 'Starter' },
    { value: 'Status Condition', label: 'Status Condition' },
    { value: 'TM / HM', label: 'TM / HM' },
    { value: '__none__', label: 'None' },
  ]

  const KEYWORDS = [
    'Attack',
    'Defense',
    'Encounter Attack',
    'Evolve',
    'Learn',
    'Ongoing',
    'Stack Ongoing',
    'Z-Move',
  ]

  const SUBTYPES = [
    'Evolved',
    'Legendary',
    'Mythical',
    'Primal',
    'Unique',
    'Ultra Beast',
    'Mega',
    'ACE SPEC',
    'Weather',
  ]

  const LOCATIONS = [
    'Setup',
    'Main Deck',
    'Poison/Status Condition Stack',
    'Potion Stack',
    'Challenge Stack',
    'Evolution Stack',
    'Mythical Pokemon Stack',
    'Mega Evolution Stack',
    'Ultra Beast Stack',
    'Max Raid Stack',
  ]

  const SYMBOLS = [
    'Mega Symbol',
    'MAX Symbol',
    'Poke Ball',
    'Beast Ball',
    'Team Rocket',
    'Team Aqua',
    'Team Magma',
    'Team Galactic',
    'Team Plasma',
    'Team Flare',
    'Team Skull',
    'Team Rainbow Rocket',
    'Team Yell',
    'Team Star',
    'Team Break',
  ]

  const selectedSetsCount = getMulti('sets').length

  // ============================================================
  // Debounced text filters (Name + Effect)
  // ============================================================
  const [nameIncludeDraft, setNameIncludeDraft] = useState(searchParams.get('name_include') || '')
  const [nameExcludeDraft, setNameExcludeDraft] = useState(searchParams.get('name_exclude') || '')
  const [namePhraseDraft, setNamePhraseDraft] = useState(searchParams.get('name_phrase') || '')

  const [effectIncludeDraft, setEffectIncludeDraft] = useState(searchParams.get('effect_include') || '')
  const [effectExcludeDraft, setEffectExcludeDraft] = useState(searchParams.get('effect_exclude') || '')
  const [effectPhraseDraft, setEffectPhraseDraft] = useState(searchParams.get('effect_phrase') || '')

  // Keep drafts in sync if URL changes via chips/back/forward/clear buttons.
  useEffect(() => setNameIncludeDraft(searchParams.get('name_include') || ''), [searchParams])
  useEffect(() => setNameExcludeDraft(searchParams.get('name_exclude') || ''), [searchParams])
  useEffect(() => setNamePhraseDraft(searchParams.get('name_phrase') || ''), [searchParams])

  useEffect(() => setEffectIncludeDraft(searchParams.get('effect_include') || ''), [searchParams])
  useEffect(() => setEffectExcludeDraft(searchParams.get('effect_exclude') || ''), [searchParams])
  useEffect(() => setEffectPhraseDraft(searchParams.get('effect_phrase') || ''), [searchParams])

  const DEBOUNCE_MS = 350

  const nameIncludeDebounced = useDebouncedValue(nameIncludeDraft, DEBOUNCE_MS)
  const nameExcludeDebounced = useDebouncedValue(nameExcludeDraft, DEBOUNCE_MS)
  const namePhraseDebounced = useDebouncedValue(namePhraseDraft, DEBOUNCE_MS)

  const effectIncludeDebounced = useDebouncedValue(effectIncludeDraft, DEBOUNCE_MS)
  const effectExcludeDebounced = useDebouncedValue(effectExcludeDraft, DEBOUNCE_MS)
  const effectPhraseDebounced = useDebouncedValue(effectPhraseDraft, DEBOUNCE_MS)

  // Commit debounced values to URL, but only if they differ from current URL.
  useEffect(() => {
    const current = searchParams.get('name_include') || ''
    if (nameIncludeDebounced !== current) updateParam('name_include', nameIncludeDebounced)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameIncludeDebounced])

  useEffect(() => {
    const current = searchParams.get('name_exclude') || ''
    if (nameExcludeDebounced !== current) updateParam('name_exclude', nameExcludeDebounced)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameExcludeDebounced])

  useEffect(() => {
    const current = searchParams.get('name_phrase') || ''
    if (namePhraseDebounced !== current) updateParam('name_phrase', namePhraseDebounced)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namePhraseDebounced])

  useEffect(() => {
    const current = searchParams.get('effect_include') || ''
    if (effectIncludeDebounced !== current) updateParam('effect_include', effectIncludeDebounced)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectIncludeDebounced])

  useEffect(() => {
    const current = searchParams.get('effect_exclude') || ''
    if (effectExcludeDebounced !== current) updateParam('effect_exclude', effectExcludeDebounced)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectExcludeDebounced])

  useEffect(() => {
    const current = searchParams.get('effect_phrase') || ''
    if (effectPhraseDebounced !== current) updateParam('effect_phrase', effectPhraseDebounced)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectPhraseDebounced])

  // ============================================================
  // Primary Types include/exclude + mode
  // Params:
  //  - primary_types_inc: CSV
  //  - primary_types_exc: CSV
  //  - primary_types_inc_mode: 'and'|'or' (default 'and')
  //  - primary_types_exc_mode: 'and'|'or' (default 'or')
  // ============================================================
  const typesInc = getMulti('primary_types_inc')
  const typesExc = getMulti('primary_types_exc')
  const typesIncMode =
    (searchParams.get('primary_types_inc_mode') || 'and').toLowerCase() === 'or' ? 'or' : 'and'
  const typesExcMode =
    (searchParams.get('primary_types_exc_mode') || 'or').toLowerCase() === 'and' ? 'and' : 'or'

  const typesSelectedCount = typesInc.length + typesExc.length

  function toggleTypeInSection(sectionKey, typeValue) {
    updateParams(params => {
      const cur = csvToList(params.get(sectionKey))
      const next = cur.includes(typeValue) ? cur.filter(t => t !== typeValue) : [...cur, typeValue]
      if (next.length === 0) params.delete(sectionKey)
      else params.set(sectionKey, listToCsv(next))
    })
  }

  function setTypeMode(modeKey, nextMode) {
    updateParams(params => {
      const m = nextMode === 'or' ? 'or' : 'and'
      const hasAny =
        csvToList(params.get('primary_types_inc')).length > 0 ||
        csvToList(params.get('primary_types_exc')).length > 0

      const isDefault =
        (modeKey === 'primary_types_inc_mode' && m === 'and') ||
        (modeKey === 'primary_types_exc_mode' && m === 'or')

      if (!hasAny && isDefault) params.delete(modeKey)
      else params.set(modeKey, m)
    })
  }

  function clearPrimaryTypes() {
    updateParams(params => {
      params.delete('primary_types_inc')
      params.delete('primary_types_exc')
      params.delete('primary_types_inc_mode')
      params.delete('primary_types_exc_mode')
      // legacy cleanup
      params.delete('primary_type')
      params.delete('primary_types')
    })
  }

  // ============================================================
  // Keywords tristate include/exclude
  // Params:
  //  - keywords_inc: CSV
  //  - keywords_exc: CSV
  // ============================================================
  const kwInc = getMulti('keywords_inc')
  const kwExc = getMulti('keywords_exc')

  function getKeywordState(k) {
    if (kwInc.includes(k)) return 'inc'
    if (kwExc.includes(k)) return 'exc'
    return 'none'
  }

  function cycleKeyword(k) {
    updateParams(params => {
      const inc = csvToList(params.get('keywords_inc'))
      const exc = csvToList(params.get('keywords_exc'))

      const inInc = inc.includes(k)
      const inExc = exc.includes(k)

      // none -> inc -> exc -> none
      let nextInc = inc
      let nextExc = exc

      if (!inInc && !inExc) {
        nextInc = [...inc, k]
      } else if (inInc) {
        nextInc = inc.filter(x => x !== k)
        nextExc = [...exc, k]
      } else {
        nextExc = exc.filter(x => x !== k)
      }

      if (nextInc.length) params.set('keywords_inc', listToCsv(nextInc))
      else params.delete('keywords_inc')

      if (nextExc.length) params.set('keywords_exc', listToCsv(nextExc))
      else params.delete('keywords_exc')

      // legacy cleanup
      params.delete('keywords')
    })
  }

  // ============================================================
  // WCS Tier: URL <-> local Range state (+ enabled toggle)
  // ============================================================
  const wcsTierEnabled = searchParams.get('wcs_tier') === 'true'

  const urlWcsMinRaw = searchParams.get('wcs_tier_min')
  const urlWcsMaxRaw = searchParams.get('wcs_tier_max')

  const hasWcsMin = urlWcsMinRaw !== null && urlWcsMinRaw !== ''
  const hasWcsMax = urlWcsMaxRaw !== null && urlWcsMaxRaw !== ''

  const urlWcsMin = hasWcsMin
    ? clamp(Number(urlWcsMinRaw), WCS_TIER_MIN_LIMIT, WCS_TIER_MAX_LIMIT)
    : WCS_TIER_MIN_LIMIT

  const urlWcsMax = hasWcsMax
    ? clamp(Number(urlWcsMaxRaw), WCS_TIER_MIN_LIMIT, WCS_TIER_MAX_LIMIT)
    : WCS_TIER_MAX_LIMIT

  const [wcsTierRange, setWcsTierRange] = useState([urlWcsMin, urlWcsMax])

  useEffect(() => {
    setWcsTierRange([urlWcsMin, urlWcsMax])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlWcsMinRaw, urlWcsMaxRaw])

  const wcsLo = Math.min(wcsTierRange[0], wcsTierRange[1])
  const wcsHi = Math.max(wcsTierRange[0], wcsTierRange[1])

  function setWcsTierParams({ lo, hi }) {
    updateParams(params => {
      const loN = clamp(Math.round(lo), WCS_TIER_MIN_LIMIT, WCS_TIER_MAX_LIMIT)
      const hiN = clamp(Math.round(hi), WCS_TIER_MIN_LIMIT, WCS_TIER_MAX_LIMIT)

      const loFinal = Math.min(loN, hiN)
      const hiFinal = Math.max(loN, hiN)

      params.set('wcs_tier', 'true')
      params.set('wcs_tier_min', String(loFinal))
      params.set('wcs_tier_max', String(hiFinal))
    })
  }

  function setWcsTierEnabled(nextEnabled) {
    if (nextEnabled) {
      setWcsTierParams({ lo: wcsTierRange[0], hi: wcsTierRange[1] })
    } else {
      updateParams(params => {
        params.delete('wcs_tier')
        params.delete('wcs_tier_min')
        params.delete('wcs_tier_max')
      })
    }
  }

  function resetWcsTierFilter() {
    setWcsTierRange([WCS_TIER_MIN_LIMIT, WCS_TIER_MAX_LIMIT])
    if (!wcsTierEnabled) return
    setWcsTierParams({ lo: WCS_TIER_MIN_LIMIT, hi: WCS_TIER_MAX_LIMIT })
  }

  // ============================================================
  // COST: URL <-> local Range state
  // ============================================================
  const urlCostMinRaw = searchParams.get('cost_min')
  const urlCostMaxRaw = searchParams.get('cost_max')

  const hasCostMin = urlCostMinRaw !== null && urlCostMinRaw !== ''
  const hasCostMax = urlCostMaxRaw !== null && urlCostMaxRaw !== ''

  const urlCostMin = hasCostMin
    ? clamp(Number(urlCostMinRaw), COST_MIN_LIMIT, COST_MAX_LIMIT)
    : COST_MIN_LIMIT
  const urlCostMax = hasCostMax
    ? clamp(Number(urlCostMaxRaw), COST_MIN_LIMIT, COST_MAX_LIMIT)
    : COST_MAX_LIMIT

  const [costRange, setCostRange] = useState([urlCostMin, urlCostMax])

  useEffect(() => {
    setCostRange([urlCostMin, urlCostMax])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCostMinRaw, urlCostMaxRaw])

  const includeCostNull = searchParams.get('cost_include_null') === '1'
  const onlyCostNull = searchParams.get('cost_only_null') === '1'

  useEffect(() => {
    const min = costRange[0]
    if (min > 0 && includeCostNull) {
      updateParam('cost_include_null', '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costRange[0]])

  function setCostParams({ lo, hi, includeNull, onlyNull }) {
    updateParams(params => {
      if (onlyNull) {
        params.set('cost_only_null', '1')
        params.delete('cost_include_null')
        params.delete('cost_min')
        params.delete('cost_max')
        return
      } else {
        params.delete('cost_only_null')
      }

      const loN = clamp(Math.round(lo), COST_MIN_LIMIT, COST_MAX_LIMIT)
      const hiN = clamp(Math.round(hi), COST_MIN_LIMIT, COST_MAX_LIMIT)

      const loFinal = Math.min(loN, hiN)
      const hiFinal = Math.max(loN, hiN)

      if (loFinal === COST_MIN_LIMIT) params.delete('cost_min')
      else params.set('cost_min', String(loFinal))

      if (hiFinal === COST_MAX_LIMIT) params.delete('cost_max')
      else params.set('cost_max', String(hiFinal))

      if (includeNull && loFinal === COST_MIN_LIMIT) params.set('cost_include_null', '1')
      else params.delete('cost_include_null')
    })
  }

  function toggleCostNull(checked) {
    setCostParams({
      lo: costRange[0],
      hi: costRange[1],
      includeNull: checked,
      onlyNull: false,
    })
  }

  function toggleOnlyCostNull(checked) {
    setCostParams({
      lo: costRange[0],
      hi: costRange[1],
      includeNull: includeCostNull,
      onlyNull: checked,
    })
  }

  function resetCostFilter() {
    setCostRange([COST_MIN_LIMIT, COST_MAX_LIMIT])
    updateParams(params => {
      params.delete('cost_min')
      params.delete('cost_max')
      params.delete('cost_include_null')
      params.delete('cost_only_null')
    })
  }

  const costLo = Math.min(costRange[0], costRange[1])
  const costHi = Math.max(costRange[0], costRange[1])

  // ============================================================
  // XP: URL <-> local Range state (+ null + variable "*")
  // ============================================================
  const urlXpMinRaw = searchParams.get('xp_min')
  const urlXpMaxRaw = searchParams.get('xp_max')

  const hasXpMin = urlXpMinRaw !== null && urlXpMinRaw !== ''
  const hasXpMax = urlXpMaxRaw !== null && urlXpMaxRaw !== ''

  const urlXpMin = hasXpMin ? clamp(Number(urlXpMinRaw), XP_MIN_LIMIT, XP_MAX_LIMIT) : XP_MIN_LIMIT
  const urlXpMax = hasXpMax ? clamp(Number(urlXpMaxRaw), XP_MIN_LIMIT, XP_MAX_LIMIT) : XP_MAX_LIMIT

  const [xpRange, setXpRange] = useState([urlXpMin, urlXpMax])

  useEffect(() => {
    setXpRange([urlXpMin, urlXpMax])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlXpMinRaw, urlXpMaxRaw])

  const includeXpNull = searchParams.get('xp_include_null') === '1'
  const onlyXpNull = searchParams.get('xp_only_null') === '1'
  const includeXpVariable = searchParams.get('xp_include_variable') === '1'
  const onlyXpVariable = searchParams.get('xp_only_variable') === '1'

  const xpLo = Math.min(xpRange[0], xpRange[1])
  const xpHi = Math.max(xpRange[0], xpRange[1])
  const xpRangeIncludesZero = xpLo <= 0 && xpHi >= 0

  useEffect(() => {
    if (!xpRangeIncludesZero && includeXpNull) {
      updateParams(params => {
        params.delete('xp_include_null')
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xpLo, xpHi, includeXpNull])

  function setXpParams({ lo, hi, includeNull, onlyNull, includeVariable, onlyVariable }) {
    updateParams(params => {
      if (onlyNull) {
        params.set('xp_only_null', '1')
        params.delete('xp_only_variable')
        params.delete('xp_include_null')
        params.delete('xp_include_variable')
        params.delete('xp_min')
        params.delete('xp_max')
        return
      } else {
        params.delete('xp_only_null')
      }

      if (onlyVariable) {
        params.set('xp_only_variable', '1')
        params.delete('xp_only_null')
        params.delete('xp_include_null')
        params.delete('xp_include_variable')
        params.delete('xp_min')
        params.delete('xp_max')
        return
      } else {
        params.delete('xp_only_variable')
      }

      const loN = clamp(Math.round(lo), XP_MIN_LIMIT, XP_MAX_LIMIT)
      const hiN = clamp(Math.round(hi), XP_MIN_LIMIT, XP_MAX_LIMIT)

      const loFinal = Math.min(loN, hiN)
      const hiFinal = Math.max(loN, hiN)

      if (loFinal === XP_MIN_LIMIT) params.delete('xp_min')
      else params.set('xp_min', String(loFinal))

      if (hiFinal === XP_MAX_LIMIT) params.delete('xp_max')
      else params.set('xp_max', String(hiFinal))

      if (includeNull && loFinal <= 0 && hiFinal >= 0) params.set('xp_include_null', '1')
      else params.delete('xp_include_null')

      if (includeVariable) params.set('xp_include_variable', '1')
      else params.delete('xp_include_variable')
    })
  }

  function toggleXpNull(checked) {
    setXpParams({
      lo: xpRange[0],
      hi: xpRange[1],
      includeNull: checked,
      onlyNull: false,
      includeVariable: includeXpVariable,
      onlyVariable: false,
    })
  }

  function toggleOnlyXpNull(checked) {
    setXpParams({
      lo: xpRange[0],
      hi: xpRange[1],
      includeNull: includeXpNull,
      onlyNull: checked,
      includeVariable: includeXpVariable,
      onlyVariable: false,
    })
  }

  function toggleXpVariable(checked) {
    setXpParams({
      lo: xpRange[0],
      hi: xpRange[1],
      includeNull: includeXpNull,
      onlyNull: false,
      includeVariable: checked,
      onlyVariable: false,
    })
  }

  function toggleOnlyXpVariable(checked) {
    setXpParams({
      lo: xpRange[0],
      hi: xpRange[1],
      includeNull: includeXpNull,
      onlyNull: false,
      includeVariable: includeXpVariable,
      onlyVariable: checked,
    })
  }

  function resetXpFilter() {
    setXpRange([XP_MIN_LIMIT, XP_MAX_LIMIT])
    updateParams(params => {
      params.delete('xp_min')
      params.delete('xp_max')
      params.delete('xp_include_null')
      params.delete('xp_only_null')
      params.delete('xp_include_variable')
      params.delete('xp_only_variable')
    })
  }

  // Clear helpers
  function clearSubtypes() {
    updateParam('subtypes', [])
  }

  function clearKeywords() {
    updateParams(params => {
      params.delete('keywords_inc')
      params.delete('keywords_exc')
      params.delete('attack_multi')
      // legacy cleanup
      params.delete('keywords')
    })
  }

  function clearLocation() {
    updateParam('card_location', '')
  }

  function clearSymbols() {
    updateParam('symbols', '')
  }

  function clearAdvanced() {
    updateParams(params => {
      params.delete('wcs_tier')
      params.delete('wcs_tier_min')
      params.delete('wcs_tier_max')
      params.delete('card_location')
      params.delete('symbols')
    })
  }

  // ============================================================
  // Effect search mode
  // ============================================================
  const effectScope = searchParams.get('effect_scope') || ''
  const includeHighlightedText = effectScope === 'all'
  const onlyHighlightedText = effectScope === 'highlight'

  function setEffectScope(nextScope) {
    updateParams(params => {
      if (!nextScope) params.delete('effect_scope')
      else params.set('effect_scope', nextScope)
    })
  }

  function toggleIncludeHighlightedText(checked) {
    if (checked) setEffectScope('all')
    else setEffectScope('')
  }

  function toggleOnlyHighlightedText(checked) {
    if (checked) setEffectScope('highlight')
    else setEffectScope('')
  }

  const advancedActiveCount =
    (wcsTierEnabled ? 1 : 0) +
    (Boolean(searchParams.get('card_location')) ? 1 : 0) +
    (Boolean(searchParams.get('symbols')) ? 1 : 0)

  return (
    <div className="w-full md:w-80 border rounded p-4 md:h-full overflow-y-auto">
      {/* Name Text Search */}
      <div className="mb-4">
        <div className="text-sm font-medium mb-1">Name Search</div>
        <input
          className="w-full border p-1 mb-2 text-sm text-black placeholder:text-zinc-400"
          placeholder="Include (comma-separated)"
          value={nameIncludeDraft}
          onChange={e => setNameIncludeDraft(e.target.value)}
        />
        <input
          className="w-full border p-1 mb-2 text-sm text-black placeholder:text-zinc-400"
          placeholder="Exclude (comma-separated)"
          value={nameExcludeDraft}
          onChange={e => setNameExcludeDraft(e.target.value)}
        />
        <input
          className="w-full border p-1 text-sm text-black placeholder:text-zinc-400"
          placeholder="Exact phrase"
          value={namePhraseDraft}
          onChange={e => setNamePhraseDraft(e.target.value)}
        />
      </div>

      {/* Sets (OR) — collapsible, wrapped, auto-close */}
      <div className="mb-4" ref={setsRef}>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium">Sets</label>

          <button
            type="button"
            onClick={() => updateParam('sets', [])}
            className="text-xs text-zinc-400 hover:text-zinc-200"
            title="Clear set selections"
          >
            Clear
          </button>
        </div>

        <button
          type="button"
          onClick={() => setSetsOpen(o => !o)}
          className="w-full rounded border border-zinc-300 bg-white px-2 py-2 text-left text-sm text-black hover:bg-zinc-50 flex items-center justify-between"
          aria-expanded={setsOpen}
        >
          <span className="pr-2">
            {selectedSetsCount === 0
              ? 'All sets'
              : `${selectedSetsCount} set${selectedSetsCount === 1 ? '' : 's'} selected`}
          </span>

          <span className="text-zinc-500">{setsOpen ? '▲' : '▼'}</span>
        </button>

        {setsOpen && (
          <div className="mt-2 rounded border border-zinc-300 bg-white p-2">
            <div className="max-h-48 overflow-y-auto pr-1 pb-2">
              <div className="space-y-2">
                {SET_OPTIONS.map(s => {
                  const checked = getMulti('sets').includes(s.code)

                  return (
                    <label key={s.code} className="flex items-start gap-2 text-sm text-black">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        onChange={() => toggleMulti('sets', s.code)}
                      />
                      <span className="leading-snug">
                        <span className="font-medium">{s.code}</span>
                        <span className="text-zinc-700"> — {s.name}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="mt-3 flex gap-2 border-t border-zinc-200 pt-3">
              <button
                type="button"
                onClick={() => setSetsOpen(false)}
                className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-100 hover:bg-zinc-700"
              >
                Done
              </button>

              <button
                type="button"
                onClick={() => updateParam('sets', [])}
                className="rounded bg-zinc-200 px-2 py-1 text-xs text-black hover:bg-zinc-300"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="mt-1 text-xs text-zinc-400">Select one or more sets</div>
      </div>

      {/* Primary Type (Include/Exclude + AND/OR modes) */}
      <div className="mb-4" ref={typesRef}>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium">Primary Type</label>

          <button
            type="button"
            onClick={clearPrimaryTypes}
            className="text-xs text-zinc-400 hover:text-zinc-200"
            title="Clear primary type selections"
          >
            Clear
          </button>
        </div>

        <button
          type="button"
          onClick={() => setTypesOpen(o => !o)}
          className="w-full rounded border border-zinc-300 bg-white px-2 py-2 text-left text-sm text-black hover:bg-zinc-50 flex items-center justify-between"
          aria-expanded={typesOpen}
        >
          <span className="pr-2">
            {typesSelectedCount === 0 ? 'Any' : `${typesInc.length} include / ${typesExc.length} exclude`}
          </span>

          <span className="text-zinc-500">{typesOpen ? '▲' : '▼'}</span>
        </button>

        {typesOpen && (
          <div className="mt-2 rounded border border-zinc-300 bg-white p-2">
            {/* INCLUDE */}
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-zinc-700">INCLUDE</div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-500">Mode</span>
                <button
                  type="button"
                  onClick={() =>
                    setTypeMode('primary_types_inc_mode', typesIncMode === 'and' ? 'or' : 'and')
                  }
                  className="rounded border border-zinc-300 px-2 py-1 text-[11px] text-black hover:bg-zinc-50"
                  title="Toggle include mode"
                >
                  {typesIncMode.toUpperCase()}
                </button>
              </div>
            </div>

            <div className="mt-2 max-h-40 overflow-y-auto pr-1 pb-2">
              <div className="space-y-2">
                {TYPE_OPTIONS.map(opt => {
                  const checked = typesInc.includes(opt.value)
                  return (
                    <label key={`inc:${opt.value}`} className="flex items-start gap-2 text-sm text-black">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        onChange={() => toggleTypeInSection('primary_types_inc', opt.value)}
                      />
                      <span className="leading-snug">{opt.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="my-3 border-t border-zinc-200" />

            {/* EXCLUDE */}
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-zinc-700">EXCLUDE</div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-500">Mode</span>
                <button
                  type="button"
                  onClick={() =>
                    setTypeMode('primary_types_exc_mode', typesExcMode === 'and' ? 'or' : 'and')
                  }
                  className="rounded border border-zinc-300 px-2 py-1 text-[11px] text-black hover:bg-zinc-50"
                  title="Toggle exclude mode"
                >
                  {typesExcMode.toUpperCase()}
                </button>
              </div>
            </div>

            <div className="mt-2 max-h-40 overflow-y-auto pr-1 pb-2">
              <div className="space-y-2">
                {TYPE_OPTIONS.map(opt => {
                  const checked = typesExc.includes(opt.value)
                  return (
                    <label key={`exc:${opt.value}`} className="flex items-start gap-2 text-sm text-black">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        onChange={() => toggleTypeInSection('primary_types_exc', opt.value)}
                      />
                      <span className="leading-snug">{opt.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="mt-3 flex gap-2 border-t border-zinc-200 pt-3">
              <button
                type="button"
                onClick={() => setTypesOpen(false)}
                className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-100 hover:bg-zinc-700"
              >
                Done
              </button>

              <button
                type="button"
                onClick={clearPrimaryTypes}
                className="rounded bg-zinc-200 px-2 py-1 text-xs text-black hover:bg-zinc-300"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="mt-1 text-xs text-zinc-400">Include + exclude types with AND/OR mode</div>
      </div>

      {/* Sub-types (collapsible) */}
      <div className="mb-4">
        <CollapsibleHeader
          title="Sub-types"
          isOpen={subtypesOpen}
          onToggle={() => setSubtypesOpen(o => !o)}
          subtitle={!subtypesOpen ? `${getMulti('subtypes').length} selected` : null}
          rightSlot={
            <button
              type="button"
              onClick={clearSubtypes}
              className="text-xs text-zinc-400 hover:text-zinc-200"
              title="Clear sub-types"
            >
              Clear
            </button>
          }
        />

        {subtypesOpen && (
          <div className="mt-2">
            <div className="flex flex-wrap gap-2">
              {SUBTYPES.map(s => (
                <label key={s} className="text-sm">
                  <input
                    type="checkbox"
                    checked={getMulti('subtypes').includes(s)}
                    onChange={() => toggleMulti('subtypes', s)}
                  />
                  <span className="ml-2">{s}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Effect Text Search */}
      <div className="mb-4">
        <div className="text-sm font-medium mb-1">Effect Text Search</div>
        <input
          className="w-full border p-1 mb-2 text-sm text-black placeholder:text-zinc-400"
          placeholder="Include (comma-separated)"
          value={effectIncludeDraft}
          onChange={e => setEffectIncludeDraft(e.target.value)}
        />
        <input
          className="w-full border p-1 mb-2 text-sm text-black placeholder:text-zinc-400"
          placeholder="Exclude (comma-separated)"
          value={effectExcludeDraft}
          onChange={e => setEffectExcludeDraft(e.target.value)}
        />
        <input
          className="w-full border p-1 text-black placeholder:text-zinc-400"
          placeholder="Exact phrase"
          value={effectPhraseDraft}
          onChange={e => setEffectPhraseDraft(e.target.value)}
        />

        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeHighlightedText}
              onChange={e => toggleIncludeHighlightedText(e.target.checked)}
              disabled={onlyHighlightedText}
            />
            <span className={onlyHighlightedText ? 'text-zinc-400' : ''}>Include Highlighted Text</span>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyHighlightedText}
              onChange={e => toggleOnlyHighlightedText(e.target.checked)}
            />
            <span>Only Highlighted Text</span>
          </label>

          {onlyHighlightedText ? (
            <div className="text-xs text-zinc-500">
              Searching only <span className="font-medium">highlight_effect</span>
            </div>
          ) : includeHighlightedText ? (
            <div className="text-xs text-zinc-500">
              Searching <span className="font-medium">effect</span> and{' '}
              <span className="font-medium">highlight_effect</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Keywords (collapsible) - tristate */}
      <div className="mb-4">
        <CollapsibleHeader
          title="Keywords"
          isOpen={keywordsOpen}
          onToggle={() => setKeywordsOpen(o => !o)}
          subtitle={
            !keywordsOpen ? `${kwInc.length + kwExc.length + (multipleAttacks ? 1 : 0)} selected` : null
          }
          rightSlot={
            <button
              type="button"
              onClick={clearKeywords}
              className="text-xs text-zinc-400 hover:text-zinc-200"
              title="Clear keyword selections"
            >
              Clear
            </button>
          }
        />

        {keywordsOpen && (
          <div className="mt-2">
            <div className="grid grid-cols-2 gap-2">
              {KEYWORDS.map(k => {
                // preserve your special layout around Defense (but WITHOUT Multiple Attacks now)
                if (k === 'Defense') {
                  const attackState = getKeywordState('Attack')
                  const defenseState = getKeywordState('Defense')

                  return (
                    <div key="__kw_block_defense" className="contents">
                      <button
                        type="button"
                        onClick={() => cycleKeyword('Attack')}
                        className={[
                          'text-left text-sm rounded px-2 py-1 border',
                          attackState === 'inc'
                            ? 'bg-green-100 border-green-400 text-black'
                            : attackState === 'exc'
                              ? 'bg-red-100 border-red-400 text-black'
                              : 'bg-white border-zinc-300 text-black hover:bg-zinc-50',
                        ].join(' ')}
                        title="Click to cycle: include → exclude → neutral"
                      >
                        Attack
                        <span className="ml-2 text-xs text-zinc-600">
                          {attackState === 'inc' ? '(+)' : attackState === 'exc' ? '(-)' : ''}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => cycleKeyword('Defense')}
                        className={[
                          'text-left text-sm rounded px-2 py-1 border',
                          defenseState === 'inc'
                            ? 'bg-green-100 border-green-400 text-black'
                            : defenseState === 'exc'
                              ? 'bg-red-100 border-red-400 text-black'
                              : 'bg-white border-zinc-300 text-black hover:bg-zinc-50',
                        ].join(' ')}
                        title="Click to cycle: include → exclude → neutral"
                      >
                        Defense
                        <span className="ml-2 text-xs text-zinc-600">
                          {defenseState === 'inc' ? '(+)' : defenseState === 'exc' ? '(-)' : ''}
                        </span>
                      </button>
                    </div>
                  )
                }

                // Attack handled above in the special block
                if (k === 'Attack') return null

                const state = getKeywordState(k)

                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => cycleKeyword(k)}
                    className={[
                      'text-left text-sm rounded px-2 py-1 border',
                      state === 'inc'
                        ? 'bg-green-100 border-green-400 text-black'
                        : state === 'exc'
                          ? 'bg-red-100 border-red-400 text-black'
                          : 'bg-white border-zinc-300 text-black hover:bg-zinc-50',
                    ].join(' ')}
                    title="Click to cycle: include → exclude → neutral"
                  >
                    {k}
                    <span className="ml-2 text-xs text-zinc-600">
                      {state === 'inc' ? '(+)' : state === 'exc' ? '(-)' : ''}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Moved here per request */}
            <div className="mt-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={multipleAttacks}
                  onChange={e => toggleMultipleAttacks(e.target.checked)}
                />
                <span>Multiple Attacks</span>
              </label>
              <div className="mt-1 text-xs text-zinc-500">Filters cards where attack_count &gt; 1</div>
            </div>
          </div>
        )}
      </div>

      {/* COST RANGE (collapsible) */}
      <div className="mb-4">
        <CollapsibleHeader
          title="Cost"
          isOpen={costOpen}
          onToggle={() => setCostOpen(o => !o)}
          subtitle={
            !costOpen
              ? onlyCostNull
                ? 'null-only'
                : `${costLo} – ${costHi}${includeCostNull ? ' (incl null)' : ''}`
              : null
          }
          rightSlot={
            <button
              type="button"
              onClick={resetCostFilter}
              className="text-xs text-zinc-400 hover:text-zinc-200"
              title="Reset cost filter"
            >
              Reset
            </button>
          }
        />

        {costOpen && (
          <>
            <div className="text-xs text-zinc-400 mb-3">
              {onlyCostNull ? (
                <>
                  Showing <span className="font-medium">null-only</span>
                </>
              ) : (
                <>
                  Showing {costLo} – {costHi}
                  {includeCostNull ? ' (including null)' : ''}
                </>
              )}
            </div>

            <div className={`px-2 ${onlyCostNull ? 'opacity-40 pointer-events-none' : ''}`}>
              <Slider
                range
                min={COST_MIN_LIMIT}
                max={COST_MAX_LIMIT}
                step={1}
                allowCross={false}
                value={costRange}
                marks={COST_MARKS}
                included
                onChange={vals => {
                  if (!Array.isArray(vals) || vals.length !== 2) return
                  const lo = clamp(Math.min(vals[0], vals[1]), COST_MIN_LIMIT, COST_MAX_LIMIT)
                  const hi = clamp(Math.max(vals[0], vals[1]), COST_MIN_LIMIT, COST_MAX_LIMIT)
                  setCostRange([lo, hi])
                }}
                onChangeComplete={vals => {
                  if (!Array.isArray(vals) || vals.length !== 2) return
                  setCostParams({
                    lo: vals[0],
                    hi: vals[1],
                    includeNull: includeCostNull,
                    onlyNull: false,
                  })
                }}
              />
            </div>

            <div className="mt-3 flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={costRange[0] > 0}
                  checked={includeCostNull && costRange[0] === 0}
                  onChange={e => toggleCostNull(e.target.checked)}
                />
                <span className={costRange[0] > 0 ? 'text-zinc-400' : ''}>Treat Null Cost as 0</span>
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={onlyCostNull}
                  onChange={e => toggleOnlyCostNull(e.target.checked)}
                />
                <span>Only Null Cost</span>
              </label>
            </div>

            {costRange[0] > 0 && (
              <div className="mt-1 text-xs text-zinc-500">Null costs are only available when minimum cost is 0</div>
            )}
          </>
        )}
      </div>

      {/* XP RANGE (collapsible) */}
      <div className="mb-4">
        <CollapsibleHeader
          title="XP"
          isOpen={xpOpen}
          onToggle={() => setXpOpen(o => !o)}
          subtitle={
            !xpOpen
              ? onlyXpNull
                ? 'null-only'
                : onlyXpVariable
                  ? 'variable-only (*)'
                  : `${xpLo} – ${xpHi}${includeXpNull ? ' (incl null)' : ''}${includeXpVariable ? ' (incl *)' : ''}`
              : null
          }
          rightSlot={
            <button
              type="button"
              onClick={resetXpFilter}
              className="text-xs text-zinc-400 hover:text-zinc-200"
              title="Reset XP filter"
            >
              Reset
            </button>
          }
        />

        {xpOpen && (
          <>
            <div className="text-xs text-zinc-400 mb-3">
              {onlyXpNull ? (
                <>
                  Showing <span className="font-medium">null-only</span>
                </>
              ) : onlyXpVariable ? (
                <>
                  Showing <span className="font-medium">variable-only (*)</span>
                </>
              ) : (
                <>
                  Showing {xpLo} – {xpHi}
                  {includeXpNull ? ' (including null)' : ''}
                  {includeXpVariable ? ' (including *)' : ''}
                </>
              )}
            </div>

            <div className={`px-2 ${onlyXpNull || onlyXpVariable ? 'opacity-40 pointer-events-none' : ''}`}>
              <Slider
                range
                min={XP_MIN_LIMIT}
                max={XP_MAX_LIMIT}
                step={1}
                allowCross={false}
                value={xpRange}
                marks={XP_MARKS}
                included
                onChange={vals => {
                  if (!Array.isArray(vals) || vals.length !== 2) return
                  const lo = clamp(Math.min(vals[0], vals[1]), XP_MIN_LIMIT, XP_MAX_LIMIT)
                  const hi = clamp(Math.max(vals[0], vals[1]), XP_MIN_LIMIT, XP_MAX_LIMIT)
                  setXpRange([lo, hi])
                }}
                onChangeComplete={vals => {
                  if (!Array.isArray(vals) || vals.length !== 2) return
                  setXpParams({
                    lo: vals[0],
                    hi: vals[1],
                    includeNull: includeXpNull,
                    onlyNull: false,
                    includeVariable: includeXpVariable,
                    onlyVariable: false,
                  })
                }}
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={!xpRangeIncludesZero || onlyXpNull || onlyXpVariable}
                  checked={includeXpNull && xpRangeIncludesZero && !onlyXpNull && !onlyXpVariable}
                  onChange={e => toggleXpNull(e.target.checked)}
                />
                <span className={!xpRangeIncludesZero ? 'text-zinc-400' : ''}>Treat Null XP as 0</span>
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={onlyXpNull} onChange={e => toggleOnlyXpNull(e.target.checked)} />
                <span>Only Null XP</span>
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={onlyXpNull || onlyXpVariable}
                  checked={includeXpVariable && !onlyXpNull && !onlyXpVariable}
                  onChange={e => toggleXpVariable(e.target.checked)}
                />
                <span>Include Variable XP (*)</span>
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={onlyXpVariable}
                  onChange={e => toggleOnlyXpVariable(e.target.checked)}
                />
                <span>Only Variable XP (*)</span>
              </label>

              {!xpRangeIncludesZero && !onlyXpNull && !onlyXpVariable && (
                <div className="col-span-2 mt-1 text-xs text-zinc-500">
                  Null XP is only treated as 0 when the selected range includes 0
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Advanced Options (collapsible) */}
      <div className="mb-4">
        <CollapsibleHeader
          title="Advanced Options"
          isOpen={advancedOpen}
          onToggle={() => setAdvancedOpen(o => !o)}
          subtitle={!advancedOpen ? `${advancedActiveCount} active` : null}
          rightSlot={
            <button
              type="button"
              onClick={clearAdvanced}
              className={`text-xs hover:text-zinc-200 ${advancedActiveCount > 0 ? 'text-zinc-400' : 'text-zinc-600'}`}
              title="Clear advanced options"
              disabled={advancedActiveCount === 0}
            >
              Clear
            </button>
          }
        />

        {advancedOpen && (
          <div className="mt-2 space-y-4">
            {/* WCS Tier */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-medium">WCS Tier</div>
                <button
                  type="button"
                  onClick={resetWcsTierFilter}
                  className={`text-xs hover:text-zinc-200 ${wcsTierEnabled ? 'text-zinc-400' : 'text-zinc-600'}`}
                  title={wcsTierEnabled ? 'Reset WCS Tier filter' : 'Enable WCS Tier to use reset'}
                  disabled={!wcsTierEnabled}
                >
                  Reset
                </button>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={wcsTierEnabled} onChange={e => setWcsTierEnabled(e.target.checked)} />
                <span>Enable WCS Tier filter</span>
              </label>

              <div className={`mt-3 ${!wcsTierEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
                <div className="text-xs text-zinc-400 mb-3">
                  Showing {wcsLo} – {wcsHi}
                </div>

                <div className="px-2">
                  <Slider
                    range
                    min={WCS_TIER_MIN_LIMIT}
                    max={WCS_TIER_MAX_LIMIT}
                    step={1}
                    allowCross={false}
                    value={wcsTierRange}
                    marks={WCS_TIER_MARKS}
                    included
                    onChange={vals => {
                      if (!Array.isArray(vals) || vals.length !== 2) return
                      const lo = clamp(Math.min(vals[0], vals[1]), WCS_TIER_MIN_LIMIT, WCS_TIER_MAX_LIMIT)
                      const hi = clamp(Math.max(vals[0], vals[1]), WCS_TIER_MIN_LIMIT, WCS_TIER_MAX_LIMIT)

                      setWcsTierRange([lo, hi])

                      if (wcsTierEnabled) {
                        setWcsTierParams({ lo, hi })
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">Location</label>
                <button
                  type="button"
                  onClick={clearLocation}
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                  title="Clear location"
                >
                  Clear
                </button>
              </div>

              <select
                className="w-full border p-1 text-black"
                value={searchParams.get('card_location') || ''}
                onChange={e => updateParam('card_location', e.target.value)}
              >
                <option value="">Any</option>
                {LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Symbols */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">Extra Symbol</label>
                <button
                  type="button"
                  onClick={clearSymbols}
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                  title="Clear symbol"
                >
                  Clear
                </button>
              </div>

              <select
                className="w-full border p-1 text-black"
                value={searchParams.get('symbols') || ''}
                onChange={e => updateParam('symbols', e.target.value)}
              >
                <option value="">Any</option>
                {SYMBOLS.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="__none__">No Symbol</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
