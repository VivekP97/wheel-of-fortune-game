import type { Puzzle } from '../types/game'

interface PuzzleFileShape {
  puzzles?: unknown
}

const hasValue = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const isPuzzle = (value: unknown): value is Puzzle => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    hasValue(candidate.id) &&
    hasValue(candidate.category) &&
    hasValue(candidate.answer)
  )
}

export const validatePuzzles = (raw: unknown): Puzzle[] => {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Puzzle file must be a JSON object.')
  }

  const parsed = raw as PuzzleFileShape
  if (!Array.isArray(parsed.puzzles)) {
    throw new Error('Puzzle file must include a "puzzles" array.')
  }

  const puzzles = parsed.puzzles.filter(isPuzzle).map((puzzle) => {
    const base: Puzzle = {
      id: puzzle.id.trim(),
      category: puzzle.category.trim(),
      answer: puzzle.answer.toUpperCase().trim(),
    }
    const notes =
      typeof puzzle.notes === 'string' && puzzle.notes.trim().length > 0
        ? puzzle.notes.trim()
        : undefined
    return notes ? { ...base, notes } : base
  })

  if (puzzles.length !== parsed.puzzles.length) {
    throw new Error('One or more puzzles are missing required fields.')
  }

  const ids = new Set<string>()
  for (const puzzle of puzzles) {
    if (ids.has(puzzle.id)) {
      throw new Error(`Duplicate puzzle id found: ${puzzle.id}`)
    }
    ids.add(puzzle.id)
  }

  if (puzzles.length === 0) {
    throw new Error('At least one puzzle is required.')
  }

  return puzzles
}

export const loadPuzzles = async (): Promise<Puzzle[]> => {
  const response = await fetch('/api/puzzles')
  if (!response.ok) {
    throw new Error('Could not load puzzle file.')
  }

  const raw = (await response.json()) as unknown
  return validatePuzzles(raw)
}

export const savePuzzles = async (puzzles: Puzzle[]): Promise<Puzzle[]> => {
  const payload = { puzzles }
  const response = await fetch('/api/puzzles', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Could not save puzzle file.')
  }

  const raw = (await response.json()) as unknown
  return validatePuzzles(raw)
}
