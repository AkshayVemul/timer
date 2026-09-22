/** 75 -> "1:15", 3725 -> "1:02:05" */
export function formatClock(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const ss = String(s).padStart(2, '0')
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`
  return `${m}:${ss}`
}

/** 90 -> "1 minute 30 seconds". Written to be read aloud. */
export function spokenDuration(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const parts: string[] = []
  if (h) parts.push(`${h} ${h === 1 ? 'hour' : 'hours'}`)
  if (m) parts.push(`${m} ${m === 1 ? 'minute' : 'minutes'}`)
  if (s || parts.length === 0) parts.push(`${s} ${s === 1 ? 'second' : 'seconds'}`)
  return parts.join(' ')
}

/** 90 -> "1m 30s". Compact label for cards. */
export function shortDuration(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const parts: string[] = []
  if (h) parts.push(`${h}h`)
  if (m) parts.push(`${m}m`)
  if (s || parts.length === 0) parts.push(`${s}s`)
  return parts.join(' ')
}

/** Replaces `{key}` placeholders; unknown keys are left untouched. */
export function renderTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  )
}
