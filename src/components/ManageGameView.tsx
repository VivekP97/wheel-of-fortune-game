import { useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { loadCategories } from '../data/loadCategories'
import { savePuzzles, validatePuzzles } from '../data/loadPuzzles'
import type { Puzzle } from '../types/game'

interface ManageGameViewProps {
  puzzles: Puzzle[]
  onPuzzlesSaved: (puzzles: Puzzle[]) => void
}

type FieldKey = 'id' | 'category' | 'answer'
type ValidationMap = Record<number, Partial<Record<FieldKey, string>>>

const buildNewPuzzle = (index: number): Puzzle => ({
  id: `puzzle-${String(index + 1).padStart(3, '0')}`,
  category: '',
  answer: '',
  notes: '',
})

const reorderAt = <T,>(items: T[], from: number, to: number): T[] => {
  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

const newRowKey = (): string => crypto.randomUUID()

const buildValidationMap = (items: Puzzle[]): ValidationMap => {
  const errors: ValidationMap = {}
  const idToIndices = new Map<string, number[]>()

  items.forEach((puzzle, index) => {
    const id = puzzle.id.trim()
    if (!id) {
      errors[index] = { ...errors[index], id: 'ID is required.' }
    } else {
      const indices = idToIndices.get(id) ?? []
      indices.push(index)
      idToIndices.set(id, indices)
    }

    if (!puzzle.category.trim()) {
      errors[index] = { ...errors[index], category: 'Category is required.' }
    }

    if (!puzzle.answer.trim()) {
      errors[index] = { ...errors[index], answer: 'Answer is required.' }
    }
  })

  for (const indices of idToIndices.values()) {
    if (indices.length > 1) {
      indices.forEach((index) => {
        errors[index] = { ...errors[index], id: 'ID must be unique.' }
      })
    }
  }

  return errors
}

export default function ManageGameView({
  puzzles,
  onPuzzlesSaved,
}: ManageGameViewProps) {
  const [draftPuzzles, setDraftPuzzles] = useState<Puzzle[]>(puzzles)
  const [rowKeys, setRowKeys] = useState<string[]>(() => puzzles.map(() => newRowKey()))
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [categoriesList, setCategoriesList] = useState<string[]>([])
  const [categoriesError, setCategoriesError] = useState('')
  const [pendingAction, setPendingAction] = useState<'save' | 'reset' | null>(null)

  const isManageBusy = pendingAction !== null

  useEffect(() => {
    setDraftPuzzles(puzzles)
    setRowKeys(puzzles.map(() => newRowKey()))
  }, [puzzles])

  useEffect(() => {
    void (async () => {
      try {
        const loaded = await loadCategories()
        setCategoriesList(loaded)
        setCategoriesError('')
      } catch (err) {
        setCategoriesList([])
        setCategoriesError(
          err instanceof Error ? err.message : 'Could not load categories.',
        )
      }
    })()
  }, [])

  const categoryOptions = useMemo(() => {
    const seen = new Set<string>()
    const ordered: string[] = []
    for (const c of categoriesList) {
      const key = c.toLowerCase()
      if (seen.has(key)) {
        continue
      }
      seen.add(key)
      ordered.push(c)
    }
    const extras: string[] = []
    for (const p of draftPuzzles) {
      const t = p.category.trim()
      if (!t) {
        continue
      }
      const key = t.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        extras.push(t)
      }
    }
    extras.sort((a, b) => a.localeCompare(b))
    return [...ordered, ...extras]
  }, [categoriesList, draftPuzzles])

  const validationMap = useMemo(() => buildValidationMap(draftPuzzles), [draftPuzzles])
  const hasValidationIssues = Object.keys(validationMap).length > 0

  const updatePuzzle = (index: number, field: keyof Puzzle, value: string): void => {
    setDraftPuzzles((current) =>
      current.map((puzzle, puzzleIndex) =>
        puzzleIndex === index ? { ...puzzle, [field]: value } : puzzle,
      ),
    )
    setStatus('')
    setError('')
  }

  const handleAddPuzzle = () => {
    if (isManageBusy) {
      return
    }
    setDraftPuzzles((current) => [...current, buildNewPuzzle(current.length)])
    setRowKeys((current) => [...current, newRowKey()])
    setStatus('')
    setError('')
  }

  const handleRemovePuzzle = (index: number) => {
    if (isManageBusy) {
      return
    }
    setDraftPuzzles((current) => current.filter((_, puzzleIndex) => puzzleIndex !== index))
    setRowKeys((current) => current.filter((_, puzzleIndex) => puzzleIndex !== index))
    setStatus('')
    setError('')
  }

  const handleReset = () => {
    if (isManageBusy) {
      return
    }
    flushSync(() => {
      setPendingAction('reset')
    })
    queueMicrotask(() => {
      setDraftPuzzles(puzzles)
      setRowKeys(puzzles.map(() => newRowKey()))
      setStatus('Draft reset to current saved puzzles.')
      setError('')
      setPendingAction(null)
    })
  }

  const handleSave = async () => {
    if (isManageBusy) {
      return
    }
    setStatus('')
    setError('')

    if (hasValidationIssues) {
      setError('Resolve field validation errors before saving.')
      return
    }

    setPendingAction('save')
    try {
      const valid = validatePuzzles({ puzzles: draftPuzzles })
      const saved = await savePuzzles(valid)
      setDraftPuzzles(saved)
      setRowKeys(saved.map(() => newRowKey()))
      onPuzzlesSaved(saved)
      setStatus('Puzzles saved to public/data/puzzles.json.')
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Could not save puzzle changes.',
      )
    } finally {
      setPendingAction(null)
    }
  }

  const handleDropOnIndex = (dropIndex: number) => {
    if (isManageBusy) {
      return
    }
    if (draggingIndex === null || draggingIndex === dropIndex) {
      setDraggingIndex(null)
      return
    }

    setDraftPuzzles((current) => reorderAt(current, draggingIndex, dropIndex))
    setRowKeys((current) => reorderAt(current, draggingIndex, dropIndex))
    setDraggingIndex(null)
    setStatus('Puzzle order updated. Save to persist.')
    setError('')
  }

  return (
    <section className="panel manage-view">
      <h2>Manage Game</h2>
      <p>
        Edit puzzle fields below. Drag puzzle cards to reorder. Save writes to
        <code> public/data/puzzles.json</code>.
      </p>

      {status && <p className="success-banner manage-feedback">{status}</p>}
      {error && <p className="error-banner manage-feedback">{error}</p>}
      {categoriesError && (
        <p className="error-banner manage-feedback">{categoriesError}</p>
      )}
      {hasValidationIssues && (
        <p className="warning-banner manage-feedback">
          Some fields are invalid. Fix highlighted errors before saving.
        </p>
      )}

      <div className="manage-actions">
        <button type="button" onClick={handleAddPuzzle} disabled={isManageBusy}>
          Add Puzzle
        </button>
        <button
          type="button"
          className="secondary btn-with-spinner"
          onClick={handleReset}
          disabled={isManageBusy}
          aria-busy={pendingAction === 'reset'}
        >
          {pendingAction === 'reset' ? (
            <>
              <span className="btn-spinner" aria-hidden />
              Resetting…
            </>
          ) : (
            'Reset Changes'
          )}
        </button>
        <button
          type="button"
          className="btn-with-spinner"
          onClick={() => void handleSave()}
          disabled={isManageBusy || hasValidationIssues}
          aria-busy={pendingAction === 'save'}
        >
          {pendingAction === 'save' ? (
            <>
              <span className="btn-spinner" aria-hidden />
              Saving…
            </>
          ) : (
            'Save Puzzle Changes'
          )}
        </button>
      </div>

      <div className="puzzle-list">
        {draftPuzzles.map((puzzle, index) => {
          const fieldErrors = validationMap[index] ?? {}

          return (
            <article
              key={rowKeys[index]}
              className={`puzzle-card ${draggingIndex === index ? 'dragging' : ''} ${isManageBusy ? 'is-busy' : ''}`}
              draggable={!isManageBusy}
              onDragStart={() => {
                if (!isManageBusy) {
                  setDraggingIndex(index)
                }
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDropOnIndex(index)}
              onDragEnd={() => setDraggingIndex(null)}
            >
              <div className="puzzle-card-header">
                <h3>{puzzle.id.trim() || '(no ID yet)'}</h3>
                <div className="puzzle-header-actions">
                  <span className="drag-hint">Drag to reorder</span>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => handleRemovePuzzle(index)}
                    disabled={isManageBusy}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="puzzle-grid">
                <label>
                  ID
                  <input
                    type="text"
                    value={puzzle.id}
                    onChange={(event) => updatePuzzle(index, 'id', event.target.value)}
                    disabled={isManageBusy}
                  />
                  {fieldErrors.id && <span className="field-error">{fieldErrors.id}</span>}
                </label>
                <label>
                  Category
                  <select
                    value={puzzle.category}
                    onChange={(event) =>
                      updatePuzzle(index, 'category', event.target.value)
                    }
                    aria-invalid={Boolean(fieldErrors.category)}
                    disabled={isManageBusy}
                  >
                    <option value="">Select category…</option>
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.category && (
                    <span className="field-error">{fieldErrors.category}</span>
                  )}
                </label>
                <label className="full-width">
                  Answer
                  <input
                    type="text"
                    value={puzzle.answer}
                    onChange={(event) => updatePuzzle(index, 'answer', event.target.value)}
                    disabled={isManageBusy}
                  />
                  {fieldErrors.answer && (
                    <span className="field-error">{fieldErrors.answer}</span>
                  )}
                </label>
                <label className="full-width">
                  Notes (optional)
                  <input
                    type="text"
                    value={puzzle.notes ?? ''}
                    onChange={(event) => updatePuzzle(index, 'notes', event.target.value)}
                    disabled={isManageBusy}
                  />
                </label>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
