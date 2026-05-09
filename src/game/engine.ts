import type {
  ActionOutcome,
  ActiveRound,
  GameConfig,
  GameState,
  Player,
  Puzzle,
  RoundResult,
  WheelSpinEffect,
} from '../types/game'

const LETTER_REGEX = /^[A-Z]$/
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U'])

export const MAX_PLAYERS = 5
export const MIN_PLAYERS = 1
export const MIN_ROUNDS = 1
export const DEFAULT_ROUNDS = 3

/** Cost to reveal a vowel (paid before the letter is chosen). */
export const VOWEL_PRICE = 250

const isLetter = (char: string) => LETTER_REGEX.test(char)

export const isVowel = (letter: string): boolean => VOWELS.has(letter)

export const isConsonant = (letter: string): boolean =>
  isLetter(letter) && !isVowel(letter)

const normalizeGuess = (value: string): string => value.trim().toUpperCase()

const normalizeAnswer = (value: string): string =>
  value.trim().toUpperCase().replace(/\s+/g, ' ')

const nextPlayerIndex = (index: number, players: Player[]): number =>
  (index + 1) % players.length

export const revealCharacters = (
  answer: string,
  guessedLetters: string[],
): string[] =>
  answer.split('').map((char) => {
    if (!isLetter(char)) {
      return char
    }

    return guessedLetters.includes(char) ? char : ''
  })

export const isPuzzleSolved = (
  answer: string,
  guessedLetters: string[],
): boolean => {
  const revealed = revealCharacters(answer, guessedLetters)
  return revealed.every((char, index) => {
    const original = answer[index]
    return !isLetter(original) || char === original
  })
}

const countOccurrences = (answer: string, letter: string): number =>
  answer.split('').filter((char) => char === letter).length

const buildRound = (
  puzzle: Puzzle,
  currentPlayerIndex: number,
  playerCount: number,
): ActiveRound => ({
  puzzle,
  guessedLetters: [],
  currentPlayerIndex,
  lastActionMessage: `Spin the wheel or buy a vowel ($${VOWEL_PRICE}).`,
  roundScores: Array.from({ length: playerCount }, () => 0),
  pendingWheelValue: null,
})

/** Restore an in-progress game: current round’s puzzle starts fresh (no guessed letters). */
export const resumeGameFromSave = (input: {
  config: GameConfig
  puzzles: Puzzle[]
  currentRoundNumber: number
  currentPlayerIndex: number
  cumulativeScores: number[]
  roundResults: RoundResult[]
}): GameState => {
  const {
    config,
    puzzles,
    currentRoundNumber,
    currentPlayerIndex,
    cumulativeScores,
    roundResults,
  } = input

  if (config.players.length < MIN_PLAYERS || config.players.length > MAX_PLAYERS) {
    throw new Error(`Player count must be between ${MIN_PLAYERS} and ${MAX_PLAYERS}.`)
  }
  if (config.maxRounds < MIN_ROUNDS) {
    throw new Error('At least one round is required.')
  }
  if (puzzles.length < config.maxRounds) {
    throw new Error('Not enough puzzles for the selected number of rounds.')
  }
  if (currentRoundNumber < 1 || currentRoundNumber > config.maxRounds) {
    throw new Error('Invalid round number.')
  }
  if (currentPlayerIndex < 0 || currentPlayerIndex >= config.players.length) {
    throw new Error('Invalid current player.')
  }
  if (cumulativeScores.length !== config.players.length) {
    throw new Error('Cumulative scores do not match players.')
  }

  const puzzle = puzzles[currentRoundNumber - 1]
  if (!puzzle) {
    throw new Error('Missing puzzle for this round.')
  }

  return {
    phase: 'inRound',
    config,
    puzzles,
    currentRoundNumber,
    roundResults: roundResults.map((r) => ({ ...r })),
    cumulativeScores: cumulativeScores.map((n) => n),
    activeRound: buildRound(puzzle, currentPlayerIndex, config.players.length),
  }
}

