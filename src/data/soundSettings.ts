import { DEFAULT_SOUND_PROFILE, type SoundProfile } from '../audio/soundManager'

interface SoundSettingsFileShape {
  soundProfile?: unknown
  muted?: unknown
}

export interface SoundSettings {
  soundProfile: SoundProfile
  muted: boolean
}

const isString = (value: unknown): value is string => typeof value === 'string'

const normalizeProfile = (value: unknown): SoundProfile => {
  if (typeof value !== 'object' || value === null) {
    return { ...DEFAULT_SOUND_PROFILE }
  }

  const candidate = value as Record<string, unknown>
  return {
    letterRevealId: isString(candidate.letterRevealId)
      ? candidate.letterRevealId
      : DEFAULT_SOUND_PROFILE.letterRevealId,
    solveSuccessId: isString(candidate.solveSuccessId)
      ? candidate.solveSuccessId
      : DEFAULT_SOUND_PROFILE.solveSuccessId,
    solveFailureId: isString(candidate.solveFailureId)
      ? candidate.solveFailureId
      : DEFAULT_SOUND_PROFILE.solveFailureId,
  }
}

export const validateSoundSettings = (raw: unknown): SoundSettings => {
  if (typeof raw !== 'object' || raw === null) {
    return {
      soundProfile: { ...DEFAULT_SOUND_PROFILE },
      muted: false,
    }
  }

  const parsed = raw as SoundSettingsFileShape
  return {
    soundProfile: normalizeProfile(parsed.soundProfile),
    muted: typeof parsed.muted === 'boolean' ? parsed.muted : false,
  }
}

export const loadSoundSettings = async (): Promise<SoundSettings> => {
  const response = await fetch('/api/sound-settings')
  if (!response.ok) {
    throw new Error('Could not load sound settings file.')
  }

  const raw = (await response.json()) as unknown
  return validateSoundSettings(raw)
}

export const saveSoundSettings = async (
  settings: SoundSettings,
): Promise<SoundSettings> => {
  const response = await fetch('/api/sound-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Could not save sound settings.')
  }

  const raw = (await response.json()) as unknown
  return validateSoundSettings(raw)
}

