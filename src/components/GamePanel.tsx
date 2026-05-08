import type { Player } from '../types/game'

interface GamePanelProps {
  players: Player[]
  currentPlayerIndex: number
  roundNumber: number
  maxRounds: number
  message: string
  solveAttempt: string
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
  solveAttempt,
  onSolveAttemptChange,
  onSubmitSolve,
  onPassTurn,
  onFinishRoundWithoutSolve,
}: GamePanelProps) {
  return (
    <section className="panel">
      <h2>Round Controls</h2>
      <p>
        Round {roundNumber} of {maxRounds}
      </p>
      <p className="turn-label">
        Current player: <strong>{players[currentPlayerIndex]?.name}</strong>
      </p>

      <div className="player-list">
        {players.map((player, index) => (
          <div
            key={player.id}
            className={`player-chip ${index === currentPlayerIndex ? 'active' : ''}`}
          >
            {player.name}
          </div>
        ))}
      </div>

      <p className="message">{message}</p>

      <div className="actions">
        <input
          type="text"
          value={solveAttempt}
          onChange={(event) => onSolveAttemptChange(event.target.value)}
          placeholder="Type full puzzle to solve"
          aria-label="Solve attempt"
        />
        <button type="button" onClick={onSubmitSolve}>
          Solve Puzzle
        </button>
        <button type="button" onClick={onPassTurn}>
          Pass Turn
        </button>
        <button type="button" onClick={onFinishRoundWithoutSolve}>
          End Round Without Solve
        </button>
      </div>
    </section>
  )
}
