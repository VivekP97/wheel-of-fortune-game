import { revealCharacters } from '../game/engine'

interface PuzzleBoardProps {
  answer: string
  guessedLetters: string[]
  category: string
}

export default function PuzzleBoard({
  answer,
  guessedLetters,
  category,
}: PuzzleBoardProps) {
  const cells = revealCharacters(answer, guessedLetters)

  return (
    <section className="panel">
      <h2>Puzzle Board</h2>
      <p className="category">Category: {category}</p>
      <div className="board" aria-label="Puzzle board">
        {cells.map((char, index) => {
          const original = answer[index]
          const isLetterCell = /[A-Z]/.test(original)
          const display = char || (isLetterCell ? '' : original)

          return (
            <div
              key={`${original}-${index}`}
              className={`tile ${isLetterCell ? 'letter' : 'symbol'}`}
            >
              {display}
            </div>
          )
        })}
      </div>
    </section>
  )
}
