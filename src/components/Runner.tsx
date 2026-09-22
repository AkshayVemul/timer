import { useCallback, useEffect, useMemo } from 'react'
import { useTimerRunner } from '../hooks/useTimerRunner'
import { useWakeLock } from '../hooks/useWakeLock'
import { formatClock, spokenDuration } from '../lib/format'
import { buildSchedule } from '../lib/schedule'
import { overtimeConfig } from '../lib/overtime'
import type { Settings, TimerConfig } from '../types'
import { Icon } from './Icon'

interface Props {
  timer: TimerConfig
  settings: Settings
  onToggleVoice: () => void
  onEdit: () => void
  onExit: () => void
  /** Bump the timer's duration after an overtime run. */
  onUpdateDuration: (durationSec: number) => void
}

const RING_RADIUS = 140
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen()
  else void document.documentElement.requestFullscreen?.()
}

export function Runner({ timer, settings, onToggleVoice, onEdit, onExit, onUpdateDuration }: Props) {
  const phases = useMemo(() => buildSchedule(timer), [timer])
  const overtime = useMemo(() => overtimeConfig(timer), [timer])
  const run = useTimerRunner(phases, settings, overtime)
  const { status, start, pause, resume, stop, reset, skipPhase } = run

  const phase = phases[run.phaseIndex]
  const remainingMs = Math.max(0, phase.durationMs - run.elapsedMs)
  const remainingSec = Math.ceil(remainingMs / 1000)
  const idle = status === 'idle'
  const finished = status === 'finished'
  const inOvertime = run.overtime && !finished
  const overtimeSec = Math.floor(run.overtimeMs / 1000)
  const inFinalCountdown =
    status === 'running' && phase.countdownFrom > 0 && remainingSec <= phase.countdownFrom

  const totalMs = useMemo(() => phases.reduce((sum, p) => sum + p.durationMs, 0), [phases])
  const nextCue = phase.events.find((e) => e.say && !/^\d+$/.test(e.say) && e.atMs > run.elapsedMs)

  useWakeLock(settings.keepAwake && (status === 'running' || status === 'overtime'))

  const toggle = useCallback(() => {
    if (status === 'running') pause()
    else if (status === 'overtime') stop()
    else if (status === 'paused') resume()
    else start()
  }, [status, start, pause, resume, stop])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return
      // A focused button already reacts to Space; don't fire the shortcut on top of it.
      if (e.code === 'Space' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault()
        toggle()
      } else if (e.key === 'r') reset()
      else if (e.key === 's' && (status === 'running' || status === 'paused') && !run.overtime) skipPhase()
      else if (e.key === 'f') toggleFullscreen()
      else if (e.key === 'm') onToggleVoice()
      else if (e.key === 'Escape' && !document.fullscreenElement) onExit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle, reset, skipPhase, status, run.overtime, onToggleVoice, onExit])

  useEffect(() => {
    if (idle) return
    document.title = finished
      ? `Done · ${timer.name}`
      : inOvertime
        ? `+${formatClock(overtimeSec)} · Overtime`
        : `${formatClock(remainingSec)} · ${phase.label}`
    return () => {
      document.title = 'Cue Timer'
    }
  }, [idle, finished, inOvertime, overtimeSec, remainingSec, phase.label, timer.name])

  const progress = idle ? 0 : finished ? 1 : Math.min(1, run.elapsedMs / phase.durationMs)
  // The ring drains while counting down, then fills once per interval while in overtime.
  const ringVisible =
    inOvertime && overtime ? (run.overtimeMs % overtime.intervalMs) / overtime.intervalMs : finished || idle ? 1 : 1 - progress

  const phaseKind = idle
    ? 'idle'
    : finished
      ? 'done'
      : inOvertime
        ? 'overtime'
        : inFinalCountdown && phase.kind === 'work'
          ? 'final'
          : phase.kind

  const suggestedSec = timer.durationSec + overtimeSec
  const wentOver = finished && overtimeSec >= 1

  let statusLine: string
  if (idle) {
    statusLine = timer.prepSec > 0 ? `${timer.prepSec}s lead-in, then go` : 'Ready when you are'
  } else if (wentOver) {
    statusLine = `You went ${spokenDuration(overtimeSec)} over — ${formatClock(suggestedSec)} in all.`
  } else if (finished) {
    statusLine = timer.endMessage || 'Done'
  } else if (status === 'paused') {
    statusLine = 'Paused'
  } else if (inOvertime && overtime) {
    const next = overtime.intervalMs - (run.overtimeMs % overtime.intervalMs)
    statusLine = `Timer's done. Keep going — next callout in ${Math.ceil(next / 1000)}s. Stop when you're spent.`
  } else if (nextCue) {
    statusLine = `Next: “${nextCue.say}” in ${formatClock((nextCue.atMs - run.elapsedMs) / 1000)}`
  } else {
    statusLine = phase.kind === 'work' ? 'Keep going' : `${timer.name} is up next`
  }

  const ringLabel = idle
    ? timer.name
    : finished
      ? 'Finished'
      : inOvertime
        ? 'Overtime'
        : phase.label

  const primaryIcon =
    status === 'running' ? 'pause' : status === 'overtime' ? 'stop' : finished ? 'restart' : 'play'
  const primaryTitle =
    status === 'overtime' ? 'Stop (Space)' : finished ? 'Run again (Space)' : 'Start / pause (Space)'

  return (
    <section className="runner" data-phase={phaseKind}>
      <header className="runner-top">
        <button className="btn ghost" onClick={onExit}>
          <Icon name="back" /> Timers
        </button>
        <div className="runner-top-actions">
          <button
            className="btn ghost icon-only"
            onClick={onToggleVoice}
            aria-pressed={!settings.voiceEnabled}
            title={settings.voiceEnabled ? 'Mute voice (M)' : 'Unmute voice (M)'}
          >
            <Icon name={settings.voiceEnabled ? 'volume' : 'mute'} />
          </button>
          <button className="btn ghost icon-only" onClick={toggleFullscreen} title="Fullscreen (F)">
            <Icon name="fullscreen" />
          </button>
          <button
            className="btn ghost icon-only"
            onClick={onEdit}
            title="Edit timer"
            disabled={status === 'running' || status === 'overtime'}
          >
            <Icon name="edit" />
          </button>
        </div>
      </header>

      {phases.length > 1 && (
        <div className="phase-strip" aria-hidden="true">
          {phases.map((p, i) => {
            const done = finished || run.overtime || i < run.phaseIndex
            const fill = done ? 1 : i === run.phaseIndex && !idle ? progress : 0
            return (
              <span
                key={i}
                className="phase-strip-segment"
                data-phase={p.kind}
                style={{ flexGrow: p.durationMs / totalMs }}
              >
                <span style={{ transform: `scaleX(${fill})` }} />
              </span>
            )
          })}
        </div>
      )}

      <div className="runner-stage">
        <div className="ring">
          <svg viewBox="0 0 320 320" aria-hidden="true">
            <circle className="ring-track" cx="160" cy="160" r={RING_RADIUS} />
            <circle
              className="ring-progress"
              cx="160"
              cy="160"
              r={RING_RADIUS}
              strokeDasharray={RING_LENGTH}
              strokeDashoffset={RING_LENGTH * (1 - ringVisible)}
              transform="rotate(-90 160 160)"
            />
          </svg>
          <div className="ring-content">
            <span className="ring-label">
              {ringLabel}
              {timer.rounds > 1 && status === 'running' && (
                <span className="ring-round">
                  {' '}
                  · {phase.round}/{timer.rounds}
                </span>
              )}
            </span>
            {inFinalCountdown ? (
              <span key={remainingSec} className="ring-time big-count" role="timer">
                {remainingSec}
              </span>
            ) : (
              <span className="ring-time" role="timer">
                {idle
                  ? formatClock(timer.durationSec)
                  : inOvertime || wentOver
                    ? `+${formatClock(overtimeSec)}`
                    : finished
                      ? '0:00'
                      : formatClock(remainingSec)}
              </span>
            )}
          </div>
        </div>
        <p className="runner-status" aria-live="polite">
          {statusLine}
        </p>
        {wentOver && (
          <button
            className="btn"
            onClick={() => {
              onUpdateDuration(suggestedSec)
              reset()
            }}
          >
            <Icon name="check" /> Use {formatClock(suggestedSec)} next time
          </button>
        )}
      </div>

      <footer className="runner-controls">
        <button className="btn round" onClick={reset} disabled={idle} title="Restart (R)">
          <Icon name="restart" size={22} />
        </button>
        <button className="btn primary round large" onClick={finished ? start : toggle} title={primaryTitle}>
          <Icon name={primaryIcon} size={30} />
        </button>
        <button
          className="btn round"
          onClick={skipPhase}
          disabled={idle || finished || run.overtime}
          title="Skip to next phase (S)"
        >
          <Icon name="skip" size={22} />
        </button>
      </footer>
      <p className="hint shortcuts">Space start/pause/stop · R restart · S skip · M mute · F fullscreen</p>
    </section>
  )
}
