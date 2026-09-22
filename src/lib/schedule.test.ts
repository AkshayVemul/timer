import { describe, expect, it } from 'vitest'
import type { TimerConfig } from '../types'
import { buildSchedule, totalDurationSec } from './schedule'

const base: TimerConfig = {
  id: 't',
  name: 'Plank',
  durationSec: 50,
  prepSec: 10,
  prepMessage: '{name} starts in {prep}.',
  startMessage: 'Go!',
  endMessage: "Time's up!",
  cues: [{ id: 'c', anchor: 'percent', value: 50, message: 'Halfway through!' }],
  countdownFrom: 10,
  countdownMode: 'voice',
  rounds: 1,
  restSec: 0,
  restMessage: 'Rest. Round {round} of {rounds} in {rest}.',
  overtime: false,
  overtimeIntervalSec: 10,
  overtimeMessage: '{overtime} over.',
}

const said = (timer: TimerConfig, phaseIndex: number) =>
  buildSchedule(timer)[phaseIndex].events.map((e) => [e.atMs, e.say])

describe('buildSchedule', () => {
  it('announces the timer during the lead-in, then counts 3-2-1', () => {
    expect(said(base, 0)).toEqual([
      [0, 'Plank starts in 10 seconds.'],
      [7000, '3'],
      [8000, '2'],
      [9000, '1'],
    ])
  })

  it('plays start, halfway, the final countdown and the end message in order', () => {
    expect(said(base, 1)).toEqual([
      [0, 'Go!'],
      [25000, 'Halfway through!'],
      ...Array.from({ length: 10 }, (_, i) => [40000 + i * 1000, String(10 - i)]),
      [50000, "Time's up!"],
    ])
  })

  it('skips the lead-in when it is 0', () => {
    const phases = buildSchedule({ ...base, prepSec: 0 })
    expect(phases.map((p) => p.kind)).toEqual(['work'])
  })

  it('drops cues that would talk over the final countdown', () => {
    const timer = { ...base, cues: [{ id: 'c', anchor: 'remaining' as const, value: 5, message: 'Nearly' }] }
    expect(said(timer, 1).some(([, say]) => say === 'Nearly')).toBe(false)
  })

  it('keeps late cues when the countdown is off', () => {
    const timer = {
      ...base,
      countdownMode: 'off' as const,
      cues: [{ id: 'c', anchor: 'remaining' as const, value: 5, message: 'Nearly' }],
    }
    expect(said(timer, 1)).toEqual([
      [0, 'Go!'],
      [45000, 'Nearly'],
      [50000, "Time's up!"],
    ])
  })

  it('never counts down from more than the timer holds', () => {
    const work = buildSchedule({ ...base, durationSec: 5, cues: [] })[1]
    expect(work.countdownFrom).toBe(4)
    expect(work.events.map((e) => e.say)).toEqual(['Go!', '4', '3', '2', '1', "Time's up!"])
  })

  it('uses beeps instead of numbers in beep mode', () => {
    const work = buildSchedule({ ...base, countdownMode: 'beep', countdownFrom: 3, cues: [] })[1]
    expect(work.events.filter((e) => e.beep === 'tick').map((e) => e.atMs)).toEqual([47000, 48000, 49000])
    expect(work.events.some((e) => e.say && /^\d+$/.test(e.say))).toBe(false)
  })

  it('alternates work and rest across rounds and only ends once', () => {
    const timer = { ...base, rounds: 3, restSec: 15 }
    const phases = buildSchedule(timer)
    expect(phases.map((p) => p.kind)).toEqual(['prep', 'work', 'rest', 'work', 'rest', 'work'])
    expect(phases[1].events[0].say).toBe('Round 1. Go!')
    expect(phases[2].events[0].say).toBe('Rest. Round 2 of 3 in 15 seconds.')
    expect(phases.filter((p) => p.events.some((e) => e.say === "Time's up!"))).toHaveLength(1)
    expect(totalDurationSec(timer)).toBe(10 + 3 * 50 + 2 * 15)
  })
})
