import type { ExerciseWeight, ExerciseWeightMode, ExerciseWeightUnit } from '../types'

export const WEIGHT_UNITS: { value: ExerciseWeightUnit; label: string }[] = [
  { value: 'lb', label: 'lb' },
  { value: 'kg', label: 'kg' },
]

export const WEIGHT_MODES: { value: ExerciseWeightMode; label: string; hint: string }[] = [
  { value: 'total', label: 'Total', hint: 'Full bar or machine load' },
  { value: 'per_side', label: 'Per side', hint: 'One plate per side of the bar' },
  { value: 'per_hand', label: 'Each', hint: 'One dumbbell / one hand' },
]

export function formatExerciseWeight(w: ExerciseWeight): string {
  const u = w.unit
  const v = Number.isInteger(w.value) ? String(w.value) : String(w.value)
  if (w.mode === 'total') return `${v} ${u} total`
  if (w.mode === 'per_side') return `${v} ${u}/side`
  return `${v} ${u} each`
}

/** Display for snapshot line — supports legacy free-text strings. */
export function formatWeightForDisplay(w: ExerciseWeight | string | undefined): string | null {
  if (w == null) return null
  if (typeof w === 'string') {
    const t = w.trim()
    return t.length > 0 ? t : null
  }
  return formatExerciseWeight(w)
}

export function parseExerciseWeightPayload(raw: unknown): ExerciseWeight | null {
  if (raw == null || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const value = typeof o.value === 'number' ? o.value : Number(o.value)
  if (!Number.isFinite(value) || value < 0 || value > 9999) return null
  const unit: ExerciseWeightUnit = o.unit === 'kg' ? 'kg' : 'lb'
  const mode: ExerciseWeightMode =
    o.mode === 'per_side' ? 'per_side' : o.mode === 'per_hand' ? 'per_hand' : 'total'
  return { value, unit, mode }
}

/** Restore from JSON snapshot — supports legacy string weights. */
export function parseStoredRoutineWeight(raw: unknown): ExerciseWeight | string | undefined {
  if (raw == null) return undefined
  if (typeof raw === 'string') {
    const t = raw.trim()
    return t.length > 0 ? t : undefined
  }
  if (typeof raw === 'object') return parseExerciseWeightPayload(raw) ?? undefined
  return undefined
}