export const createGame = (
  puzzles: Puzzle[],
  config: GameConfig,
): GameState => {
  if (config.players.length < MIN_PLAYERS || config.players.length > MAX_PLAYERS) {
    throw new Error(`Player count must be between ${MIN_PLAYERS} and ${MAX_PLAYERS}.`)
  }

  if (config.maxRounds < MIN_ROUNDS) {
    throw new Error('At least one round is required.')
  }

  if (puzzles.length < config.maxRounds) {
    throw new Error('Not enough puzzles for the selected number of rounds.')
  }

  return {
    phase: 'inRound',
    config,
    puzzles,
    currentRoundNumber: 1,
    activeRound: buildRound(puzzles[0], 0, config.players.length),
    roundResults: [],
    cumulativeScores: Array.from({ length: config.players.length }, () => 0),
  }
}

/** Player indices tied for the highest cumulative score (everyone if all zero). */
export const getHighestCumulativeScoreIndices = (
  scores: readonly number[],
): number[] => {
  if (scores.length === 0) {
    return []
  }
  const max = Math.max(...scores)
  return scores.map((value, index) => (value === max ? index : -1)).filter((i) => i >= 0)
}

const withMessage = (
  state: GameState,
  message: string,
  updatePlayer = false,
): GameState => {
  if (!state.activeRound) {
    return state
  }

  const currentIndex = state.activeRound.currentPlayerIndex
  const nextIndex = nextPlayerIndex(currentIndex, state.config.players)

  return {
    ...state,
    activeRound: {
      ...state.activeRound,
      currentPlayerIndex: updatePlayer ? nextIndex : currentIndex,
      lastActionMessage: message,
    },
  }
}

export const guessConsonant = (
  state: GameState,
  input: string,
): [GameState, ActionOutcome] => {
  if (state.phase !== 'inRound' || !state.activeRound) {
    return [state, { success: false, message: 'No active round.' }]
  }

  const perLetter = state.activeRound.pendingWheelValue
  if (perLetter === null) {
    const msg = 'Spin the wheel before calling a consonant.'
    return [
      {
        ...state,
        activeRound: { ...state.activeRound, lastActionMessage: msg },
      },
      { success: false, message: msg },
    ]
  }

  const guess = normalizeGuess(input)
  if (!isConsonant(guess)) {
    return [state, { success: false, message: 'Please enter a consonant (A-Z).' }]
  }

  if (state.activeRound.guessedLetters.includes(guess)) {
    return [state, { success: false, message: `${guess} was already guessed.` }]
  }

  const idx = state.activeRound.currentPlayerIndex
  const player = state.config.players[idx]
  const occurrences = countOccurrences(state.activeRound.puzzle.answer, guess)
  const scores = [...state.activeRound.roundScores]

  const baseActive = {
    ...state.activeRound,
    guessedLetters: [...state.activeRound.guessedLetters, guess],
    pendingWheelValue: null as number | null,
  }

  if (occurrences === 0) {
    return [
      withMessage(
        {
          ...state,
          activeRound: baseActive,
        },
        `${guess} is not in the puzzle. Turn passes.`,
        true,
      ),
      { success: true, message: `${guess} not found.` },
    ]
  }

  const earned = perLetter * occurrences
  scores[idx] += earned
  return [
    {
      ...state,
      activeRound: {
        ...baseActive,
        roundScores: scores,
        lastActionMessage: `${guess}: ${occurrences} hit${occurrences > 1 ? 's' : ''}. ${player.name} earns $${earned.toLocaleString()} ($${perLetter.toLocaleString()} × ${occurrences}). Spin again or buy a vowel.`,
      },
    },
    { success: true, message: `${guess} found ${occurrences} time(s).` },
  ]
}

