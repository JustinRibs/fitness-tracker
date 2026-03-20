import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

const dataDir = path.join(process.cwd(), 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = process.env.DB_PATH ?? path.join(dataDir, 'fitness.db')

export const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS template_items (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    exercise_name TEXT NOT NULL,
    sets TEXT NOT NULL DEFAULT '',
    reps TEXT NOT NULL DEFAULT ''
  );

  CREATE INDEX IF NOT EXISTS idx_template_items_template ON template_items(template_id);

  CREATE TABLE IF NOT EXISTS workout_logs (
    id TEXT PRIMARY KEY,
    log_date TEXT NOT NULL,
    template_id TEXT REFERENCES templates(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    notes TEXT,
    completed_at TEXT NOT NULL,
    routine_snapshot_json TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_workout_logs_date ON workout_logs(log_date);
`)

const templateCols = db.prepare('PRAGMA table_info(templates)').all() as { name: string }[]
if (!templateCols.some((c) => c.name === 'abbreviation')) {
  db.exec(`ALTER TABLE templates ADD COLUMN abbreviation TEXT NOT NULL DEFAULT '';`)
}

const workoutLogCols = db.prepare('PRAGMA table_info(workout_logs)').all() as { name: string }[]
if (!workoutLogCols.some((c) => c.name === 'feel_emoji')) {
  db.exec(`ALTER TABLE workout_logs ADD COLUMN feel_emoji TEXT`)
}

db.exec(`
  CREATE TABLE IF NOT EXISTS user_profile (
    id TEXT PRIMARY KEY CHECK (id = 'default'),
    display_name TEXT NOT NULL DEFAULT '',
    birthday TEXT,
    weight REAL,
    age INTEGER
  );
  INSERT OR IGNORE INTO user_profile (id) VALUES ('default');

  CREATE TABLE IF NOT EXISTS weight_entries (
    id TEXT PRIMARY KEY,
    log_date TEXT NOT NULL,
    weight REAL NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_weight_entries_log_date ON weight_entries(log_date);
`)

let profileCols = db.prepare('PRAGMA table_info(user_profile)').all() as { name: string }[]
if (!profileCols.some((c) => c.name === 'weight_unit')) {
  db.exec(`ALTER TABLE user_profile ADD COLUMN weight_unit TEXT NOT NULL DEFAULT 'lb'`)
}
profileCols = db.prepare('PRAGMA table_info(user_profile)').all() as { name: string }[]
if (!profileCols.some((c) => c.name === 'weekly_workout_goal')) {
  db.exec(`ALTER TABLE user_profile ADD COLUMN weekly_workout_goal INTEGER`)
}
profileCols = db.prepare('PRAGMA table_info(user_profile)').all() as { name: string }[]
if (!profileCols.some((c) => c.name === 'height')) {
  db.exec(`ALTER TABLE user_profile ADD COLUMN height REAL`)
}
profileCols = db.prepare('PRAGMA table_info(user_profile)').all() as { name: string }[]
if (!profileCols.some((c) => c.name === 'height_unit')) {
  db.exec(`ALTER TABLE user_profile ADD COLUMN height_unit TEXT NOT NULL DEFAULT 'in'`)
}
