import SolveOutcomeBanner from './SolveOutcomeBanner'
import type { Player } from '../types/game'

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
}: GamePanelProps) {
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
    </section>
  )
}
