import type { ExerciseWeight, WorkoutLog } from '../types'
import { formatWeightForDisplay, parseStoredRoutineWeight } from './exerciseWeight'

/** Normalize free-text exercise names for grouping (e.g. "Bench Press" vs "bench press"). */
export function normalizeExerciseKey(name: string): string {
  return name.trim().toLowerCase()
}

/** Distinct exercise labels from all routine snapshots, sorted alphabetically (display names). */
export function listDistinctExerciseNames(logs: WorkoutLog[]): string[] {
  const byKey = new Map<string, string>()
  for (const log of logs) {
    const snap = log.routineSnapshot
    if (!snap) continue
    for (const line of snap) {
      const raw = line.exerciseName.trim()
      if (!raw) continue
      const key = normalizeExerciseKey(raw)
      if (!byKey.has(key)) byKey.set(key, raw)
    }
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

const LB_TO_KG = 0.45359237

/**
 * Approximate total load in kg for ordering / PR (ignores bar weight).
 * total: as-is; per_side: 2× plate load; per_hand: 2× dumbbell.
 */
export function exerciseWeightToCompareKg(w: ExerciseWeight): number {
  const kg = w.unit === 'kg' ? w.value : w.value * LB_TO_KG
  if (w.mode === 'total') return kg
  return 2 * kg
}

export type LiftHistoryRow = {
  logId: string
  date: string
  sessionName: string
  /** Shown in table */
  displayLoad: string | null
  /** Set only for structured weights — used for bars and PR */
  compareKg: number | null
}

/**
 * All log lines for one normalized exercise key, oldest first.
 */
export function buildLiftSeries(logs: WorkoutLog[], exerciseKey: string): LiftHistoryRow[] {
  const rows: LiftHistoryRow[] = []
  for (const log of logs) {
    const snap = log.routineSnapshot
    if (!snap) continue
    for (const line of snap) {
      if (normalizeExerciseKey(line.exerciseName) !== exerciseKey) continue
      const w = parseStoredRoutineWeight(line.weight)
      let displayLoad: string | null = null
      let compareKg: number | null = null
      if (typeof w === 'string') {
        displayLoad = formatWeightForDisplay(w) ?? (w.trim() ? w.trim() : null)
      } else if (w && typeof w === 'object') {
        displayLoad = formatWeightForDisplay(w)
        compareKg = exerciseWeightToCompareKg(w)
      }
      rows.push({
        logId: log.id,
        date: log.date,
        sessionName: log.name,
        displayLoad,
        compareKg,
      })
    }
  }
  rows.sort((a, b) => {
    const c = a.date.localeCompare(b.date)
    if (c !== 0) return c
    return a.logId.localeCompare(b.logId)
  })
  return rows
}

export function bestCompareKg(series: LiftHistoryRow[]): number | null {
  let best: number | null = null
  for (const r of series) {
    if (r.compareKg == null) continue
    if (best == null || r.compareKg > best) best = r.compareKg
  }
  return best
}
