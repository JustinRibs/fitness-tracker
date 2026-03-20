import {
  eachWeekOfInterval,
  endOfWeek,
  format,
  isWithinInterval,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subWeeks,
} from 'date-fns'
import type { WorkoutLog } from '../types'

function parseLogDate(s: string): Date {
  return parse(s, 'yyyy-MM-dd', new Date())
}

/** Unique calendar dates that have at least one workout, sorted ascending (YYYY-MM-DD). */
export function uniqueLogDates(logs: WorkoutLog[]): string[] {
  const set = new Set(logs.map((l) => l.date))
  return [...set].sort((a, b) => a.localeCompare(b))
}

/** Longest run of consecutive calendar days present in `sortedDates` (ascending). */
export function longestConsecutiveDayRun(sortedDates: string[]): number {
  if (sortedDates.length === 0) return 0
  let best = 1
  let run = 1
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = parseLogDate(sortedDates[i - 1]!)
    const cur = parseLogDate(sortedDates[i]!)
    const diff = (cur.getTime() - prev.getTime()) / 86400000
    if (diff === 1) {
      run += 1
      best = Math.max(best, run)
    } else {
      run = 1
    }
  }
  return best
}

/**
 * Longest trailing block of consecutive days ending at the most recent workout day.
 * (If you last trained 3 days ago with no gap before that, this is that run’s length.)
 */
export function currentStreakDays(sortedDatesAsc: string[]): number {
  if (sortedDatesAsc.length === 0) return 0
  const dates = [...sortedDatesAsc].sort((a, b) => b.localeCompare(a))
  let streak = 1
  let d = parseLogDate(dates[0]!)
  for (let i = 1; i < dates.length; i++) {
    const prev = parseLogDate(dates[i]!)
    const gap = (d.getTime() - prev.getTime()) / 86400000
    if (gap === 1) {
      streak += 1
      d = prev
    } else {
      break
    }
  }
  return streak
}

export type WorkoutStats = {
  totalWorkouts: number
  uniqueDays: number
  last7Days: number
  thisCalendarMonth: number
  thisCalendarWeek: number
  currentStreak: number
  longestStreak: number
  avgPerWeekLast4: number
  topByName: { name: string; count: number }[]
  last8Weeks: { label: string; count: number }[]
}

const WEEK_OPTS = { weekStartsOn: 1 as const }

export type WeeklyGoalProgress = {
  goal: number
  thisWeekCount: number
  metGoal: boolean
}

/** Mon–Sun week vs optional session target (same window as `thisCalendarWeek` in stats). */
export function computeWeeklyGoalProgress(
  logs: WorkoutLog[],
  weeklyGoal: number | null,
  now: Date = new Date(),
): WeeklyGoalProgress | null {
  if (weeklyGoal == null || !Number.isInteger(weeklyGoal) || weeklyGoal < 1) return null
  const weekStart = startOfWeek(now, WEEK_OPTS)
  const weekEnd = endOfWeek(now, WEEK_OPTS)
  const thisWeekCount = logs.filter((l) => {
    const ld = parseLogDate(l.date)
    return isWithinInterval(ld, { start: weekStart, end: weekEnd })
  }).length
  return {
    goal: weeklyGoal,
    thisWeekCount,
    metGoal: thisWeekCount >= weeklyGoal,
  }
}

export function computeWorkoutStats(logs: WorkoutLog[], now: Date = new Date()): WorkoutStats {
  const totalWorkouts = logs.length
  const unique = uniqueLogDates(logs)
  const uniqueDays = unique.length

  const today = startOfDay(now)
  const d7 = subDays(today, 6)
  const last7Days = logs.filter((l) => {
    const ld = startOfDay(parseLogDate(l.date))
    return ld >= d7 && ld <= today
  }).length

  const monthStart = startOfMonth(today)
  const thisCalendarMonth = logs.filter((l) => {
    const ld = parseLogDate(l.date)
    return ld >= monthStart && ld <= today
  }).length

  const weekStart = startOfWeek(today, WEEK_OPTS)
  const weekEnd = endOfWeek(today, WEEK_OPTS)
  const thisCalendarWeek = logs.filter((l) => {
    const ld = parseLogDate(l.date)
    return isWithinInterval(ld, { start: weekStart, end: weekEnd })
  }).length

  const currentStreak = currentStreakDays(unique)
  const longestStreak = longestConsecutiveDayRun(unique)

  const fourWeeksAgo = subWeeks(startOfWeek(today, WEEK_OPTS), 3)
  const inLast4Weeks = logs.filter((l) => {
    const ld = parseLogDate(l.date)
    return ld >= fourWeeksAgo && ld <= today
  }).length
  const avgPerWeekLast4 = Math.round((inLast4Weeks / 4) * 10) / 10

  const byName = new Map<string, number>()
  for (const log of logs) {
    const key = log.name.trim() || 'Untitled'
    byName.set(key, (byName.get(key) ?? 0) + 1)
  }
  const topByName = [...byName.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const anchor = startOfWeek(today, WEEK_OPTS)
  const weekStarts = eachWeekOfInterval(
    { start: subWeeks(anchor, 7), end: anchor },
    WEEK_OPTS,
  )
  const last8Weeks = weekStarts.map((ws) => {
    const we = endOfWeek(ws, WEEK_OPTS)
    const count = logs.filter((l) => {
      const ld = parseLogDate(l.date)
      return isWithinInterval(ld, { start: ws, end: we })
    }).length
    return {
      label: format(ws, 'MMM d'),
      count,
    }
  })

  return {
    totalWorkouts,
    uniqueDays,
    last7Days,
    thisCalendarMonth,
    thisCalendarWeek,
    currentStreak,
    longestStreak,
    avgPerWeekLast4,
    topByName,
    last8Weeks,
  }
}
