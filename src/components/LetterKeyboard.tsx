import { VOWEL_PRICE } from '../game/engine'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U'])

export type LetterPickMode = 'vowelsOnly' | 'consonantsOnly'

interface LetterKeyboardProps {
  guessedLetters: string[]
  disabled?: boolean
  /** After a cash spin: consonants only; otherwise vowels only (buy) until next spin. */
  letterPickMode: LetterPickMode
  /** For vowel picks: player must have enough round cash. */
  canAffordVowel: boolean
  onPickConsonant: (letter: string) => void
  onPickVowel: (letter: string) => void
}

export default function LetterKeyboard({
  guessedLetters,
  disabled = false,
  letterPickMode,
  canAffordVowel,
  onPickConsonant,
  onPickVowel,
}: LetterKeyboardProps) {
  return (
    <section className="panel">
      <h2>Letter Bank</h2>
      {letterPickMode === 'consonantsOnly' ? (
        <p className="keyboard-mode-hint muted">Use your spin — choose a consonant.</p>
      ) : (
        <p className="keyboard-mode-hint muted">
          Buy a vowel (${VOWEL_PRICE.toLocaleString()}) or spin the wheel for consonants.
        </p>
      )}
      <div className="keyboard">
        {ALPHABET.map((letter) => {
          const guessed = guessedLetters.includes(letter)
          const isVowel = VOWELS.has(letter)
          const kind = isVowel ? 'vowel' : 'consonant'

          const blockedByMode =
            letterPickMode === 'vowelsOnly'
              ? !isVowel
              : isVowel

          const blockedByFunds =
            letterPickMode === 'vowelsOnly' && isVowel && !canAffordVowel && !guessed

          const isDisabled =
            disabled || guessed || blockedByMode || blockedByFunds

          const affordTitle =
            blockedByFunds && !guessed
              ? `Need $${VOWEL_PRICE.toLocaleString()} this round to buy a vowel`
              : undefined

          return (
            <button
              key={letter}
              type="button"
              className={`letter-btn ${kind}`}
              disabled={isDisabled}
              title={affordTitle}
              onClick={() =>
                isVowel ? onPickVowel(letter) : onPickConsonant(letter)
              }
            >
              {letter}
            </button>
          )
        })}
      </div>
    </section>
  )
}
