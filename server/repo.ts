import { parseStoredRoutineWeight } from '../src/lib/exerciseWeight.js'
import { WORKOUT_FEEL_EMOJI_SET } from '../src/lib/workoutFeel.js'
import type {
  FitExportSnapshot,
  RoutineItem,
  UserProfile,
  WeightEntry,
  WorkoutLog,
  WorkoutTemplate,
} from '../src/types.js'
import { db } from './db.js'

type ItemRow = {
  id: string
  template_id: string
  position: number
  exercise_name: string
  sets: string
  reps: string
}

function mapItemRow(r: ItemRow): RoutineItem {
  return {
    id: r.id,
    exerciseName: r.exercise_name,
    sets: r.sets,
    reps: r.reps,
  }
}

export function listTemplates(): WorkoutTemplate[] {
  const templates = db
    .prepare(
      'SELECT id, name, abbreviation, created_at as createdAt FROM templates ORDER BY created_at DESC',
    )
    .all() as { id: string; name: string; abbreviation: string; createdAt: string }[]

  const itemRows = db
    .prepare(
      'SELECT id, template_id, position, exercise_name, sets, reps FROM template_items ORDER BY template_id, position',
    )
    .all() as ItemRow[]

  const byTemplate = new Map<string, RoutineItem[]>()
  for (const r of itemRows) {
    const list = byTemplate.get(r.template_id) ?? []
    list.push(mapItemRow(r))
    byTemplate.set(r.template_id, list)
  }

  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    abbreviation: t.abbreviation ?? '',
    createdAt: t.createdAt,
    items: byTemplate.get(t.id) ?? [],
  }))
}

export function insertTemplate(
  name: string,
  abbreviation: string,
  items: RoutineItem[],
): WorkoutTemplate {
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const insT = db.prepare(
    'INSERT INTO templates (id, name, abbreviation, created_at) VALUES (?, ?, ?, ?)',
  )
  const insI = db.prepare(
    'INSERT INTO template_items (id, template_id, position, exercise_name, sets, reps) VALUES (?, ?, ?, ?, ?, ?)',
  )

  const tx = db.transaction(() => {
    insT.run(id, name, abbreviation, createdAt)
    items.forEach((item, position) => {
      insI.run(
        crypto.randomUUID(),
        id,
        position,
        item.exerciseName,
        item.sets,
        item.reps,
      )
    })
  })
  tx()

  return listTemplates().find((t) => t.id === id)!
}

export function replaceTemplate(template: WorkoutTemplate): void {
  const upd = db.prepare('UPDATE templates SET name = ?, abbreviation = ? WHERE id = ?')
  const del = db.prepare('DELETE FROM template_items WHERE template_id = ?')
  const insI = db.prepare(
    'INSERT INTO template_items (id, template_id, position, exercise_name, sets, reps) VALUES (?, ?, ?, ?, ?, ?)',
  )

  const tx = db.transaction(() => {
    upd.run(template.name, template.abbreviation, template.id)
    del.run(template.id)
    template.items.forEach((item, position) => {
      insI.run(
        crypto.randomUUID(),
        template.id,
        position,
        item.exerciseName,
        item.sets,
        item.reps,
      )
    })
  })
  tx()
}

export function deleteTemplate(id: string): void {
  db.prepare('DELETE FROM templates WHERE id = ?').run(id)
}

type LogRow = {
  id: string
  log_date: string
  template_id: string | null
  name: string
  notes: string | null
  completed_at: string
  routine_snapshot_json: string | null
  feel_emoji: string | null
}

export function listLogs(): WorkoutLog[] {
  const rows = db
    .prepare(
      `SELECT id, log_date, template_id, name, notes, completed_at, routine_snapshot_json, feel_emoji
       FROM workout_logs ORDER BY completed_at DESC`,
    )
    .all() as LogRow[]

  return rows.map((r) => {
    let routineSnapshot: RoutineItem[] | undefined
    if (r.routine_snapshot_json) {
      try {
        const parsed = JSON.parse(r.routine_snapshot_json) as unknown
        if (Array.isArray(parsed)) {
          routineSnapshot = parsed
            .filter((x): x is Record<string, unknown> => x != null && typeof x === 'object')
            .map((x) => {
              const base = {
                id: typeof x.id === 'string' ? x.id : crypto.randomUUID(),
                exerciseName:
                  typeof x.exerciseName === 'string'
                    ? x.exerciseName
                    : typeof (x as { text?: string }).text === 'string'
                      ? (x as { text: string }).text
                      : '',
                sets: typeof x.sets === 'string' ? x.sets : '',
                reps: typeof x.reps === 'string' ? x.reps : '',
              }
              const w = parseStoredRoutineWeight((x as { weight?: unknown }).weight)
              return w != null ? { ...base, weight: w } : base
            })
            .filter((i) => i.exerciseName.trim())
          if (routineSnapshot.length === 0) routineSnapshot = undefined
        }
      } catch {
        routineSnapshot = undefined
      }
    }
    return {
      id: r.id,
      date: r.log_date,
      templateId: r.template_id,
      name: r.name,
      ...(r.feel_emoji ? { feelEmoji: r.feel_emoji } : {}),
      notes: r.notes ?? undefined,
      completedAt: r.completed_at,
      routineSnapshot,
    }
  })
}

