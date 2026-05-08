import type { SoundCategory, SoundOption, SoundProfile } from '../audio/soundManager'

interface SoundLabPanelProps {
  soundProfile: SoundProfile
  isMuted: boolean
  soundsByCategory: Record<SoundCategory, SoundOption[]>
  onToggleMute: () => void
  onPreview: (soundId: string) => void
  onChangeProfile: (next: Partial<SoundProfile>) => void
}

const CATEGORY_LABELS: Record<SoundCategory, string> = {
  bells: 'Bell Sounds (Letter Reveal)',
  success: 'Success Sounds (Solve Success - future use)',
  failure: 'Failure Sounds (Solve Failure - future use)',
}

export default function SoundLabPanel({
  soundProfile,
  isMuted,
  soundsByCategory,
  onToggleMute,
  onPreview,
  onChangeProfile,
}: SoundLabPanelProps) {
  return (
    <section className="panel sound-lab">
      <h2>Sound Lab</h2>
      <p className="muted">
        Preview tones and assign which sounds should play for game events.
      </p>

      <button type="button" className="sound-lab-mute-btn" onClick={onToggleMute}>
        {isMuted ? 'Unmute Sounds' : 'Mute Sounds'}
      </button>

      <div className="sound-lab-assignments">
        <label>
          Letter Reveal Sound
          <select
            value={soundProfile.letterRevealId}
            onChange={(event) =>
              onChangeProfile({ letterRevealId: event.target.value })
            }
          >
            {soundsByCategory.bells.map((sound) => (
              <option key={sound.id} value={sound.id}>
                {sound.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Solve Success Sound (future)
          <select
            value={soundProfile.solveSuccessId}
            onChange={(event) =>
              onChangeProfile({ solveSuccessId: event.target.value })
            }
          >
            {soundsByCategory.success.map((sound) => (
              <option key={sound.id} value={sound.id}>
                {sound.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Solve Failure Sound (future)
          <select
            value={soundProfile.solveFailureId}
            onChange={(event) =>
              onChangeProfile({ solveFailureId: event.target.value })
            }
          >
            {soundsByCategory.failure.map((sound) => (
              <option key={sound.id} value={sound.id}>
                {sound.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {(['bells', 'success', 'failure'] as const).map((category) => (
        <section key={category} className="sound-category">
          <h3>{CATEGORY_LABELS[category]}</h3>
          <div className="sound-grid">
            {soundsByCategory[category].map((sound) => (
              <article key={sound.id} className="sound-card">
                <strong>{sound.name}</strong>
                <p>{sound.description}</p>
                <button type="button" onClick={() => onPreview(sound.id)}>
                  Play Preview
                </button>
              </article>
            ))}
          </div>
        </section>
      ))}
    </section>
  )
}

