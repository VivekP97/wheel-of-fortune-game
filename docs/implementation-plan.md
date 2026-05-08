# Implementation Plan

## Stack
- Vite + React + TypeScript frontend
- Client-side game engine logic (pure functions in `src/game/engine.ts`)
- JSON puzzle data loaded from `public/data/puzzles.json`

## Module Responsibilities
- `src/types/game.ts`
  - Shared types for puzzles, players, round outcomes, and game state.
- `src/data/loadPuzzles.ts`
  - Fetch and validate JSON puzzle data.
- `src/game/engine.ts`
  - Gameplay transitions:
    - game creation,
    - consonant guess,
    - vowel purchase action,
    - solve attempt,
    - pass turn,
    - round end and next round.
- `src/game/round.ts`
  - Round helper selectors/utilities.
- `src/components/PuzzleBoard.tsx`
  - Revealed/hidden board rendering.
- `src/components/LetterKeyboard.tsx`
  - A-Z letter controls with guessed-letter disabling.
- `src/components/GamePanel.tsx`
  - Turn, player, and round controls.
- `src/components/RoundSummary.tsx`
  - Post-round summary and next-step action.
- `src/App.tsx`
  - Setup flow and state orchestration.

## Implementation Phases
1. Scaffold React + TS app.
2. Add puzzle data model and loader.
3. Implement game engine with 1-4 player turn flow.
4. Build board and action components.
5. Wire multi-round state transitions.
6. Add project docs and progress tracking.

## Validation Strategy
- Compile/build check via `npm run build`.
- Manual browser test coverage:
  - Setup with 1, 2, 3, and 4 players.
  - Consonant guess reveal behavior.
  - Buy-vowel action behavior.
  - Incorrect/correct solve handling.
  - Round progression and game completion summary.
  - Puzzle customization by editing JSON file.

## Future Enhancements
- Optional score tracking module (kept off by default).
- Wheel outcome input mode (host enters spin result).
- More puzzle files with in-app file selector.
