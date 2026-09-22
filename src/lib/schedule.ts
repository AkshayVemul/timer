import type { Cue, Phase, ScheduledEvent, TimerConfig } from '../types'
import { renderTemplate, spokenDuration } from './format'

/** Lead-ins shorter than this skip the 3-2-1 so it doesn't cut off the announcement. */
const MIN_LEAD_IN_FOR_COUNT_SEC = 6
const LEAD_IN_COUNT_FROM = 3

/** Offset of a cue from the start of the main countdown, in ms. */
export function cueOffsetMs(cue: Cue, durationSec: number): number {
  switch (cue.anchor) {
    case 'percent':
      return (durationSec * 1000 * cue.value) / 100
    case 'remaining':
      return (durationSec - cue.value) * 1000
    case 'elapsed':
      return cue.value * 1000
  }
}

/** The final countdown can't be longer than the timer itself. */
export function effectiveCountdownFrom(timer: TimerConfig): number {
  if (timer.countdownMode === 'off') return 0
  return Math.max(0, Math.min(timer.countdownFrom, Math.ceil(timer.durationSec) - 1))
}

function countdownEvents(
  durationSec: number,
  from: number,
  mode: TimerConfig['countdownMode'],
): ScheduledEvent[] {
  if (mode === 'off') return []
  const events: ScheduledEvent[] = []
  for (let n = from; n >= 1; n--) {
    const atMs = (durationSec - n) * 1000
    events.push(mode === 'voice' ? { atMs, say: String(n) } : { atMs, beep: 'tick' })
  }
  return events
}

function leadInPhase(
  kind: 'prep' | 'rest',
  durationSec: number,
  message: string,
  round: number,
  timer: TimerConfig,
): Phase {
  const from = durationSec >= MIN_LEAD_IN_FOR_COUNT_SEC ? LEAD_IN_COUNT_FROM : 0
  const events: ScheduledEvent[] = []
  if (message.trim()) events.push({ atMs: 0, say: message })
  events.push(...countdownEvents(durationSec, from, timer.countdownMode))
  return {
    kind,
    label: kind === 'prep' ? 'Get ready' : 'Rest',
    durationMs: durationSec * 1000,
    round,
    countdownFrom: from,
    events,
  }
}

function workPhase(timer: TimerConfig, round: number, vars: Record<string, string | number>): Phase {
  const durationMs = timer.durationSec * 1000
  const from = effectiveCountdownFrom(timer)
  const countdownStartMs = durationMs - from * 1000
  const events: ScheduledEvent[] = []

  const start = renderTemplate(timer.startMessage, vars).trim()
  const startLine = timer.rounds > 1 ? `Round ${round}. ${start}`.trim() : start
  if (startLine) events.push({ atMs: 0, say: startLine })
  if (timer.countdownMode === 'beep') events.push({ atMs: 0, beep: 'go' })

  for (const cue of timer.cues) {
    const atMs = cueOffsetMs(cue, timer.durationSec)
    const message = renderTemplate(cue.message, vars).trim()
    // Cues that would talk over the final countdown are dropped.
    if (message && atMs > 0 && atMs < countdownStartMs) events.push({ atMs, say: message })
  }

  events.push(...countdownEvents(timer.durationSec, from, timer.countdownMode))

  const isLastRound = round === timer.rounds
  if (isLastRound) {
    const end = renderTemplate(timer.endMessage, vars).trim()
    events.push({ atMs: durationMs, say: end || undefined, beep: 'chime' })
  }

  events.sort((a, b) => a.atMs - b.atMs)
  return {
    kind: 'work',
    label: timer.name,
    durationMs,
    round,
    countdownFrom: from,
    events,
  }
}

/** Expands a timer into the ordered phases the runner plays through. */
export function buildSchedule(timer: TimerConfig): Phase[] {
  const phases: Phase[] = []
  const baseVars = {
    name: timer.name,
    duration: spokenDuration(timer.durationSec),
    prep: spokenDuration(timer.prepSec),
    rest: spokenDuration(timer.restSec),
    rounds: timer.rounds,
  }

  if (timer.prepSec > 0) {
    const message = renderTemplate(timer.prepMessage, { ...baseVars, round: 1 })
    phases.push(leadInPhase('prep', timer.prepSec, message, 1, timer))
  }

  for (let round = 1; round <= timer.rounds; round++) {
    const vars = { ...baseVars, round }
    phases.push(workPhase(timer, round, vars))
    if (round < timer.rounds && timer.restSec > 0) {
      const message = renderTemplate(timer.restMessage, { ...vars, round: round + 1 })
      phases.push(leadInPhase('rest', timer.restSec, message, round + 1, timer))
    }
  }

  return phases
}

export function totalDurationSec(timer: TimerConfig): number {
  return buildSchedule(timer).reduce((sum, phase) => sum + phase.durationMs, 0) / 1000
}