export const buyVowel = (
  state: GameState,
  input: string,
): [GameState, ActionOutcome] => {
  if (state.phase !== 'inRound' || !state.activeRound) {
    return [state, { success: false, message: 'No active round.' }]
  }

  if (state.activeRound.pendingWheelValue !== null) {
    const msg = 'You have a spin in play — call a consonant first.'
    return [
      {
        ...state,
        activeRound: { ...state.activeRound, lastActionMessage: msg },
      },
      { success: false, message: msg },
    ]
  }

  const idx = state.activeRound.currentPlayerIndex
  if (state.activeRound.roundScores[idx] < VOWEL_PRICE) {
    const msg = `Vowels cost $${VOWEL_PRICE}. Earn cash with consonants first.`
    return [
      {
        ...state,
        activeRound: { ...state.activeRound, lastActionMessage: msg },
      },
      { success: false, message: msg },
    ]
  }

  const guess = normalizeGuess(input)
  if (!isVowel(guess)) {
    return [state, { success: false, message: 'Please enter a vowel (A, E, I, O, U).' }]
  }

  if (state.activeRound.guessedLetters.includes(guess)) {
    return [state, { success: false, message: `${guess} was already guessed.` }]
  }

  const scores = [...state.activeRound.roundScores]
  scores[idx] -= VOWEL_PRICE

  const occurrences = countOccurrences(state.activeRound.puzzle.answer, guess)
  const paidActive = {
    ...state.activeRound,
    roundScores: scores,
    guessedLetters: [...state.activeRound.guessedLetters, guess],
  }

  if (occurrences === 0) {
    return [
      withMessage(
        {
          ...state,
          activeRound: paidActive,
        },
        `${guess} is not in the puzzle (–$${VOWEL_PRICE}). Turn passes.`,
        true,
      ),
      { success: true, message: `${guess} not found.` },
    ]
  }

  return [
    {
      ...state,
      activeRound: {
        ...paidActive,
        lastActionMessage: `${guess}: ${occurrences} hit${occurrences > 1 ? 's' : ''} (paid $${VOWEL_PRICE}). Spin or buy another vowel.`,
      },
    },
    { success: true, message: `${guess} found ${occurrences} time(s).` },
  ]
}

export const passTurn = (state: GameState): GameState => {
  if (state.phase !== 'inRound' || !state.activeRound) {
    return state
  }
  const currentIndex = state.activeRound.currentPlayerIndex
  const nextIndex = nextPlayerIndex(currentIndex, state.config.players)
  return {
    ...state,
    activeRound: {
      ...state.activeRound,
      currentPlayerIndex: nextIndex,
      pendingWheelValue: null,
      lastActionMessage: 'Turn passed.',
    },
  }
}

/** Apply a wheel result: cash adds to the current player’s round total; lose turn / bankrupt pass the turn (bankrupt also clears that total). */
export const applyWheelSpinEffect = (
  state: GameState,
  effect: WheelSpinEffect,
): [GameState, ActionOutcome] => {
  if (state.phase !== 'inRound' || !state.activeRound) {
    return [state, { success: false, message: 'No active round.' }]
  }

  const idx = state.activeRound.currentPlayerIndex
  const player = state.config.players[idx]
  const scores = [...state.activeRound.roundScores]

  if (effect.kind === 'loseTurn') {
    const next = withMessage(
      {
        ...state,
        activeRound: {
          ...state.activeRound,
          roundScores: scores,
          pendingWheelValue: null,
        },
      },
      `${player.name}: Lose a turn!`,
      true,
    )
    return [next, { success: true, message: 'Lose a turn' }]
  }

  if (effect.kind === 'bankrupt') {
    scores[idx] = 0
    const next = withMessage(
      {
        ...state,
        activeRound: {
          ...state.activeRound,
          roundScores: scores,
          pendingWheelValue: null,
        },
      },
      `${player.name}: Bankrupt! Round total reset to $0. Turn passes.`,
      true,
    )
    return [next, { success: true, message: 'Bankrupt' }]
  }

  if (state.activeRound.pendingWheelValue !== null) {
    const msg = 'Call a consonant from your current spin before spinning again.'
    return [
      {
        ...state,
        activeRound: { ...state.activeRound, lastActionMessage: msg },
      },
      { success: false, message: msg },
    ]
  }

  return [
    {
      ...state,
      activeRound: {
        ...state.activeRound,
        pendingWheelValue: effect.value,
        lastActionMessage: `${player.name} spun $${effect.value.toLocaleString()} per letter — choose a consonant.`,
      },
    },
    { success: true, message: 'Cash' },
  ]
}

