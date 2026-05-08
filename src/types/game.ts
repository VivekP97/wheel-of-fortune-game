export interface Puzzle {
  id: string
  category: string
  answer: string
  difficulty?: string
  notes?: string
}

export interface Player {
  id: string
  name: string
}

export interface RoundResult {
  roundNumber: number
  puzzleId: string
  winnerPlayerId: string | null
  solved: boolean
}

export interface ActiveRound {
  puzzle: Puzzle
  guessedLetters: string[]
  currentPlayerIndex: number
  lastActionMessage: string
}

export type GamePhase = 'inRound' | 'roundComplete' | 'gameComplete'

export interface GameConfig {
  players: Player[]
  maxRounds: number
}

export interface GameState {
  phase: GamePhase
  config: GameConfig
  puzzles: Puzzle[]
  currentRoundNumber: number
  activeRound: ActiveRound | null
  roundResults: RoundResult[]
}

export interface ActionOutcome {
  success: boolean
  message: string
}
