import { shortDuration } from '../lib/format'
import { totalDurationSec } from '../lib/schedule'
import type { TimerConfig } from '../types'
import { Icon } from './Icon'

interface Props {
  timers: TimerConfig[]
  onRun: (id: string) => void
  onEdit: (id: string) => void
  onDuplicate: (id: string) => void
  onCreate: () => void
}

function describe(timer: TimerConfig): string[] {
  const tags: string[] = []
  if (timer.prepSec > 0) tags.push(`${shortDuration(timer.prepSec)} lead-in`)
  if (timer.cues.length > 0) tags.push(`${timer.cues.length} callout${timer.cues.length === 1 ? '' : 's'}`)
  if (timer.countdownMode !== 'off') {
    tags.push(`${timer.countdownMode === 'voice' ? 'spoken' : 'beep'} last ${timer.countdownFrom}s`)
  }
  if (timer.rounds > 1) {
    tags.push(`${timer.rounds} rounds${timer.restSec > 0 ? ` · ${shortDuration(timer.restSec)} rest` : ''}`)
  }
  return tags
}

export function TimerList({ timers, onRun, onEdit, onDuplicate, onCreate }: Props) {
  return (
    <div className="timer-grid">
      {timers.map((timer) => {
        const total = totalDurationSec(timer)
        return (
          <article className="timer-card" key={timer.id}>
            <button className="timer-card-main" onClick={() => onRun(timer.id)} title={`Open ${timer.name}`}>
              <span className="timer-card-name">{timer.name}</span>
              <span className="timer-card-duration">{shortDuration(timer.durationSec)}</span>
              <span className="timer-card-tags">
                {describe(timer).map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </span>
            </button>
            <footer className="timer-card-footer">
              <span className="muted">
                {total !== timer.durationSec ? `${shortDuration(total)} total` : ' '}
              </span>
              <button className="btn ghost icon-only" onClick={() => onDuplicate(timer.id)} title="Duplicate">
                <Icon name="copy" />
              </button>
              <button className="btn ghost icon-only" onClick={() => onEdit(timer.id)} title="Edit">
                <Icon name="edit" />
              </button>
            </footer>
          </article>
        )
      })}
      <button className="timer-card new" onClick={onCreate}>
        <Icon name="plus" size={26} />
        New timer
      </button>
    </div>
  )
}
