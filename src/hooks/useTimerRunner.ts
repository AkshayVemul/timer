import { useCallback, useEffect, useRef, useState } from 'react'
import { beep, unlockAudio } from '../lib/beep'
import { speak, stopSpeaking } from '../lib/speech'
import type { Phase, ScheduledEvent, Settings } from '../types'

export type RunStatus = 'idle' | 'running' | 'paused' | 'overtime' | 'finished'

/** Stopwatch that runs after the schedule ends, calling out every `intervalMs`. */
export interface OvertimeConfig {
  intervalMs: number
  messageAt: (overtimeMs: number) => string
  beep: boolean
}

interface Snapshot {
  status: RunStatus
  phaseIndex: number
  elapsedMs: number
  /** True once the schedule has ended and the stopwatch is, or was, counting. */
  overtime: boolean
  overtimeMs: number
}

const TICK_MS = 100
/** After a throttled background tab wakes up, announcements older than this are skipped. */
const STALE_EVENT_MS = 1500

const initial: Snapshot = { status: 'idle', phaseIndex: 0, elapsedMs: 0, overtime: false, overtimeMs: 0 }

export function useTimerRunner(phases: Phase[], settings: Settings, overtime: OvertimeConfig | null) {
  const [snapshot, setSnapshot] = useState<Snapshot>(initial)

  const phasesRef = useRef(phases)
  const settingsRef = useRef(settings)
  const overtimeRef = useRef(overtime)
  /** Index into `phases`; equal to `phases.length` while the overtime stopwatch runs. */
  const phaseIndexRef = useRef(0)
  /** performance.now() value at which the current phase (or the stopwatch) was at 0 elapsed. */
  const phaseStartRef = useRef(0)
  /** Next unplayed event in the phase, or the number of overtime callouts already made. */
  const nextEventRef = useRef(0)
  const pausedElapsedRef = useRef(0)

  useEffect(() => {
    phasesRef.current = phases
    settingsRef.current = settings
    overtimeRef.current = overtime
  }, [phases, settings, overtime])

  const emit = useCallback((event: ScheduledEvent) => {
    const s = settingsRef.current
    if (event.beep && (event.beep !== 'chime' || s.endChime)) beep(event.beep, s.volume)
    if (event.say) speak(event.say, s)
  }, [])

  const finishedSnapshot = useCallback(
    (overtimeMs: number): Snapshot => {
      const all = phasesRef.current
      return {
        status: 'finished',
        phaseIndex: all.length - 1,
        elapsedMs: all[all.length - 1].durationMs,
        overtime: overtimeMs > 0,
        overtimeMs,
      }
    },
    [],
  )

  const tickOvertime = useCallback((now: number) => {
    const config = overtimeRef.current
    const all = phasesRef.current
    if (!config) return
    const elapsed = now - phaseStartRef.current
    for (;;) {
      const at = (nextEventRef.current + 1) * config.intervalMs
      if (at > elapsed) break
      if (elapsed - at < STALE_EVENT_MS) {
        const s = settingsRef.current
        if (config.beep) beep('tick', s.volume)
        speak(config.messageAt(at), s)
      }
      nextEventRef.current++
    }
    setSnapshot({
      status: 'overtime',
      phaseIndex: all.length - 1,
      elapsedMs: all[all.length - 1].durationMs,
      overtime: true,
      overtimeMs: elapsed,
    })
  }, [])

  /** Called the moment the last phase ends: either start the stopwatch or finish. */
  const endSchedule = useCallback(
    (now: number) => {
      if (overtimeRef.current) {
        phaseIndexRef.current = phasesRef.current.length
        nextEventRef.current = 0
        tickOvertime(now)
      } else {
        phaseIndexRef.current = phasesRef.current.length - 1
        setSnapshot(finishedSnapshot(0))
      }
    },
    [tickOvertime, finishedSnapshot],
  )

  // Time is derived from the clock on every tick, so throttled intervals never cause drift.
  const tick = useCallback(() => {
    const all = phasesRef.current
    const now = performance.now()
    if (phaseIndexRef.current >= all.length) {
      tickOvertime(now)
      return
    }

    let index = phaseIndexRef.current
    let elapsed = now - phaseStartRef.current

    for (;;) {
      const phase = all[index]
      while (nextEventRef.current < phase.events.length) {
        const event = phase.events[nextEventRef.current]
        if (event.atMs > elapsed) break
        if (elapsed - event.atMs < STALE_EVENT_MS) emit(event)
        nextEventRef.current++
      }
      if (elapsed < phase.durationMs) break

      elapsed -= phase.durationMs
      // Advancing by the phase length (not resetting to now) keeps the next phase drift-free.
      phaseStartRef.current += phase.durationMs
      nextEventRef.current = 0
      index++
      if (index >= all.length) {
        endSchedule(now)
        return
      }
      phaseIndexRef.current = index
    }

    setSnapshot({ status: 'running', phaseIndex: index, elapsedMs: elapsed, overtime: false, overtimeMs: 0 })
  }, [emit, tickOvertime, endSchedule])

  useEffect(() => {
    if (snapshot.status !== 'running' && snapshot.status !== 'overtime') return
    const id = window.setInterval(tick, TICK_MS)
    return () => window.clearInterval(id)
  }, [snapshot.status, tick])

  useEffect(() => stopSpeaking, [])

  const start = useCallback(() => {
    if (phasesRef.current.length === 0) return
    unlockAudio()
    stopSpeaking()
    phaseIndexRef.current = 0
    nextEventRef.current = 0
    phaseStartRef.current = performance.now()
    // First announcement happens inside the click handler, which Safari requires for speech.
    tick()
  }, [tick])

  const pause = useCallback(() => {
    pausedElapsedRef.current = performance.now() - phaseStartRef.current
    stopSpeaking()
    setSnapshot((prev) => {
      if (prev.status === 'running') return { ...prev, status: 'paused' }
      if (prev.status === 'overtime') return { ...prev, status: 'paused', overtimeMs: pausedElapsedRef.current }
      return prev
    })
  }, [])

  const resume = useCallback(() => {
    unlockAudio()
    phaseStartRef.current = performance.now() - pausedElapsedRef.current
    setSnapshot((prev) =>
      prev.status === 'paused' ? { ...prev, status: prev.overtime ? 'overtime' : 'running' } : prev,
    )
  }, [])

  /** Ends the overtime stopwatch, keeping the time gone over. */
  const stop = useCallback(() => {
    stopSpeaking()
    setSnapshot((prev) => {
      if (prev.status === 'overtime') return finishedSnapshot(performance.now() - phaseStartRef.current)
      if (prev.status === 'paused' && prev.overtime) return finishedSnapshot(prev.overtimeMs)
      return prev
    })
  }, [finishedSnapshot])

  const reset = useCallback(() => {
    stopSpeaking()
    phaseIndexRef.current = 0
    nextEventRef.current = 0
    setSnapshot(initial)
  }, [])

  const skipPhase = useCallback(() => {
    stopSpeaking()
    const all = phasesRef.current
    const nextIndex = phaseIndexRef.current + 1
    if (nextIndex >= all.length) {
      phaseStartRef.current = performance.now()
      pausedElapsedRef.current = 0
      endSchedule(performance.now())
      return
    }
    phaseIndexRef.current = nextIndex
    nextEventRef.current = 0
    phaseStartRef.current = performance.now()
    pausedElapsedRef.current = 0
    setSnapshot((prev) => ({ ...prev, phaseIndex: nextIndex, elapsedMs: 0 }))
  }, [endSchedule])

  return { ...snapshot, start, pause, resume, stop, reset, skipPhase }
}
