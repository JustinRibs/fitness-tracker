import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseExerciseWeightPayload } from '../src/lib/exerciseWeight.js'
import { cloneRoutineItems } from '../src/lib/routine.js'
import { WORKOUT_FEEL_EMOJI_SET } from '../src/lib/workoutFeel.js'
import { db } from './db.js'
import * as repo from './repo.js'
import { seedIfEmpty } from './seed.js'

seedIfEmpty()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(express.json({ limit: '5mb' }))

app.get('/api/templates', (_req, res) => {
  try {
    res.json(repo.listTemplates())
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to list templates' })
  }
})

app.post('/api/templates', (req, res) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
    const abbreviation =
      typeof req.body?.abbreviation === 'string' ? req.body.abbreviation.trim() : ''
    const items = Array.isArray(req.body?.items) ? req.body.items : []
    if (!name) {
      res.status(400).json({ error: 'name required' })
      return
    }
    if (!abbreviation) {
      res.status(400).json({ error: 'abbreviation required' })
      return
    }
    const normalized = items
      .filter((x: unknown) => x != null && typeof x === 'object')
      .map((x: Record<string, unknown>) => ({
        id: typeof x.id === 'string' ? x.id : crypto.randomUUID(),
        exerciseName:
          typeof x.exerciseName === 'string' ? x.exerciseName : String(x.exerciseName ?? ''),
        sets: typeof x.sets === 'string' ? x.sets : '',
        reps: typeof x.reps === 'string' ? x.reps : '',
      }))
      .filter((i: { exerciseName: string }) => i.exerciseName.trim().length > 0)

    const created = repo.insertTemplate(name, abbreviation, normalized)
    res.status(201).json(created)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to create template' })
  }
})

app.put('/api/templates/:id', (req, res) => {
  try {
    const id = req.params.id
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
    const abbreviation =
      typeof req.body?.abbreviation === 'string' ? req.body.abbreviation.trim() : ''
    const items = Array.isArray(req.body?.items) ? req.body.items : []
    if (!name) {
      res.status(400).json({ error: 'name required' })
      return
    }
    if (!abbreviation) {
      res.status(400).json({ error: 'abbreviation required' })
      return
    }
    const normalized = items
      .filter((x: unknown) => x != null && typeof x === 'object')
      .map((x: Record<string, unknown>) => ({
        id: typeof x.id === 'string' ? x.id : crypto.randomUUID(),
        exerciseName:
          typeof x.exerciseName === 'string' ? x.exerciseName : String(x.exerciseName ?? ''),
        sets: typeof x.sets === 'string' ? x.sets : '',
        reps: typeof x.reps === 'string' ? x.reps : '',
      }))
      .filter((i: { exerciseName: string }) => i.exerciseName.trim().length > 0)

    const existing = repo.listTemplates().find((t) => t.id === id)
    if (!existing) {
      res.status(404).json({ error: 'not found' })
      return
    }
    repo.replaceTemplate({ ...existing, name, abbreviation, items: normalized })
    const updated = repo.listTemplates().find((t) => t.id === id)
    res.json(updated)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to update template' })
  }
})

app.delete('/api/templates/:id', (req, res) => {
  try {
    repo.deleteTemplate(req.params.id)
    res.status(204).end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to delete template' })
  }
})

app.get('/api/export', (_req, res) => {
  try {
    res.json(repo.exportSnapshot())
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to export data' })
  }
})

app.post('/api/import', (req, res) => {
  try {
    repo.importSnapshot(req.body)
    res.status(204).end()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Import failed'
    console.error(e)
    res.status(400).json({ error: msg })
  }
})

app.get('/api/profile', (_req, res) => {
  try {
    res.json(repo.getProfile())
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to load profile' })
  }
})

app.get('/api/weight-entries', (_req, res) => {
  try {
    res.json(repo.listWeightEntries())
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to list weight entries' })
  }
})

app.post('/api/weight-entries', (req, res) => {
  try {
    const date = typeof req.body?.date === 'string' ? req.body.date.trim() : ''
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'date must be YYYY-MM-DD' })
      return
    }
    const w = Number(req.body?.weight)
    if (!Number.isFinite(w) || w < 0) {
      res.status(400).json({ error: 'weight must be a non-negative number' })
      return
    }
    const createdAt =
      typeof req.body?.createdAt === 'string' ? req.body.createdAt : new Date().toISOString()
    const created = repo.insertWeightEntry({ date, weight: w, createdAt })
    res.status(201).json(created)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to save weight entry' })
  }
})

app.delete('/api/weight-entries/:id', (req, res) => {
  try {
    repo.deleteWeightEntry(req.params.id)
    res.status(204).end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to delete weight entry' })
  }
})

