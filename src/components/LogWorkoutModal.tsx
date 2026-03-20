import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { WEIGHT_MODES, WEIGHT_UNITS } from '../lib/exerciseWeight'
import type { ExerciseWeight, ExerciseWeightMode, ExerciseWeightUnit, WorkoutTemplate } from '../types'
import { useData } from '../context/DataContext'
import { toLocalDateString } from '../lib/dates'
import { WORKOUT_FEEL_OPTIONS, type WorkoutFeelEmoji } from '../lib/workoutFeel'
import { RoutineReadOnly } from './RoutineReadOnly'

type Props = {
  open: boolean
  onClose: () => void
  date: Date
  templates: WorkoutTemplate[]
}

type WeightRowDraft = {
  value: string
  unit: ExerciseWeightUnit
  mode: ExerciseWeightMode
}

function emptyRow(unit: ExerciseWeightUnit): WeightRowDraft {
  return { value: '', unit, mode: 'total' }
}

export function LogWorkoutModal({ open, onClose, date, templates }: Props) {
  const { createLog, profile } = useData()
  const defaultWeightUnit: ExerciseWeightUnit = profile.weightUnit === 'kg' ? 'kg' : 'lb'
  const [templateId, setTemplateId] = useState<string>('')
  const [feelEmoji, setFeelEmoji] = useState<WorkoutFeelEmoji>(WORKOUT_FEEL_OPTIONS[2]!.emoji)
  const [notes, setNotes] = useState('')
  const [specifyWeights, setSpecifyWeights] = useState(false)
  const [weightRows, setWeightRows] = useState<WeightRowDraft[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setTemplateId(templates[0]?.id ?? '')
      setFeelEmoji(WORKOUT_FEEL_OPTIONS[2]!.emoji)
      setNotes('')
    }
  }, [open, templates])

  useEffect(() => {
    if (!open) return
    setSpecifyWeights(false)
    setWeightRows([])
  }, [open, templateId])

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId],
  )

  const exerciseLines = useMemo(
    () => selectedTemplate?.items.filter((i) => i.exerciseName.trim()) ?? [],
    [selectedTemplate],
  )

  useEffect(() => {
    if (!open) return
    const n = exerciseLines.length
    setWeightRows((prev) => {
      if (prev.length === n) return prev
      return Array.from({ length: n }, (_, i) => prev[i] ?? emptyRow(defaultWeightUnit))
    })
  }, [open, exerciseLines, defaultWeightUnit])

  const patchWeightRow = (idx: number, patch: Partial<WeightRowDraft>) => {
    setWeightRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  if (!open) return null

  const dateStr = toLocalDateString(date)
  const displayDate = format(date, 'EEE, MMM d')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fromTemplate = templates.find((t) => t.id === templateId)
    if (!fromTemplate) return

    setSaving(true)
    try {
      const routineWeights: (ExerciseWeight | null)[] | undefined =
        specifyWeights && exerciseLines.length > 0
          ? exerciseLines.map((_, i) => {
              const row = weightRows[i] ?? emptyRow(defaultWeightUnit)
              const v = row.value.trim().replace(',', '.')
              if (v === '') return null
              const num = parseFloat(v)
              if (!Number.isFinite(num) || num < 0) return null
              return { value: num, unit: row.unit, mode: row.mode }
            })
          : undefined

      await createLog({
        date: dateStr,
        templateId: fromTemplate.id,
        feelEmoji,
        notes: notes.trim() || undefined,
        completedAt: new Date().toISOString(),
        ...(routineWeights ? { routineWeights } : {}),
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const canSave = !!templateId && templates.length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-workout-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="relative z-10 max-h-[88dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-border bg-surface-2 p-5 shadow-2xl"
      >
        <h2 id="log-workout-title" className="text-lg font-semibold">
          Log workout
        </h2>
        <p className="mt-1 text-sm text-muted">{displayDate}</p>

        <label className="mt-4 block text-sm font-medium text-fg/90">
          Preset
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-surface-3 px-3 py-3 text-base text-fg outline-none focus:ring-2 focus:ring-accent"
          >
            {templates.length === 0 ? (
              <option value="">No presets — add under Presets</option>
            ) : (
              templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))
            )}
          </select>
        </label>

        {selectedTemplate && (
          <div className="mt-3 rounded-xl border border-border/60 bg-surface-3/30 p-3">
            <RoutineReadOnly items={selectedTemplate.items} title="Today’s plan" />
            {selectedTemplate.items.filter((i) => i.exerciseName.trim()).length === 0 && (
              <p className="mt-2 text-sm text-muted">
                This preset has no exercises yet — add them under Presets.
              </p>
            )}
          </div>
        )}

        {exerciseLines.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                setSpecifyWeights((v) => {
                  if (v) setWeightRows((prev) => prev.map(() => emptyRow(defaultWeightUnit)))
                  return !v
                })
              }}
              className={`w-full rounded-xl px-4 py-3.5 text-left text-sm font-semibold transition-[transform,box-shadow,background-color] active:scale-[0.99] ${
                specifyWeights
                  ? 'border border-border/80 bg-surface-3/70 text-fg shadow-sm hover:bg-surface-3'
                  : 'border-2 border-accent bg-gradient-to-br from-accent/20 via-accent/10 to-surface-3/80 text-fg shadow-[0_8px_28px_-8px_rgba(52,211,153,0.45)] ring-1 ring-accent/35 hover:from-accent/25 hover:shadow-[0_10px_32px_-8px_rgba(52,211,153,0.55)]'
              }`}
            >
              {specifyWeights ? 'Skip logging weights' : 'Add weights used'}
            </button>
            {specifyWeights && (
              <div className="mt-3 space-y-4 rounded-xl border border-border/60 bg-surface-3/25 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  Weight per exercise
                </p>
                <p className="text-xs text-muted">
                  Enter a number, choose lb or kg, then how you count it (total bar, per side, or each
                  dumbbell). Leave amount blank to skip that exercise.
                </p>
                <ul className="space-y-4">
                  {exerciseLines.map((ex, idx) => {
                    const row = weightRows[idx] ?? emptyRow(defaultWeightUnit)
                    return (
                      <li key={ex.id} className="rounded-xl border border-border/50 bg-surface-3/40 p-3">
                        <p className="line-clamp-2 text-sm font-medium text-fg">{ex.exerciseName.trim()}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <label className="min-w-[5rem] flex-1">
                            <span className="sr-only">Amount</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step="any"
                              value={row.value}
                              onChange={(e) => patchWeightRow(idx, { value: e.target.value })}
                              placeholder="Amount"
                              className="w-full rounded-lg border border-border bg-surface-3 px-2.5 py-2 text-base tabular-nums text-fg placeholder:text-muted/60 outline-none focus:ring-2 focus:ring-accent"
                              autoComplete="off"
                            />
                          </label>
                          <div
                            className="flex shrink-0 rounded-lg border border-border bg-surface-3 p-0.5"
                            role="group"
                            aria-label="Unit"
                          >
                            {WEIGHT_UNITS.map((u) => {
                              const on = row.unit === u.value
                              return (
                                <button
                                  key={u.value}
                                  type="button"
                                  onClick={() => patchWeightRow(idx, { unit: u.value })}
                                  className={`rounded-md px-3 py-1.5 text-xs font-semibold tabular-nums ${
                                    on
                                      ? 'bg-accent text-surface'
                                      : 'text-muted hover:text-fg'
                                  }`}
                                >
                                  {u.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="How to count">
                          {WEIGHT_MODES.map((m) => {
                            const on = row.mode === m.value
                            return (
                              <button
                                key={m.value}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                title={m.hint}
                                onClick={() => patchWeightRow(idx, { mode: m.value })}
                                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                                  on
                                    ? 'border-accent bg-accent/15 text-fg'
                                    : 'border-border/70 bg-surface-3/50 text-muted hover:border-border hover:text-fg'
                                }`}
                              >
                                {m.label}
                              </button>
                            )
                          })}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        <fieldset className="mt-4">
          <legend className="text-sm font-medium text-fg/90">How did it feel?</legend>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="How did it feel?">
            {WORKOUT_FEEL_OPTIONS.map((opt) => {
              const selected = feelEmoji === opt.emoji
              return (
                <button
                  key={opt.emoji}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  title={opt.label}
                  onClick={() => setFeelEmoji(opt.emoji)}
                  className={`flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center rounded-xl border px-1 py-2 text-2xl leading-none transition-[transform,box-shadow,border-color] active:scale-[0.97] sm:min-w-0 sm:flex-1 ${
                    selected
                      ? 'border-accent bg-accent/15 shadow-[0_0_0_1px_rgba(52,211,153,0.5)]'
                      : 'border-border bg-surface-3/50 hover:border-border/90'
                  }`}
                >
                  <span aria-hidden>{opt.emoji}</span>
                  <span className="mt-1 text-[10px] font-medium text-muted">{opt.label}</span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <label className="mt-4 block text-sm font-medium text-fg/90">
          Session notes <span className="font-normal text-muted">(optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Anything else…"
            className="mt-1.5 w-full resize-none rounded-xl border border-border bg-surface-3 px-3 py-3 text-base text-fg placeholder:text-muted/60 outline-none focus:ring-2 focus:ring-accent"
          />
        </label>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-12 flex-1 rounded-xl border border-border bg-transparent font-medium text-fg active:scale-[0.98] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSave || saving}
            className="h-12 flex-1 rounded-xl bg-accent font-semibold text-surface active:scale-[0.98] disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
