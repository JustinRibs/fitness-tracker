# Fit Log

Workout calendar with presets and SQLite storage.

## Dev

Runs Vite (frontend) and the API together. The UI proxies `/api` to the server.

```bash
npm install
npm run dev
```

- App: **http://localhost:5173**
- API: **http://localhost:3001**

Database file: **`data/fitness.db`** (created automatically; gitignored).

## Production

```bash
npm run build
NODE_ENV=production npm start
```

Open **http://localhost:3001** — static files and API share one port.

Override DB path: `DB_PATH=/path/to/file.db`. Override port: `PORT=8080`.

## Docker

Requires [Docker](https://docs.docker.com/get-docker/) with Compose v2.

```bash
docker compose up --build
```

Open **http://localhost:3939** (API + static UI on one port). Data persists in the named volume `fitness_data` (SQLite under `/app/data` in the container).

- Change the **host** port: `HOST_PORT=8080 docker compose up`
- Override DB file path in the container: set `DB_PATH` under `environment` in `docker-compose.yml`

## Profile

Open **Profile** in the bottom nav to set name, birthday, age, and body weight (stored in SQLite). Choose **Pounds** or **Kilograms** as the default unit for exercise weights when logging (defaults to lb). Optionally set a **weekly workout goal** (sessions per Monday–Sunday week). On your birthday, the home screen shows a short greeting.

## Stats

**Overview** (default **Stats** tab) shows weigh-ins, session counts, streaks, and weekly charts. **Lifts** lists exercises seen in your logged routine snapshots: pick an exercise to see history, a simple load chart (structured weights only), and approximate “PR” ordering (total load in kg; **per side** / **each** are doubled for comparison; bar weight is not modeled).

## Backup

Under **Profile → Data**, **Download backup** saves a JSON file (presets, workouts, weigh-ins, profile including weekly goal). **Restore from file** replaces everything in the local SQLite database after a confirmation — use for migration or recovery.

## Weight

Weigh-ins are stored in **`weight_entries`** (date + weight). **Friday** is the weekly weigh-in day. The **Home** screen only nags **after** that Friday has passed (from **Saturday** onward) if that Friday still has no entry. The quick form saves the weight for **that Friday’s date**. Logging **today’s** date also updates **Profile → Weight**. History and delete are under **Stats**.

## Presets

Each preset has a **name**, a short **calendar abbreviation** (shown on the month grid), and **routine** lines (**exercise**, **sets**, **reps**). **Logging a workout** requires choosing a preset, picking a **feel** emoji (rough → great), and optional notes — the routine snapshot is copied from the preset. You can optionally tap **Add weights used** and enter a **structured** load per exercise: numeric amount, **lb** or **kg**, and whether it’s **total** load, **per side** (bar), or **each** (dumbbell). Fresh DBs are seeded with Push / Pull / Leg / Daily rehab templates (with abbreviations PD, PL, LD, DR).

Existing databases pick up an `abbreviation` column via migration; edit each preset once to set an abbreviation if yours are empty.