export const attemptSolve = (
  state: GameState,
  proposal: string,
): [GameState, ActionOutcome] => {
  if (!state.activeRound) {
    return [state, { success: false, message: 'No active round.' }]
  }
  if (state.phase !== 'inRound') {
    return [state, { success: false, message: 'Cannot solve right now.' }]
  }

  const normalizedProposal = normalizeAnswer(proposal)
  const normalizedAnswer = normalizeAnswer(state.activeRound.puzzle.answer)

  if (!normalizedProposal) {
    return [state, { success: false, message: 'Enter a solve attempt first.' }]
  }

  if (normalizedProposal !== normalizedAnswer) {
    const nextState = withMessage(
      {
        ...state,
        activeRound: {
          ...state.activeRound,
          pendingWheelValue: null,
        },
      },
      'Incorrect solve. Turn passes.',
      true,
    )
    return [nextState, { success: false, message: 'Incorrect solve attempt.' }]
  }

  const winnerIndex = state.activeRound.currentPlayerIndex
  const winner = state.config.players[winnerIndex]
  const bankAmount = state.activeRound.roundScores[winnerIndex]
  const cumulativeScores = [...state.cumulativeScores]
  cumulativeScores[winnerIndex] += bankAmount
  const newTotal = cumulativeScores[winnerIndex]

  const result: RoundResult = {
    roundNumber: state.currentRoundNumber,
    puzzleId: state.activeRound.puzzle.id,
    winnerPlayerId: winner.id,
    solved: true,
  }

  return [
    {
      ...state,
      phase: 'roundSolvedAwaitingAdvance',
      cumulativeScores,
      roundResults: [...state.roundResults, result],
      activeRound: {
        ...state.activeRound,
        pendingWheelValue: null,
        guessedLetters: Array.from(
          new Set(
            state.activeRound.puzzle.answer
              .split('')
              .filter((char) => isLetter(char)),
          ),
        ),
        lastActionMessage: `${winner.name} solved the puzzle and banks $${bankAmount.toLocaleString()} toward the game total (now $${newTotal.toLocaleString()}).`,
      },
    },
    { success: true, message: `${winner.name} solved the puzzle.` },
  ]
}

export const finishRoundWithoutSolve = (state: GameState): GameState => {
  if (state.phase !== 'inRound' || !state.activeRound) {
    return state
  }

  const result: RoundResult = {
    roundNumber: state.currentRoundNumber,
    puzzleId: state.activeRound.puzzle.id,
    winnerPlayerId: null,
    solved: false,
  }

  return {
    ...state,
    phase: 'roundComplete',
    roundResults: [...state.roundResults, result],
    activeRound: {
      ...state.activeRound,
      pendingWheelValue: null,
      lastActionMessage: 'Round ended without a solve.',
    },
  }
}

export const goToNextRound = (state: GameState): GameState => {
  if (state.phase !== 'roundComplete' && state.phase !== 'roundSolvedAwaitingAdvance') {
    return state
  }

  const nextRoundNumber = state.currentRoundNumber + 1
  if (nextRoundNumber > state.config.maxRounds) {
    return {
      ...state,
      phase: 'gameComplete',
      activeRound: null,
    }
  }

  const nextPuzzle = state.puzzles[nextRoundNumber - 1]
  const lastResult = state.roundResults[state.roundResults.length - 1]
  const nextStartingPlayerIndex =
    lastResult?.winnerPlayerId != null
      ? state.config.players.findIndex(
          (player) => player.id === lastResult.winnerPlayerId,
        )
      : 0

  return {
    ...state,
    phase: 'inRound',
    currentRoundNumber: nextRoundNumber,
    activeRound: buildRound(
      nextPuzzle,
      nextStartingPlayerIndex >= 0 ? nextStartingPlayerIndex : 0,
      state.config.players.length,
    ),
  }
}
