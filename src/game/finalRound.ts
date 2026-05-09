import { isConsonant, isVowel } from './engine'

/** Letters revealed for free before bonus picks (TV final round). */
export const FINAL_ROUND_GIVEN_LETTERS = ['R', 'S', 'T', 'L', 'N', 'E'] as const

export const FINAL_ROUND_GIVEN_SET = new Set<string>(FINAL_ROUND_GIVEN_LETTERS)

const normalizeAnswer = (value: string): string =>
  value.trim().toUpperCase().replace(/\s+/g, ' ')

export const isFinalRoundSolveCorrect = (proposal: string, answer: string): boolean => {
  const p = normalizeAnswer(proposal)
  const a = normalizeAnswer(answer)
  return p.length > 0 && p === a
}

export const allLetterIndicesInAnswer = (answer: string): number[] => {
  const out: number[] = []
  for (let i = 0; i < answer.length; i++) {
    if (/[A-Z]/.test(answer[i])) {
      out.push(i)
    }
  }
  return out
}

export const allDistinctLettersInAnswer = (answer: string): string[] =>
  Array.from(
    new Set(
      answer
        .split('')
        .filter((c) => /[A-Z]/.test(c)),
    ),
  ).sort()

/** Indices of letter tiles whose letters appear in `letters` (e.g. R S T L N E). */
export const indicesWhereAnswerHasLettersFromSet = (
  answer: string,
  letters: ReadonlySet<string>,
): number[] => {
  const out: number[] = []
  for (let i = 0; i < answer.length; i++) {
    const c = answer[i]
    if (/[A-Z]/.test(c) && letters.has(c)) {
      out.push(i)
    }
  }
  return out
}

/** Bonus-letter tiles not yet clicked open (excludes positions already revealed from R S T L N E). */
export const indicesForBonusLettersPending = (
  answer: string,
  bonusPicks: readonly string[],
  alreadyRevealed: ReadonlySet<number>,
): number[] => {
  const bonus = new Set(bonusPicks.map((l) => l.toUpperCase()))
  const out: number[] = []
  for (let i = 0; i < answer.length; i++) {
    const c = answer[i]
    if (/[A-Z]/.test(c) && bonus.has(c) && !alreadyRevealed.has(i)) {
      out.push(i)
    }
  }
  return out
}

export const countBonusPicks = (picks: readonly string[]): {
  consonants: number
  vowels: number
} => {
  let consonants = 0
  let vowels = 0
  for (const letter of picks) {
    if (isConsonant(letter)) {
      consonants += 1
    } else if (isVowel(letter)) {
      vowels += 1
    }
  }
  return { consonants, vowels }
}
