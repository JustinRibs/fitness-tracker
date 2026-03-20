import { formatWeightForDisplay } from '../lib/exerciseWeight'
import type { RoutineItem } from '../types'

type Props = {
  items: RoutineItem[]
  title?: string
  className?: string
}

function formatSetsReps(sets: string, reps: string): string | null {
  const s = sets.trim()
  const r = reps.trim()
  if (!s && !r) return null
  if (s && r) return `${s} × ${r}`
  return s || r
}

export function RoutineReadOnly({ items, title = 'Routine', className = '' }: Props) {
  const lines = items.filter((i) => i.exerciseName.trim())
  if (lines.length === 0) return null

  return (
    <div className={className}>
      {title ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      ) : null}
      <ol className={title ? 'mt-1.5 space-y-2' : 'space-y-2'}>
        {lines.map((i, idx) => {
          const detail = formatSetsReps(i.sets, i.reps)
          const w = formatWeightForDisplay(i.weight)
          return (
            <li key={i.id} className="flex gap-2 text-sm leading-snug">
              <span className="w-5 shrink-0 text-right font-medium text-fg/60">{idx + 1}.</span>
              <div className="min-w-0">
                <span className="font-medium text-fg">{i.exerciseName.trim()}</span>
                {detail && (
                  <span className="text-muted">
                    {' '}
                    · {detail}
                  </span>
                )}
                {w && (
                  <span className="text-muted">
                    {' '}
                    · {w}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
