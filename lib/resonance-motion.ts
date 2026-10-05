/** Presentation only: motion never changes canonical identities or scores. */
export function resonancePosition(index: number, count: number, phase = 0) {
  const angle = -Math.PI / 2 + index * Math.PI * 2 / Math.max(1, count) + phase
  return { x: 50 + Math.cos(angle) * 34, y: 48 + Math.sin(angle) * 31 }
}
