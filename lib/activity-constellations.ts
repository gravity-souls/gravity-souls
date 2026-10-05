import type { StarMapGroup, StarMapNode } from '@/types/star-map'

export function constellationGroup(galaxyId: string, past: boolean) {
  return `${past ? 'history' : 'active'}:${galaxyId}`
}
export function parseConstellationGroup(value: string) {
  const match = /^(active|history):([a-zA-Z0-9_-]{1,80})$/.exec(value)
  return match ? { galaxyId: match[2], past: match[1] === 'history' } : null
}
// Groups describe this bounded batch, never participants or all galaxy events.
export function constellationGroups(nodes: StarMapNode[]): StarMapGroup[] {
  const groups = new Map<string, StarMapGroup>()
  for (const node of nodes) {
    const group = groups.get(node.groupId)
    if (group) group.count++
    else groups.set(node.groupId, { id: node.groupId, name: node.tagline ?? '', count: 1, color: node.activityState === 'past' ? '#a3abbc' : '#68d8bd', phase: node.activityState === 'past' ? 'past' : 'active' })
  }
  return [...groups.values()].sort((a, b) => a.id.localeCompare(b.id))
}
