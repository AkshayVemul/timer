let ctx: AudioContext | null = null

/** Must first be called from a user gesture (the Start button) so the browser allows audio. */
export function unlockAudio(): void {
  if (typeof AudioContext === 'undefined') return
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
}

function tone(frequency: number, startIn: number, length: number, volume: number): void {
  if (!ctx) return
  const at = ctx.currentTime + startIn
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = frequency
  gain.gain.setValueAtTime(0, at)
  gain.gain.linearRampToValueAtTime(volume, at + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length)
  osc.connect(gain).connect(ctx.destination)
  osc.start(at)
  osc.stop(at + length + 0.02)
}

export function beep(kind: 'tick' | 'go' | 'chime', volume: number): void {
  const v = Math.max(0, Math.min(1, volume)) * 0.5
  if (kind === 'tick') tone(880, 0, 0.14, v)
  else if (kind === 'go') tone(1320, 0, 0.45, v)
  else {
    tone(784, 0, 0.35, v)
    tone(988, 0.16, 0.35, v)
    tone(1175, 0.32, 0.7, v)
  }
}
