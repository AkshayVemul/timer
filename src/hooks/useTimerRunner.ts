import { useCallback, useEffect, useRef, useState } from 'react'
import { beep, unlockAudio } from '../lib/beep'
import { speak, stopSpeaking } from '../lib/speech'
import type { Phase, ScheduledEvent, Settings } from '../types'

export type RunStatus = 'idle' | 'running' | 'paused' | 'finished'

interface Snapshot {
  status: RunStatus
  phaseIndex: number
  elapsedMs: number
}

const TICK_MS = 100
/** After a throttled background tab wakes up, announcements older than this are skipped. */
const STALE_EVENT_MS = 1500

const initial: Snapshot = { status: 'idle', phaseIndex: 0, elapsedMs: 0 }

export function useTimerRunner(phases: Phase[], settings: Settings) {
  const [snapshot, setSnapshot] = useState<Snapshot>(initial)

  const phasesRef = useRef(phases)
  const settingsRef = useRef(settings)
  const phaseIndexRef = useRef(0)
  /** performance.now() value at which the current phase was at 0 elapsed. */
  const phaseStartRef = useRef(0)
  const nextEventRef = useRef(0)
  const pausedElapsedRef = useRef(0)

  useEffect(() => {
    phasesRef.current = phases
    settingsRef.current = settings
  }, [phases, settings])

  const emit = useCallback((event: ScheduledEvent) => {
    const s = settingsRef.current
    if (event.beep && (event.beep !== 'chime' || s.endChime)) beep(event.beep, s.volume)
    if (event.say) speak(event.say, s)
  }, [])

  // Time is derived from the clock on every tick, so throttled intervals never cause drift.
  const tick = useCallback(() => {
    const all = phasesRef.current
    let index = phaseIndexRef.current
    let elapsed = performance.now() - phaseStartRef.current

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
      phaseStartRef.current += phase.durationMs
      nextEventRef.current = 0
      index++
      if (index >= all.length) {
        phaseIndexRef.current = all.length - 1
        setSnapshot({
          status: 'finished',
          phaseIndex: all.length - 1,
          elapsedMs: all[all.length - 1].durationMs,
        })
        return
      }
      phaseIndexRef.current = index
    }

    setSnapshot({ status: 'running', phaseIndex: index, elapsedMs: elapsed })
  }, [emit])

  useEffect(() => {
    if (snapshot.status !== 'running') return
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
    setSnapshot((prev) => (prev.status === 'running' ? { ...prev, status: 'paused' } : prev))
  }, [])

  const resume = useCallback(() => {
    unlockAudio()
    phaseStartRef.current = performance.now() - pausedElapsedRef.current
    setSnapshot((prev) => (prev.status === 'paused' ? { ...prev, status: 'running' } : prev))
  }, [])

  const reset = useCallback(() => {
    stopSpeaking()
    phaseIndexRef.current = 0
    nextEventRef.current = 0
    setSnapshot(initial)
  }, [])

  const skipPhase = useCallback(() => {
    stopSpeaking()
    const nextIndex = phaseIndexRef.current + 1
    if (nextIndex >= phasesRef.current.length) {
      setSnapshot((prev) => ({
        status: 'finished',
        phaseIndex: prev.phaseIndex,
        elapsedMs: phasesRef.current[prev.phaseIndex].durationMs,
      }))
      return
    }
    phaseIndexRef.current = nextIndex
    nextEventRef.current = 0
    phaseStartRef.current = performance.now()
    pausedElapsedRef.current = 0
    setSnapshot((prev) => ({ status: prev.status, phaseIndex: nextIndex, elapsedMs: 0 }))
  }, [])

  return { ...snapshot, start, pause, resume, reset, skipPhase }
}
