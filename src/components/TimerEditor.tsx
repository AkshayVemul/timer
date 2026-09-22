import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { renderTemplate, spokenDuration } from '../lib/format'
import { cueOffsetMs, effectiveCountdownFrom } from '../lib/schedule'
import { speak, speechSupported } from '../lib/speech'
import { halfwayCue, newId } from '../lib/storage'
import type { CountdownMode, Cue, CueAnchor, Settings, TimerConfig } from '../types'
import { DurationInput } from './DurationInput'
import { Icon } from './Icon'
import { Timeline } from './Timeline'

interface Props {
  initial: TimerConfig
  isNew: boolean
  settings: Settings
  onSave: (timer: TimerConfig) => void
  onCancel: () => void
  onDelete: () => void
}

const anchorLabels: Record<CueAnchor, string> = {
  percent: '% of the way through',
  remaining: 'seconds before the end',
  elapsed: 'seconds after the start',
}

const countdownModes: { value: CountdownMode; label: string }[] = [
  { value: 'voice', label: 'Voice' },
  { value: 'beep', label: 'Beeps' },
  { value: 'off', label: 'Off' },
]

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="section">
      <legend>{title}</legend>
      {hint && <p className="hint">{hint}</p>}
      {children}
    </fieldset>
  )
}

export function TimerEditor({ initial, isNew, settings, onSave, onCancel, onDelete }: Props) {
  const [draft, setDraft] = useState(initial)
  const set = <K extends keyof TimerConfig>(key: K, value: TimerConfig[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }))

  const updateCue = (id: string, patch: Partial<Cue>) =>
    set(
      'cues',
      draft.cues.map((cue) => (cue.id === id ? { ...cue, ...patch } : cue)),
    )

  const vars = {
    name: draft.name,
    duration: spokenDuration(draft.durationSec),
    prep: spokenDuration(draft.prepSec),
    rest: spokenDuration(draft.restSec),
    round: Math.min(2, draft.rounds),
    rounds: draft.rounds,
  }
  // Previewing ignores the mute switch: pressing the button is an explicit ask to hear it.
  const preview = (template: string) =>
    speak(renderTemplate(template, vars), { ...settings, voiceEnabled: true })

  const previewButton = (template: string) =>
    speechSupported && (
      <button
        type="button"
        className="btn ghost icon-only"
        onClick={() => preview(template)}
        title="Hear it"
        disabled={!template.trim()}
      >
        <Icon name="volume" />
      </button>
    )

  const countdownStartMs = (draft.durationSec - effectiveCountdownFrom(draft)) * 1000
  const cueProblem = (cue: Cue): string | null => {
    const at = cueOffsetMs(cue, draft.durationSec)
    if (at <= 0 || at >= draft.durationSec * 1000) return "Outside the timer, so it won't play."
    if (at >= countdownStartMs) return "Overlaps the final countdown, so it won't play."
    return null
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSave({
      ...draft,
      name: draft.name.trim() || 'Untitled timer',
      durationSec: Math.max(1, draft.durationSec),
      rounds: Math.max(1, draft.rounds),
      countdownFrom: Math.max(1, draft.countdownFrom),
    })
  }

  return (
    <form className="editor" onSubmit={submit}>
      <header className="editor-header">
        <button type="button" className="btn ghost" onClick={onCancel}>
          <Icon name="back" /> Timers
        </button>
        <h1>{isNew ? 'New timer' : 'Edit timer'}</h1>
      </header>

      <div className="editor-grid">
        <div className="editor-form">
          <Section title="Timer">
            <div className="field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                value={draft.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Plank, tea, sprint…"
                autoFocus={isNew}
              />
            </div>
            <div className="field">
              <label htmlFor="duration">Duration</label>
              <DurationInput id="duration" value={draft.durationSec} onChange={(v) => set('durationSec', v)} />
            </div>
          </Section>

          <Section title="Lead-in" hint="A short pre-timer that announces what's coming. Set it to 0 to start immediately.">
            <div className="field">
              <label htmlFor="prep">Length</label>
              <DurationInput id="prep" value={draft.prepSec} onChange={(v) => set('prepSec', v)} maxSec={3600} />
            </div>
            {draft.prepSec > 0 && (
              <div className="field">
                <label htmlFor="prepMessage">Announcement</label>
                <div className="with-action">
                  <input
                    id="prepMessage"
                    type="text"
                    value={draft.prepMessage}
                    onChange={(e) => set('prepMessage', e.target.value)}
                  />
                  {previewButton(draft.prepMessage)}
                </div>
                <p className="hint">
                  <code>{'{name}'}</code>, <code>{'{duration}'}</code> and <code>{'{prep}'}</code> are filled in for you.
                </p>
              </div>
            )}
          </Section>

          <Section title="Callouts" hint="Messages spoken while the timer runs.">
            <div className="field">
              <label htmlFor="startMessage">At the start</label>
              <div className="with-action">
                <input
                  id="startMessage"
                  type="text"
                  value={draft.startMessage}
                  onChange={(e) => set('startMessage', e.target.value)}
                />
                {previewButton(draft.startMessage)}
              </div>
            </div>

            {draft.cues.map((cue) => {
              const problem = cueProblem(cue)
              return (
                <div className="cue" key={cue.id}>
                  <div className="cue-when">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      aria-label="Cue position"
                      value={cue.value}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => updateCue(cue.id, { value: Math.max(0, Number(e.target.value) || 0) })}
                    />
                    <select
                      aria-label="Cue position type"
                      value={cue.anchor}
                      onChange={(e) => updateCue(cue.id, { anchor: e.target.value as CueAnchor })}
                    >
                      {Object.entries(anchorLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="with-action">
                    <input
                      type="text"
                      aria-label="Cue message"
                      value={cue.message}
                      placeholder="What should be said?"
                      onChange={(e) => updateCue(cue.id, { message: e.target.value })}
                    />
                    {previewButton(cue.message)}
                    <button
                      type="button"
                      className="btn ghost icon-only"
                      title="Remove callout"
                      onClick={() => set('cues', draft.cues.filter((c) => c.id !== cue.id))}
                    >
                      <Icon name="close" />
                    </button>
                  </div>
                  {problem && <p className="hint warn">{problem}</p>}
                </div>
              )
            })}

            <div className="row">
              <button type="button" className="btn small" onClick={() => set('cues', [...draft.cues, halfwayCue()])}>
                <Icon name="plus" size={16} /> Halfway
              </button>
              <button
                type="button"
                className="btn small"
                onClick={() =>
                  set('cues', [...draft.cues, { id: newId(), anchor: 'remaining', value: 30, message: '30 seconds left.' }])
                }
              >
                <Icon name="plus" size={16} /> Custom
              </button>
            </div>

            <div className="field">
              <label htmlFor="endMessage">At the end</label>
              <div className="with-action">
                <input
                  id="endMessage"
                  type="text"
                  value={draft.endMessage}
                  onChange={(e) => set('endMessage', e.target.value)}
                />
                {previewButton(draft.endMessage)}
              </div>
            </div>
          </Section>

          <Section title="Final countdown">
            <div className="field">
              <span className="label">Style</span>
              <div className="segmented" role="radiogroup" aria-label="Countdown style">
                {countdownModes.map((mode) => (
                  <button
                    type="button"
                    key={mode.value}
                    role="radio"
                    aria-checked={draft.countdownMode === mode.value}
                    onClick={() => set('countdownMode', mode.value)}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
            {draft.countdownMode !== 'off' && (
              <div className="field">
                <label htmlFor="countdownFrom">Count down from</label>
                <DurationInput
                  id="countdownFrom"
                  secondsOnly
                  value={draft.countdownFrom}
                  onChange={(v) => set('countdownFrom', v)}
                  maxSec={60}
                />
              </div>
            )}
          </Section>

          <Section title="Rounds" hint="Repeat the timer, with an optional rest in between.">
            <div className="field">
              <label htmlFor="rounds">Rounds</label>
              <input
                id="rounds"
                className="narrow"
                type="number"
                inputMode="numeric"
                min={1}
                max={99}
                value={draft.rounds}
                onFocus={(e) => e.target.select()}
                onChange={(e) => set('rounds', Math.min(99, Math.max(0, Number.parseInt(e.target.value, 10) || 0)))}
              />
            </div>
            {draft.rounds > 1 && (
              <>
                <div className="field">
                  <label htmlFor="rest">Rest</label>
                  <DurationInput id="rest" value={draft.restSec} onChange={(v) => set('restSec', v)} maxSec={3600} />
                </div>
                {draft.restSec > 0 && (
                  <div className="field">
                    <label htmlFor="restMessage">Rest announcement</label>
                    <div className="with-action">
                      <input
                        id="restMessage"
                        type="text"
                        value={draft.restMessage}
                        onChange={(e) => set('restMessage', e.target.value)}
                      />
                      {previewButton(draft.restMessage)}
                    </div>
                    <p className="hint">
                      Also available: <code>{'{round}'}</code>, <code>{'{rounds}'}</code>, <code>{'{rest}'}</code>.
                    </p>
                  </div>
                )}
              </>
            )}
          </Section>
        </div>

        <aside className="editor-preview">
          <h2>What you'll hear</h2>
          <Timeline timer={{ ...draft, durationSec: Math.max(1, draft.durationSec), rounds: Math.max(1, draft.rounds) }} />
        </aside>
      </div>

      <footer className="editor-footer">
        {!isNew && (
          <button type="button" className="btn danger" onClick={onDelete}>
            <Icon name="trash" /> Delete
          </button>
        )}
        <span className="spacer" />
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn primary">
          Save timer
        </button>
      </footer>
    </form>
  )
}
