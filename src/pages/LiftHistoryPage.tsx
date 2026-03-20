import { format, parse } from 'date-fns'
import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import {
  bestCompareKg,
  buildLiftSeries,
  listDistinctExerciseNames,
  normalizeExerciseKey,
} from '../lib/liftHistory'

export function LiftHistoryPage() {
  const { logs } = useData()
  const names = useMemo(() => listDistinctExerciseNames(logs), [logs])
  const [pickedExercise, setPickedExercise] = useState<string | null>(null)

  const selectedName = useMemo(() => {
    if (names.length === 0) return ''
    if (pickedExercise != null && names.includes(pickedExercise)) return pickedExercise
    return names[0]!
  }, [names, pickedExercise])

  const exerciseKey = selectedName ? normalizeExerciseKey(selectedName) : ''
  const series = useMemo(
    () => (exerciseKey ? buildLiftSeries(logs, exerciseKey) : []),
    [logs, exerciseKey],
  )
  const pr = useMemo(() => bestCompareKg(series), [series])

  const maxKg = useMemo(() => {
    const nums = series.map((r) => r.compareKg).filter((x): x is number => x != null)
    return nums.length ? Math.max(...nums) : 1
  }, [series])

  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        History from logged routines. PR bars use structured weights only (approximate total load in kg;
        ignores bar weight). Free-text weights appear in the table but not in the chart.
      </p>

      <label className="block text-sm font-medium">Exercise</label>
      <select
        value={selectedName}
        onChange={(e) => setPickedExercise(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-fg"
      >
        {names.length === 0 ? (
          <option value="">No exercises in logs yet</option>
        ) : (
          names.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))
        )}
      </select>

      {names.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted">Log a workout with a preset to see lifts here.</p>
      ) : series.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted">No rows for this exercise.</p>
      ) : (
        <>
          {pr != null && (
            <p className="mt-3 text-xs text-muted">
              Best recorded structured load (approx. kg):{' '}
              <span className="font-semibold tabular-nums text-fg">{pr.toFixed(1)}</span>
            </p>
          )}

          <section className="mt-6 rounded-2xl border border-border bg-surface-2 p-4">
            <h2 className="text-sm font-semibold">Load over time</h2>
            <p className="mt-1 text-xs text-muted">Structured weights only.</p>
            <div
              className="mt-4 flex h-36 items-end gap-1"
              role="img"
              aria-label="Approximate load per session"
            >
              {series.map((row, i) => {
                const has = row.compareKg != null
                const h = has ? Math.round((row.compareKg! / maxKg) * 100) : 0
                const d = parse(row.date, 'yyyy-MM-dd', new Date())
                const label = format(d, 'MMM d')
                return (
                  <div key={`bar-${row.logId}-${row.date}-${i}`} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] font-medium tabular-nums text-muted">
                      {has ? row.compareKg!.toFixed(0) : '—'}
                    </span>
                    <div
                      className={`w-full max-w-11 rounded-md ${has ? 'bg-accent/85' : 'bg-border/40'}`}
                      style={{ height: `${has ? Math.max(8, h) : 8}%` }}
                      title={`${label}: ${row.displayLoad ?? 'no structured weight'}`}
                    />
                    <span className="truncate text-[10px] text-muted">{label}</span>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-border bg-surface-2 p-4">
            <h2 className="text-sm font-semibold">Sessions</h2>
            <ul className="mt-4 space-y-2">
              {[...series].reverse().map((row, i) => {
                const d = parse(row.date, 'yyyy-MM-dd', new Date())
                const dateLabel = format(d, 'MMM d, yyyy')
                const vs =
                  row.compareKg != null && pr != null && row.compareKg < pr - 1e-9
                    ? `${((row.compareKg / pr) * 100).toFixed(0)}% of PR`
                    : row.compareKg != null && pr != null && row.compareKg >= pr - 1e-9
                      ? 'PR'
                      : null
                return (
                  <li
                    key={`row-${row.logId}-${row.date}-${i}`}
                    className="flex flex-col gap-0.5 rounded-xl border border-border/60 bg-surface-3/40 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{row.sessionName}</p>
                      <p className="text-xs text-muted">{dateLabel}</p>
                    </div>
                    <div className="shrink-0 text-right text-sm">
                      <p className="tabular-nums">{row.displayLoad ?? '—'}</p>
                      {vs && <p className="text-xs text-muted">{vs}</p>}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
