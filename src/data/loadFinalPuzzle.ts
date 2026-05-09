import type { Puzzle } from '../types/game'

interface FinalPuzzleFileShape {
  puzzle?: unknown
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

export const validateFinalPuzzleFile = (raw: unknown): Puzzle => {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Final puzzle file must be a JSON object.')
  }

  const parsed = raw as FinalPuzzleFileShape
  if (!isPuzzle(parsed.puzzle)) {
    throw new Error('Final puzzle file must include a valid "puzzle" object.')
  }

  const puzzle = parsed.puzzle
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
}

export const loadFinalPuzzle = async (): Promise<Puzzle> => {
  const response = await fetch('/api/final-puzzle')
  if (!response.ok) {
    throw new Error('Could not load final puzzle file.')
  }

  const raw = (await response.json()) as unknown
  return validateFinalPuzzleFile(raw)
}
