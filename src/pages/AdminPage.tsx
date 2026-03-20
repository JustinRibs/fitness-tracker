import { useState } from 'react'
import { emptyItem, RoutineLinesEditor } from '../components/RoutineLinesEditor'
import { useData } from '../context/DataContext'
import type { RoutineItem, WorkoutTemplate } from '../types'

function nonEmptyItems(items: RoutineItem[]): RoutineItem[] {
  return items.filter((i) => i.exerciseName.trim().length > 0)
}

export function AdminPage() {
  const { templates, createTemplate, updateTemplate, deleteTemplate } = useData()
  const [draftName, setDraftName] = useState('')
  const [draftAbbreviation, setDraftAbbreviation] = useState('')
  const [draftItems, setDraftItems] = useState<RoutineItem[]>([emptyItem()])
  const [formError, setFormError] = useState<string | null>(null)

  const addPreset = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const name = draftName.trim()
    const abbreviation = draftAbbreviation.trim()
    if (!name) return
    if (!abbreviation) {
      setFormError('Add a short calendar abbreviation (e.g. PD).')
      return
    }
    const items = nonEmptyItems(draftItems)
    try {
      await createTemplate(name, abbreviation, items)
      setDraftName('')
      setDraftAbbreviation('')
      setDraftItems([emptyItem()])
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save preset')
    }
  }

  const saveTemplate = async (updated: WorkoutTemplate) => {
    setFormError(null)
    const items = nonEmptyItems(updated.items)
    const abbr = updated.abbreviation.trim()
    if (!abbr) {
      setFormError('Calendar abbreviation is required.')
      return
    }
    try {
      await updateTemplate({ ...updated, abbreviation: abbr, items })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not update preset')
    }
  }

  const remove = async (id: string) => {
    setFormError(null)
    try {
      await deleteTemplate(id)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not delete preset')
    }
  }

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Workout presets</h1>
        <p className="mt-1 text-sm text-muted">
          Name each day, set a short abbreviation for the calendar, then list exercises in order.
          Routines show when you log and copy into history.
        </p>
      </header>

      {formError && (
        <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-fg">
          {formError}
        </p>
      )}

      <form onSubmit={addPreset} className="rounded-2xl border border-border bg-surface-2 p-4">
        <h2 className="text-sm font-semibold text-fg">New preset</h2>
        <label className="mt-3 block text-sm font-medium">Name</label>
        <input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder="e.g. Push day"
          className="mt-1.5 min-h-12 w-full rounded-xl border border-border bg-surface-3 px-3 text-base outline-none focus:ring-2 focus:ring-accent"
        />
        <label className="mt-3 block text-sm font-medium">Calendar abbreviation</label>
        <p className="mt-0.5 text-xs text-muted">Shown on the month grid (keep it very short).</p>
        <input
          value={draftAbbreviation}
          onChange={(e) => setDraftAbbreviation(e.target.value)}
          placeholder="e.g. PD"
          maxLength={12}
          className="mt-1.5 min-h-12 w-full rounded-xl border border-border bg-surface-3 px-3 text-base outline-none focus:ring-2 focus:ring-accent"
        />
        <div className="mt-4">
          <p className="text-sm font-medium">Routine</p>
          <div className="mt-2">
            <RoutineLinesEditor
              items={draftItems}
              onChange={setDraftItems}
              hint="Exercise name plus sets and reps (or time/duration in reps if you prefer)."
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 w-full min-h-12 rounded-xl bg-accent font-semibold text-surface active:scale-[0.98]"
        >
          Save preset
        </button>
      </form>

      <h2 className="mb-2 mt-8 text-sm font-semibold text-muted">Your presets</h2>
      <ul className="space-y-2">
        {templates.map((t) => (
          <PresetCard key={t.id} template={t} onSave={saveTemplate} onRemove={remove} />
        ))}
      </ul>

      {templates.length === 0 && (
        <p className="mt-6 text-center text-sm text-muted">No presets yet. Add one above.</p>
      )}
    </div>
  )
}

function PresetCard({
  template,
  onSave,
  onRemove,
}: {
  template: WorkoutTemplate
  onSave: (t: WorkoutTemplate) => void | Promise<void>
  onRemove: (id: string) => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(template.name)
  const [abbreviation, setAbbreviation] = useState(template.abbreviation)
  const [items, setItems] = useState<RoutineItem[]>(template.items)
  const [saving, setSaving] = useState(false)

  const syncFromProps = () => {
    setName(template.name)
    setAbbreviation(template.abbreviation)
    setItems(
      template.items.length > 0
        ? template.items.map((i) => ({ ...i }))
        : [emptyItem()],
    )
  }

  const openEditor = () => {
    syncFromProps()
    setOpen(true)
  }

  const close = () => {
    setOpen(false)
    syncFromProps()
  }

  const save = async () => {
    const n = name.trim()
    const abbr = abbreviation.trim()
    if (!n || !abbr) return
    setSaving(true)
    try {
      await onSave({ ...template, name: n, abbreviation: abbr, items })
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const count = template.items.filter((i) => i.exerciseName.trim()).length
  const abbrDisplay = template.abbreviation.trim() || '—'

  if (!open) {
    return (
      <li className="rounded-xl border border-border bg-surface-2 px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold">{template.name}</p>
            <p className="mt-0.5 text-sm text-muted">
              <span className="font-medium text-fg/80">{abbrDisplay}</span>
              {' · '}
              {count === 0 ? 'No exercises yet' : `${count} exercise${count === 1 ? '' : 's'}`}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={openEditor}
              className="rounded-lg bg-surface-3 px-3 py-2 text-sm font-medium active:scale-[0.98]"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => void onRemove(template.id)}
              className="rounded-lg px-3 py-2 text-sm text-muted hover:text-fg"
            >
              Delete
            </button>
          </div>
        </div>
      </li>
    )
  }

  return (
    <li className="rounded-xl border border-accent/40 bg-surface-2 p-4 ring-1 ring-accent/20">
      <label className="block text-sm font-medium">Name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mt-1.5 min-h-12 w-full rounded-xl border border-border bg-surface-3 px-3 text-base outline-none focus:ring-2 focus:ring-accent"
      />
      <label className="mt-3 block text-sm font-medium">Calendar abbreviation</label>
      <p className="mt-0.5 text-xs text-muted">Shown on the month grid.</p>
      <input
        value={abbreviation}
        onChange={(e) => setAbbreviation(e.target.value)}
        placeholder="e.g. PD"
        maxLength={12}
        className="mt-1.5 min-h-12 w-full rounded-xl border border-border bg-surface-3 px-3 text-base outline-none focus:ring-2 focus:ring-accent"
      />
      <div className="mt-4">
        <p className="text-sm font-medium">Routine</p>
        <div className="mt-2">
          <RoutineLinesEditor items={items} onChange={setItems} />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={close}
          disabled={saving}
          className="h-12 flex-1 rounded-xl border border-border font-medium active:scale-[0.98] disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || !abbreviation.trim()}
          className="h-12 flex-1 rounded-xl bg-accent font-semibold text-surface active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </li>
  )
}
