/** Tap one emoji to capture how the session felt (stored on each log). */
export const WORKOUT_FEEL_OPTIONS = [
  { emoji: '😩', label: 'Rough' },
  { emoji: '😮‍💨', label: 'Hard' },
  { emoji: '😐', label: 'OK' },
  { emoji: '🙂', label: 'Good' },
  { emoji: '🔥', label: 'Great' },
] as const

export const WORKOUT_FEEL_EMOJI_SET = new Set(
  WORKOUT_FEEL_OPTIONS.map((o) => o.emoji) as string[],
)

export type WorkoutFeelEmoji = (typeof WORKOUT_FEEL_OPTIONS)[number]['emoji']
