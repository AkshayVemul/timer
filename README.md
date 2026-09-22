# Cue Timer

Countdown timers that talk you through it: a lead-in that announces what's coming, spoken callouts along
the way (e.g. "Halfway through!"), a voiced final countdown, and an optional overtime stopwatch that keeps
calling out every N seconds after the timer ends so you know how much further you went. Speech uses the browser's native
`speechSynthesis` API; beeps use Web Audio. Timers and sound settings are saved in `localStorage`.

```bash
pnpm install
pnpm dev      # start the app
pnpm test     # unit tests for the schedule engine
pnpm build    # type-check + production build
```

## How it fits together

- `src/lib/schedule.ts` — pure function that expands a timer into phases (lead-in → work → rest …), each with
  a list of timed events. All "what plays when" rules live here and are unit-tested.
- `src/hooks/useTimerRunner.ts` — plays a schedule. Time is derived from `performance.now()` on every tick,
  so it doesn't drift when the tab is throttled.
- `src/lib/speech.ts`, `src/lib/beep.ts` — thin wrappers over the browser speech and audio APIs.
- `src/components/` — list, editor (with a live "What you'll hear" preview), run screen, sound settings.
