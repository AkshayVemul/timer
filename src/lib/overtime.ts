import type { OvertimeConfig } from '../hooks/useTimerRunner'
import type { TimerConfig } from '../types'
import { renderTemplate, spokenDuration } from './format'

export function overtimeConfig(timer: TimerConfig): OvertimeConfig | null {
  if (!timer.overtime || timer.overtimeIntervalSec <= 0) return null
  return {
    intervalMs: timer.overtimeIntervalSec * 1000,
    messageAt: (ms) =>
      renderTemplate(timer.overtimeMessage, { name: timer.name, overtime: spokenDuration(ms / 1000) }),
    beep: timer.countdownMode === 'beep',
  }
}

