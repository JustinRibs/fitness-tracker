import { NavLink, Outlet } from 'react-router-dom'

const tabClass =
  'rounded-lg px-3 py-2 text-sm font-medium transition-colors border border-transparent'
const tabActive = 'bg-surface-3 text-fg border-border'
const tabIdle = 'text-muted hover:text-fg'

export function StatsLayout() {
  return (
    <div>
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Stats</h1>
        <nav className="mt-3 flex gap-1" aria-label="Stats sections">
          <NavLink
            to="/stats"
            end
            className={({ isActive }) => `${tabClass} ${isActive ? tabActive : tabIdle}`}
          >
            Overview
          </NavLink>
          <NavLink
            to="/stats/lifts"
            className={({ isActive }) => `${tabClass} ${isActive ? tabActive : tabIdle}`}
          >
            Lifts
          </NavLink>
        </nav>
      </header>
      <Outlet />
    </div>
  )
}
