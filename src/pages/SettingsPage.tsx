import { differenceInYears, format, parse } from 'date-fns'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useData } from '../context/DataContext'
import { bmiCategoryLabel, computeBmiFromProfile } from '../lib/bmi'
import { fetchExportSnapshot, importSnapshotApi } from '../lib/api'
import type { ExerciseWeightUnit, FitExportSnapshot, HeightUnit, UserProfile } from '../types'

function parseBirthdayParts(iso: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  return [y, mo, d]
}

function ageFromBirthday(iso: string): number | null {
  const parts = parseBirthdayParts(iso)
  if (!parts) return null
  const [y, mo, d] = parts
  const birth = new Date(y, mo - 1, d)
  if (Number.isNaN(birth.getTime())) return null
  return differenceInYears(new Date(), birth)
}

function formatBirthdayLong(iso: string | null): string {
  if (!iso?.trim()) return '—'
  const d = parse(iso, 'yyyy-MM-dd', new Date())
  if (Number.isNaN(d.getTime())) return iso
  return format(d, 'MMMM d, yyyy')
}

/** `height` in inches when unit is `in` */
function ftInFromTotalInches(total: number): { ft: number; inch: number } {
  const ft = Math.floor(total / 12)
  const inch = Math.round((total - ft * 12) * 100) / 100
  return { ft, inch }
}

function formatHeightLine(height: number | null, unit: HeightUnit): string {
  if (height == null) return '—'
  if (unit === 'cm') {
    const n = height % 1 === 0 ? String(height) : height.toFixed(1)
    return `${n} cm`
  }
  const { ft, inch } = ftInFromTotalInches(height)
  if (inch === 0) return `${ft} ft`
  const inchLabel = inch % 1 === 0 ? String(inch) : inch.toFixed(1)
  return `${ft} ft ${inchLabel} in`
}

function formatInchInput(inch: number): string {
  if (inch % 1 === 0) return String(inch)
  return inch.toFixed(1)
}

type ProfileRowProps = { label: string; value: string }
function ProfileRow({ label, value }: ProfileRowProps) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/60 py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <span className="text-sm font-medium text-fg">{value}</span>
    </div>
  )
}

