import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { VOWEL_PRICE } from '../game/engine'
import {
  FORTUNE_WHEEL_WEDGES,
  buildWheelConicGradient,
  wedgeAngleDeg,
  wedgeCount,
  type WheelWedge,
} from '../game/fortuneWheel'

interface FortuneWheelModalProps {
  open: boolean
  onClose: () => void
  /** When true, open / spin / close are disabled */
  disabled?: boolean
  /** Fires when the spin animation finishes (same wedge as shown in the modal). */
  onSpinComplete?: (wedge: WheelWedge) => void
}

const SPIN_MS = 5200
const SPIN_MS_REDUCED = 400

function pickRandomWedgeIndex(): number {
  return Math.floor(Math.random() * wedgeCount)
}

export default function FortuneWheelModal({
  open,
  onClose,
  disabled = false,
  onSpinComplete,
}: FortuneWheelModalProps) {
  const titleId = useId()
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [lastResult, setLastResult] = useState<WheelWedge | null>(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onSpinCompleteRef = useRef(onSpinComplete)
  onSpinCompleteRef.current = onSpinComplete

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setPrefersReducedMotion(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !spinning) {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, spinning])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (open) {
      setRotation(0)
      setLastResult(null)
      setSpinning(false)
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
    }
  }, [open])

  const spinDurationMs = prefersReducedMotion ? SPIN_MS_REDUCED : SPIN_MS

  const spin = useCallback(() => {
    if (spinning || disabled) {
      return
    }
    setSpinning(true)
    setLastResult(null)

    const pick = pickRandomWedgeIndex()
    const θ = (pick + 0.5) * wedgeAngleDeg
    const fullSpins = 5 + Math.floor(Math.random() * 4)

    setRotation((current) => {
      const currentMod = ((current % 360) + 360) % 360
      const delta = ((360 - θ) - currentMod + 360) % 360
      const add = fullSpins * 360 + delta
      return current + add
    })

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
    }
    closeTimerRef.current = setTimeout(() => {
      setSpinning(false)
      const wedge = FORTUNE_WHEEL_WEDGES[pick]
      setLastResult(wedge)
      onSpinCompleteRef.current?.(wedge)
      closeTimerRef.current = null
    }, spinDurationMs)
  }, [spinning, disabled, spinDurationMs])

  const gradient = buildWheelConicGradient(FORTUNE_WHEEL_WEDGES)

  if (!open) {
    return null
  }

  return createPortal(
    <div
      className="fortune-wheel-modal-backdrop"
      role="presentation"
      onClick={() => !spinning && onClose()}
    >
      <div
        className="fortune-wheel-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="fortune-wheel-modal-title">
          Wheel of Fortune
        </h2>
        <p className="fortune-wheel-modal-hint muted">
          Pointer at the top. <strong>Cash</strong> sets dollars <em>per consonant</em> for your
          next guess (× how many appear). Vowels are bought separately ($
          {VOWEL_PRICE.toLocaleString()} each). <strong>Bankrupt</strong> wipes your round total
          and passes; <strong>Lose a Turn</strong> passes.
        </p>

        <div className="fortune-wheel-stage">
          <div className="fortune-wheel-pointer" aria-hidden />
          <div
            className="fortune-wheel-rotor"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning
                ? `transform ${spinDurationMs}ms cubic-bezier(0.12, 0.85, 0.18, 1)`
                : 'none',
              background: gradient,
            }}
          >
            {FORTUNE_WHEEL_WEDGES.map((w, i) => {
              const mid = i * wedgeAngleDeg + wedgeAngleDeg / 2
              const light =
                w.kind === 'bankrupt'
                  ? 'fortune-wheel-label--dark'
                  : w.kind === 'loseTurn'
                    ? 'fortune-wheel-label--muted'
                    : 'fortune-wheel-label--light'
              return (
                <div
                  key={w.id}
                  className="fortune-wheel-spoke"
                  style={{ transform: `rotate(${mid}deg)` }}
                >
                  <span className={`fortune-wheel-label-text ${light}`}>{w.label}</span>
                </div>
              )
            })}
          </div>
          <div className="fortune-wheel-hub" aria-hidden />
        </div>

        <div className="fortune-wheel-modal-actions">
          <button type="button" onClick={spin} disabled={disabled || spinning}>
            {spinning ? 'Spinning…' : 'Spin the wheel'}
          </button>
          <button
            type="button"
            className="btn-grey"
            onClick={onClose}
            disabled={spinning}
          >
            Close
          </button>
        </div>

        {lastResult && !spinning && (
          <p className="fortune-wheel-result" role="status">
            {lastResult.kind === 'cash' && (
              <>
                Landed on <strong>{lastResult.label}</strong>
              </>
            )}
            {lastResult.kind === 'bankrupt' && (
              <>
                Landed on <strong>Bankrupt</strong>
              </>
            )}
            {lastResult.kind === 'loseTurn' && (
              <>
                Landed on <strong>Lose a Turn</strong>
              </>
            )}
          </p>
        )}
      </div>
    </div>,
    document.body,
  )
}
