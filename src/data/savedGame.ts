import { resumeGameFromSave } from '../game/engine'
import type { GameConfig, GameState, Player, Puzzle, RoundResult } from '../types/game'

const SAVE_VERSION = 1 as const

export interface SavedGamePayload {
  version: typeof SAVE_VERSION
  savedAt: string
  config: GameConfig
  puzzles: Puzzle[]
  currentRoundNumber: number
  currentPlayerIndex: number
  cumulativeScores: number[]
  roundResults: RoundResult[]
}

export interface SavedGameFileShape {
  savedGame?: unknown
}

const isPlayer = (value: unknown): value is Player => {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const o = value as Record<string, unknown>
  return typeof o.id === 'string' && typeof o.name === 'string'
}

const isPuzzle = (value: unknown): value is Puzzle => {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const o = value as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    o.id.trim().length > 0 &&
    typeof o.category === 'string' &&
    typeof o.answer === 'string' &&
    o.answer.trim().length > 0
  )
}

const isRoundResult = (value: unknown): value is RoundResult => {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const o = value as Record<string, unknown>
  return (
    typeof o.roundNumber === 'number' &&
    typeof o.puzzleId === 'string' &&
    (o.winnerPlayerId === null || typeof o.winnerPlayerId === 'string') &&
    typeof o.solved === 'boolean'
  )
}

export const parseSavedGamePayload = (value: unknown): SavedGamePayload => {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Invalid saved game.')
  }
  const o = value as Record<string, unknown>
  if (o.version !== SAVE_VERSION) {
    throw new Error('Unsupported save file version.')
  }
  if (typeof o.savedAt !== 'string' || !o.savedAt) {
    throw new Error('Save is missing a timestamp.')
  }
  if (typeof o.config !== 'object' || o.config === null) {
    throw new Error('Save is missing config.')
  }
  const cfg = o.config as Record<string, unknown>
  if (!Array.isArray(cfg.players) || !cfg.players.every(isPlayer)) {
    throw new Error('Invalid players in save.')
  }
  if (typeof cfg.maxRounds !== 'number' || cfg.maxRounds < 1) {
    throw new Error('Invalid maxRounds in save.')
  }
  const config: GameConfig = {
    players: cfg.players as Player[],
    maxRounds: cfg.maxRounds,
  }
  if (config.players.length < 1 || config.players.length > 4) {
    throw new Error('Invalid player count in save.')
  }

  if (!Array.isArray(o.puzzles) || !o.puzzles.every(isPuzzle)) {
    throw new Error('Invalid puzzles in save.')
  }
  const puzzles = (o.puzzles as Puzzle[]).map((p) => ({
    ...p,
    id: p.id.trim(),
    category: p.category.trim(),
    answer: p.answer.toUpperCase().trim(),
    notes:
      typeof p.notes === 'string' && p.notes.trim().length > 0
        ? p.notes.trim()
        : undefined,
  }))

  if (puzzles.length < config.maxRounds) {
    throw new Error('Not enough puzzles in save for max rounds.')
  }

  if (typeof o.currentRoundNumber !== 'number') {
    throw new Error('Invalid round number in save.')
  }
  const currentRoundNumber = o.currentRoundNumber
  if (currentRoundNumber < 1 || currentRoundNumber > config.maxRounds) {
    throw new Error('Round number out of range.')
  }

  if (typeof o.currentPlayerIndex !== 'number') {
    throw new Error('Invalid current player in save.')
  }
  const currentPlayerIndex = o.currentPlayerIndex
  if (currentPlayerIndex < 0 || currentPlayerIndex >= config.players.length) {
    throw new Error('Current player index out of range.')
  }

  if (!Array.isArray(o.cumulativeScores)) {
    throw new Error('Invalid cumulative scores.')
  }
  const cumulativeScores = o.cumulativeScores.map((n) => {
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) {
      throw new Error('Invalid score value.')
    }
    return Math.floor(n)
  })
  if (cumulativeScores.length !== config.players.length) {
    throw new Error('Cumulative scores length mismatch.')
  }

  if (!Array.isArray(o.roundResults) || !o.roundResults.every(isRoundResult)) {
    throw new Error('Invalid round results.')
  }
  const roundResults = o.roundResults as RoundResult[]
  if (roundResults.length !== currentRoundNumber - 1) {
    throw new Error('Round results do not match current round.')
  }
  for (let i = 0; i < roundResults.length; i++) {
    if (roundResults[i].roundNumber !== i + 1) {
      throw new Error('Round results sequence invalid.')
    }
  }

  return {
    version: SAVE_VERSION,
    savedAt: o.savedAt,
    config,
    puzzles,
    currentRoundNumber,
    currentPlayerIndex,
    cumulativeScores,
    roundResults,
  }
}

export const gameStateToSavedPayload = (state: GameState): SavedGamePayload => {
  if (state.phase !== 'inRound' || !state.activeRound) {
    throw new Error('You can only save during an active round in progress.')
  }
  return {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    config: state.config,
    puzzles: state.puzzles,
    currentRoundNumber: state.currentRoundNumber,
    currentPlayerIndex: state.activeRound.currentPlayerIndex,
    cumulativeScores: [...state.cumulativeScores],
    roundResults: state.roundResults.map((r) => ({ ...r })),
  }
}

export const savedPayloadToGameState = (payload: SavedGamePayload): GameState =>
  resumeGameFromSave(payload)

export const validateSavedGameFile = (raw: unknown): SavedGamePayload | null => {
  if (typeof raw !== 'object' || raw === null) {
    return null
  }
  const parsed = raw as SavedGameFileShape
  if (parsed.savedGame === undefined || parsed.savedGame === null) {
    return null
  }
  return parseSavedGamePayload(parsed.savedGame)
}

export const loadSavedGameFile = async (): Promise<SavedGamePayload | null> => {
  const response = await fetch('/api/saved-game')
  if (!response.ok) {
    throw new Error('Could not load saved game file.')
  }
  const raw = (await response.json()) as unknown
  return validateSavedGameFile(raw)
}

export const saveSavedGameFile = async (
  payload: SavedGamePayload | null,
): Promise<void> => {
  const body = { savedGame: payload }
  const response = await fetch('/api/saved-game', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Could not save game.')
  }
}
