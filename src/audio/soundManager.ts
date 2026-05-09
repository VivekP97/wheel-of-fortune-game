import { Howl, Howler } from 'howler'
import { playSound } from 'react-sounds'

const SAMPLE_RATE = 44100

export type SoundCategory = 'bells' | 'success' | 'failure'

interface SoundRecipe {
  durationSeconds: number
  amplitude: number
  decay: number
  partials: Array<{ freq: number; gain: number }>
}

export interface SoundOption {
  id: string
  name: string
  category: SoundCategory
  description: string
  recipe: SoundRecipe
}

export interface SoundProfile {
  letterRevealId: string
  solveSuccessId: string
  solveFailureId: string
}

const toBase64 = (bytes: Uint8Array): string => {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

const writeString = (view: DataView, offset: number, value: string) => {
  for (let i = 0; i < value.length; i++) {
    view.setUint8(offset + i, value.charCodeAt(i))
  }
}

const createToneWavDataUri = (recipe: SoundRecipe): string => {
  const durationSeconds = recipe.durationSeconds
  const sampleCount = Math.floor(SAMPLE_RATE * durationSeconds)
  const pcmData = new Int16Array(sampleCount)

  for (let i = 0; i < sampleCount; i++) {
    const t = i / SAMPLE_RATE
    const envelope = Math.exp(-recipe.decay * t)
    let sample = 0

    for (const partial of recipe.partials) {
      sample += Math.sin(2 * Math.PI * partial.freq * t) * partial.gain
    }

    sample *= envelope * recipe.amplitude
    sample = Math.max(-1, Math.min(1, sample))
    pcmData[i] = sample * 32767
  }

  const byteRate = SAMPLE_RATE * 2
  const dataSize = sampleCount * 2
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < pcmData.length; i++) {
    view.setInt16(offset, pcmData[i], true)
    offset += 2
  }

  const bytes = new Uint8Array(buffer)
  return `data:audio/wav;base64,${toBase64(bytes)}`
}

export const SOUND_OPTIONS: SoundOption[] = [
  {
    id: 'bell_classic',
    name: 'Classic Bell',
    category: 'bells',
    description: 'Warm 3-note bell chime.',
    recipe: {
      durationSeconds: 0.62,
      amplitude: 0.75,
      decay: 7.2,
      partials: [
        { freq: 1046.5, gain: 0.55 },
        { freq: 1318.5, gain: 0.34 },
        { freq: 1568.0, gain: 0.2 },
      ],
    },
  },
  {
    id: 'bell_soft',
    name: 'Soft Bell',
    category: 'bells',
    description: 'Lower, softer round bell.',
    recipe: {
      durationSeconds: 0.72,
      amplitude: 0.6,
      decay: 6.6,
      partials: [
        { freq: 784.0, gain: 0.58 },
        { freq: 987.77, gain: 0.3 },
        { freq: 1174.66, gain: 0.2 },
      ],
    },
  },
  {
    id: 'bell_bright',
    name: 'Bright Bell',
    category: 'bells',
    description: 'Higher sparkle with short tail.',
    recipe: {
      durationSeconds: 0.5,
      amplitude: 0.8,
      decay: 8.3,
      partials: [
        { freq: 1174.66, gain: 0.5 },
        { freq: 1396.91, gain: 0.33 },
        { freq: 1760.0, gain: 0.26 },
      ],
    },
  },
  {
    id: 'success_chime',
    name: 'Success Chime',
    category: 'success',
    description: 'Upward resolving success tone.',
    recipe: {
      durationSeconds: 0.82,
      amplitude: 0.72,
      decay: 5.9,
      partials: [
        { freq: 659.25, gain: 0.5 },
        { freq: 987.77, gain: 0.35 },
        { freq: 1318.5, gain: 0.25 },
      ],
    },
  },
  {
    id: 'success_fanfare',
    name: 'Mini Fanfare',
    category: 'success',
    description: 'Punchier celebratory hit.',
    recipe: {
      durationSeconds: 0.72,
      amplitude: 0.82,
      decay: 6.8,
      partials: [
        { freq: 523.25, gain: 0.42 },
        { freq: 783.99, gain: 0.36 },
        { freq: 1046.5, gain: 0.3 },
      ],
    },
  },
  {
    id: 'failure_buzz',
    name: 'Failure Buzz',
    category: 'failure',
    description: 'Short low dissonant buzz.',
    recipe: {
      durationSeconds: 0.48,
      amplitude: 0.7,
      decay: 8.8,
      partials: [
        { freq: 220.0, gain: 0.52 },
        { freq: 207.65, gain: 0.3 },
        { freq: 196.0, gain: 0.24 },
      ],
    },
  },
  {
    id: 'failure_drop',
    name: 'Failure Drop',
    category: 'failure',
    description: 'Low descending thunk tone.',
    recipe: {
      durationSeconds: 0.56,
      amplitude: 0.68,
      decay: 7.8,
      partials: [
        { freq: 246.94, gain: 0.5 },
        { freq: 174.61, gain: 0.3 },
        { freq: 146.83, gain: 0.24 },
      ],
    },
  },
  {
    id: 'failure_brief_buzz',
    name: 'Brief Buzz',
    category: 'failure',
    description: 'Very short electric-style buzz.',
    recipe: {
      durationSeconds: 0.24,
      amplitude: 0.68,
      decay: 11.5,
      partials: [
        { freq: 170.0, gain: 0.58 },
        { freq: 182.0, gain: 0.42 },
        { freq: 194.0, gain: 0.34 },
        { freq: 206.0, gain: 0.22 },
      ],
    },
  },
]

export const DEFAULT_SOUND_PROFILE: SoundProfile = {
  letterRevealId: 'bell_classic',
  solveSuccessId: 'success_chime',
  solveFailureId: 'failure_buzz',
}

const byId = new Map(SOUND_OPTIONS.map((option) => [option.id, option]))

export class GameSoundManager {
  private muted = false

  private profile: SoundProfile = { ...DEFAULT_SOUND_PROFILE }

  private readonly howlMap: Record<string, Howl> = {}

  constructor() {
    for (const option of SOUND_OPTIONS) {
      this.howlMap[option.id] = new Howl({
        src: [createToneWavDataUri(option.recipe)],
        volume: option.category === 'bells' ? 0.42 : 0.48,
        preload: true,
      })
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted
    Howler.mute(muted)
  }

  isMuted(): boolean {
    return this.muted
  }

  setProfile(next: Partial<SoundProfile>) {
    this.profile = { ...this.profile, ...next }
  }

  getProfile(): SoundProfile {
    return { ...this.profile }
  }

  playPreview(soundId: string) {
    if (this.muted) {
      return
    }
    const howl = this.howlMap[soundId]
    if (!howl) {
      return
    }
    howl.stop()
    howl.play()
  }

  playLetterReveal() {
    if (this.muted) {
      return
    }
    void playSound('notification/info').catch(() => {
      this.playPreview(this.profile.letterRevealId)
    })
  }

  playSolveSuccess() {
    if (this.muted) {
      return
    }
    void playSound('notification/success').catch(() => {
      this.playPreview(this.profile.solveSuccessId)
    })
  }

  playSolveFailure() {
    if (this.muted) {
      return
    }
    void playSound('ui/buzz').catch(() => {
      this.playPreview(this.profile.solveFailureId)
    })
  }

  getSoundsByCategory(category: SoundCategory): SoundOption[] {
    return SOUND_OPTIONS.filter((option) => option.category === category)
  }

  hasSound(soundId: string): boolean {
    return byId.has(soundId)
  }
}

