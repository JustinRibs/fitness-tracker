/** Short label for calendar cells: initials for multi-word names, else trimmed. */
export function abbreviateWorkoutLabel(raw: string): string {
  const name = raw.trim()
  if (name.length <= 5) return name

  const parts = name.split(/\s+/).filter((p) => p.length > 0)
  if (parts.length >= 2) {
    const letters = parts
      .map((p) => {
        const m = p.match(/[A-Za-zÀ-ÿ]/)
        return m ? m[0].toUpperCase() : ''
      })
      .join('')
    if (letters.length >= 2) return letters.slice(0, 4)
  }

  return name.length > 4 ? `${name.slice(0, 3)}…` : name
}
