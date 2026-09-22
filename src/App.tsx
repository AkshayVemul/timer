import { useCallback, useEffect, useState } from 'react'
import { Icon } from './components/Icon'
import { Runner } from './components/Runner'
import { SettingsDialog } from './components/SettingsDialog'
import { TimerEditor } from './components/TimerEditor'
import { TimerList } from './components/TimerList'
import { createTimer, loadSettings, loadTimers, newId, saveSettings, saveTimers } from './lib/storage'
import type { TimerConfig } from './types'

type View =
  | { name: 'list' }
  | { name: 'run'; id: string }
  | { name: 'edit'; draft: TimerConfig; isNew: boolean; returnTo: 'list' | 'run' }

export default function App() {
  const [timers, setTimers] = useState(loadTimers)
  const [settings, setSettings] = useState(loadSettings)
  const [view, setView] = useState<View>({ name: 'list' })
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => saveTimers(timers), [timers])
  useEffect(() => saveSettings(settings), [settings])

  const toggleVoice = useCallback(
    () => setSettings((prev) => ({ ...prev, voiceEnabled: !prev.voiceEnabled })),
    [],
  )
  const goToList = useCallback(() => setView({ name: 'list' }), [])

  const edit = (id: string, returnTo: 'list' | 'run') => {
    const timer = timers.find((t) => t.id === id)
    if (timer) setView({ name: 'edit', draft: timer, isNew: false, returnTo })
  }

  const duplicate = (id: string) => {
    const index = timers.findIndex((t) => t.id === id)
    if (index === -1) return
    const source = timers[index]
    const copy: TimerConfig = {
      ...source,
      id: newId(),
      name: `${source.name} copy`,
      cues: source.cues.map((cue) => ({ ...cue, id: newId() })),
    }
    setTimers(timers.toSpliced(index + 1, 0, copy))
  }

  const running = view.name === 'run' ? timers.find((t) => t.id === view.id) : undefined

  let content
  if (view.name === 'edit') {
    const { draft, isNew, returnTo } = view
    const leave = () => setView(returnTo === 'run' && !isNew ? { name: 'run', id: draft.id } : { name: 'list' })
    content = (
      <TimerEditor
        key={draft.id}
        initial={draft}
        isNew={isNew}
        settings={settings}
        onCancel={leave}
        onSave={(saved) => {
          setTimers(isNew ? [...timers, saved] : timers.map((t) => (t.id === saved.id ? saved : t)))
          leave()
        }}
        onDelete={() => {
          if (!window.confirm(`Delete “${draft.name}”?`)) return
          setTimers(timers.filter((t) => t.id !== draft.id))
          goToList()
        }}
      />
    )
  } else if (running) {
    content = (
      <Runner
        key={running.id}
        timer={running}
        settings={settings}
        onToggleVoice={toggleVoice}
        onEdit={() => edit(running.id, 'run')}
        onExit={goToList}
      />
    )
  } else {
    content = (
      <>
        <header className="app-header">
          <div>
            <h1>Cue Timer</h1>
            <p className="muted">Countdowns that talk you through it.</p>
          </div>
          <button className="btn" onClick={() => setSettingsOpen(true)}>
            <Icon name="settings" /> Sound
          </button>
        </header>
        <TimerList
          timers={timers}
          onRun={(id) => setView({ name: 'run', id })}
          onEdit={(id) => edit(id, 'list')}
          onDuplicate={duplicate}
          onCreate={() => setView({ name: 'edit', draft: createTimer(), isNew: true, returnTo: 'list' })}
        />
      </>
    )
  }

  return (
    <main className="app">
      {content}
      <SettingsDialog
        open={settingsOpen}
        settings={settings}
        onChange={setSettings}
        onClose={() => setSettingsOpen(false)}
      />
    </main>
  )
}
