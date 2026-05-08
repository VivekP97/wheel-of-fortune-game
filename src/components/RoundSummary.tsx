import { getPlayerById } from '../game/round'
import type { Player, RoundResult } from '../types/game'

interface RoundSummaryProps {
  result: RoundResult
  players: Player[]
  canAdvance: boolean
  onAdvance: () => void
}

export default function RoundSummary({
  result,
  players,
  canAdvance,
  onAdvance,
}: RoundSummaryProps) {
  const winner = getPlayerById(players, result.winnerPlayerId)

  return (
    <section className="panel summary">
      <h2>Round {result.roundNumber} Complete</h2>
      {winner ? (
        <p>
          Winner: <strong>{winner.name}</strong>
        </p>
      ) : (
        <p>No winner was recorded for this round.</p>
      )}
      <p>Puzzle ID: {result.puzzleId}</p>
      <button type="button" onClick={onAdvance}>
        {canAdvance ? 'Start Next Round' : 'Finish Game'}
      </button>
    </section>
  )
}
