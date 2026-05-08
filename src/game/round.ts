import type { GameState, Player } from '../types/game'

export const getPlayerById = (
  players: Player[],
  playerId: string | null,
): Player | null => {
  if (!playerId) {
    return null
  }

  return players.find((player) => player.id === playerId) ?? null
}

export const getLatestRoundResult = (state: GameState) =>
  state.roundResults[state.roundResults.length - 1] ?? null

export const isGameDone = (state: GameState): boolean => state.phase === 'gameComplete'
