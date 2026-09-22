/** Where in the main countdown a cue fires. */
export type CueAnchor = 'percent' | 'remaining' | 'elapsed'

export interface Cue {
  id: string
  anchor: CueAnchor
  /** Percent (1–99) for `percent`, seconds for `remaining` / `elapsed`. */
  value: number
  message: string
}

export type CountdownMode = 'voice' | 'beep' | 'off'

export interface TimerConfig {
  id: string
  name: string
  durationSec: number
  /** Lead-in before the main countdown. 0 disables it. */
  prepSec: number
  prepMessage: string
  startMessage: string
  endMessage: string
  cues: Cue[]
  /** Final countdown is called out from this many seconds remaining. */
  countdownFrom: number
  countdownMode: CountdownMode
  rounds: number
  /** Rest between rounds. 0 runs rounds back to back. */
  restSec: number
  restMessage: string
  /** Keep a stopwatch running after the last round until the user stops it. */
  overtime: boolean
  overtimeIntervalSec: number
  /** Spoken at every interval; `{overtime}` is the time gone over. */
  overtimeMessage: string
}

export interface Settings {
  voiceEnabled: boolean
  voiceURI: string | null
  rate: number
  pitch: number
  volume: number
  endChime: boolean
  keepAwake: boolean
}

export type PhaseKind = 'prep' | 'work' | 'rest'

export interface ScheduledEvent {
  atMs: number
  say?: string
  beep?: 'tick' | 'go' | 'chime'
}

export interface Phase {
  kind: PhaseKind
  label: string
  durationMs: number
  round: number
  /** Seconds remaining at which the display switches to its "final countdown" look. */
  countdownFrom: number
  events: ScheduledEvent[]
}