export type NewLog = {
  date: string
  templateId: string | null
  name: string
  feelEmoji: string
  notes?: string
  completedAt: string
  routineSnapshot?: RoutineItem[]
}

export function insertLog(input: NewLog): WorkoutLog {
  const id = crypto.randomUUID()
  const snapJson =
    input.routineSnapshot && input.routineSnapshot.length > 0
      ? JSON.stringify(input.routineSnapshot)
      : null

  db.prepare(
    `INSERT INTO workout_logs (id, log_date, template_id, name, notes, completed_at, routine_snapshot_json, feel_emoji)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.date,
    input.templateId,
    input.name,
    input.notes ?? null,
    input.completedAt,
    snapJson,
    input.feelEmoji,
  )

  return {
    id,
    date: input.date,
    templateId: input.templateId,
    name: input.name,
    feelEmoji: input.feelEmoji,
    notes: input.notes,
    completedAt: input.completedAt,
    routineSnapshot: input.routineSnapshot,
  }
}

export function deleteLog(id: string): void {
  db.prepare('DELETE FROM workout_logs WHERE id = ?').run(id)
}

type ProfileRow = {
  display_name: string
  birthday: string | null
  weight: number | null
  age: number | null
  height: number | null
  height_unit: string | null
  weight_unit: string | null
  weekly_workout_goal: number | null
}

export function getProfile(): UserProfile {
  const row = db
    .prepare(
      `SELECT display_name, birthday, weight, age, height, height_unit, weight_unit, weekly_workout_goal FROM user_profile WHERE id = ?`,
    )
    .get('default') as ProfileRow | undefined
  if (!row) {
    db.prepare('INSERT OR IGNORE INTO user_profile (id) VALUES (?)').run('default')
    return {
      name: '',
      birthday: null,
      weight: null,
      age: null,
      height: null,
      heightUnit: 'in',
      weightUnit: 'lb',
      weeklyWorkoutGoal: null,
    }
  }
  const goal =
    row.weekly_workout_goal != null &&
    Number.isInteger(row.weekly_workout_goal) &&
    row.weekly_workout_goal >= 1
      ? row.weekly_workout_goal
      : null
  return {
    name: row.display_name ?? '',
    birthday: row.birthday,
    weight: row.weight,
    age: row.age,
    height: row.height,
    heightUnit: row.height_unit === 'cm' ? 'cm' : 'in',
    weightUnit: row.weight_unit === 'kg' ? 'kg' : 'lb',
    weeklyWorkoutGoal: goal,
  }
}

export function upsertProfile(input: UserProfile): UserProfile {
  const unit = input.weightUnit === 'kg' ? 'kg' : 'lb'
  const goal =
    input.weeklyWorkoutGoal != null &&
    Number.isInteger(input.weeklyWorkoutGoal) &&
    input.weeklyWorkoutGoal >= 1
      ? input.weeklyWorkoutGoal
      : null
  const heightUnit = input.heightUnit === 'cm' ? 'cm' : 'in'
  db.prepare(
    `INSERT INTO user_profile (id, display_name, birthday, weight, age, height, height_unit, weight_unit, weekly_workout_goal)
     VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       display_name = excluded.display_name,
       birthday = excluded.birthday,
       weight = excluded.weight,
       age = excluded.age,
       height = excluded.height,
       height_unit = excluded.height_unit,
       weight_unit = excluded.weight_unit,
       weekly_workout_goal = excluded.weekly_workout_goal`,
  ).run(input.name, input.birthday, input.weight, input.age, input.height, heightUnit, unit, goal)
  return getProfile()
}

type WeightRow = {
  id: string
  log_date: string
  weight: number
  created_at: string
}

export function listWeightEntries(): WeightEntry[] {
  const rows = db
    .prepare(
      `SELECT id, log_date, weight, created_at FROM weight_entries ORDER BY log_date DESC, created_at DESC`,
    )
    .all() as WeightRow[]
  return rows.map((r) => ({
    id: r.id,
    date: r.log_date,
    weight: r.weight,
    createdAt: r.created_at,
  }))
}

export type NewWeightEntry = {
  date: string
  weight: number
  createdAt: string
}

/** Sets profile body weight to the latest weigh-in (by calendar date, then time). */
function syncProfileWeightFromLatestEntry(): void {
  const row = db
    .prepare(
      `SELECT weight FROM weight_entries ORDER BY log_date DESC, created_at DESC LIMIT 1`,
    )
    .get() as { weight: number } | undefined
  if (row) {
    db.prepare(`UPDATE user_profile SET weight = ? WHERE id = 'default'`).run(row.weight)
  } else {
    db.prepare(`UPDATE user_profile SET weight = NULL WHERE id = 'default'`).run()
  }
}

/** Inserts a weigh-in and keeps profile weight in sync (including weekly / backdated entries). */
export function insertWeightEntry(input: NewWeightEntry): WeightEntry {
  const id = crypto.randomUUID()
  db.prepare(
    `INSERT INTO weight_entries (id, log_date, weight, created_at) VALUES (?, ?, ?, ?)`,
  ).run(id, input.date, input.weight, input.createdAt)

  syncProfileWeightFromLatestEntry()

  return {
    id,
    date: input.date,
    weight: input.weight,
    createdAt: input.createdAt,
  }
}

export function deleteWeightEntry(id: string): void {
  db.prepare(`DELETE FROM weight_entries WHERE id = ?`).run(id)
  syncProfileWeightFromLatestEntry()
}

export const EXPORT_SCHEMA_VERSION = 1

export function exportSnapshot(): FitExportSnapshot {
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    profile: getProfile(),
    templates: listTemplates(),
    logs: listLogs(),
    weightEntries: listWeightEntries(),
  }
}

function assertImportProfile(o: unknown): UserProfile {
  if (o == null || typeof o !== 'object') throw new Error('profile invalid')
  const p = o as Record<string, unknown>
  const name = typeof p.name === 'string' ? p.name : ''
  const birthday = p.birthday == null || p.birthday === '' ? null : String(p.birthday)
  if (birthday && !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) throw new Error('profile birthday invalid')
  const weight = p.weight == null ? null : Number(p.weight)
  if (weight != null && (!Number.isFinite(weight) || weight < 0)) throw new Error('profile weight invalid')
  const age = p.age == null ? null : Number(p.age)
  if (age != null && (!Number.isInteger(age) || age < 0 || age > 150)) throw new Error('profile age invalid')
  const height = p.height == null || p.height === '' ? null : Number(p.height)
  if (height != null && (!Number.isFinite(height) || height <= 0)) throw new Error('profile height invalid')
  const heightUnit = p.heightUnit === 'cm' ? 'cm' : 'in'
  if (height != null) {
    if (heightUnit === 'cm' && (height < 50 || height > 280)) throw new Error('profile height cm out of range')
    if (heightUnit === 'in' && (height < 20 || height > 120)) throw new Error('profile height in out of range')
  }
  const weightUnit = p.weightUnit === 'kg' ? 'kg' : 'lb'
  let weeklyWorkoutGoal: number | null = null
  if (p.weeklyWorkoutGoal != null && p.weeklyWorkoutGoal !== '') {
    const g = Number(p.weeklyWorkoutGoal)
    if (!Number.isInteger(g) || g < 1 || g > 21) throw new Error('profile weeklyWorkoutGoal invalid')
    weeklyWorkoutGoal = g
  }
  return { name, birthday, weight, age, height, heightUnit, weightUnit, weeklyWorkoutGoal }
}

export function importSnapshot(payload: unknown): void {
  if (payload == null || typeof payload !== 'object') throw new Error('invalid payload')
  const raw = payload as Record<string, unknown>
  const schemaVersion = Number(raw.schemaVersion)
  if (schemaVersion !== EXPORT_SCHEMA_VERSION) throw new Error('unsupported schemaVersion')

  if (!Array.isArray(raw.templates)) throw new Error('templates must be an array')
  if (!Array.isArray(raw.logs)) throw new Error('logs must be an array')
  if (!Array.isArray(raw.weightEntries)) throw new Error('weightEntries must be an array')

  const profile = assertImportProfile(raw.profile)

  const templates: WorkoutTemplate[] = []
  for (const t of raw.templates) {
    if (t == null || typeof t !== 'object') throw new Error('invalid template')
    const o = t as Record<string, unknown>
    const id = typeof o.id === 'string' ? o.id : ''
    const name = typeof o.name === 'string' ? o.name : ''
    const abbreviation = typeof o.abbreviation === 'string' ? o.abbreviation : ''
    const createdAt = typeof o.createdAt === 'string' ? o.createdAt : new Date().toISOString()
    if (!id || !name) throw new Error('template id/name required')
    const items: RoutineItem[] = []
    if (!Array.isArray(o.items)) throw new Error('template items must be an array')
    for (const it of o.items) {
      if (it == null || typeof it !== 'object') throw new Error('invalid template item')
      const i = it as Record<string, unknown>
      const itemId = typeof i.id === 'string' && i.id ? i.id : crypto.randomUUID()
      const exerciseName =
        typeof i.exerciseName === 'string' ? i.exerciseName : String(i.exerciseName ?? '')
      const sets = typeof i.sets === 'string' ? i.sets : ''
      const reps = typeof i.reps === 'string' ? i.reps : ''
      items.push({ id: itemId, exerciseName, sets, reps })
    }
    templates.push({ id, name, abbreviation, createdAt, items })
  }

  const logs: WorkoutLog[] = []
  for (const log of raw.logs) {
    if (log == null || typeof log !== 'object') throw new Error('invalid log')
    const l = log as Record<string, unknown>
    const id = typeof l.id === 'string' ? l.id : ''
    const date = typeof l.date === 'string' ? l.date : ''
    const name = typeof l.name === 'string' ? l.name : ''
    const completedAt = typeof l.completedAt === 'string' ? l.completedAt : ''
    if (!id || !date || !name || !completedAt) throw new Error('log id/date/name/completedAt required')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('log date invalid')
    const templateId =
      l.templateId == null || l.templateId === ''
        ? null
        : typeof l.templateId === 'string'
          ? l.templateId
          : null
    const notes =
      typeof l.notes === 'string' && l.notes.trim() ? l.notes.trim() : undefined
    const feelRaw = typeof l.feelEmoji === 'string' ? l.feelEmoji.trim() : ''
    const feelEmoji =
      feelRaw && WORKOUT_FEEL_EMOJI_SET.has(feelRaw) ? feelRaw : '😐'
    let routineSnapshot: RoutineItem[] | undefined
    if (Array.isArray(l.routineSnapshot)) {
      routineSnapshot = l.routineSnapshot
        .filter((x): x is Record<string, unknown> => x != null && typeof x === 'object')
        .map((x) => {
          const id = typeof x.id === 'string' ? x.id : crypto.randomUUID()
          const exerciseName =
            typeof x.exerciseName === 'string' ? x.exerciseName : String(x.exerciseName ?? '')
          const sets = typeof x.sets === 'string' ? x.sets : ''
          const reps = typeof x.reps === 'string' ? x.reps : ''
          const base: RoutineItem = { id, exerciseName, sets, reps }
          const w = parseStoredRoutineWeight(x.weight)
          return w != null ? { ...base, weight: w } : base
        })
        .filter((i) => i.exerciseName.trim())
      if (routineSnapshot.length === 0) routineSnapshot = undefined
    }
    logs.push({
      id,
      date,
      templateId,
      name,
      feelEmoji,
      notes,
      completedAt,
      routineSnapshot,
    })
  }

  const weightEntries: WeightEntry[] = []
  for (const we of raw.weightEntries) {
    if (we == null || typeof we !== 'object') throw new Error('invalid weight entry')
    const w = we as Record<string, unknown>
    const id = typeof w.id === 'string' ? w.id : ''
    const date = typeof w.date === 'string' ? w.date : ''
    const weight = Number(w.weight)
    const createdAt = typeof w.createdAt === 'string' ? w.createdAt : ''
    if (!id || !date || !createdAt || !Number.isFinite(weight) || weight < 0) {
      throw new Error('weight entry invalid')
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('weight entry date invalid')
    weightEntries.push({ id, date, weight, createdAt })
  }

  const insLog = db.prepare(
    `INSERT INTO workout_logs (id, log_date, template_id, name, notes, completed_at, routine_snapshot_json, feel_emoji)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const insT = db.prepare(
    'INSERT INTO templates (id, name, abbreviation, created_at) VALUES (?, ?, ?, ?)',
  )
  const insI = db.prepare(
    'INSERT INTO template_items (id, template_id, position, exercise_name, sets, reps) VALUES (?, ?, ?, ?, ?, ?)',
  )
  const insW = db.prepare(
    'INSERT INTO weight_entries (id, log_date, weight, created_at) VALUES (?, ?, ?, ?)',
  )

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM workout_logs').run()
    db.prepare('DELETE FROM template_items').run()
    db.prepare('DELETE FROM templates').run()
    db.prepare('DELETE FROM weight_entries').run()

    for (const t of templates) {
      insT.run(t.id, t.name, t.abbreviation, t.createdAt)
      t.items.forEach((item, position) => {
        insI.run(item.id, t.id, position, item.exerciseName, item.sets, item.reps)
      })
    }

    for (const log of logs) {
      const snapJson =
        log.routineSnapshot && log.routineSnapshot.length > 0
          ? JSON.stringify(log.routineSnapshot)
          : null
      insLog.run(
        log.id,
        log.date,
        log.templateId,
        log.name,
        log.notes ?? null,
        log.completedAt,
        snapJson,
        log.feelEmoji ?? null,
      )
    }

    for (const e of weightEntries) {
      insW.run(e.id, e.date, e.weight, e.createdAt)
    }

    upsertProfile(profile)
  })
  tx()
}
