export type WheelWedgeKind = 'cash' | 'bankrupt' | 'loseTurn'

export interface WheelWedge {
  id: string
  /** Short label on the wheel */
  label: string
  kind: WheelWedgeKind
  /** Cash value when kind === 'cash' */
  value?: number
  /** Fill color for wedge */
  fill: string
}

/**
 * TV-style main-game style wedges: cash amounts, Bankrupt, and Lose a Turn.
 * Order is clockwise from the top (12 o'clock) of the unrotated wheel.
 */
export const FORTUNE_WHEEL_WEDGES: readonly WheelWedge[] = [
  { id: 'w0', label: '$500', kind: 'cash', value: 500, fill: '#c9a227' },
  { id: 'w1', label: '$350', kind: 'cash', value: 350, fill: '#1e5a8e' },
  { id: 'w2', label: '$700', kind: 'cash', value: 700, fill: '#c9a227' },
  { id: 'w3', label: 'BANKRUPT', kind: 'bankrupt', fill: '#1a1a1a' },
  { id: 'w4', label: '$600', kind: 'cash', value: 600, fill: '#1e5a8e' },
  { id: 'w5', label: '$900', kind: 'cash', value: 900, fill: '#c9a227' },
  { id: 'w6', label: 'LOSE A TURN', kind: 'loseTurn', fill: '#e8e8ec' },
  { id: 'w7', label: '$550', kind: 'cash', value: 550, fill: '#1e5a8e' },
  { id: 'w8', label: '$800', kind: 'cash', value: 800, fill: '#c9a227' },
  { id: 'w9', label: '$400', kind: 'cash', value: 400, fill: '#1e5a8e' },
  { id: 'w10', label: '$650', kind: 'cash', value: 650, fill: '#c9a227' },
  { id: 'w11', label: 'BANKRUPT', kind: 'bankrupt', fill: '#1a1a1a' },
  { id: 'w12', label: '$750', kind: 'cash', value: 750, fill: '#1e5a8e' },
  { id: 'w13', label: '$500', kind: 'cash', value: 500, fill: '#c9a227' },
  { id: 'w14', label: '$850', kind: 'cash', value: 850, fill: '#1e5a8e' },
  { id: 'w15', label: '$450', kind: 'cash', value: 450, fill: '#c9a227' },
  { id: 'w16', label: '$1,000', kind: 'cash', value: 1000, fill: '#1e5a8e' },
  { id: 'w17', label: '$600', kind: 'cash', value: 600, fill: '#c9a227' },
  { id: 'w18', label: '$700', kind: 'cash', value: 700, fill: '#1e5a8e' },
  { id: 'w19', label: '$900', kind: 'cash', value: 900, fill: '#c9a227' },
  { id: 'w20', label: '$500', kind: 'cash', value: 500, fill: '#1e5a8e' },
  { id: 'w21', label: '$800', kind: 'cash', value: 800, fill: '#c9a227' },
  { id: 'w22', label: '$650', kind: 'cash', value: 650, fill: '#1e5a8e' },
  { id: 'w23', label: '$550', kind: 'cash', value: 550, fill: '#c9a227' },
] as const

export const wedgeCount = FORTUNE_WHEEL_WEDGES.length

export const wedgeAngleDeg = 360 / wedgeCount

export function buildWheelConicGradient(wedges: readonly WheelWedge[]): string {
  const step = 360 / wedges.length
  const parts = wedges.map((w, i) => {
    const start = i * step
    const end = (i + 1) * step
    return `${w.fill} ${start}deg ${end}deg`
  })
  return `conic-gradient(from 0deg, ${parts.join(', ')})`
}
