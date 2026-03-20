import type { RoutineItem } from '../types'
import { randomUUID } from './randomUUID'

/** Deep copy items with new ids (for log snapshots) */
export function cloneRoutineItems(items: RoutineItem[]): RoutineItem[] {
  return items.map((i) => ({
    id: randomUUID(),
    exerciseName: i.exerciseName,
    sets: i.sets,
    reps: i.reps,
  }))
}
