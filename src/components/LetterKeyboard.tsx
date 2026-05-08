const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U'])

interface LetterKeyboardProps {
  guessedLetters: string[]
  onPickConsonant: (letter: string) => void
  onPickVowel: (letter: string) => void
}

export default function LetterKeyboard({
  guessedLetters,
  onPickConsonant,
  onPickVowel,
}: LetterKeyboardProps) {
  return (
    <section className="panel">
      <h2>Letter Bank</h2>
      <div className="keyboard">
        {ALPHABET.map((letter) => {
          const guessed = guessedLetters.includes(letter)
          const isVowel = VOWELS.has(letter)
          const kind = isVowel ? 'vowel' : 'consonant'

          return (
            <button
              key={letter}
              type="button"
              className={`letter-btn ${kind}`}
              disabled={guessed}
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
