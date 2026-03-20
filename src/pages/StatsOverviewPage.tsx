import { format, parse } from 'date-fns'
import { useMemo } from 'react'
import { useData } from '../context/DataContext'
import { computeWeeklyGoalProgress, computeWorkoutStats } from '../lib/stats'

function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

export function StatsOverviewPage() {
  const { logs, weightEntries, deleteWeightEntry, profile } = useData()
  const s = useMemo(() => computeWorkoutStats(logs), [logs])
  const goalProgress = useMemo(
    () => computeWeeklyGoalProgress(logs, profile.weeklyWorkoutGoal),
    [logs, profile.weeklyWorkoutGoal],
  )

  const weightRows = useMemo(() => {
    return [...weightEntries].sort((a, b) => {
      const c = b.date.localeCompare(a.date)
      if (c !== 0) return c
      return b.createdAt.localeCompare(a.createdAt)
    })
  }, [weightEntries])

  const maxWeek = Math.max(1, ...s.last8Weeks.map((w) => w.count))

  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        Summaries from your log — streaks use calendar days with at least one workout.
      </p>

      <section className="mb-6 rounded-2xl border border-border bg-surface-2 p-4">
        <h2 className="text-sm font-semibold">Weight log</h2>
        <p className="mt-1 text-xs text-muted">
          Weigh-in day is Friday. If you miss it, you’ll get a reminder starting Saturday; backfills
          from Home use that Friday’s date.
        </p>
        {weightRows.length === 0 ? (
          <p className="mt-4 text-center text-sm text-muted">No entries yet — log from the home screen.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {weightRows.map((row) => {
              const d = parse(row.date, 'yyyy-MM-dd', new Date())
              const label = format(d, 'MMM d, yyyy')
              return (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-surface-3/40 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="font-medium tabular-nums">{row.weight}</p>
                    <p className="text-xs text-muted">{label}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void deleteWeightEntry(row.id).catch(() => {})}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-surface-2 hover:text-fg"
                  >
                    Remove
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total sessions" value={s.totalWorkouts} />
        <StatCard label="Days trained" value={s.uniqueDays} hint="Distinct calendar days" />
        {goalProgress ? (
          <StatCard
            label="Week goal"
            value={`${goalProgress.thisWeekCount} / ${goalProgress.goal}`}
            hint={goalProgress.metGoal ? 'Target met (Mon–Sun)' : 'Sessions vs goal, Mon–Sun'}
          />
        ) : (
          <StatCard label="This week" value={s.thisCalendarWeek} hint="Mon–Sun, this week" />
        )}
        <StatCard label="This month" value={s.thisCalendarMonth} />
        <StatCard label="Last 7 days" value={s.last7Days} hint="Rolling window" />
        <StatCard
          label="Avg / week"
          value={s.avgPerWeekLast4}
          hint="Last 4 calendar weeks"
        />
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-surface-2 p-4">
        <h2 className="text-sm font-semibold">Streaks</h2>
        <p className="mt-1 text-xs text-muted">
          Current streak counts consecutive days up to your most recent session.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border/60 bg-surface-3/50 px-3 py-3">
            <p className="text-xs text-muted">Current streak</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums">
              {s.currentStreak} <span className="text-sm font-medium text-muted">days</span>
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-surface-3/50 px-3 py-3">
            <p className="text-xs text-muted">Best streak</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums">
              {s.longestStreak} <span className="text-sm font-medium text-muted">days</span>
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface-2 p-4">
        <h2 className="text-sm font-semibold">Last 8 weeks</h2>
        <p className="mt-1 text-xs text-muted">Sessions logged per week (Mon–Sun).</p>
        <div className="mt-4 flex h-36 items-end gap-1.5" role="img" aria-label="Workouts per week, last 8 weeks">
          {s.last8Weeks.map((w) => {
            const h = Math.round((w.count / maxWeek) * 100)
            return (
              <div key={w.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-medium tabular-nums text-muted">{w.count}</span>
                <div
                  className="w-full max-w-11 rounded-md bg-accent/85"
                  style={{ height: `${Math.max(8, h)}%` }}
                  title={`${w.label}: ${w.count} workout${w.count === 1 ? '' : 's'}`}
                />
                <span className="truncate text-[10px] text-muted">{w.label}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface-2 p-4">
        <h2 className="text-sm font-semibold">Most logged</h2>
        <p className="mt-1 text-xs text-muted">By preset name.</p>
        {s.topByName.length === 0 ? (
          <p className="mt-4 text-center text-sm text-muted">No workouts yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {s.topByName.map((row, i) => (
              <li
                key={row.name}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-surface-3/40 px-3 py-2.5"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-2 text-xs font-semibold text-muted">
                    {i + 1}
                  </span>
                  <span className="truncate font-medium">{row.name}</span>
                </span>
                <span className="shrink-0 tabular-nums text-sm text-muted">{row.count}×</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
