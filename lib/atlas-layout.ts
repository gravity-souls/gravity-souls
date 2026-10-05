import { stableUnit } from '@/lib/star-map'
export function planetGravity(level = 1) {
  const safe = Math.max(1, Math.min(100, Number.isFinite(level) ? level : 1))
  return { radius: Math.min(23, 10 + Math.sqrt(safe) * 1.4), pull: Math.max(.84, 1-Math.log2(safe)*.025) }
}
export function atlasPosition(id: string, score?: number, level = 1) {
  const relevance = Number.isFinite(score) ? Math.min(100, Math.max(0, score!)) : 50
  const radius = (70+(100-relevance)*2.8) * planetGravity(level).pull
  const angle = stableUnit(`${id}:atlas:angle`)*Math.PI*2
  return { x: Math.cos(angle)*radius, y: Math.sin(angle)*radius*.8, z: (stableUnit(`${id}:atlas:depth`)-.5)*30 }
}
export function galaxyMagnitude(members = 0) {
  const count = Math.max(0, Number.isFinite(members) ? members : 0)
  // Area grows with membership at first; logarithmic compression keeps very
  // large galaxies readable without making small communities disappear.
  return { radius: Math.min(110, 15 + Math.log2(1+Math.sqrt(count))*12), particles: Math.min(240, 20 + Math.round(Math.sqrt(count)*16)) }
}