export function SettingsPage() {
  const { profile, updateProfile, refresh } = useData()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile.name)
  const [birthday, setBirthday] = useState(profile.birthday ?? '')
  const [weight, setWeight] = useState(profile.weight != null ? String(profile.weight) : '')
  const [age, setAge] = useState(profile.age != null ? String(profile.age) : '')
  const [heightFtStr, setHeightFtStr] = useState('')
  const [heightInStr, setHeightInStr] = useState('')
  const [heightCmStr, setHeightCmStr] = useState('')
  const [heightUnit, setHeightUnit] = useState<HeightUnit>(profile.heightUnit)
  const [weightUnit, setWeightUnit] = useState<ExerciseWeightUnit>(profile.weightUnit)
  const [weeklyGoal, setWeeklyGoal] = useState(
    profile.weeklyWorkoutGoal != null ? String(profile.weeklyWorkoutGoal) : '',
  )
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [exportBusy, setExportBusy] = useState(false)
  const [importBusy, setImportBusy] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const syncFormFromProfile = useCallback(() => {
    setName(profile.name)
    setBirthday(profile.birthday ?? '')
    setWeight(profile.weight != null ? String(profile.weight) : '')
    setAge(profile.age != null ? String(profile.age) : '')
    const u = profile.heightUnit === 'cm' ? 'cm' : 'in'
    setHeightUnit(u)
    if (u === 'cm') {
      setHeightCmStr(profile.height != null ? String(profile.height) : '')
      setHeightFtStr('')
      setHeightInStr('')
    } else if (profile.height != null) {
      const { ft, inch } = ftInFromTotalInches(profile.height)
      setHeightFtStr(String(ft))
      setHeightInStr(formatInchInput(inch))
      setHeightCmStr('')
    } else {
      setHeightFtStr('')
      setHeightInStr('')
      setHeightCmStr('')
    }
    setWeightUnit(profile.weightUnit === 'kg' ? 'kg' : 'lb')
    setWeeklyGoal(profile.weeklyWorkoutGoal != null ? String(profile.weeklyWorkoutGoal) : '')
  }, [profile])

  const setHeightUnitAndConvert = (next: HeightUnit) => {
    if (next === heightUnit) return
    if (next === 'cm') {
      const ft = Number(heightFtStr)
      const inch = Number(heightInStr)
      const hasIn = heightFtStr.trim() !== '' || heightInStr.trim() !== ''
      if (hasIn && Number.isFinite(ft) && Number.isFinite(inch) && ft >= 0 && inch >= 0) {
        const totalIn = ft * 12 + inch
        if (totalIn > 0) setHeightCmStr((totalIn * 2.54).toFixed(1))
      }
      setHeightUnit('cm')
      return
    }
    const cm = Number(heightCmStr.trim())
    if (heightCmStr.trim() !== '' && Number.isFinite(cm) && cm > 0) {
      const totalIn = cm / 2.54
      const { ft, inch } = ftInFromTotalInches(totalIn)
      setHeightFtStr(String(ft))
      setHeightInStr(formatInchInput(inch))
    }
    setHeightUnit('in')
  }

  useEffect(() => {
    syncFormFromProfile()
  }, [syncFormFromProfile])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setSaving(true)
    const wTrim = weight.trim()
    const aTrim = age.trim()
    let weightNum: number | null = null
    if (wTrim) {
      const w = Number(wTrim)
      if (!Number.isFinite(w) || w < 0) {
        setFormError('Weight must be a non-negative number.')
        setSaving(false)
        return
      }
      weightNum = w
    }
    let ageNum: number | null = null
    if (aTrim) {
      const a = Number(aTrim)
      if (!Number.isInteger(a) || a < 0 || a > 150) {
        setFormError('Age must be a whole number between 0 and 150.')
        setSaving(false)
        return
      }
      ageNum = a
    }
    let heightNum: number | null = null
    if (heightUnit === 'cm') {
      const hTrim = heightCmStr.trim()
      if (hTrim) {
        const h = Number(hTrim)
        if (!Number.isFinite(h) || h <= 0) {
          setFormError('Height must be a positive number.')
          setSaving(false)
          return
        }
        if (h < 50 || h > 280) {
          setFormError('Height (cm) must be between 50 and 280.')
          setSaving(false)
          return
        }
        heightNum = h
      }
    } else {
      const ftTrim = heightFtStr.trim()
      const inTrim = heightInStr.trim()
      if (!ftTrim && !inTrim) {
        heightNum = null
      } else {
        const ft = ftTrim ? Number(ftTrim) : 0
        const inch = inTrim ? Number(inTrim) : 0
        if (!Number.isFinite(ft) || !Number.isFinite(inch)) {
          setFormError('Feet and inches must be numbers.')
          setSaving(false)
          return
        }
        if (ft < 0 || inch < 0) {
          setFormError('Feet and inches cannot be negative.')
          setSaving(false)
          return
        }
        if (inch >= 12) {
          setFormError('Inches must be less than 12 — use the next foot up (e.g. 6 ft 1 in, not 5 ft 13 in).')
          setSaving(false)
          return
        }
        heightNum = ft * 12 + inch
        if (heightNum === 0) {
          heightNum = null
        } else if (heightNum < 20 || heightNum > 120) {
          setFormError('Height must be between about 1′8″ and 10′ (20–120 total inches).')
          setSaving(false)
          return
        }
      }
    }
    const bTrim = birthday.trim()
    const gTrim = weeklyGoal.trim()
    let weeklyWorkoutGoal: number | null = null
    if (gTrim) {
      const g = Number(gTrim)
      if (!Number.isInteger(g) || g < 1 || g > 21) {
        setFormError('Weekly goal must be a whole number from 1 to 21, or leave blank.')
        setSaving(false)
        return
      }
      weeklyWorkoutGoal = g
    }
    const payload: UserProfile = {
      name: name.trim(),
      birthday: bTrim ? bTrim : null,
      weight: weightNum,
      age: ageNum,
      height: heightNum,
      heightUnit,
      weightUnit,
      weeklyWorkoutGoal,
    }
    try {
      await updateProfile(payload)
      setSavedAt(Date.now())
      setEditing(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const fillAgeFromBirthday = () => {
    const b = birthday.trim()
    if (!b) return
    const computed = ageFromBirthday(b)
    if (computed != null) setAge(String(computed))
  }

  const cancelEdit = () => {
    setFormError(null)
    syncFormFromProfile()
    setEditing(false)
  }

  const downloadBackup = async () => {
    setImportError(null)
    setExportBusy(true)
    try {
      const data = await fetchExportSnapshot()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fit-log-backup-${format(new Date(), 'yyyy-MM-dd')}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExportBusy(false)
    }
  }

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (
      !window.confirm(
        'Replace all data on this device with this backup? This cannot be undone.',
      )
    ) {
      return
    }
    setImportError(null)
    setImportBusy(true)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown
      if (parsed == null || typeof parsed !== 'object') throw new Error('Invalid JSON')
      await importSnapshotApi(parsed as FitExportSnapshot)
      await refresh()
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImportBusy(false)
    }
  }

  const displayName = profile.name.trim() || 'Your profile'
  const weightLine =
    profile.weight != null
      ? `${profile.weight % 1 === 0 ? String(profile.weight) : profile.weight.toFixed(1)} (your scale)`
      : '—'
  const bmi = computeBmiFromProfile(profile)
  const bmiLine = bmi != null ? `${bmi} · ${bmiCategoryLabel(bmi)}` : '—'

  return (
    <div>
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted">
            Profile details personalize the app. Birthday unlocks a one-day greeting on the home screen.
          </p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              syncFormFromProfile()
              setFormError(null)
              setEditing(true)
            }}
            className="shrink-0 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-surface active:scale-[0.98]"
          >
            Edit profile
          </button>
        )}
      </header>

      {formError && (
        <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-fg">
          {formError}
        </p>
      )}

      {!editing ? (
        <section className="overflow-hidden rounded-2xl border border-border bg-surface-2">
          <div className="border-b border-border bg-surface-3/50 px-4 py-5">
            <p className="text-lg font-semibold tracking-tight text-fg">{displayName}</p>
          </div>
          <div className="px-4 pb-1">
            <ProfileRow label="Birthday" value={formatBirthdayLong(profile.birthday)} />
            <ProfileRow
              label="Age"
              value={profile.age != null ? `${profile.age} years` : '—'}
            />
            <ProfileRow label="Weight" value={weightLine} />
            <ProfileRow
              label="Height"
              value={formatHeightLine(profile.height, profile.heightUnit)}
            />
            <ProfileRow
              label="Lift weights"
              value={profile.weightUnit === 'kg' ? 'Kilograms (kg)' : 'Pounds (lb)'}
            />
            <ProfileRow label="BMI" value={bmiLine} />
            <ProfileRow
              label="Weekly goal"
              value={
                profile.weeklyWorkoutGoal != null
                  ? `${profile.weeklyWorkoutGoal} sessions / week`
                  : 'None set'
              }
            />
          </div>
          <p className="border-t border-border/60 px-4 py-3 text-xs leading-relaxed text-muted">
            BMI uses your weight and height above. Body weight is read as{' '}
            {profile.weightUnit === 'kg' ? 'kilograms' : 'pounds'} to match your lift-weight units.
          </p>
        </section>
      ) : (
        <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-surface-2 p-4">
          <label className="block text-sm font-medium">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="How we greet you"
            className="mt-1.5 w-full rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-fg placeholder:text-muted/60"
          />

          <label className="mt-4 block text-sm font-medium">Birthday</label>
          <input
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-fg [color-scheme:dark]"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={fillAgeFromBirthday}
              className="rounded-lg border border-border bg-surface-3 px-3 py-1.5 text-xs font-medium text-muted hover:text-fg"
            >
              Set age from birthday
            </button>
            <span className="text-xs text-muted">Optional shortcut — you can still type age yourself.</span>
          </div>

          <label className="mt-4 block text-sm font-medium">Age</label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={150}
            step={1}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="Years"
            className="mt-1.5 w-full rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-fg placeholder:text-muted/60"
          />

          <label className="mt-4 block text-sm font-medium">Weight</label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="e.g. 175 (your unit)"
            className="mt-1.5 w-full rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-fg placeholder:text-muted/60"
          />
          <p className="mt-1 text-xs text-muted">Stored as a number — use whichever unit you prefer.</p>

          <p className="mt-4 text-sm font-medium">Height</p>
          <div className="mt-1.5 flex flex-wrap items-end gap-2">
            {heightUnit === 'in' ? (
              <>
                <div className="min-w-0 flex-1 sm:max-w-[7rem]">
                  <label className="block text-xs text-muted">Feet</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={10}
                    step={1}
                    value={heightFtStr}
                    onChange={(e) => setHeightFtStr(e.target.value)}
                    placeholder="6"
                    className="mt-1 w-full rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-fg placeholder:text-muted/60"
                  />
                </div>
                <div className="min-w-0 flex-1 sm:max-w-[7rem]">
                  <label className="block text-xs text-muted">Inches</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.1"
                    value={heightInStr}
                    onChange={(e) => setHeightInStr(e.target.value)}
                    placeholder="1"
                    className="mt-1 w-full rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-fg placeholder:text-muted/60"
                  />
                </div>
              </>
            ) : (
              <div className="min-w-0 flex-1">
                <label className="block text-xs text-muted">Centimeters</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={50}
                  max={280}
                  step={0.1}
                  value={heightCmStr}
                  onChange={(e) => setHeightCmStr(e.target.value)}
                  placeholder="e.g. 175"
                  className="mt-1 w-full rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-fg placeholder:text-muted/60"
                />
              </div>
            )}
            <div
              className="flex shrink-0 rounded-xl border border-border bg-surface-3 p-0.5"
              role="group"
              aria-label="Height unit"
            >
              {(
                [
                  { value: 'in' as const, label: 'ft / in' },
                  { value: 'cm' as const, label: 'cm' },
                ] as const
              ).map((opt) => {
                const on = heightUnit === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setHeightUnitAndConvert(opt.value)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      on ? 'bg-accent text-surface' : 'text-muted hover:text-fg'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
          <p className="mt-1 text-xs text-muted">
            {heightUnit === 'in'
              ? 'e.g. 6 ft and 1 in. Leave both blank if you prefer not to track height.'
              : 'Leave blank if you prefer not to track height.'}
          </p>

          <p className="mt-4 text-sm font-medium">Units for logging lifts</p>
          <p className="mt-1 text-xs text-muted">
            Default for lb / kg when you add weights to a workout. You can still switch per exercise.
          </p>
          <div
            className="mt-2 flex rounded-xl border border-border bg-surface-3 p-0.5"
            role="group"
            aria-label="Default weight unit"
          >
            {(
              [
                { value: 'lb' as const, label: 'Pounds (lb)' },
                { value: 'kg' as const, label: 'Kilograms (kg)' },
              ] as const
            ).map((opt) => {
              const on = weightUnit === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setWeightUnit(opt.value)}
                  className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    on ? 'bg-accent text-surface' : 'text-muted hover:text-fg'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>

          <label className="mt-4 block text-sm font-medium">Weekly workout goal</label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={21}
            step={1}
            value={weeklyGoal}
            onChange={(e) => setWeeklyGoal(e.target.value)}
            placeholder="e.g. 4 (sessions per Mon–Sun week)"
            className="mt-1.5 w-full rounded-xl border border-border bg-surface-3 px-3 py-2.5 text-fg placeholder:text-muted/60"
          />
          <p className="mt-1 text-xs text-muted">Optional. Leave blank for no goal. Weeks start on Monday.</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-surface disabled:opacity-60 active:scale-[0.98]"
            >
              {saving ? 'Saving…' : 'Save profile'}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={cancelEdit}
              className="rounded-xl border border-border bg-surface-3 px-4 py-2.5 text-sm font-medium text-fg disabled:opacity-60"
            >
              Cancel
            </button>
            {savedAt != null && !saving && (
              <span className="text-xs text-muted" role="status">
                Saved
              </span>
            )}
          </div>
        </form>
      )}

      <section className="mt-8 rounded-2xl border border-border bg-surface-2 p-4">
        <h2 className="text-sm font-semibold">Data</h2>
        <p className="mt-1 text-xs text-muted">
          Download a JSON backup of presets, workouts, weigh-ins, and profile. Restoring replaces
          everything in the local database.
        </p>
        {importError && (
          <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-fg">
            {importError}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={exportBusy}
            onClick={() => void downloadBackup()}
            className="rounded-xl border border-border bg-surface-3 px-4 py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {exportBusy ? 'Preparing…' : 'Download backup'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(ev) => void onImportFile(ev)}
          />
          <button
            type="button"
            disabled={importBusy}
            onClick={() => fileRef.current?.click()}
            className="rounded-xl border border-border bg-surface-3 px-4 py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {importBusy ? 'Restoring…' : 'Restore from file…'}
          </button>
        </div>
      </section>
    </div>
  )
}
