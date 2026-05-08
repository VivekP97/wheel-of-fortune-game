# Wheel of Fortune Puzzle Board Spec

## Purpose
Create a local web app that supports Wheel of Fortune puzzle play without implementing the spinning wheel. The app handles board reveal logic, turn flow, and letter actions while score and wheel outcomes are managed outside the app.

## Core Requirements
- React + Vite + TypeScript web app runnable locally.
- Puzzle data loaded from JSON files in this project.
- Support 1 to 4 players.
- Multi-round game flow.
- Separate action for buying vowels.
- No in-app score or currency tracking.

## Gameplay Rules (This Version)
- At game start, users configure:
  - player count (1-4),
  - player names,
  - number of rounds.
- Round begins with one puzzle.
- Non-letter characters (spaces/punctuation) are visible immediately.
- Letter actions:
  - **Guess consonant**: reveals matching consonants if present; if none, turn passes.
  - **Buy vowel**: separate action path; reveals matching vowels if present; if none, turn passes.
  - **Solve puzzle**: player enters full answer.
    - Correct solve ends the round and records winner.
    - Incorrect solve passes the turn.
  - **Pass turn**: manually moves to next player.
- Round can also be ended without a solve (manual host control).
- After configured rounds complete, game ends and shows per-round results.

## Out of Scope
- Wheel spin simulation or wedges.
- In-app point calculations.
- Persistent player histories.
- Server/database storage.

## Puzzle JSON Format
File path: `public/data/puzzles.json`

Schema:
- `puzzles` (array)
  - `id` (string, unique, required)
  - `category` (string, required)
  - `answer` (string, required)
  - `notes` (string, optional)

Example:
```json
{
  "puzzles": [
    {
      "id": "puzzle-001",
      "category": "Phrase",
      "answer": "HELLO WORLD"
    }
  ]
}
```

## Category list (Manage Game)
File path: `public/data/categories.json`

Used to populate the **Category** dropdown when editing puzzles. Edit this file to add, remove, or reorder category options.

Schema:
- `categories` (array of non-empty strings, unique ignoring case)

Example:
```json
{
  "categories": ["Phrase", "Thing", "Place", "Title"]
}
```

If a puzzle already uses a category string that is not in this file, that value still appears in the dropdown so you can keep or change it.

## Local Run
1. `npm install`
2. `npm run dev`
3. Open the local Vite URL in browser.

To customize puzzles, use **Manage Game** in the app or edit `public/data/puzzles.json`. To customize category choices, edit `public/data/categories.json` and refresh the app.
