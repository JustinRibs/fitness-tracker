import { db } from './db.js'

type SeedItem = { exerciseName: string; sets: string; reps: string }

const DEFAULTS: { name: string; abbreviation: string; items: SeedItem[] }[] = [
  {
    name: 'Push day',
    abbreviation: 'PD',
    items: [
      { exerciseName: 'Bench press', sets: '3', reps: '6–8' },
      { exerciseName: 'Overhead press', sets: '3', reps: '8' },
      { exerciseName: 'Incline DB press', sets: '3', reps: '10' },
      { exerciseName: 'Lateral raise', sets: '3', reps: '12' },
      { exerciseName: 'Tricep pushdown', sets: '3', reps: '12' },
    ],
  },
  {
    name: 'Pull day',
    abbreviation: 'PL',
    items: [
      { exerciseName: 'Deadlift or RDL', sets: '3', reps: '5–8' },
      { exerciseName: 'Barbell or cable row', sets: '3', reps: '8' },
      { exerciseName: 'Lat pulldown', sets: '3', reps: '10' },
      { exerciseName: 'Face pulls', sets: '3', reps: '15' },
      { exerciseName: 'Hammer curls', sets: '3', reps: '10' },
    ],
  },
  {
    name: 'Leg day',
    abbreviation: 'LD',
    items: [
      { exerciseName: 'Squat', sets: '3', reps: '6–8' },
      { exerciseName: 'Leg press', sets: '3', reps: '10' },
      { exerciseName: 'Leg curl', sets: '3', reps: '12' },
      { exerciseName: 'Leg extension', sets: '3', reps: '12' },
      { exerciseName: 'Standing calf raise', sets: '4', reps: '12' },
    ],
  },
  {
    name: 'Daily rehab',
    abbreviation: 'DR',
    items: [
      { exerciseName: 'Breathing / bracing', sets: '', reps: '2 min' },
      { exerciseName: 'Cat-cow, thoracic rotations', sets: '', reps: '5 min' },
      { exerciseName: 'Band pull-aparts', sets: '2', reps: '20' },
      { exerciseName: 'External rotation', sets: '2', reps: '15 each' },
      { exerciseName: 'Hip flexor stretch', sets: '', reps: '90s each side' },
      { exerciseName: 'Walking or easy bike', sets: '', reps: '10–15 min' },
    ],
  },
]

export function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) as c FROM templates').get() as { c: number }
  if (count.c > 0) return

  const now = new Date().toISOString()
  const insT = db.prepare(
    'INSERT INTO templates (id, name, abbreviation, created_at) VALUES (?, ?, ?, ?)',
  )
  const insI = db.prepare(
    'INSERT INTO template_items (id, template_id, position, exercise_name, sets, reps) VALUES (?, ?, ?, ?, ?, ?)',
  )

  const run = db.transaction(() => {
    for (const preset of DEFAULTS) {
      const tid = crypto.randomUUID()
      insT.run(tid, preset.name, preset.abbreviation, now)
      preset.items.forEach((item, position) => {
        insI.run(
          crypto.randomUUID(),
          tid,
          position,
          item.exerciseName,
          item.sets,
          item.reps,
        )
      })
    }
  })
  run()
}
