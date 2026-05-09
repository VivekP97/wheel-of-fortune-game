import { useState } from 'react'
import FortuneWheelModal from './FortuneWheelModal'
import SolveOutcomeBanner from './SolveOutcomeBanner'
import type { Player } from '../types/game'
import type { WheelWedge } from '../game/fortuneWheel'

interface GamePanelProps {
  players: Player[]
  currentPlayerIndex: number
  roundNumber: number
  maxRounds: number
  message: string
  hideStatusMessage: boolean
  roundControlsLocked: boolean
  solveAttempt: string
  solveBanner: { variant: 'success' | 'error'; message: string } | null
  onDismissSolveBanner: () => void
  onSolveAttemptChange: (value: string) => void
  onSubmitSolve: () => void
  onPassTurn: () => void
  onFinishRoundWithoutSolve: () => void
  roundScores: number[]
  /** Banked totals from won rounds only */
  cumulativeScores: number[]
  onWheelSpinComplete: (wedge: WheelWedge) => void
  /** True while a cash spin is waiting for a consonant */
  wheelSpinDisabled: boolean
}

export default function GamePanel({
  players,
  currentPlayerIndex,
  roundNumber,
  maxRounds,
  message,
  hideStatusMessage,
  roundControlsLocked,
  solveAttempt,
  solveBanner,
  onDismissSolveBanner,
  onSolveAttemptChange,
  onSubmitSolve,
  onPassTurn,
  onFinishRoundWithoutSolve,
  roundScores,
  cumulativeScores,
  onWheelSpinComplete,
  wheelSpinDisabled,
}: GamePanelProps) {
  const [wheelOpen, setWheelOpen] = useState(false)

  return (
    <section className="panel game-panel">
      <h2>Round Controls</h2>
      <p className="game-panel-round-meta">
        Round {roundNumber} of {maxRounds}
      </p>

      <div className="player-roster" aria-label="Players">
        {players.map((player, index) => {
          const isCurrent = index === currentPlayerIndex
          return (
            <div
              key={player.id}
              className={`player-roster-item ${isCurrent ? 'player-roster-item--current' : ''}`}
            >
              <span className="player-roster-name">{player.name}</span>
              <div className="player-score-lines">
                <span
                  className="player-round-score"
                  aria-label={`Round total for ${player.name}`}
                >
                  Round: ${(roundScores[index] ?? 0).toLocaleString()}
                </span>
                <span
                  className="player-game-total"
                  aria-label={`Game total for ${player.name}`}
                >
                  Game: ${(cumulativeScores[index] ?? 0).toLocaleString()}
                </span>
              </div>
              {isCurrent && <span className="player-roster-badge">Current turn</span>}
            </div>
          )
        })}
      </div>

      {!hideStatusMessage && message && (
        <p className="message game-panel-status">{message}</p>
      )}

      <div className="actions">
        <input
          type="text"
          value={solveAttempt}
          onChange={(event) => onSolveAttemptChange(event.target.value)}
          placeholder="Type full puzzle to solve"
          aria-label="Solve attempt"
          disabled={roundControlsLocked}
        />
        <div className="action-buttons-row">
          <button type="button" onClick={onSubmitSolve} disabled={roundControlsLocked}>
            Solve Puzzle
          </button>
          <button
            type="button"
            onClick={() => setWheelOpen(true)}
            disabled={roundControlsLocked || wheelSpinDisabled}
            title={
              wheelSpinDisabled ? 'Call a consonant from your current spin first' : undefined
            }
          >
            Spin wheel
          </button>
          <button
            type="button"
            className="btn-grey"
            onClick={onPassTurn}
            disabled={roundControlsLocked}
          >
            Pass Turn
          </button>
          <button
            type="button"
            className="btn-grey"
            onClick={onFinishRoundWithoutSolve}
            disabled={roundControlsLocked}
          >
            End Round Without Solve
          </button>
        </div>
      </div>

      {solveBanner && (
        <SolveOutcomeBanner
          variant={solveBanner.variant}
          message={solveBanner.message}
          onDismiss={onDismissSolveBanner}
        />
      )}

      <FortuneWheelModal
        open={wheelOpen}
        onClose={() => setWheelOpen(false)}
        disabled={roundControlsLocked || wheelSpinDisabled}
        onSpinComplete={onWheelSpinComplete}
      />
    </section>
  )
}
