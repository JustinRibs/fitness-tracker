import { randomUUID } from '../lib/randomUUID'
import type { RoutineItem } from '../types'

type Props = {
  items: RoutineItem[]
  onChange: (items: RoutineItem[]) => void
  /** Shown above the list */
  hint?: string
}

function emptyItem(): RoutineItem {
  return { id: randomUUID(), exerciseName: '', sets: '', reps: '' }
}

export function RoutineLinesEditor({ items, onChange, hint }: Props) {
  const patch = (id: string, field: keyof Pick<RoutineItem, 'exerciseName' | 'sets' | 'reps'>, value: string) => {
    onChange(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)))
  }

  const remove = (id: string) => {
    onChange(items.filter((i) => i.id !== id))
  }

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[index], next[j]] = [next[j], next[index]]
    onChange(next)
  }

  const addLine = () => {
    onChange([...items, emptyItem()])
  }

  return (
    <div className="space-y-2">
      {hint && <p className="text-xs text-muted">{hint}</p>}
      <ol className="space-y-3">
        {items.map((item, index) => (
          <li
            key={item.id}
            className="rounded-xl border border-border/70 bg-surface-3/40 p-2 pl-2"
          >
            <div className="flex gap-2">
              <span className="flex w-6 shrink-0 justify-center pt-2 text-xs font-medium text-muted">
                {index + 1}.
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <label className="sr-only">Exercise {index + 1} name</label>
                <input
                  type="text"
                  value={item.exerciseName}
                  onChange={(e) => patch(item.id, 'exerciseName', e.target.value)}
                  placeholder="Exercise name"
                  className="w-full rounded-lg border border-border bg-surface-2/80 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-accent"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">
                      Sets
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={item.sets}
                      onChange={(e) => patch(item.id, 'sets', e.target.value)}
                      placeholder="e.g. 3"
                      className="w-full rounded-lg border border-border bg-surface-2/80 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">
                      Reps
                    </label>
                    <input
                      type="text"
                      value={item.reps}
                      onChange={(e) => patch(item.id, 'reps', e.target.value)}
                      placeholder="e.g. 8"
                      className="w-full rounded-lg border border-border bg-surface-2/80 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-0.5 self-start">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-sm disabled:opacity-25"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === items.length - 1}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-sm disabled:opacity-25"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-xs text-muted hover:text-fg"
                  aria-label="Remove exercise"
                >
                  ✕
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={addLine}
        className="w-full rounded-xl border border-dashed border-border py-2.5 text-sm font-medium text-muted hover:border-accent/50 hover:text-accent"
      >
        + Add exercise
      </button>
    </div>
  )
}

export { emptyItem }
