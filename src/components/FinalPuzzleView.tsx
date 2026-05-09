import { useEffect, useMemo, useState } from 'react'
import PuzzleBoard from './PuzzleBoard'
import SolveOutcomeBanner from './SolveOutcomeBanner'
import { isConsonant, isVowel } from '../game/engine'
import {
  FINAL_ROUND_GIVEN_LETTERS,
  FINAL_ROUND_GIVEN_SET,
  allDistinctLettersInAnswer,
  allLetterIndicesInAnswer,
  countBonusPicks,
  indicesForBonusLettersPending,
  indicesWhereAnswerHasLettersFromSet,
  isFinalRoundSolveCorrect,
} from '../game/finalRound'
import type { Puzzle } from '../types/game'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

interface FinalPuzzleViewProps {
  puzzle: Puzzle
  /** Menu mode: toolbar + wide layout. Immersive: stacked board / panels / letters (use inside `game-play-root`). */
  layout?: 'menu' | 'immersive'
  onExit: () => void
  isSoundMuted: boolean
  onToggleMute: () => void
  playSuccessTone: () => void
  playFailureTone: () => void
  playRevealTone: () => void
}

type FinalPhase = 'picking' | 'solving' | 'won' | 'lost'

export default function FinalPuzzleView({
  puzzle,
  layout = 'menu',
  onExit,
  isSoundMuted,
  onToggleMute,
  playSuccessTone,
  playFailureTone,
  playRevealTone,
}: FinalPuzzleViewProps) {
  const [phase, setPhase] = useState<FinalPhase>('picking')
  const [bonusPicks, setBonusPicks] = useState<string[]>([])
  const [solveInput, setSolveInput] = useState('')
  const [solveBanner, setSolveBanner] = useState<{
    variant: 'success' | 'error'
    message: string
  } | null>(null)
  const [pendingRevealIndices, setPendingRevealIndices] = useState<number[]>(() =>
    indicesWhereAnswerHasLettersFromSet(puzzle.answer, FINAL_ROUND_GIVEN_SET),
  )
  const [revealedTileIndices, setRevealedTileIndices] = useState<number[]>([])

  useEffect(() => {
    setPhase('picking')
    setBonusPicks([])
    setSolveInput('')
    setSolveBanner(null)
    setPendingRevealIndices(
      indicesWhereAnswerHasLettersFromSet(puzzle.answer, FINAL_ROUND_GIVEN_SET),
    )
    setRevealedTileIndices([])
  }, [puzzle.id, puzzle.answer])

  const { consonants: pickConsonants, vowels: pickVowels } = useMemo(
    () => countBonusPicks(bonusPicks),
    [bonusPicks],
  )

  const canConfirmPicks =
    pickConsonants === 3 && pickVowels === 1 && pendingRevealIndices.length === 0

  const guessedLettersForBoard = useMemo(() => {
    if (phase === 'picking') {
      return [...FINAL_ROUND_GIVEN_LETTERS]
    }
    if (phase === 'won') {
      return allDistinctLettersInAnswer(puzzle.answer)
    }
    const merged = [...FINAL_ROUND_GIVEN_LETTERS, ...bonusPicks]
    return Array.from(new Set(merged))
  }, [phase, puzzle.answer, bonusPicks])

  const toggleBonusPick = (letter: string) => {
    if (FINAL_ROUND_GIVEN_SET.has(letter)) {
      return
    }

    setBonusPicks((current) => {
      if (current.includes(letter)) {
        return current.filter((l) => l !== letter)
      }

      const { consonants, vowels } = countBonusPicks(current)
      if (isConsonant(letter) && consonants >= 3) {
        return current
      }
      if (isVowel(letter) && vowels >= 1) {
        return current
      }
      return [...current, letter]
    })
  }

  const confirmBonusPicks = () => {
    if (!canConfirmPicks) {
      return
    }
    const revealedSet = new Set(revealedTileIndices)
    setPendingRevealIndices(
      indicesForBonusLettersPending(puzzle.answer, bonusPicks, revealedSet),
    )
    setPhase('solving')
    setSolveBanner(null)
  }

  const submitSolve = () => {
    if (phase !== 'solving') {
      return
    }
    if (!isFinalRoundSolveCorrect(solveInput, puzzle.answer)) {
      playFailureTone()
      setPhase('lost')
      setSolveBanner({
        variant: 'error',
        message: 'Incorrect. That was your only solve attempt (TV final round rules).',
      })
      return
    }
    playSuccessTone()
    setPhase('won')
    setSolveBanner({
      variant: 'success',
      message: 'You solved the final puzzle!',
    })
  }

  const resetRound = () => {
    setPhase('picking')
    setBonusPicks([])
    setSolveInput('')
    setSolveBanner(null)
    setPendingRevealIndices(
      indicesWhereAnswerHasLettersFromSet(puzzle.answer, FINAL_ROUND_GIVEN_SET),
    )
    setRevealedTileIndices([])
  }

  const onRevealTile = (tileIndex: number) => {
    if (!pendingRevealIndices.includes(tileIndex)) {
      return
    }
    setPendingRevealIndices((current) => current.filter((i) => i !== tileIndex))
    setRevealedTileIndices((current) =>
      current.includes(tileIndex) ? current : [...current, tileIndex],
    )
    playRevealTone()
  }

  const letterButtonClass = (letter: string): string => {
    const parts = ['letter-btn']
    if (FINAL_ROUND_GIVEN_SET.has(letter)) {
      parts.push('letter-btn--final-given')
      return parts.join(' ')
    }
    if (isVowel(letter)) {
      parts.push('vowel')
    } else {
      parts.push('consonant')
    }
    if (bonusPicks.includes(letter)) {
      parts.push('letter-btn--final-picked')
    }
    return parts.join(' ')
  }

  const isPickDisabled = (letter: string): boolean => {
    if (FINAL_ROUND_GIVEN_SET.has(letter)) {
      return true
    }
    if (bonusPicks.includes(letter)) {
      return false
    }
    const { consonants, vowels } = countBonusPicks(bonusPicks)
    if (isConsonant(letter) && consonants >= 3) {
      return true
    }
    if (isVowel(letter) && vowels >= 1) {
      return true
    }
    return false
  }

  const banner = (
    <div
      className={
        layout === 'immersive'
          ? 'final-puzzle-banner final-puzzle-banner--immersive'
          : 'final-puzzle-banner'
      }
    >
      <h2 className="final-puzzle-title">Final Puzzle</h2>
      <p className="final-puzzle-rules">
        Click each <strong>blue</strong> tile to reveal letters from <strong>R S T L N E</strong>.
        Then choose <strong>three consonants</strong> and <strong>one vowel</strong>; after you
        confirm, new matches appear as blue tiles to click. You get <strong>one</strong> solve
        attempt.
      </p>
      {phase === 'picking' && (
        <p className="final-puzzle-progress" aria-live="polite">
          Reveal all R S T L N E tiles, then bonus picks: {pickConsonants}/3 consonants ·{' '}
          {pickVowels}/1 vowel
        </p>
      )}
      {phase === 'solving' && pendingRevealIndices.length > 0 && (
        <p className="final-puzzle-progress" aria-live="polite">
          Click the blue tiles to reveal your bonus letters.
        </p>
      )}
    </div>
  )

  const letterBankPanel =
    phase === 'picking' ? (
      <section className="panel final-puzzle-picker">
        <h2 className="final-puzzle-letter-bank-heading">Letter Bank</h2>
        <p className="muted">
          Tap a letter to select or deselect. Open every R S T L N E tile on the board before
          confirming bonus letters.
        </p>
        <div className="keyboard final-puzzle-keyboard">
          {ALPHABET.map((letter) => (
            <button
              key={letter}
              type="button"
              className={letterButtonClass(letter)}
              disabled={isPickDisabled(letter)}
              onClick={() => toggleBonusPick(letter)}
            >
              {letter}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="final-puzzle-confirm"
          disabled={!canConfirmPicks}
          onClick={confirmBonusPicks}
        >
          Reveal bonus letters
        </button>
      </section>
    ) : null

  const solvePanel =
    phase === 'solving' || phase === 'lost' ? (
      <section className="panel final-puzzle-solve">
        <h2 className="final-puzzle-solve-heading">Solve</h2>
        {phase === 'solving' ? (
          <>
            <input
              type="text"
              value={solveInput}
              onChange={(e) => setSolveInput(e.target.value)}
              placeholder="Full puzzle answer"
              aria-label="Final puzzle solve attempt"
              className="final-puzzle-solve-input"
            />
            <button type="button" onClick={submitSolve}>
              Submit solve
            </button>
          </>
        ) : (
          <p className="final-puzzle-answer-reveal">
            Answer: <strong>{puzzle.answer}</strong>
          </p>
        )}
      </section>
    ) : null

  const resultPanel =
    phase === 'won' ? (
      <section className="panel final-puzzle-solve">
        <h2 className="final-puzzle-solve-heading">Result</h2>
        <p className="final-puzzle-win-msg">Congratulations — puzzle solved!</p>
      </section>
    ) : null

  const againButton =
    phase === 'won' || phase === 'lost' ? (
      <button type="button" className="btn-grey final-puzzle-again" onClick={resetRound}>
        Play this final puzzle again
      </button>
    ) : null

  const outcomeBanner = solveBanner ? (
    <SolveOutcomeBanner
      variant={solveBanner.variant}
      message={solveBanner.message}
      onDismiss={() => setSolveBanner(null)}
    />
  ) : null

  const boardPending = phase === 'won' ? [] : pendingRevealIndices
  const boardRevealed =
    phase === 'won' ? allLetterIndicesInAnswer(puzzle.answer) : revealedTileIndices

  const board = (
    <PuzzleBoard
      answer={puzzle.answer}
      guessedLetters={guessedLettersForBoard}
      category={puzzle.category}
      pendingRevealIndices={boardPending}
      revealedTileIndices={boardRevealed}
      onRevealTile={onRevealTile}
    />
  )

  const immersiveMid =
    solvePanel || resultPanel || againButton || outcomeBanner ? (
      <div className="final-puzzle-immersive-mid">
        {solvePanel}
        {resultPanel}
        {againButton}
        {outcomeBanner}
      </div>
    ) : null

  if (layout === 'immersive') {
    return (
      <div className="final-puzzle-immersive" role="application" aria-label="Final puzzle round">
        {banner}
        <section className="game-layout game-layout--immersive">
          {board}
          {immersiveMid}
          {letterBankPanel}
        </section>
      </div>
    )
  }

  return (
    <div className="final-puzzle-root" role="application" aria-label="Final puzzle round">
      <div className="final-puzzle-toolbar">
        <button type="button" className="exit-game-btn" onClick={onExit}>
          Back to menu
        </button>
        <button
          type="button"
          className="mute-sound-btn"
          onClick={onToggleMute}
          aria-pressed={isSoundMuted}
        >
          {isSoundMuted ? 'Unmute sounds' : 'Mute sounds'}
        </button>
      </div>

      {banner}

      <section className="final-puzzle-layout">
        {board}

        <div className="final-puzzle-side">
          {letterBankPanel}
          {solvePanel}
          {resultPanel}
          {againButton}
          {outcomeBanner}
        </div>
      </section>
    </div>
  )
}
