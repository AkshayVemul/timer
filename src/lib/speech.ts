import type { Settings } from '../types'

export const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

// Chrome can garbage-collect an utterance mid-sentence unless something holds on to it.
let current: SpeechSynthesisUtterance | null = null

export function speak(text: string, settings: Settings): void {
  if (!speechSupported || !settings.voiceEnabled || !text) return
  const synth = window.speechSynthesis

  // Latest call wins: a late "halfway" must never delay the "3, 2, 1".
  if (synth.speaking || synth.pending) synth.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  const voice = synth.getVoices().find((v) => v.voiceURI === settings.voiceURI)
  if (voice) {
    utterance.voice = voice
    utterance.lang = voice.lang
  }
  utterance.rate = settings.rate
  utterance.pitch = settings.pitch
  utterance.volume = settings.volume
  current = utterance
  utterance.onend = () => {
    if (current === utterance) current = null
  }
  synth.speak(utterance)
}

export function stopSpeaking(): void {
  if (speechSupported) window.speechSynthesis.cancel()
}
