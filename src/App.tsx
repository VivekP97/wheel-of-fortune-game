import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import GamePanel from './components/GamePanel'
import LetterKeyboard from './components/LetterKeyboard'
import FinalPuzzleView from './components/FinalPuzzleView'
import ManageGameView from './components/ManageGameView'
import PuzzleBoard from './components/PuzzleBoard'
import RoundSummary from './components/RoundSummary'
import SoundLabPanel from './components/SoundLabPanel'
import {
  DEFAULT_SOUND_PROFILE,
  GameSoundManager,
  type SoundCategory,
  type SoundProfile,
} from './audio/soundManager'
import { loadFinalPuzzle } from './data/loadFinalPuzzle'
import { loadSoundSettings, saveSoundSettings } from './data/soundSettings'
import { loadPuzzles } from './data/loadPuzzles'
import {
  gameStateToSavedPayload,
  loadSavedGameFile,
  saveSavedGameFile,
  savedPayloadToGameState,
} from './data/savedGame'
import {
  DEFAULT_ROUNDS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  applyWheelSpinEffect,
  attemptSolve,
  buyVowel,
  createGame,
  finishRoundWithoutSolve,
  getHighestCumulativeScoreIndices,
  goToNextRound,
  guessConsonant,
  passTurn,
  VOWEL_PRICE,
} from './game/engine'
import { wedgeToSpinEffect, type WheelWedge } from './game/fortuneWheel'
import { getLatestRoundResult } from './game/round'
import type { GameState, Player, Puzzle } from './types/game'

