/** YYYY-MM-DD in local timezone */
export function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** True when `birthday` is YYYY-MM-DD and month/day match today (local). */
export function isBirthdayToday(birthday: string | null | undefined): boolean {
  if (!birthday || typeof birthday !== 'string') return false
  const m = ISO_DATE.exec(birthday.trim())
  if (!m) return false
  const month = Number(m[2]) - 1
  const day = Number(m[3])
  if (month < 0 || month > 11 || day < 1 || day > 31) return false
  const now = new Date()
  return now.getMonth() === month && now.getDate() === day
}
