import { addDays, startOfDay, startOfWeek } from 'date-fns'
import type { WeightEntry } from '../types'
import { toLocalDateString } from './dates'

const WEEK_OPTS = { weekStartsOn: 1 as const }

/** Most recent Friday (local calendar) that is on or before `now`. */
export function getLastFridayOnOrBefore(now: Date = new Date()): Date {
  const mon = startOfWeek(now, WEEK_OPTS)
  let fri = startOfDay(addDays(mon, 4))
  const today = startOfDay(now)
  if (fri > today) {
    fri = startOfDay(addDays(fri, -7))
  }
  return fri
}

/**
 * Show reminder only **after** the weekly Friday has passed: from Saturday until the next
 * Thursday if there is no weigh-in for that Friday. On Friday itself we do not nag.
 */
export function shouldShowFridayWeightReminder(entries: WeightEntry[], now: Date = new Date()): boolean {
  const lastFriday = getLastFridayOnOrBefore(now)
  const today = startOfDay(now)
  if (today <= lastFriday) return false

  const target = toLocalDateString(lastFriday)
  return !entries.some((e) => e.date === target)
}
