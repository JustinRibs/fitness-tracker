/** Logged load — value + unit + how you count it (bar total vs per-side vs dumbbells). */
export type ExerciseWeightUnit = 'lb' | 'kg'

export type ExerciseWeightMode = 'total' | 'per_side' | 'per_hand'

export type ExerciseWeight = {
  value: number
  unit: ExerciseWeightUnit
  mode: ExerciseWeightMode
}

export type RoutineItem = {
  id: string
  exerciseName: string
  /** Free text, e.g. "3" or "4–5" */
  sets: string
  /** Free text, e.g. "8", "6–8", "AMRAP", "30s" */
  reps: string
  /** Logged snapshots only. `string` = older free-text entries */
  weight?: ExerciseWeight | string
}

export type WorkoutTemplate = {
  id: string
  name: string
  /** Short label for the month calendar (e.g. PD, Rehab) */
  abbreviation: string
  createdAt: string
  /** Ordered steps / exercises for this preset */
  items: RoutineItem[]
}

/** One line on the month calendar (preset abbr. or shortened custom name) */
export type CalendarCellLabel = {
  text: string
  title: string
}

/** How height is interpreted when `height` is set */
export type HeightUnit = 'cm' | 'in'

/** Saved under Settings; birthday is YYYY-MM-DD when set */
export type UserProfile = {
  name: string
  birthday: string | null
  weight: number | null
  age: number | null
  /** Total height in cm, or total inches, depending on `heightUnit` */
  height: number | null
  heightUnit: HeightUnit
  /** Default lb/kg for exercise weights when logging (defaults to lb) */
  weightUnit: ExerciseWeightUnit
  /** Target sessions per Mon–Sun week; null = no goal */
  weeklyWorkoutGoal: number | null
}

/** One weigh-in; `date` is local calendar day YYYY-MM-DD */
export type WeightEntry = {
  id: string
  date: string
  weight: number
  createdAt: string
}

export type WorkoutLog = {
  id: string
  /** Local calendar date YYYY-MM-DD */
  date: string
  templateId: string | null
  /** Snapshot for display if template is removed */
  name: string
  /** How it felt — one of WORKOUT_FEEL_OPTIONS (older logs may omit) */
  feelEmoji?: string
  notes?: string
  completedAt: string
  /** Copy of template routine at log time */
  routineSnapshot?: RoutineItem[]
}

/** Full backup JSON (export/import). */
export type FitExportSnapshot = {
  schemaVersion: number
  exportedAt: string
  profile: UserProfile
  templates: WorkoutTemplate[]
  logs: WorkoutLog[]
  weightEntries: WeightEntry[]
}
