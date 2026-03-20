import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { RoutineItem, UserProfile, WeightEntry, WorkoutLog, WorkoutTemplate } from '../types'
import * as api from '../lib/api'

type DataContextValue = {
  templates: WorkoutTemplate[]
  logs: WorkoutLog[]
  weightEntries: WeightEntry[]
  profile: UserProfile
  booting: boolean
  error: string | null
  refresh: () => Promise<void>
  updateProfile: (profile: UserProfile) => Promise<void>
  createTemplate: (name: string, abbreviation: string, items: RoutineItem[]) => Promise<void>
  updateTemplate: (template: WorkoutTemplate) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>
  createLog: (payload: api.CreateLogPayload) => Promise<void>
  deleteLog: (id: string) => Promise<void>
  recordWeight: (payload: api.CreateWeightEntryPayload) => Promise<void>
  deleteWeightEntry: (id: string) => Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([])
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    birthday: null,
    weight: null,
    age: null,
    height: null,
    heightUnit: 'in',
    weightUnit: 'lb',
    weeklyWorkoutGoal: null,
  })
  const [booting, setBooting] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const [t, l, w, p] = await Promise.all([
        api.fetchTemplates(),
        api.fetchLogs(),
        api.fetchWeightEntries(),
        api.fetchProfile(),
      ])
      setTemplates(
        t.map((x) => ({ ...x, abbreviation: typeof x.abbreviation === 'string' ? x.abbreviation : '' })),
      )
      setLogs(l)
      setWeightEntries(w)
      setProfile({
        ...p,
        heightUnit: p.heightUnit === 'cm' ? 'cm' : 'in',
        weightUnit: p.weightUnit === 'kg' ? 'kg' : 'lb',
        weeklyWorkoutGoal:
          p.weeklyWorkoutGoal != null &&
          Number.isInteger(p.weeklyWorkoutGoal) &&
          p.weeklyWorkoutGoal >= 1
            ? p.weeklyWorkoutGoal
            : null,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load data')
      throw e
    } finally {
      setBooting(false)
    }
  }, [])

  useEffect(() => {
    void refresh().catch(() => {})
  }, [refresh])

  const createTemplate = useCallback(
    async (name: string, abbreviation: string, items: RoutineItem[]) => {
      await api.createTemplateApi(name, abbreviation, items)
      await refresh()
    },
    [refresh],
  )

  const updateTemplate = useCallback(async (template: WorkoutTemplate) => {
    await api.updateTemplateApi(template)
    await refresh()
  }, [refresh])

  const deleteTemplate = useCallback(async (id: string) => {
    await api.deleteTemplateApi(id)
    await refresh()
  }, [refresh])

  const createLog = useCallback(async (payload: api.CreateLogPayload) => {
    await api.createLogApi(payload)
    await refresh()
  }, [refresh])

  const deleteLog = useCallback(async (id: string) => {
    await api.deleteLogApi(id)
    await refresh()
  }, [refresh])

  const updateProfile = useCallback(async (next: UserProfile) => {
    const saved = await api.updateProfileApi(next)
    setProfile(saved)
  }, [])

  const recordWeight = useCallback(async (payload: api.CreateWeightEntryPayload) => {
    await api.createWeightEntryApi(payload)
    await refresh()
  }, [refresh])

  const deleteWeightEntry = useCallback(async (id: string) => {
    await api.deleteWeightEntryApi(id)
    await refresh()
  }, [refresh])

  const value = useMemo(
    () => ({
      templates,
      logs,
      weightEntries,
      profile,
      booting,
      error,
      refresh,
      updateProfile,
      createTemplate,
      updateTemplate,
      deleteTemplate,
      createLog,
      deleteLog,
      recordWeight,
      deleteWeightEntry,
    }),
    [
      templates,
      logs,
      weightEntries,
      profile,
      booting,
      error,
      refresh,
      updateProfile,
      createTemplate,
      updateTemplate,
      deleteTemplate,
      createLog,
      deleteLog,
      recordWeight,
      deleteWeightEntry,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
