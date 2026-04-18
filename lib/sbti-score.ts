import {
  DIMENSION_ORDER,
  NORMAL_TYPES,
  TYPE_LIBRARY,
  type DimKey,
  type DimScore,
  type SbtiType,
} from './sbti-data'

// --- Per-dimension level threshold --------------------------------------------
// Each dimension has exactly 2 questions, each scored 1–3.
// Total range: 2–6 → L (≤3) | M (=4) | H (≥5)

function toLevel(sum: number): DimScore {
  if (sum <= 3) return 'L'
  if (sum === 4) return 'M'
  return 'H'
}

// --- Compute 15 dimension scores from raw answers -----------------------------
// computeDimScores is intentionally not exported here; use computeResult instead.

// --- Main scoring entry point --------------------------------------------------

export interface SbtiResult {
  /** Scores for all 15 dimensions */
  scores: Record<DimKey, DimScore>
  /** Matched personality type code, e.g. "CTRL" */
  typeCode: string
  /** Full type object */
  type: SbtiType
  /** Whether or not the DRUNK hidden type was triggered */
  isDrunk: boolean
  /** Raw pattern string for display, e.g. "HHH-HMH-MHH-HHH-MHM" */
  patternString: string
  /** Best-match confidence percentage, 0–100 */
  confidencePercent: number
}

/**
 * computeResult  -  derive SBTI type from user answers.
 *
 * @param dimAnswers  Record<DimKey, number[]>   -  per-dimension raw values (2 per dim)
 * @param drinkAnswers  { gate?: number; trigger?: number }   -  special hobbies/drink answers
 */
export function computeResult(
  dimAnswers: Record<DimKey, [number, number]>,
  drinkAnswers: { gate?: number; trigger?: number } = {},
): SbtiResult {
  // -- 1. Compute L/M/H for each dimension ------------------------------------
  const scores = {} as Record<DimKey, DimScore>

  for (const dim of DIMENSION_ORDER) {
    const [a, b] = dimAnswers[dim] ?? [2, 2]
    scores[dim] = toLevel(a + b)
  }

  // -- 2. Check hidden DRUNK type ----------------------------------------------
  const isDrunk = drinkAnswers.gate === 3 && drinkAnswers.trigger === 2

  if (isDrunk) {
    return {
      scores,
      typeCode: 'DRUNK',
      type: TYPE_LIBRARY['DRUNK'],
      isDrunk: true,
      patternString: buildPatternString(scores),
      confidencePercent: 100,
    }
  }

  // -- 3. Numeric pattern for matching (H=3, M=2, L=1) -----------------------
  const levelNum: Record<DimScore, number> = { L: 1, M: 2, H: 3 }
  const userNums = DIMENSION_ORDER.map((d) => levelNum[scores[d]])

  // -- 4. Match against NORMAL_TYPES using similarity scoring -----------------
  let bestCode = 'HHHH'
  let bestSimilarity = -1

  for (const t of NORMAL_TYPES) {
    const typeChars = t.pattern.replace(/-/g, '')
    let similarity = 0

    for (let i = 0; i < 15; i++) {
      const typeLevel = typeChars[i] as DimScore
      const distance = Math.abs(userNums[i] - levelNum[typeLevel])
      similarity += distance === 0 ? 1 : distance === 1 ? 0.5 : 0
    }

    if (similarity > bestSimilarity) {
      bestSimilarity = similarity
      bestCode = t.code
    }
  }

  // Fall back to HHHH if match confidence < 60%
  const confidencePercent = Math.round((bestSimilarity / 15) * 100)
  const finalCode = confidencePercent >= 60 ? bestCode : 'HHHH'

  return {
    scores,
    typeCode: finalCode,
    type: TYPE_LIBRARY[finalCode] ?? TYPE_LIBRARY['HHHH'],
    isDrunk: false,
    patternString: buildPatternString(scores),
    confidencePercent,
  }
}

// --- Helpers -------------------------------------------------------------------

function buildPatternString(scores: Record<DimKey, DimScore>): string {
  const groups: DimScore[][] = [
    [scores.S1, scores.S2, scores.S3],
    [scores.E1, scores.E2, scores.E3],
    [scores.A1, scores.A2, scores.A3],
    [scores.Ac1, scores.Ac2, scores.Ac3],
    [scores.So1, scores.So2, scores.So3],
  ]
  return groups.map((g) => g.join('')).join('-')
}

/** Score as a 0–100 percentage for UI bars.  L=16, M=50, H=84 */
export function dimScoreToPercent(s: DimScore): number {
  return s === 'L' ? 16 : s === 'M' ? 50 : 84
}
