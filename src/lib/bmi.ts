import type { UserProfile } from '../types'

const LB_TO_KG = 0.45359237

/** Uses profile weight as kg if `weightUnit` is kg, otherwise as lb (same as lift defaults). */
export function computeBmiFromProfile(p: UserProfile): number | null {
  const { weight, height, heightUnit, weightUnit } = p
  if (weight == null || height == null || weight <= 0 || height <= 0) return null

  const heightM = heightUnit === 'cm' ? height / 100 : height * 0.0254
  const weightKg = weightUnit === 'kg' ? weight : weight * LB_TO_KG

  const bmi = weightKg / (heightM * heightM)
  if (!Number.isFinite(bmi) || bmi <= 0) return null
  return Math.round(bmi * 10) / 10
}

/** Standard WHO adult categories (same cutoffs as CDC). */
export function bmiCategoryLabel(bmi: number): string {
  if (bmi < 18.5) return 'Underweight'
  if (bmi < 25) return 'Normal'
  if (bmi < 30) return 'Overweight'
  return 'Obese'
}