function App() {
  const [activeView, setActiveView] = useState<'play' | 'manage' | 'sounds' | 'final'>(
    'play',
  )
  const [puzzles, setPuzzles] = useState<Puzzle[]>([])
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [loadError, setLoadError] = useState('')
  const [finalPuzzle, setFinalPuzzle] = useState<Puzzle | null>(null)
  const [finalPuzzleError, setFinalPuzzleError] = useState('')
  const [finalPuzzleSessionActive, setFinalPuzzleSessionActive] = useState(false)
  const [playerCount, setPlayerCount] = useState(3)
  const [roundCount, setRoundCount] = useState(DEFAULT_ROUNDS)
  const [playerNames, setPlayerNames] = useState<string[]>([
    'Player 1',
    'Player 2',
    'Player 3',
    'Player 4',
    'Player 5',
  ])
  const [solveInput, setSolveInput] = useState('')
  const [solveBanner, setSolveBanner] = useState<{
    variant: 'success' | 'error'
    message: string
  } | null>(null)
  const [pendingRevealIndices, setPendingRevealIndices] = useState<number[]>([])
  const [revealedTileIndices, setRevealedTileIndices] = useState<number[]>([])
  const [isSoundMuted, setIsSoundMuted] = useState(false)
  const [soundProfile, setSoundProfile] = useState<SoundProfile>(DEFAULT_SOUND_PROFILE)
  const [soundSettingsLoaded, setSoundSettingsLoaded] = useState(false)
  const [savedGameSummary, setSavedGameSummary] = useState<{ savedAt: string } | null>(null)
  const [savedGameMenuError, setSavedGameMenuError] = useState('')
  const soundManagerRef = useRef<GameSoundManager | null>(null)

  const refreshSavedGameSlot = () => {
    void (async () => {
      try {
        const payload = await loadSavedGameFile()
        setSavedGameSummary(payload ? { savedAt: payload.savedAt } : null)
        setSavedGameMenuError('')
      } catch {
        setSavedGameSummary(null)
        setSavedGameMenuError('Could not read saved game file.')
      }
    })()
  }

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

  useEffect(() => {
    void (async () => {
      try {
        const loaded = await loadFinalPuzzle()
        setFinalPuzzle(loaded)
        setFinalPuzzleError('')
      } catch (error) {
        setFinalPuzzle(null)
        setFinalPuzzleError(
          error instanceof Error ? error.message : 'Could not load final puzzle.',
        )
      }
    })()
  }, [])

  useEffect(() => {
    if (activeView === 'play' && !gameState) {
      refreshSavedGameSlot()
    }
  }, [activeView, gameState])

  useEffect(() => {
    void (async () => {
      try {
        const loaded = await loadSoundSettings()
        setSoundProfile(loaded.soundProfile)
        setIsSoundMuted(loaded.muted)
      } catch {
        // Keep defaults when settings file is missing/unreadable.
      } finally {
        setSoundSettingsLoaded(true)
      }
    })()
  }, [])

  useEffect(() => {
    if (!soundManagerRef.current) {
      soundManagerRef.current = new GameSoundManager()
    }
    soundManagerRef.current.setProfile(soundProfile)
    soundManagerRef.current.setMuted(isSoundMuted)
  }, [isSoundMuted, soundProfile])

  useEffect(() => {
    if (!soundSettingsLoaded) {
      return
    }
    void saveSoundSettings({
      soundProfile,
      muted: isSoundMuted,
    })
  }, [isSoundMuted, soundProfile, soundSettingsLoaded])

  const activeRound = gameState?.activeRound ?? null
  const hasPendingReveals = pendingRevealIndices.length > 0

  const clearRevealState = () => {
    setPendingRevealIndices([])
    setRevealedTileIndices([])
  }

  const playRevealTone = () => {
    soundManagerRef.current?.playLetterReveal()
  }

  const playFailureTone = () => {
    soundManagerRef.current?.playSolveFailure()
  }

  const playSuccessTone = () => {
    soundManagerRef.current?.playSolveSuccess()
  }

  const previewSound = (soundId: string) => {
    soundManagerRef.current?.playPreview(soundId)
  }

  const handleWheelSpinComplete = (wedge: WheelWedge) => {
    if (!gameState || gameState.phase !== 'inRound') {
      return
    }
    const effect = wedgeToSpinEffect(wedge)
    const [next, outcome] = applyWheelSpinEffect(gameState, effect)
    setGameState(next)
    if (!outcome.success) {
      playFailureTone()
      return
    }
    if (effect.kind === 'cash') {
      playRevealTone()
    } else {
      playFailureTone()
    }
  }

  const soundsByCategory: Record<SoundCategory, ReturnType<GameSoundManager['getSoundsByCategory']>> =
    {
      bells: soundManagerRef.current?.getSoundsByCategory('bells') ?? [],
      success: soundManagerRef.current?.getSoundsByCategory('success') ?? [],
      failure: soundManagerRef.current?.getSoundsByCategory('failure') ?? [],
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
    const [next, outcome] = guessConsonant(gameState, letter)
    if (!outcome.success) {
      playFailureTone()
      setGameState(next)
      return
    }
    const answer = next.activeRound?.puzzle.answer ?? ''
    const hits = collectMatchingLetterIndices(answer, letter).filter(
      (index) =>
        !pendingRevealIndices.includes(index) && !revealedTileIndices.includes(index),
    )
    if (hits.length > 0) {
      setPendingRevealIndices((current) => [...current, ...hits])
      void playRevealTone()
    }
    setGameState(next)
  }

  const submitVowel = (letter: string) => {
    if (!gameState || hasPendingReveals) {
      return
    }
    const [next, outcome] = buyVowel(gameState, letter)
    if (!outcome.success) {
      playFailureTone()
      setGameState(next)
      return
    }
    const answer = next.activeRound?.puzzle.answer ?? ''
    const hits = collectMatchingLetterIndices(answer, letter).filter(
      (index) =>
        !pendingRevealIndices.includes(index) && !revealedTileIndices.includes(index),
    )
    if (hits.length > 0) {
      setPendingRevealIndices((current) => [...current, ...hits])
      void playRevealTone()
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
      playFailureTone()
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
      playSuccessTone()
    } else if (!outcome.success) {
      setSolveBanner({ variant: 'error', message: outcome.message })
      playFailureTone()
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

  const saveGameAndExitToMenu = () => {
    if (!gameState || gameState.phase !== 'inRound') {
      return
    }
    void (async () => {
      try {
        const payload = gameStateToSavedPayload(gameState)
        await saveSavedGameFile(payload)
        setSavedGameSummary({ savedAt: payload.savedAt })
        exitGame()
      } catch (error) {
        setSolveBanner({
          variant: 'error',
          message:
            error instanceof Error ? error.message : 'Could not save game to file.',
        })
      }
    })()
  }

  const continueSavedGame = () => {
    setSavedGameMenuError('')
    void (async () => {
      try {
        const payload = await loadSavedGameFile()
        if (!payload) {
          setSavedGameSummary(null)
          return
        }
        const next = savedPayloadToGameState(payload)
        setGameState(next)
        setSolveInput('')
        setSolveBanner(null)
        clearRevealState()
        setLoadError('')
      } catch (error) {
        setSavedGameMenuError(
          error instanceof Error ? error.message : 'Could not continue saved game.',
        )
      }
    })()
  }

  const isImmersivePlaySession = activeView === 'play' && gameState !== null
  const isImmersiveFinalSession =
    activeView === 'final' && finalPuzzleSessionActive && finalPuzzle !== null

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
        {gameState?.phase === 'inRound' && (
          <button
            type="button"
            className="save-game-btn"
            onClick={saveGameAndExitToMenu}
          >
            Save &amp; menu
          </button>
        )}
        <button
          type="button"
          className="mute-sound-btn"
          onClick={() => setIsSoundMuted((current) => !current)}
          aria-pressed={isSoundMuted}
        >
          {isSoundMuted ? 'Unmute sounds' : 'Mute sounds'}
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
                roundScores={activeRound.roundScores}
                cumulativeScores={gameState.cumulativeScores}
                onWheelSpinComplete={handleWheelSpinComplete}
                wheelSpinDisabled={activeRound.pendingWheelValue !== null}
              />
              <LetterKeyboard
                guessedLetters={activeRound.guessedLetters}
                disabled={letterInputLocked}
                letterPickMode={
                  activeRound.pendingWheelValue !== null ? 'consonantsOnly' : 'vowelsOnly'
                }
                canAffordVowel={
                  activeRound.roundScores[activeRound.currentPlayerIndex] >= VOWEL_PRICE
                }
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
              <p className="game-complete-intro">
                Final scores count only cash you <strong>banked</strong> by solving a puzzle
                (your round total when you solved).
              </p>
              <h3 className="game-complete-standings-heading">Final standings</h3>
              <ol className="result-list game-final-standings">
                {gameState.config.players
                  .map((player, index) => ({
                    player,
                    index,
                    total: gameState.cumulativeScores[index] ?? 0,
                  }))
                  .sort((a, b) => b.total - a.total)
                  .map(({ player, total }) => (
                    <li key={`final-${player.id}`}>
                      {player.name}: <strong>${total.toLocaleString()}</strong>
                    </li>
                  ))}
              </ol>
              {(() => {
                const top = getHighestCumulativeScoreIndices(gameState.cumulativeScores)
                const names = top
                  .map((i) => gameState.config.players[i]?.name)
                  .filter(Boolean)
                const label = names.length > 1 ? 'Winners' : 'Winner'
                return (
                  <p className="game-winner-declaration" role="status">
                    {label}: <strong>{names.join(', ')}</strong>
                  </p>
                )
              })()}
              <h3 className="game-complete-rounds-heading">Rounds</h3>
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

  if (isImmersiveFinalSession) {
    return (
      <div
        className="game-play-root"
        role="application"
        aria-label="Wheel of Fortune final puzzle"
      >
        <button
          type="button"
          className="exit-game-btn"
          onClick={() => setFinalPuzzleSessionActive(false)}
        >
          Exit to menu
        </button>
        <button
          type="button"
          className="mute-sound-btn"
          onClick={() => setIsSoundMuted((current) => !current)}
          aria-pressed={isSoundMuted}
        >
          {isSoundMuted ? 'Unmute sounds' : 'Mute sounds'}
        </button>
        <div className="game-play-inner">
          <FinalPuzzleView
            layout="immersive"
            puzzle={finalPuzzle}
            onExit={() => setFinalPuzzleSessionActive(false)}
            isSoundMuted={isSoundMuted}
            onToggleMute={() => setIsSoundMuted((current) => !current)}
            playSuccessTone={playSuccessTone}
            playFailureTone={playFailureTone}
            playRevealTone={playRevealTone}
          />
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
          onClick={() => {
            setActiveView('play')
            setFinalPuzzleSessionActive(false)
          }}
        >
          Play Game
        </button>
        <button
          type="button"
          className={activeView === 'manage' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => {
            setActiveView('manage')
            setFinalPuzzleSessionActive(false)
          }}
        >
          Manage Game
        </button>
        <button
          type="button"
          className={activeView === 'sounds' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => {
            setActiveView('sounds')
            setFinalPuzzleSessionActive(false)
          }}
        >
          Sounds
        </button>
        <button
          type="button"
          className={activeView === 'final' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => {
            setActiveView('final')
            setFinalPuzzleSessionActive(false)
          }}
        >
          Final Puzzle
        </button>
      </aside>

      <section className="main-view">
        <header>
          <h1>Wheel of Fortune Puzzle Board</h1>
          <p>
            Local multiplayer helper app with custom puzzles from{' '}
            <code>public/data/puzzles.json</code>. In-progress games save to{' '}
            <code>public/data/saved-game.json</code> (dev server only for file API).
          </p>
        </header>

        {loadError && <p className="error-banner">{loadError}</p>}
        {savedGameMenuError && activeView === 'play' && !gameState && (
          <p className="error-banner">{savedGameMenuError}</p>
        )}
        {finalPuzzleError && activeView === 'final' && (
          <p className="error-banner">{finalPuzzleError}</p>
        )}
        {activeView === 'final' && !finalPuzzle && !finalPuzzleError && (
          <p className="muted">Loading final puzzle…</p>
        )}

        {activeView === 'final' && (
          <section className="panel final-puzzle-menu">
            <h2>Final Puzzle</h2>
            <p>
              TV-style bonus round: click to reveal <strong>R S T L N E</strong>, then pick{' '}
              <strong>three consonants</strong> and <strong>one vowel</strong> and click to reveal
              those matches, then one solve attempt. Puzzle:{' '}
              <code>public/data/final-puzzle.json</code>.
            </p>
            <button
              type="button"
              className="final-puzzle-start-btn"
              disabled={!finalPuzzle || Boolean(finalPuzzleError)}
              onClick={() => setFinalPuzzleSessionActive(true)}
            >
              Start final puzzle
            </button>
          </section>
        )}

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

        {activeView === 'sounds' && (
          <SoundLabPanel
            soundProfile={soundProfile}
            isMuted={isSoundMuted}
            soundsByCategory={soundsByCategory}
            onToggleMute={() => setIsSoundMuted((current) => !current)}
            onPreview={previewSound}
            onChangeProfile={(next) =>
              setSoundProfile((current) => ({
                ...current,
                ...next,
              }))
            }
          />
        )}

        {activeView === 'play' && !gameState && (
          <section className="panel setup">
            <h2>Game Setup</h2>
            {savedGameSummary && (
              <div className="saved-game-continue-block">
                <p className="muted">
                  Saved game from{' '}
                  <time dateTime={savedGameSummary.savedAt}>
                    {new Date(savedGameSummary.savedAt).toLocaleString()}
                  </time>{' '}
                  — the current round restarts from a fresh board; banked totals and turn are
                  restored.
                </p>
                <button type="button" onClick={continueSavedGame}>
                  Continue saved game
                </button>
              </div>
            )}
            <label>
              Number of players (1-5)
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
