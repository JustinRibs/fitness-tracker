import { NavLink } from 'react-router-dom'

const linkClass =
  'flex min-h-12 min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-xs font-medium text-muted transition-colors'

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface-2/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md"
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-lg justify-around px-2">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `${linkClass} ${isActive ? 'text-accent' : 'hover:text-fg/80'}`
          }
        >
          <span className="text-lg leading-none" aria-hidden>
            ◎
          </span>
          Track
        </NavLink>
        <NavLink
          to="/stats"
          className={({ isActive }) =>
            `${linkClass} ${isActive ? 'text-accent' : 'hover:text-fg/80'}`
          }
        >
          <span className="text-lg leading-none" aria-hidden>
            ◆
          </span>
          Stats
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `${linkClass} ${isActive ? 'text-accent' : 'hover:text-fg/80'}`
          }
        >
          <span className="text-lg leading-none" aria-hidden>
            ○
          </span>
          Profile
        </NavLink>
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            `${linkClass} ${isActive ? 'text-accent' : 'hover:text-fg/80'}`
          }
        >
          <span className="text-lg leading-none" aria-hidden>
            ⚙
          </span>
          Presets
        </NavLink>
      </div>
    </nav>
  )
}
