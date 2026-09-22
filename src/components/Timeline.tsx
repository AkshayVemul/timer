import { useMemo } from 'react'
import { formatClock, renderTemplate, shortDuration, spokenDuration } from '../lib/format'
import { buildSchedule } from '../lib/schedule'
import type { Phase, TimerConfig } from '../types'

interface Row {
  key: string
  kind: Phase['kind'] | 'overtime'
  clock: string
  text: string
  spoken: boolean
}

function isCountdownEvent(event: Phase['events'][number]): boolean {
  return event.beep === 'tick' || (event.say !== undefined && /^\d+$/.test(event.say))
}

function countdownText(from: number, voice: boolean): string {
  if (!voice) return `${from} beep${from === 1 ? '' : 's'}`
  if (from <= 4) return Array.from({ length: from }, (_, i) => from - i).join(', ')
  return `${from}, ${from - 1}, ${from - 2} … 1`
}

function rowsFor(phase: Phase, index: number): Row[] {
  const rows: Row[] = []
  let countdownAdded = false
  for (const event of phase.events) {
    const clock = formatClock((phase.durationMs - event.atMs) / 1000)
    if (isCountdownEvent(event)) {
      if (countdownAdded) continue
      countdownAdded = true
      rows.push({
        key: `${index}-countdown`,
        kind: phase.kind,
        clock,
        text: countdownText(phase.countdownFrom, event.say !== undefined),
        spoken: false,
      })
    } else if (event.say) {
      rows.push({ key: `${index}-${event.atMs}`, kind: phase.kind, clock, text: event.say, spoken: true })
    } else if (event.beep === 'chime') {
      rows.push({ key: `${index}-chime`, kind: phase.kind, clock, text: 'Chime', spoken: false })
    }
  }
  return rows
}

/** Visual + written preview of one round: what plays and when. */
export function Timeline({ timer }: { timer: TimerConfig }) {
  const phases = useMemo(() => {
    const all = buildSchedule(timer)
    // One of each kind is enough to explain the pattern, however many rounds there are.
    const lastWork = all[all.length - 1]
    const prep = all.find((p) => p.kind === 'prep')
    const rest = all.find((p) => p.kind === 'rest')
    return [prep, rest ? all.find((p) => p.kind === 'work') : lastWork, rest].filter(
      (p): p is Phase => p !== undefined,
    )
  }, [timer])

  if (phases.length === 0) return null

  const interval = Math.max(1, timer.overtimeIntervalSec)
  const overtimeRows: Row[] = timer.overtime
    ? [1, 2].map((n) => ({
        key: `overtime-${n}`,
        kind: 'overtime',
        clock: `+${formatClock(n * interval)}`,
        text: renderTemplate(timer.overtimeMessage, { name: timer.name, overtime: spokenDuration(n * interval) }),
        spoken: true,
      }))
    : []

  return (
    <div className="timeline">
      <div className="timeline-bar" role="img" aria-label="Timer phases">
        {phases.map((phase, i) => (
          <div
            key={i}
            className="timeline-segment"
            data-phase={phase.kind}
            style={{ flexGrow: Math.max(phase.durationMs, 1) }}
          >
            <span className="timeline-segment-label">
              {phase.kind === 'work' ? formatClock(phase.durationMs / 1000) : phase.label}
            </span>
            {phase.kind === 'work' && phase.countdownFrom > 0 && (
              <span
                className="timeline-countdown-zone"
                style={{ width: `${((phase.countdownFrom * 1000) / phase.durationMs) * 100}%` }}
              />
            )}
            {phase.kind === 'work' &&
              phase.events
                .filter((e) => e.say && !isCountdownEvent(e) && e.atMs > 0 && e.atMs < phase.durationMs)
                .map((e) => (
                  <span
                    key={e.atMs}
                    className="timeline-marker"
                    style={{ left: `${(e.atMs / phase.durationMs) * 100}%` }}
                    title={e.say}
                  />
                ))}
          </div>
        ))}
      </div>

      <ol className="timeline-rows">
        {[...phases.flatMap(rowsFor), ...overtimeRows].map((row) => (
          <li key={row.key} data-phase={row.kind}>
            <span className="timeline-clock">{row.clock}</span>
            <span className={row.spoken ? 'timeline-text spoken' : 'timeline-text'}>{row.text}</span>
          </li>
        ))}
      </ol>
      {timer.rounds > 1 && <p className="hint">Repeats for {timer.rounds} rounds.</p>}
      {timer.overtime && (
        <p className="hint">Then the stopwatch keeps going, calling out every {shortDuration(interval)} until you stop it.</p>
      )}
    </div>
  )
}
