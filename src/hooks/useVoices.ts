import { useSyncExternalStore } from 'react'
import { speechSupported } from '../lib/speech'

let cached: SpeechSynthesisVoice[] = []

function subscribe(onChange: () => void): () => void {
  if (!speechSupported) return () => {}
  // Chrome loads voices asynchronously and announces them with `voiceschanged`.
  const handler = () => {
    cached = window.speechSynthesis.getVoices()
    onChange()
  }
  window.speechSynthesis.addEventListener('voiceschanged', handler)
  return () => window.speechSynthesis.removeEventListener('voiceschanged', handler)
}

function getSnapshot(): SpeechSynthesisVoice[] {
  if (speechSupported && cached.length === 0) {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) cached = voices
  }
  return cached
}

export function useVoices(): SpeechSynthesisVoice[] {
  return useSyncExternalStore(subscribe, getSnapshot)
}
