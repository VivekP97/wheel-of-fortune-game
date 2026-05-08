import { useEffect, useMemo, useState } from 'react'
import './App.css'
import GamePanel from './components/GamePanel'
import LetterKeyboard from './components/LetterKeyboard'
import ManageGameView from './components/ManageGameView'
import PuzzleBoard from './components/PuzzleBoard'
import RoundSummary from './components/RoundSummary'
import { loadPuzzles } from './data/loadPuzzles'
import {
  DEFAULT_ROUNDS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  attemptSolve,
  buyVowel,
  createGame,
  finishRoundWithoutSolve,
  goToNextRound,
  guessConsonant,
  passTurn,
} from './game/engine'
import { getLatestRoundResult } from './game/round'
import type { GameState, Player, Puzzle } from './types/game'

function App() {
  const [activeView, setActiveView] = useState<'play' | 'manage'>('play')
  const [puzzles, setPuzzles] = useState<Puzzle[]>([])
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [loadError, setLoadError] = useState('')
  const [playerCount, setPlayerCount] = useState(2)
  const [roundCount, setRoundCount] = useState(DEFAULT_ROUNDS)
  const [playerNames, setPlayerNames] = useState<string[]>([
    'Player 1',
    'Player 2',
    'Player 3',
    'Player 4',
  ])
  const [solveInput, setSolveInput] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const loaded = await loadPuzzles()
        setPuzzles(loaded)
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : 'Unknown puzzle loading error.',
        )
      }
    })()
  }, [])

  const activeRound = gameState?.activeRound ?? null

  const startGame = () => {
    if (puzzles.length === 0) {
      return
    }

    const trimmedPlayerNames = playerNames
      .slice(0, playerCount)
      .map((name, index) => name.trim() || `Player ${index + 1}`)

    const players: Player[] = trimmedPlayerNames.map((name, index) => ({
      id: `player-${index + 1}`,
      name,
    }))

    try {
      const nextState = createGame(puzzles, {
        players,
        maxRounds: roundCount,
      })
      setGameState(nextState)
      setSolveInput('')
      setLoadError('')
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not start game.')
    }
  }

  const submitConsonant = (letter: string) => {
    if (!gameState) {
      return
    }
    const [next] = guessConsonant(gameState, letter)
    setGameState(next)
  }

  const submitVowel = (letter: string) => {
    if (!gameState) {
      return
    }
    const [next] = buyVowel(gameState, letter)
    setGameState(next)
  }

  const submitSolve = () => {
    if (!gameState) {
      return
    }
    const [next] = attemptSolve(gameState, solveInput)
    setSolveInput('')
    setGameState(next)
  }

  const latestRound = useMemo(
    () => (gameState ? getLatestRoundResult(gameState) : null),
    [gameState],
  )

  return (
    <main className="app-shell">
      <aside className="sidebar panel">
        <h2>Menu</h2>
        <button
          type="button"
          className={activeView === 'play' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveView('play')}
        >
          Play Game
        </button>
        <button
          type="button"
          className={activeView === 'manage' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveView('manage')}
        >
          Manage Game
        </button>
      </aside>

      <section className="main-view">
        <header>
          <h1>Wheel of Fortune Puzzle Board</h1>
          <p>
            Local multiplayer helper app with custom puzzles from
            <code> public/data/puzzles.json</code>
          </p>
        </header>

        {loadError && <p className="error-banner">{loadError}</p>}

        {activeView === 'manage' && (
          <ManageGameView
            puzzles={puzzles}
            onPuzzlesSaved={(saved) => {
              setPuzzles(saved)
              setGameState(null)
              setLoadError('')
            }}
          />
        )}

        {activeView === 'play' && !gameState && (
          <section className="panel setup">
            <h2>Game Setup</h2>
            <label>
              Number of players (1-4)
              <input
                type="number"
                min={MIN_PLAYERS}
                max={MAX_PLAYERS}
                value={playerCount}
                onChange={(event) => {
                  const value = Number(event.target.value)
                  setPlayerCount(Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, value)))
                }}
              />
            </label>
            <label>
              Number of rounds
              <input
                type="number"
                min={1}
                max={puzzles.length || 1}
                value={roundCount}
                onChange={(event) => {
                  const value = Number(event.target.value)
                  setRoundCount(Math.max(1, value))
                }}
              />
            </label>

            <div className="name-grid">
              {playerNames.slice(0, playerCount).map((name, index) => (
                <label key={`player-name-${index}`}>
                  Player {index + 1} Name
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => {
                      const next = [...playerNames]
                      next[index] = event.target.value
                      setPlayerNames(next)
                    }}
                  />
                </label>
              ))}
            </div>

            <button type="button" onClick={startGame} disabled={puzzles.length === 0}>
              Start Game
            </button>
            <p className="muted">Loaded puzzles: {puzzles.length}</p>
          </section>
        )}

        {activeView === 'play' && gameState && activeRound && gameState.phase === 'inRound' && (
          <section className="game-layout">
            <PuzzleBoard
              answer={activeRound.puzzle.answer}
              guessedLetters={activeRound.guessedLetters}
              category={activeRound.puzzle.category}
            />
            <GamePanel
              players={gameState.config.players}
              currentPlayerIndex={activeRound.currentPlayerIndex}
              roundNumber={gameState.currentRoundNumber}
              maxRounds={gameState.config.maxRounds}
              message={activeRound.lastActionMessage}
              solveAttempt={solveInput}
              onSolveAttemptChange={setSolveInput}
              onSubmitSolve={submitSolve}
              onPassTurn={() => setGameState(passTurn(gameState))}
              onFinishRoundWithoutSolve={() =>
                setGameState(finishRoundWithoutSolve(gameState))
              }
            />
            <LetterKeyboard
              guessedLetters={activeRound.guessedLetters}
              onPickConsonant={submitConsonant}
              onPickVowel={submitVowel}
            />
          </section>
        )}

        {activeView === 'play' && gameState?.phase === 'roundComplete' && latestRound && (
          <RoundSummary
            result={latestRound}
            players={gameState.config.players}
            canAdvance={gameState.currentRoundNumber < gameState.config.maxRounds}
            onAdvance={() => setGameState(goToNextRound(gameState))}
          />
        )}

        {activeView === 'play' && gameState?.phase === 'gameComplete' && (
          <section className="panel summary">
            <h2>Game Complete</h2>
            <p>All rounds are complete.</p>
            <ul className="result-list">
              {gameState.roundResults.map((result) => {
                const winner = gameState.config.players.find(
                  (player) => player.id === result.winnerPlayerId,
                )
                return (
                  <li key={`round-result-${result.roundNumber}`}>
                    Round {result.roundNumber}: {winner ? winner.name : 'No winner'}
                  </li>
                )
              })}
            </ul>
            <button type="button" onClick={() => setGameState(null)}>
              Start New Game
            </button>
          </section>
        )}
      </section>
    </main>
  )
}

export default App
