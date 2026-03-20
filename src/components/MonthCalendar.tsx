import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import type { CalendarCellLabel } from '../types'

type Props = {
  visibleMonth: Date
  onPrevMonth: () => void
  onNextMonth: () => void
  selectedDate: Date
  onSelectDate: (d: Date) => void
  /** YYYY-MM-DD → labels for the month grid (preset abbreviations or shortened names) */
  calendarLabelsByDay: Map<string, CalendarCellLabel[]>
}

function dayKey(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

const MAX_BULLETS = 3

export function MonthCalendar({
  visibleMonth,
  onPrevMonth,
  onNextMonth,
  selectedDate,
  onSelectDate,
  calendarLabelsByDay,
}: Props) {
  const start = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 0 })
  const end = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start, end })

  const weekLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-3 shadow-lg shadow-black/20">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onPrevMonth}
          className="flex h-11 min-w-11 items-center justify-center rounded-xl border border-border bg-surface-3 text-fg active:scale-95"
          aria-label="Previous month"
        >
          ‹
        </button>
        <h2 className="text-center text-base font-semibold tracking-tight">
          {format(visibleMonth, 'MMMM yyyy')}
        </h2>
        <button
          type="button"
          onClick={onNextMonth}
          className="flex h-11 min-w-11 items-center justify-center rounded-xl border border-border bg-surface-3 text-fg active:scale-95"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wider text-muted">
        {weekLabels.map((l, i) => (
          <div key={`${l}-${i}`} className="py-1">
            {l}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const key = dayKey(d)
          const outside = !isSameMonth(d, visibleMonth)
          const selected = isSameDay(d, selectedDate)
          const today = isToday(d)
          const labels = calendarLabelsByDay.get(key) ?? []
          const hasLog = labels.length > 0

          const labelClass = selected
            ? 'text-surface/90'
            : outside
              ? 'text-muted/50'
              : 'text-muted'

          const ariaLabel =
            format(d, 'EEEE, MMMM d, yyyy') +
            (hasLog ? `. Workouts: ${labels.map((l) => l.title).join(', ')}` : '')

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(d)}
              aria-label={ariaLabel}
              className={[
                'relative flex min-h-14 flex-col items-stretch rounded-xl px-1 pb-1 pt-1 transition-colors',
                outside ? 'text-muted/40' : 'text-fg',
                selected
                  ? 'bg-accent text-surface ring-2 ring-accent ring-offset-2 ring-offset-surface-2'
                  : today && !selected
                    ? 'bg-surface-3 text-accent'
                    : 'hover:bg-surface-3/80 active:scale-[0.98]',
              ].join(' ')}
            >
              <span
                className={`self-center text-sm font-semibold leading-none ${
                  selected ? 'text-surface' : today && !selected ? 'text-accent' : ''
                }`}
              >
                {format(d, 'd')}
              </span>
              {hasLog && (
                <ul
                  className={`mt-1 w-full min-w-0 list-none space-y-px text-left ${labelClass}`}
                  aria-hidden
                >
                  {labels.slice(0, MAX_BULLETS).map((entry, i) => (
                    <li
                      key={`${key}-lbl-${i}-${entry.title}`}
                      className="flex gap-0.5 text-[8px] font-medium leading-tight tracking-tight sm:text-[9px]"
                    >
                      <span className="shrink-0 select-none opacity-65" aria-hidden>
                        •
                      </span>
                      <span className="min-w-0 truncate" title={entry.title}>
                        {entry.text}
                      </span>
                    </li>
                  ))}
                  {labels.length > MAX_BULLETS && (
                    <li className="flex gap-0.5 text-[8px] font-medium leading-tight opacity-75 sm:text-[9px]">
                      <span className="shrink-0 select-none opacity-65" aria-hidden>
                        •
                      </span>
                      <span>+{labels.length - MAX_BULLETS}</span>
                    </li>
                  )}
                </ul>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { addMonths, subMonths }
