export interface Puzzle {
  id: string
  category: string
  answer: string
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

/** Outcome of a wheel spin used by the game engine. */
export type WheelSpinEffect =
  | { kind: 'cash'; value: number }
  | { kind: 'loseTurn' }
  | { kind: 'bankrupt' }

export interface ActiveRound {
  puzzle: Puzzle
  guessedLetters: string[]
  currentPlayerIndex: number
  lastActionMessage: string
  /** Cash earned this round only (indexed by player order); Bankrupt clears current player’s entry. */
  roundScores: number[]
  /**
   * After a cash wheel spin: dollars earned per matching consonant for the next guess only.
   * `null` means the player may spin or buy a vowel — not a consonant from the wheel.
   */
  pendingWheelValue: number | null
}

export type GamePhase =
  | 'inRound'
  | 'roundSolvedAwaitingAdvance'
  | 'roundComplete'
  | 'gameComplete'

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
  /**
   * Running totals across rounds. Only the round winner’s `roundScores[i]` is added here
   * when they solve; other players’ round cash is not banked.
   */
  cumulativeScores: number[]
}

export interface ActionOutcome {
  success: boolean
  message: string
}
