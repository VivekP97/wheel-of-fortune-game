# Implementation Progress

Last updated: 2026-05-09

## Checklist

- [x] Scaffold React + Vite + TypeScript app
- [x] Define game and puzzle TypeScript models
- [x] Implement JSON puzzle loading and validation
- [x] Implement core game engine (turn flow, wheel spin effects, consonant/vowel rules, solve flow, round progression)
- [x] Round and game scoring (per-letter cash on consonants after a spin, $250 vowel buys, bank round total on correct solve; bankrupt / lose-a-turn behavior)
- [x] Add UI components (board, keyboard, wheel modal, controls, round summary, game-complete standings)
- [x] Support configurable **1–5** players and configurable round count (up to loaded puzzle count)
- [x] Keep buy vowel as a separate action from cash-spin consonants
- [x] Add `docs/spec.md`
- [x] Add `docs/implementation-plan.md`
- [x] Add and maintain `docs/progress.md`
- [x] Left sidebar navigation: **Play Game**, **Manage Game**, **Sounds**, **Final Puzzle**
- [x] UI puzzle editor (Manage Game) with persistence to `public/data/puzzles.json`
- [x] **Final puzzle** mode (`public/data/final-puzzle.json`) — RSTLNE reveal, extra letters, single solve attempt
- [x] **Save & continue** — `public/data/saved-game.json` via dev-server file API in `vite.config.ts`
- [x] Sound effects via **react-sounds** / Howler; **Sound Lab** UI and `public/data/sound-settings.json`
- [x] Supplementary data: `public/data/categories.json` (for category labels as needed)
- [ ] Add automated unit tests
- [ ] Polish responsive/mobile layout (some breakpoints exist; not fully tuned)

## Milestone Notes

- App runs on **React 19**, **TypeScript**, **Vite 8**; `npm run build` typechecks and bundles.
- Main match loads puzzles from `public/data/puzzles.json`; default round count follows puzzle list length until the host changes it on setup.
- **Play** flow: spin wheel (cash wedges, Bankrupt, Lose a Turn), guess consonants against the active spin value, buy vowels when not holding a pending cash spin, solve to bank round money into the game total, then advance rounds until completion and final standings (ties noted).
- **Manage Game** edits the puzzle list in the browser and saves back to `public/data/puzzles.json` (same dev file-write path as saves).
- **Final Puzzle** is a separate immersive/session view with click-to-reveal tiles and one solve attempt.
- **Sounds** view edits the sound profile; settings persist to `public/data/sound-settings.json`.
- Saving and JSON writes rely on a small **local dev API**; static hosting would need a different persistence approach (see README).
