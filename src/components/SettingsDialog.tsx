import { useEffect, useMemo, useRef } from 'react'
import { useVoices } from '../hooks/useVoices'
import { beep, unlockAudio } from '../lib/beep'
import { speak, speechSupported } from '../lib/speech'
import type { Settings } from '../types'
import { Icon } from './Icon'

interface Props {
  open: boolean
  settings: Settings
  onChange: (settings: Settings) => void
  onClose: () => void
}

export function SettingsDialog({ open, settings, onChange, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const voices = useVoices()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  // Voices in the browser's language first; they're the ones people want.
  const sortedVoices = useMemo(() => {
    const lang = navigator.language.slice(0, 2)
    return [...voices].sort((a, b) => {
      const aLocal = a.lang.startsWith(lang) ? 0 : 1
      const bLocal = b.lang.startsWith(lang) ? 0 : 1
      return aLocal - bLocal || a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name)
    })
  }, [voices])

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...settings, [key]: value })

  const slider = (key: 'rate' | 'pitch' | 'volume', label: string, min: number, max: number) => (
    <div className="field">
      <label htmlFor={key}>
        {label} <span className="muted">{settings[key].toFixed(1)}</span>
      </label>
      <input
        id={key}
        type="range"
        min={min}
        max={max}
        step={0.1}
        value={settings[key]}
        onChange={(e) => set(key, Number(e.target.value))}
      />
    </div>
  )

  return (
    <dialog
      ref={ref}
      className="dialog"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      <div className="dialog-body">
        <header className="dialog-header">
          <h2>Sound</h2>
          <button className="btn ghost icon-only" onClick={onClose} title="Close">
            <Icon name="close" />
          </button>
        </header>

        {!speechSupported && (
          <p className="hint warn">This browser has no text-to-speech. Switch timers to beeps instead.</p>
        )}

        <label className="check">
          <input
            type="checkbox"
            checked={settings.voiceEnabled}
            onChange={(e) => set('voiceEnabled', e.target.checked)}
          />
          Speak announcements
        </label>

        <div className="field">
          <label htmlFor="voice">Voice</label>
          <select
            id="voice"
            value={settings.voiceURI ?? ''}
            onChange={(e) => set('voiceURI', e.target.value || null)}
            disabled={voices.length === 0}
          >
            <option value="">Browser default</option>
            {sortedVoices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </div>

        {slider('rate', 'Speed', 0.5, 2)}
        {slider('pitch', 'Pitch', 0, 2)}
        {slider('volume', 'Volume', 0, 1)}

        <div className="row">
          <button
            className="btn small"
            onClick={() => speak('Halfway through! 3, 2, 1.', { ...settings, voiceEnabled: true })}
            disabled={!speechSupported}
          >
            <Icon name="volume" size={16} /> Test voice
          </button>
          <button
            className="btn small"
            onClick={() => {
              unlockAudio()
              beep('chime', settings.volume)
            }}
          >
            Test chime
          </button>
        </div>

        <hr />

        <label className="check">
          <input type="checkbox" checked={settings.endChime} onChange={(e) => set('endChime', e.target.checked)} />
          Play a chime when a timer finishes
        </label>
        <label className="check">
          <input type="checkbox" checked={settings.keepAwake} onChange={(e) => set('keepAwake', e.target.checked)} />
          Keep the screen awake while running
        </label>
      </div>
    </dialog>
  )
}
