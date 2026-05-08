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
  const [playerCount, setPlayerCount] = useState(3)
  const [roundCount, setRoundCount] = useState(DEFAULT_ROUNDS)
  const [playerNames, setPlayerNames] = useState<string[]>([
    'Player 1',
    'Player 2',
    'Player 3',
    'Player 4',
  ])
  const [solveInput, setSolveInput] = useState('')
  const [solveBanner, setSolveBanner] = useState<{
    variant: 'success' | 'error'
    message: string
  } | null>(null)
  const [pendingRevealIndices, setPendingRevealIndices] = useState<number[]>([])
  const [revealedTileIndices, setRevealedTileIndices] = useState<number[]>([])

  useEffect(() => {
    void (async () => {
      try {
        const loaded = await loadPuzzles()
        setPuzzles(loaded)
        setRoundCount(Math.max(1, loaded.length))
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : 'Unknown puzzle loading error.',
        )
      }
    })()
  }, [])

  const activeRound = gameState?.activeRound ?? null
  const hasPendingReveals = pendingRevealIndices.length > 0

  const clearRevealState = () => {
    setPendingRevealIndices([])
    setRevealedTileIndices([])
  }

  const collectMatchingLetterIndices = (answer: string, letter: string): number[] => {
    const hits: number[] = []
    const normalized = letter.toUpperCase()
    for (let i = 0; i < answer.length; i++) {
      if (answer[i] === normalized) {
        hits.push(i)
      }
    }
    return hits
  }

  const collectAllLetterIndices = (answer: string): number[] => {
    const hits: number[] = []
    for (let i = 0; i < answer.length; i++) {
      if (/[A-Z]/.test(answer[i])) {
        hits.push(i)
      }
    }
    return hits
  }

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
      setSolveBanner(null)
      clearRevealState()
      setLoadError('')
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not start game.')
    }
  }

  const submitConsonant = (letter: string) => {
    if (!gameState || hasPendingReveals) {
      return
    }
    const [next] = guessConsonant(gameState, letter)
    const answer = next.activeRound?.puzzle.answer ?? ''
    const hits = collectMatchingLetterIndices(answer, letter).filter(
      (index) =>
        !pendingRevealIndices.includes(index) && !revealedTileIndices.includes(index),
    )
    if (hits.length > 0) {
      setPendingRevealIndices((current) => [...current, ...hits])
    }
    setGameState(next)
  }

  const submitVowel = (letter: string) => {
    if (!gameState || hasPendingReveals) {
      return
    }
    const [next] = buyVowel(gameState, letter)
    const answer = next.activeRound?.puzzle.answer ?? ''
    const hits = collectMatchingLetterIndices(answer, letter).filter(
      (index) =>
        !pendingRevealIndices.includes(index) && !revealedTileIndices.includes(index),
    )
    if (hits.length > 0) {
      setPendingRevealIndices((current) => [...current, ...hits])
    }
    setGameState(next)
  }

  const submitSolve = () => {
    if (!gameState) {
      return
    }
    if (hasPendingReveals) {
      setSolveBanner({
        variant: 'error',
        message: 'Reveal all blue tiles before continuing.',
      })
      return
    }
    const [next, outcome] = attemptSolve(gameState, solveInput)
    setSolveInput('')
    setGameState(next)
    if (next.phase === 'roundSolvedAwaitingAdvance' && outcome.success) {
      const answer = next.activeRound?.puzzle.answer ?? ''
      setPendingRevealIndices([])
      setRevealedTileIndices(collectAllLetterIndices(answer))
      setSolveBanner({ variant: 'success', message: outcome.message })
    } else if (!outcome.success) {
      setSolveBanner({ variant: 'error', message: outcome.message })
    }
  }

  const latestRound = useMemo(
    () => (gameState ? getLatestRoundResult(gameState) : null),
    [gameState],
  )

  const exitGame = () => {
    setGameState(null)
    setSolveInput('')
    setSolveBanner(null)
    clearRevealState()
  }

  const isImmersivePlaySession = activeView === 'play' && gameState !== null

  if (isImmersivePlaySession) {
    const showPlayBoard =
      gameState &&
      activeRound &&
      (gameState.phase === 'inRound' ||
        gameState.phase === 'roundSolvedAwaitingAdvance')
    const roundControlsLocked =
      gameState?.phase === 'roundSolvedAwaitingAdvance' || hasPendingReveals
    const letterInputLocked = gameState?.phase !== 'inRound' || hasPendingReveals

    return (
      <div
        className="game-play-root"
        role="application"
        aria-label="Wheel of Fortune puzzle game"
      >
        <button type="button" className="exit-game-btn" onClick={exitGame}>
          Exit game
        </button>
        {gameState?.phase === 'roundSolvedAwaitingAdvance' && (
          <button
            type="button"
            className="next-round-btn"
            onClick={() => {
              setSolveBanner(null)
              clearRevealState()
              setGameState(goToNextRound(gameState))
            }}
          >
            {gameState.currentRoundNumber < gameState.config.maxRounds
              ? 'Next round'
              : 'View results'}
          </button>
        )}
        <div className="game-play-inner">
          {showPlayBoard && (
            <section className="game-layout game-layout--immersive">
              <PuzzleBoard
                answer={activeRound.puzzle.answer}
                guessedLetters={activeRound.guessedLetters}
                category={activeRound.puzzle.category}
                pendingRevealIndices={pendingRevealIndices}
                revealedTileIndices={revealedTileIndices}
                onRevealTile={(tileIndex) => {
                  if (!pendingRevealIndices.includes(tileIndex)) {
                    return
                  }
                  setPendingRevealIndices((current) =>
                    current.filter((index) => index !== tileIndex),
                  )
                  setRevealedTileIndices((current) =>
                    current.includes(tileIndex) ? current : [...current, tileIndex],
                  )
                }}
              />
              <GamePanel
                players={gameState.config.players}
                currentPlayerIndex={activeRound.currentPlayerIndex}
                roundNumber={gameState.currentRoundNumber}
                maxRounds={gameState.config.maxRounds}
                message={activeRound.lastActionMessage}
                hideStatusMessage={solveBanner !== null}
                roundControlsLocked={roundControlsLocked}
                solveAttempt={solveInput}
                solveBanner={solveBanner}
                onDismissSolveBanner={() => setSolveBanner(null)}
                onSolveAttemptChange={setSolveInput}
                onSubmitSolve={submitSolve}
                onPassTurn={() => {
                  if (hasPendingReveals) {
                    return
                  }
                  setGameState(passTurn(gameState))
                }}
                onFinishRoundWithoutSolve={() => {
                  if (hasPendingReveals) {
                    return
                  }
                  setGameState(finishRoundWithoutSolve(gameState))
                }}
              />
              <LetterKeyboard
                guessedLetters={activeRound.guessedLetters}
                disabled={letterInputLocked}
                onPickConsonant={submitConsonant}
                onPickVowel={submitVowel}
              />
            </section>
          )}

          {gameState?.phase === 'roundComplete' && latestRound && (
            <RoundSummary
              result={latestRound}
              players={gameState.config.players}
              canAdvance={gameState.currentRoundNumber < gameState.config.maxRounds}
              onAdvance={() => {
                clearRevealState()
                setGameState(goToNextRound(gameState))
              }}
            />
          )}

          {gameState?.phase === 'gameComplete' && (
            <section className="panel summary game-complete-panel">
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
              <button type="button" onClick={exitGame}>
                Back to menu
              </button>
            </section>
          )}
        </div>
      </div>
    )
  }

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
      </section>
    </main>
  )
}

export default App
