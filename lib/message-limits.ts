/** Matches Zod's Unicode code-point string limit; DOM selection uses UTF-16 offsets. */
export const MAX_MESSAGE_LENGTH = 2000
export function messageLength(value: string) {
  return Array.from(value).length
}
export function truncateMessage(value: string) {
  return Array.from(value).slice(0, MAX_MESSAGE_LENGTH).join('')
}
