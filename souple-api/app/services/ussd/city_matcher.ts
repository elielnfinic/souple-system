// ─── Fuzzy City Matcher ───────────────────────────────────────────────────────
//
// USSD users type city names on a numeric keypad without autocomplete, so we
// need forgiving matching. Strategy (in priority order):
//
//   1. Exact match (case-insensitive)
//   2. Abbreviation look-up via ABBREVIATIONS map
//   3. Levenshtein distance <= 2 (tolerates 2 typos / missing letters)
//   4. Prefix match (input is a prefix of the city name, min 3 chars)
//
// matchCity() returns:
//   { city: City, candidates: [] }    — unambiguous single match
//   { city: null, candidates: City[] } — multiple candidates (show options)
//   { city: null, candidates: [] }    — no match found

import type City from '#models/city'

// ─── Abbreviations ────────────────────────────────────────────────────────────

/** Common shorthand forms users type for major DRC / African cities. */
const ABBREVIATIONS: Record<string, string> = {
  kin: 'Kinshasa',
  knsh: 'Kinshasa',
  kinsh: 'Kinshasa',
  lushi: 'Lubumbashi',
  lsh: 'Lubumbashi',
  lub: 'Lubumbashi',
  lubu: 'Lubumbashi',
  gma: 'Goma',
  gom: 'Goma',
  bkv: 'Bukavu',
  buk: 'Bukavu',
  buva: 'Bukavu',
  kis: 'Kisangani',
  kisan: 'Kisangani',
  mbu: 'Mbuji-Mayi',
  mbuj: 'Mbuji-Mayi',
  mbuji: 'Mbuji-Mayi',
  kol: 'Kolwezi',
  kolw: 'Kolwezi',
  liku: 'Likasi',
  mat: 'Matadi',
  kan: 'Kananga',
  kana: 'Kananga',
  bun: 'Bunia',
}

// ─── Levenshtein Distance ─────────────────────────────────────────────────────

/**
 * Standard Levenshtein edit-distance implementation.
 * O(m*n) time, O(n) space using a single row + scalar.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const row: number[] = Array.from({ length: b.length + 1 }, (_, i) => i)

  for (let i = 1; i <= a.length; i++) {
    let prev = i
    for (let j = 1; j <= b.length; j++) {
      const val =
        a[i - 1] === b[j - 1]
          ? row[j - 1]
          : 1 + Math.min(row[j - 1], row[j], prev)
      row[j - 1] = prev
      prev = val
    }
    row[b.length] = prev
  }

  return row[b.length]
}

// ─── matchCity ────────────────────────────────────────────────────────────────

export interface CityMatchResult {
  city: City | null
  candidates: City[]
}

/**
 * Find the best-matching City for a user-typed string.
 *
 * @param input   Raw text the user entered (e.g. "Kinshsa", "lushi", "gma")
 * @param cities  Active city list from the database
 */
export function matchCity(input: string, cities: City[]): CityMatchResult {
  const normalized = input.trim().toLowerCase()
  if (!normalized || cities.length === 0) {
    return { city: null, candidates: [] }
  }

  // 1. Exact match
  const exact = cities.find((c) => c.name.toLowerCase() === normalized)
  if (exact) return { city: exact, candidates: [] }

  // 2. Abbreviation look-up
  const abbrev = ABBREVIATIONS[normalized]
  if (abbrev) {
    const found = cities.find((c) => c.name.toLowerCase() === abbrev.toLowerCase())
    if (found) return { city: found, candidates: [] }
  }

  // 3. Levenshtein distance <= 2
  const fuzzyMatches = cities.filter(
    (c) => levenshtein(normalized, c.name.toLowerCase()) <= 2
  )

  if (fuzzyMatches.length === 1) return { city: fuzzyMatches[0], candidates: [] }
  if (fuzzyMatches.length > 1) return { city: null, candidates: fuzzyMatches }

  // 4. Prefix match (input must be at least 3 characters)
  if (normalized.length >= 3) {
    const prefixMatches = cities.filter((c) =>
      c.name.toLowerCase().startsWith(normalized)
    )
    if (prefixMatches.length === 1) return { city: prefixMatches[0], candidates: [] }
    if (prefixMatches.length > 1) return { city: null, candidates: prefixMatches }
  }

  return { city: null, candidates: [] }
}
