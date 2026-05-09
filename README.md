# Wheel of Fortune (browser game)

A Wheel of Fortune–style party game built with **React**, **TypeScript**, and **Vite**. Players take turns spinning a wheel, guessing letters on a puzzle board, and trying to solve phrases across multiple rounds. A separate **Final Puzzle** mode mirrors the show’s bonus round flow.

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Use **`npm run build`** for a production build and **`npm run preview`** to serve the build locally.

## Main game — how to play

1. **Setup** — From the main menu, choose **Play game**, enter **1–5** player names, and start. Puzzles are loaded from `public/data/puzzles.json`.
2. **Turn flow**
   - **Spin the wheel** — Opens a modal with a randomized spin. You can land on **cash** amounts, **Bankrupt** (lose your **round** total and your turn), or **Lose a turn** (turn passes; round money is unchanged).
   - **After a cash spin** — The spin sets a **per-letter dollar value**. You may only pick **consonants** until that value is used: a correct consonant pays **value × number of times** that letter appears on the board, then the spin is “used up.”
   - **Vowels** — Buying a vowel costs **$250** from your **current round** score. You can buy vowels when you are **not** waiting to use a cash spin (for example, at the start of your turn before spinning). If the vowel appears, you keep your turn and can spin or buy again.
   - **Solve** — Type the full phrase. A **correct** solve **banks** your **round** earnings into your **game total** and ends the round. A wrong solve clears any pending spin and passes the turn.
   - **Misses** — A consonant that is **not** in the puzzle (after a cash spin) uses that spin and **passes** the turn. A vowel that is **not** in the puzzle still costs **$250** and **passes** the turn.
3. **Rounds & winner** — Play continues through the configured rounds. **Round** scores reset each round; **Game** totals accumulate only from rounds you **solve**. When the game ends, the app shows **final standings** and declares the winner (ties are called out if multiple players share the top total).

## Final puzzle mode

From the main menu, open **Final puzzle**. The puzzle is read from `public/data/final-puzzle.json`.

- Letters that match **R, S, T, L, N, E** appear as **blue tiles**; **click each tile** to reveal it.
- Pick **three consonants** and **one vowel**, then confirm. Those letters also appear as **blue tiles** and must be **clicked** to reveal.
- You get **one** solve attempt on the full phrase. Edit the JSON file to change category, answer, or notes.

## Save and continue

During an active round, **Save & menu** writes progress to `public/data/saved-game.json` (players, **game** totals, current player, round number). The **current round’s puzzle** restarts fresh when you resume (letters and round scores for that round reset), but **cumulative** scores and position in the match are restored.

On the main menu, **Continue saved game** appears when a valid save exists.

> **Note:** Saving uses a small **dev-server API** in `vite.config.ts` so the app can read/write JSON under `public/data/`. That wiring is intended for local play; a static deployment would need another persistence strategy.

## Sound

Effects use **[react-sounds](https://www.npmjs.com/package/react-sounds)** (with Howler under the hood) for events such as letter reveals, buzzes, and successful solves. Optional paths/IDs can be configured in `public/data/sound-settings.json`.

## Custom content

| File | Purpose |
|------|---------|
| `public/data/puzzles.json` | Main-game puzzle list |
| `public/data/categories.json` | Category labels (if used by your puzzle set) |
| `public/data/final-puzzle.json` | Single puzzle for Final Puzzle mode |
| `public/data/sound-settings.json` | Sound customization |
| `public/data/saved-game.json` | Autosave slot (updated by the app) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Typecheck and production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

## Tech stack

React 19, TypeScript, Vite 8, `react-sounds`, and `howler`.
