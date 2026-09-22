interface Props {
  id?: string
  value: number
  onChange: (seconds: number) => void
  /** Hide the minutes box for values that are always short. */
  secondsOnly?: boolean
  maxSec?: number
}

function toInt(raw: string): number {
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function DurationInput({ id, value, onChange, secondsOnly, maxSec = 24 * 3600 }: Props) {
  const minutes = secondsOnly ? 0 : Math.floor(value / 60)
  const seconds = secondsOnly ? value : value % 60
  const commit = (m: number, s: number) => onChange(Math.min(maxSec, m * 60 + s))

  return (
    <div className="duration-input">
      {!secondsOnly && (
        <label className="duration-part">
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={0}
            value={minutes}
            onFocus={(e) => e.target.select()}
            onChange={(e) => commit(toInt(e.target.value), seconds)}
          />
          <span>min</span>
        </label>
      )}
      <label className="duration-part">
        <input
          id={secondsOnly ? id : undefined}
          type="number"
          inputMode="numeric"
          min={0}
          value={seconds}
          onFocus={(e) => e.target.select()}
          onChange={(e) => commit(minutes, toInt(e.target.value))}
        />
        <span>sec</span>
      </label>
    </div>
  )
}
