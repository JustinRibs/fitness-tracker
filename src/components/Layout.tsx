import { Outlet } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { BottomNav } from './BottomNav'

export function Layout() {
  const { booting, error, refresh } = useData()

  const year = new Date().getFullYear()

  return (
    <div className="flex min-h-dvh flex-col bg-surface text-fg">
      <main className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
        {error && (
          <div
            className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-fg"
            role="alert"
          >
            <span className="min-w-0 flex-1">{error}</span>
            <button
              type="button"
              onClick={() => void refresh().catch(() => {})}
              className="shrink-0 rounded-lg bg-surface-3 px-3 py-1.5 text-xs font-medium"
            >
              Retry
            </button>
          </div>
        )}
        <div className="flex min-h-0 flex-1 flex-col">
          {booting ? (
            <p className="flex-1 py-12 text-center text-muted">Loading…</p>
          ) : (
            <div className="min-h-0 flex-1">
              <Outlet />
            </div>
          )}
          <footer className="mt-auto shrink-0 pt-6 text-center text-[10px] leading-relaxed text-muted/70">
            © {year} Full Stack Ribs Inc.
          </footer>
        </div>
      </main>
      {!booting && <BottomNav />}
    </div>
  )
}
