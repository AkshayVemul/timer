import type { Cue, Settings, TimerConfig } from '../types'

const TIMERS_KEY = 'cue-timer.timers.v1'
const SETTINGS_KEY = 'cue-timer.settings.v1'

export function newId(): string {
  return crypto.randomUUID()
}

export function halfwayCue(): Cue {
  return { id: newId(), anchor: 'percent', value: 50, message: 'Halfway through!' }
}

export function createTimer(overrides: Partial<TimerConfig> = {}): TimerConfig {
  return {
    id: newId(),
    name: 'New timer',
    durationSec: 50,
    prepSec: 10,
    prepMessage: 'Get ready. {name} starts in {prep}.',
    startMessage: 'Go!',
    endMessage: "Time's up!",
    cues: [halfwayCue()],
    countdownFrom: 10,
    countdownMode: 'voice',
    rounds: 1,
    restSec: 0,
    restMessage: 'Rest. Round {round} of {rounds} starts in {rest}.',
    ...overrides,
  }
}

function seedTimers(): TimerConfig[] {
  return [
    createTimer({ name: '50 second timer' }),
    createTimer({
      name: 'Intervals',
      durationSec: 30,
      countdownFrom: 5,
      rounds: 8,
      restSec: 15,
      endMessage: 'All rounds done. Nice work!',
    }),
    createTimer({
      name: 'Focus session',
      durationSec: 25 * 60,
      prepSec: 0,
      startMessage: 'Focus time.',
      endMessage: 'Session over. Take a break.',
      cues: [
        halfwayCue(),
        { id: newId(), anchor: 'remaining', value: 300, message: 'Five minutes left.' },
      ],
    }),
  ]
}

export const defaultSettings: Settings = {
  voiceEnabled: true,
  voiceURI: null,
  rate: 1.1,
  pitch: 1,
  volume: 1,
  endChime: true,
  keepAwake: true,
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private mode or quota: the app still works, it just won't remember.
  }
}

export function loadTimers(): TimerConfig[] {
  const stored = read<Partial<TimerConfig>[]>(TIMERS_KEY)
  if (!Array.isArray(stored)) return seedTimers()
  // Merge over defaults so timers saved by an older version pick up new fields.
  return stored.map((timer) => createTimer(timer))
}

export function saveTimers(timers: TimerConfig[]): void {
  write(TIMERS_KEY, timers)
}

export function loadSettings(): Settings {
  return { ...defaultSettings, ...read<Partial<Settings>>(SETTINGS_KEY) }
}

export function saveSettings(settings: Settings): void {
  write(SETTINGS_KEY, settings)
}
