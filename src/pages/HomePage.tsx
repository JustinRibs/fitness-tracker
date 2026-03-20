import { format, isSameDay, isSameMonth } from 'date-fns'
import { useMemo, useState } from 'react'
import { addMonths, MonthCalendar, subMonths } from '../components/MonthCalendar'
import { LogWorkoutModal } from '../components/LogWorkoutModal'
import { RoutineReadOnly } from '../components/RoutineReadOnly'
import { useData } from '../context/DataContext'
import { abbreviateWorkoutLabel } from '../lib/abbreviateWorkout'
import { isBirthdayToday, toLocalDateString } from '../lib/dates'
import { computeWeeklyGoalProgress, computeWorkoutStats } from '../lib/stats'
import { getLastFridayOnOrBefore, shouldShowFridayWeightReminder } from '../lib/weightWeek'
import type { CalendarCellLabel, WorkoutLog } from '../types'

function logsForDate(logs: WorkoutLog[], d: Date) {
  const key = toLocalDateString(d)
  return logs.filter((l) => l.date === key).sort((a, b) => b.completedAt.localeCompare(a.completedAt))
}

export function HomePage() {
  const { templates, logs, deleteLog, profile, weightEntries, recordWeight } = useData()
  const [month, setMonth] = useState(() => new Date())
  const [selected, setSelected] = useState(() => new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [weightInput, setWeightInput] = useState('')
  const [weightSaving, setWeightSaving] = useState(false)
  const [weightError, setWeightError] = useState<string | null>(null)

  const showWeightReminder = shouldShowFridayWeightReminder(weightEntries)
  const missedFriday = getLastFridayOnOrBefore()
  const missedFridayLabel = format(missedFriday, 'MMM d')

  const workoutStats = useMemo(() => computeWorkoutStats(logs), [logs])
  const goalProgress = useMemo(
    () => computeWeeklyGoalProgress(logs, profile.weeklyWorkoutGoal),
    [logs, profile.weeklyWorkoutGoal],
  )

  const calendarLabelsByDay = useMemo(() => {
    const templatesById = new Map(templates.map((t) => [t.id, t]))
    const byDate = new Map<string, { dedupeKey: string; label: CalendarCellLabel }[]>()
    const completed = [...logs].sort((a, b) => b.completedAt.localeCompare(a.completedAt))

    for (const log of completed) {
      let text: string
      if (log.templateId) {
        const t = templatesById.get(log.templateId)
        const abbr = t?.abbreviation?.trim()
        text = abbr && abbr.length > 0 ? abbr : abbreviateWorkoutLabel(log.name)
      } else {
        text = abbreviateWorkoutLabel(log.name)
      }

      const label: CalendarCellLabel = {
        text,
        title: [log.feelEmoji, log.name].filter(Boolean).join(' '),
      }
      const dedupeKey = log.templateId ?? `custom:${log.name}`
      const entries = byDate.get(log.date) ?? []
      if (entries.some((e) => e.dedupeKey === dedupeKey)) continue
      entries.push({ dedupeKey, label })
      byDate.set(log.date, entries)
    }

    return new Map(
      [...byDate.entries()].map(([date, arr]) => [date, arr.map((e) => e.label)]),
    )
  }, [logs, templates])

  const dayLogs = useMemo(() => logsForDate(logs, selected), [logs, selected])

  const onRemoveLog = (id: string) => {
    void deleteLog(id).catch(() => {})
  }

  const displayName = profile.name.trim()
  const birthdayToday = isBirthdayToday(profile.birthday)

  const onSubmitWeight = async (e: React.FormEvent) => {
    e.preventDefault()
    setWeightError(null)
    const t = weightInput.trim()
    if (!t) {
      setWeightError('Enter your weight.')
      return
    }
    const w = Number(t)
    if (!Number.isFinite(w) || w < 0) {
      setWeightError('Use a non-negative number.')
      return
    }
    setWeightSaving(true)
    try {
      await recordWeight({ date: toLocalDateString(missedFriday), weight: w })
      setWeightInput('')
    } catch (err) {
      setWeightError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setWeightSaving(false)
    }
  }

  return (
    <div>
      {showWeightReminder && (
        <div
          className="mb-4 rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3"
          role="status"
        >
          <p className="text-sm font-semibold text-fg">You missed your Friday weigh-in</p>
          <p className="mt-0.5 text-xs text-muted">
            Weekly weigh-in is <span className="font-medium text-fg/90">Friday</span>. Reminders start
            Saturday if that Friday isn’t logged. This saves for <span className="font-medium text-fg/90">{missedFridayLabel}</span> — same unit as Profile.
          </p>
          <form onSubmit={onSubmitWeight} className="mt-3 flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <label htmlFor="home-weight" className="sr-only">
                Weight
              </label>
              <input
                id="home-weight"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                placeholder={profile.weight != null ? String(profile.weight) : 'e.g. 175'}
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-fg placeholder:text-muted/60"
              />
            </div>
            <button
              type="submit"
              disabled={weightSaving}
              className="shrink-0 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-surface disabled:opacity-60 active:scale-[0.98]"
            >
              {weightSaving ? 'Saving…' : 'Log weight'}
            </button>
          </form>
          {weightError && (
            <p className="mt-2 text-xs text-red-400/90">{weightError}</p>
          )}
        </div>
      )}

      {birthdayToday && (
        <div
          className="mb-4 rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/15 via-surface-2 to-surface-2 px-4 py-3 shadow-[0_0_24px_-8px_rgba(52,211,153,0.45)]"
          role="status"
        >
          <p className="text-sm font-semibold text-accent">
            Happy birthday{displayName ? `, ${displayName}` : ''}! 🎉
          </p>
          <p className="mt-0.5 text-xs text-muted">Hope you have a great day — and maybe a light session if you feel like it.</p>
        </div>
      )}

      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">
          {displayName ? `Hi, ${displayName}` : 'Fit Log'}
        </h1>
        <p className="mt-1 text-sm text-muted">Tap a day to review or log a session.</p>
      </header>

      {(goalProgress != null || workoutStats.currentStreak > 0) && (
        <div className="mb-4 rounded-2xl border border-border bg-surface-2 px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">This week</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums">
                {goalProgress ? (
                  <>
                    {goalProgress.thisWeekCount}
                    <span className="text-muted"> / {goalProgress.goal}</span>
                  </>
                ) : (
                  workoutStats.thisCalendarWeek
                )}{' '}
                <span className="text-sm font-medium text-muted">sessions</span>
              </p>
            </div>
            {goalProgress?.metGoal && (
              <span className="rounded-md bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
                Goal met
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-muted">
            Streak · {workoutStats.currentStreak} day{workoutStats.currentStreak === 1 ? '' : 's'}
          </p>
        </div>
      )}

      {!isSameMonth(selected, month) && (
        <p className="mb-2 text-center text-xs text-muted">
          Viewing {format(month, 'MMMM yyyy')} — selected day is{' '}
          <button
            type="button"
            className="font-medium text-accent underline-offset-2 hover:underline"
            onClick={() => setMonth(selected)}
          >
            {format(selected, 'MMM d')}
          </button>
        </p>
      )}

      <MonthCalendar
        visibleMonth={month}
        onPrevMonth={() => setMonth((m) => subMonths(m, 1))}
        onNextMonth={() => setMonth((m) => addMonths(m, 1))}
        selectedDate={selected}
        onSelectDate={(d) => {
          setSelected(d)
          if (!isSameDay(d, selected)) setMonth(d)
        }}
        calendarLabelsByDay={calendarLabelsByDay}
      />

      <section className="mt-6 rounded-2xl border border-border bg-surface-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">
              {format(selected, 'EEEE, MMM d')}
            </h2>
            <p className="text-sm text-muted">
              {dayLogs.length === 0 ? 'No workouts yet.' : `${dayLogs.length} logged`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="shrink-0 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-surface active:scale-[0.98]"
          >
            Log workout
          </button>
        </div>

        <ul className="mt-4 space-y-2">
          {dayLogs.map((log) => (
            <li
              key={log.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-surface-3/50 px-3 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {log.feelEmoji && (
                    <span className="mr-1.5 text-lg leading-none" aria-hidden>
                      {log.feelEmoji}
                    </span>
                  )}
                  {log.name}
                </p>
                {log.routineSnapshot && log.routineSnapshot.length > 0 && (
                  <details className="mt-2 rounded-lg border border-border/50 bg-surface-2/80 px-2 py-1.5">
                    <summary className="cursor-pointer text-sm font-medium text-accent">
                      Routine
                    </summary>
                    <RoutineReadOnly
                      items={log.routineSnapshot}
                      title=""
                      className="mt-2 border-t border-border/40 pt-2"
                    />
                  </details>
                )}
                {log.notes && (
                  <p className="mt-1 text-sm text-muted whitespace-pre-wrap">{log.notes}</p>
                )}
                <p className="mt-1 text-xs text-muted/80">
                  {format(new Date(log.completedAt), 'h:mm a')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemoveLog(log.id)}
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-surface-2 hover:text-fg"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      <LogWorkoutModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        date={selected}
        templates={templates}
      />
    </div>
  )
}
