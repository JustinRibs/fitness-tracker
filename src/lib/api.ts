import type {
  ExerciseWeight,
  FitExportSnapshot,
  RoutineItem,
  UserProfile,
  WeightEntry,
  WorkoutLog,
  WorkoutTemplate,
} from '../types'

async function parseError(res: Response): Promise<string> {
  const t = await res.text()
  try {
    const j = JSON.parse(t) as { error?: string }
    return j.error ?? (t || res.statusText)
  } catch {
    return t || res.statusText
  }
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(await parseError(res))
  if (res.status === 204) return undefined as T
  const text = await res.text()
  if (!text.trim()) return undefined as T
  return JSON.parse(text) as T
}

export async function fetchTemplates(): Promise<WorkoutTemplate[]> {
  return json(await fetch('/api/templates'))
}

export async function fetchLogs(): Promise<WorkoutLog[]> {
  return json(await fetch('/api/logs'))
}

export async function fetchProfile(): Promise<UserProfile> {
  return json(await fetch('/api/profile'))
}

export async function fetchExportSnapshot(): Promise<FitExportSnapshot> {
  return json(await fetch('/api/export'))
}

export async function importSnapshotApi(payload: FitExportSnapshot): Promise<void> {
  await json(
    await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  )
}

export async function fetchWeightEntries(): Promise<WeightEntry[]> {
  return json(await fetch('/api/weight-entries'))
}

export type CreateWeightEntryPayload = {
  date: string
  weight: number
  createdAt?: string
}

export async function createWeightEntryApi(payload: CreateWeightEntryPayload): Promise<WeightEntry> {
  return json(
    await fetch('/api/weight-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  )
}

export async function deleteWeightEntryApi(id: string): Promise<void> {
  await json(
    await fetch(`/api/weight-entries/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  )
}

export async function updateProfileApi(profile: UserProfile): Promise<UserProfile> {
  return json(
    await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: profile.name,
        birthday: profile.birthday,
        weight: profile.weight,
        age: profile.age,
        height: profile.height,
        heightUnit: profile.heightUnit,
        weightUnit: profile.weightUnit,
        weeklyWorkoutGoal: profile.weeklyWorkoutGoal,
      }),
    }),
  )
}

export async function createTemplateApi(
  name: string,
  abbreviation: string,
  items: RoutineItem[],
): Promise<WorkoutTemplate> {
  return json(
    await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, abbreviation, items }),
    }),
  )
}

export async function updateTemplateApi(template: WorkoutTemplate): Promise<WorkoutTemplate> {
  return json(
    await fetch(`/api/templates/${encodeURIComponent(template.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: template.name,
        abbreviation: template.abbreviation,
        items: template.items,
      }),
    }),
  )
}

export async function deleteTemplateApi(id: string): Promise<void> {
  await json(
    await fetch(`/api/templates/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  )
}

export type CreateLogPayload = {
  date: string
  templateId: string
  feelEmoji: string
  notes?: string
  completedAt: string
  /** Same order as exercises; `null` = no weight for that line */
  routineWeights?: (ExerciseWeight | null)[]
}

export async function createLogApi(payload: CreateLogPayload): Promise<WorkoutLog> {
  return json(
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  )
}

export async function deleteLogApi(id: string): Promise<void> {
  await json(
    await fetch(`/api/logs/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  )
}
