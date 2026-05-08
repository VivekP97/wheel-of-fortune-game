import type {
  ActionOutcome,
  ActiveRound,
  GameConfig,
  GameState,
  Player,
  Puzzle,
  RoundResult,
} from '../types/game'

const LETTER_REGEX = /^[A-Z]$/
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U'])

export const MAX_PLAYERS = 4
export const MIN_PLAYERS = 1
export const MIN_ROUNDS = 1
export const DEFAULT_ROUNDS = 3

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

const buildRound = (puzzle: Puzzle): ActiveRound => ({
  puzzle,
  guessedLetters: [],
  currentPlayerIndex: 0,
  lastActionMessage: 'Round started. Choose an action.',
})

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
    activeRound: buildRound(puzzles[0]),
    roundResults: [],
  }
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

  const guess = normalizeGuess(input)
  if (!isConsonant(guess)) {
    return [state, { success: false, message: 'Please enter a consonant (A-Z).' }]
  }

  if (state.activeRound.guessedLetters.includes(guess)) {
    return [state, { success: false, message: `${guess} was already guessed.` }]
  }

  const occurrences = countOccurrences(state.activeRound.puzzle.answer, guess)
  const nextState = {
    ...state,
    activeRound: {
      ...state.activeRound,
      guessedLetters: [...state.activeRound.guessedLetters, guess],
    },
  }

  if (occurrences === 0) {
    return [
      withMessage(nextState, `${guess} is not in the puzzle. Turn passes.`, true),
      { success: true, message: `${guess} not found.` },
    ]
  }

  return [
    withMessage(
      nextState,
      `${guess} appears ${occurrences} time${occurrences > 1 ? 's' : ''}.`,
    ),
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

  const guess = normalizeGuess(input)
  if (!isVowel(guess)) {
    return [state, { success: false, message: 'Please enter a vowel (A, E, I, O, U).' }]
  }

  if (state.activeRound.guessedLetters.includes(guess)) {
    return [state, { success: false, message: `${guess} was already guessed.` }]
  }

  const occurrences = countOccurrences(state.activeRound.puzzle.answer, guess)
  const nextState = {
    ...state,
    activeRound: {
      ...state.activeRound,
      guessedLetters: [...state.activeRound.guessedLetters, guess],
    },
  }

  if (occurrences === 0) {
    return [
      withMessage(nextState, `${guess} is not in the puzzle. Turn passes.`, true),
      { success: true, message: `${guess} not found.` },
    ]
  }

  return [
    withMessage(
      nextState,
      `${guess} appears ${occurrences} time${occurrences > 1 ? 's' : ''}.`,
    ),
    { success: true, message: `${guess} found ${occurrences} time(s).` },
  ]
}

export const passTurn = (state: GameState): GameState =>
  withMessage(state, 'Turn passed.', true)

export const attemptSolve = (
  state: GameState,
  proposal: string,
): [GameState, ActionOutcome] => {
  if (state.phase !== 'inRound' || !state.activeRound) {
    return [state, { success: false, message: 'No active round.' }]
  }

  const normalizedProposal = normalizeAnswer(proposal)
  const normalizedAnswer = normalizeAnswer(state.activeRound.puzzle.answer)

  if (!normalizedProposal) {
    return [state, { success: false, message: 'Enter a solve attempt first.' }]
  }

  if (normalizedProposal !== normalizedAnswer) {
    const nextState = withMessage(state, 'Incorrect solve. Turn passes.', true)
    return [nextState, { success: false, message: 'Incorrect solve attempt.' }]
  }

  const winner = state.config.players[state.activeRound.currentPlayerIndex]
  const result: RoundResult = {
    roundNumber: state.currentRoundNumber,
    puzzleId: state.activeRound.puzzle.id,
    winnerPlayerId: winner.id,
    solved: true,
  }

  return [
    {
      ...state,
      phase: 'roundComplete',
      roundResults: [...state.roundResults, result],
      activeRound: {
        ...state.activeRound,
        guessedLetters: Array.from(
          new Set(
            state.activeRound.puzzle.answer
              .split('')
              .filter((char) => isLetter(char)),
          ),
        ),
        lastActionMessage: `${winner.name} solved the puzzle.`,
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
      lastActionMessage: 'Round ended without a solve.',
    },
  }
}

export const goToNextRound = (state: GameState): GameState => {
  if (state.phase !== 'roundComplete') {
    return state
  }

  const nextRoundNumber = state.currentRoundNumber + 1
  if (nextRoundNumber > state.config.maxRounds) {
    return {
      ...state,
      phase: 'gameComplete',
    }
  }

  const nextPuzzle = state.puzzles[nextRoundNumber - 1]
  return {
    ...state,
    phase: 'inRound',
    currentRoundNumber: nextRoundNumber,
    activeRound: buildRound(nextPuzzle),
  }
}