app.put('/api/profile', (req, res) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
    let birthday: string | null = null
    if (req.body?.birthday != null && req.body.birthday !== '') {
      const b = typeof req.body.birthday === 'string' ? req.body.birthday.trim() : ''
      if (b && !/^\d{4}-\d{2}-\d{2}$/.test(b)) {
        res.status(400).json({ error: 'birthday must be YYYY-MM-DD' })
        return
      }
      birthday = b || null
    }
    let weight: number | null = null
    if (req.body?.weight != null && req.body.weight !== '') {
      const w = Number(req.body.weight)
      if (!Number.isFinite(w) || w < 0) {
        res.status(400).json({ error: 'weight must be a non-negative number' })
        return
      }
      weight = w
    }
    let age: number | null = null
    if (req.body?.age != null && req.body.age !== '') {
      const a = Number(req.body.age)
      if (!Number.isInteger(a) || a < 0 || a > 150) {
        res.status(400).json({ error: 'age must be an integer between 0 and 150' })
        return
      }
      age = a
    }
    let height: number | null = null
    if (req.body?.height != null && req.body.height !== '') {
      const h = Number(req.body.height)
      if (!Number.isFinite(h) || h <= 0) {
        res.status(400).json({ error: 'height must be a positive number' })
        return
      }
      height = h
    }
    let heightUnit: 'cm' | 'in' = 'in'
    if (req.body?.heightUnit != null && req.body.heightUnit !== '') {
      const hu = typeof req.body.heightUnit === 'string' ? req.body.heightUnit.trim() : ''
      if (hu !== 'cm' && hu !== 'in') {
        res.status(400).json({ error: 'heightUnit must be cm or in' })
        return
      }
      heightUnit = hu
    }
    if (height != null) {
      if (heightUnit === 'cm' && (height < 50 || height > 280)) {
        res.status(400).json({ error: 'height (cm) must be between 50 and 280' })
        return
      }
      if (heightUnit === 'in' && (height < 20 || height > 120)) {
        res.status(400).json({ error: 'height (in) must be between 20 and 120 total inches' })
        return
      }
    }
    let weightUnit: 'lb' | 'kg' = 'lb'
    if (req.body?.weightUnit != null && req.body.weightUnit !== '') {
      const u = typeof req.body.weightUnit === 'string' ? req.body.weightUnit.trim() : ''
      if (u !== 'lb' && u !== 'kg') {
        res.status(400).json({ error: 'weightUnit must be lb or kg' })
        return
      }
      weightUnit = u
    }
    let weeklyWorkoutGoal: number | null = null
    if (req.body?.weeklyWorkoutGoal != null && req.body.weeklyWorkoutGoal !== '') {
      const g = Number(req.body.weeklyWorkoutGoal)
      if (!Number.isInteger(g) || g < 1 || g > 21) {
        res.status(400).json({ error: 'weeklyWorkoutGoal must be an integer from 1 to 21, or empty' })
        return
      }
      weeklyWorkoutGoal = g
    }
    const updated = repo.upsertProfile({
      name,
      birthday,
      weight,
      age,
      height,
      heightUnit,
      weightUnit,
      weeklyWorkoutGoal,
    })
    res.json(updated)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to save profile' })
  }
})

app.get('/api/logs', (_req, res) => {
  try {
    res.json(repo.listLogs())
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to list logs' })
  }
})

app.post('/api/logs', (req, res) => {
  try {
    const date = typeof req.body?.date === 'string' ? req.body.date.trim() : ''
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'date must be YYYY-MM-DD' })
      return
    }
    const templateId =
      typeof req.body?.templateId === 'string' ? req.body.templateId.trim() : ''
    if (!templateId) {
      res.status(400).json({ error: 'templateId required' })
      return
    }
    const tpl = repo.listTemplates().find((t) => t.id === templateId)
    if (!tpl) {
      res.status(400).json({ error: 'unknown template' })
      return
    }
    const name = tpl.name
    const feelRaw = typeof req.body?.feelEmoji === 'string' ? req.body.feelEmoji.trim() : ''
    if (!feelRaw || !WORKOUT_FEEL_EMOJI_SET.has(feelRaw)) {
      res.status(400).json({ error: 'feelEmoji must be one of the allowed values' })
      return
    }
    const notes =
      typeof req.body?.notes === 'string' && req.body.notes.trim()
        ? req.body.notes.trim()
        : undefined
    const completedAt =
      typeof req.body?.completedAt === 'string'
        ? req.body.completedAt
        : new Date().toISOString()

    const trimmed = tpl.items.filter((i) => i.exerciseName.trim())
    let routineSnapshot =
      trimmed.length > 0 ? cloneRoutineItems(trimmed) : undefined

    if (routineSnapshot && Array.isArray(req.body?.routineWeights)) {
      const weights = req.body.routineWeights as unknown[]
      if (weights.length !== routineSnapshot.length) {
        res.status(400).json({ error: 'routineWeights must match number of exercises' })
        return
      }
      for (let i = 0; i < weights.length; i++) {
        const raw = weights[i]
        if (raw == null) continue
        if (!parseExerciseWeightPayload(raw)) {
          res.status(400).json({ error: 'invalid routineWeights entry' })
          return
        }
      }
      routineSnapshot = routineSnapshot.map((item, i) => {
        const raw = weights[i]
        if (raw == null) return item
        return { ...item, weight: parseExerciseWeightPayload(raw)! }
      })
    }

    const created = repo.insertLog({
      date,
      templateId,
      name,
      feelEmoji: feelRaw,
      notes,
      completedAt,
      routineSnapshot,
    })
    res.status(201).json(created)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to create log' })
  }
})

app.delete('/api/logs/:id', (req, res) => {
  try {
    repo.deleteLog(req.params.id)
    res.status(204).end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to delete log' })
  }
})

const distDir = path.join(process.cwd(), 'dist')
const isProd = process.env.NODE_ENV === 'production'

if (isProd) {
  app.use(express.static(distDir))
  // Express 5 / path-to-regexp v8: bare '*' is invalid; use a named wildcard.
  app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

const PORT = Number(process.env.PORT) || 3001
app.listen(PORT, () => {
  console.log(`API ${isProd ? '+ static ' : ''}http://localhost:${PORT}`)
})

process.on('SIGINT', () => {
  db.close()
  process.exit(0)
})
