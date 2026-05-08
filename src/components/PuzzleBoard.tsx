import { revealCharacters } from '../game/engine'

interface PuzzleBoardProps {
  answer: string
  guessedLetters: string[]
  category: string
}

/** TV board: row 1 & 4 have 12 tiles; rows 2 & 3 have 14. */
const WOF_ROW_CAPS = [12, 14, 14, 12] as const

type GreenSlot = { kind: 'green' }
type PuzzleSlot = { kind: 'puzzle'; answerIndex: number }
type Slot = GreenSlot | PuzzleSlot

function wordIndexGroups(answer: string): number[][] {
  const words: number[][] = []
  let current: number[] = []
  for (let i = 0; i < answer.length; i++) {
    const c = answer[i]
    if (c === ' ') {
      if (current.length) {
        words.push(current)
      }
      current = []
    } else {
      current.push(i)
    }
  }
  if (current.length) {
    words.push(current)
  }
  return words
}

/**
 * Pack puzzle words onto physical rows starting at `startRow`, using caps per row.
 * Splits a word across rows if needed. Uses one green “gap” tile between words on the same row.
 */
function tryPackFromStartRow(
  words: number[][],
  startRow: number,
  caps: readonly number[],
): Map<number, number[][]> | null {
  if (startRow < 0 || startRow >= 4) {
    return null
  }

  const map = new Map<number, number[][]>()
  let pr = startRow
  let row: number[][] = []
  let used = 0

  const flush = () => {
    if (row.length > 0) {
      map.set(pr, row)
      row = []
      used = 0
      pr += 1
    }
  }

  const addWord = (wordIndices: number[]): boolean => {
    let remaining = wordIndices

    while (remaining.length > 0) {
      if (pr >= 4) {
        return false
      }

      const cap = caps[pr]
      const gap = row.length > 0 ? 1 : 0
      const avail = cap - used - gap

      if (avail <= 0) {
        flush()
        continue
      }

      if (remaining.length <= avail) {
        row.push(remaining)
        used += gap + remaining.length
        remaining = []
      } else {
        row.push(remaining.slice(0, avail))
        used += gap + avail
        remaining = remaining.slice(avail)
        flush()
      }
    }

    return true
  }

  for (const word of words) {
    if (!addWord(word)) {
      return null
    }
  }

  flush()
  return pr <= 4 ? map : null
}

function scorePackCentering(m: Map<number, number[][]>): number {
  const keys = [...m.keys()].sort((a, b) => a - b)
  if (keys.length === 0) {
    return 0
  }
  const mid = (keys[0] + keys[keys.length - 1]) / 2
  return Math.abs(mid - 1.5)
}

function findBestPack(words: number[][]): Map<number, number[][]> {
  let best: Map<number, number[][]> | null = null
  let bestScore = Infinity

  for (let start = 0; start < 4; start++) {
    const m = tryPackFromStartRow(words, start, WOF_ROW_CAPS)
    if (!m) {
      continue
    }
    const score = scorePackCentering(m)
    if (score < bestScore) {
      bestScore = score
      best = m
    }
  }

  return best ?? new Map()
}

function buildCenteredRow(cap: number, wordsInRow: number[][]): Slot[] {
  const sequence: Slot[] = []
  for (let w = 0; w < wordsInRow.length; w++) {
    if (w > 0) {
      sequence.push({ kind: 'green' })
    }
    for (const idx of wordsInRow[w]) {
      sequence.push({ kind: 'puzzle', answerIndex: idx })
    }
  }

  const used = sequence.length
  const padLeft = Math.max(0, Math.floor((cap - used) / 2))
  const padRight = Math.max(0, cap - used - padLeft)

  const left = Array.from({ length: padLeft }, (): GreenSlot => ({ kind: 'green' }))
  const right = Array.from({ length: padRight }, (): GreenSlot => ({ kind: 'green' }))

  return [...left, ...sequence, ...right]
}

function buildFourRowGrid(packMap: Map<number, number[][]>): Slot[][] {
  const grid: Slot[][] = []
  for (let r = 0; r < 4; r++) {
    const cap = WOF_ROW_CAPS[r]
    const wordsInRow = packMap.get(r)
    if (!wordsInRow) {
      grid.push(Array.from({ length: cap }, (): GreenSlot => ({ kind: 'green' })))
    } else {
      grid.push(buildCenteredRow(cap, wordsInRow))
    }
  }
  return grid
}

function WofGreenLogo() {
  return (
    <span className="wof-tile-logo" aria-hidden>
      <svg className="wof-tile-logo-svg" viewBox="0 0 40 40" focusable="false">
        <circle cx="20" cy="20" r="14" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.2" />
        <circle cx="20" cy="20" r="8" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
        <circle cx="20" cy="20" r="3" fill="rgba(255,255,255,0.35)" />
      </svg>
    </span>
  )
}

export default function PuzzleBoard({
  answer,
  guessedLetters,
  category,
}: PuzzleBoardProps) {
  const revealed = revealCharacters(answer, guessedLetters)
  const words = wordIndexGroups(answer)
  const packMap = findBestPack(words)
  const grid = buildFourRowGrid(packMap)

  return (
    <section className="panel puzzle-board-panel">
      <h2 className="puzzle-board-heading">Puzzle Board</h2>
      <div className="wof-category-strip" aria-label="Category">
        {category.trim() || '—'}
      </div>
      <div className="board board-grid-wof" aria-label="Puzzle board">
        {grid.map((rowSlots, rowIndex) => (
          <div className="board-fixed-row" key={`wof-row-${rowIndex}`}>
            {rowSlots.map((slot, colIndex) => {
              if (slot.kind === 'green') {
                return (
                  <div
                    key={`g-${rowIndex}-${colIndex}`}
                    className="tile-wof tile-wof-green"
                    aria-hidden
                  >
                    <WofGreenLogo />
                  </div>
                )
              }

              const answerIndex = slot.answerIndex
              const original = answer[answerIndex]
              const isLetterCell = /[A-Z]/.test(original)
              const displayLetter = revealed[answerIndex]
              const isHiddenLetter = isLetterCell && displayLetter === ''

              return (
                <div
                  key={`p-${answerIndex}`}
                  className={[
                    'tile-wof',
                    'tile-wof-puzzle',
                    isLetterCell
                      ? isHiddenLetter
                        ? 'tile-wof-puzzle-hidden'
                        : 'tile-wof-puzzle-revealed'
                      : 'tile-wof-punct',
                  ].join(' ')}
                  aria-label={
                    isLetterCell
                      ? isHiddenLetter
                        ? 'Hidden letter'
                        : `Letter ${displayLetter}`
                      : `Symbol ${original}`
                  }
                >
                  {isLetterCell ? displayLetter : original}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}
