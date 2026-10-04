/** Text remains the stored message format. Links are display-only, never fetched. */
import { MAX_MESSAGE_LENGTH, messageLength } from './message-limits'
export { MAX_MESSAGE_LENGTH } from './message-limits'
export type MessagePart = { text: string; href?: string }

function trimSentenceEnding(candidate: string) {
  let value = candidate.replace(/[.,!;:，。！？；：、]+$/u, '')
  const pairs = [['(', ')'], ['[', ']'], ['{', '}'], ['（', '）']] as const
  let shortened = true
  while (shortened) {
    shortened = false
    for (const [open, close] of pairs) {
      if (value.endsWith(close) && value.split(close).length > value.split(open).length) {
        value = value.slice(0, -close.length).replace(/[.,!;:，。！？；：、]+$/u, '')
        shortened = true
      }
    }
  }
  return value
}

export function messageParts(content: string): MessagePart[] {
  // Require a token boundary; a scheme embedded in another scheme stays plain text.
  const urls = /(?<![a-z0-9_+.:\/-])https?:\/\/[^\s<>"'`，。！？；：、]+/giu
  const parts: MessagePart[] = []
  let offset = 0
  for (const match of content.matchAll(urls)) {
    if (/(?:javascript|data|vbscript|file):[^\s]*$/i.test(content.slice(0, match.index))) continue
    const text = trimSentenceEnding(match[0])
    let href: string
    try {
      if (text.length > 2048 || /[\p{Cc}\p{Cf}\\]/u.test(text)) continue
      const url = new URL(text)
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) continue
      // Reject encoded controls or backslashes rather than producing a misleading link.
      if (/%(?:0[0-9a-f]|1[0-9a-f]|7f|5c)/i.test(text)) continue
      href = url.href
    } catch { continue }
    if (match.index > offset) parts.push({ text: content.slice(offset, match.index) })
    parts.push({ text, href })
    offset = match.index + text.length
  }
  if (offset < content.length) parts.push({ text: content.slice(offset) })
  return parts
}

export const CHAT_EMOJI = [
  ['smile', '😊'], ['laugh', '😄'], ['joy', '😂'], ['wink', '😉'],
  ['heartEyes', '😍'], ['thoughtful', '🤔'], ['sad', '😢'], ['surprised', '😮'],
  ['wave', '👋'], ['thumbsUp', '👍'], ['clap', '👏'], ['thanks', '🙏'],
  ['heart', '❤️'], ['sparkles', '✨'], ['star', '🌟'], ['moon', '🌙'],
  ['planet', '🪐'], ['rocket', '🚀'], ['celebrate', '🎉'], ['hug', '🤗'],
] as const

export function insertMessageEmoji(value: string, start: number, end: number, emoji: string) {
  const from = Math.max(0, Math.min(value.length, start))
  const to = Math.max(from, Math.min(value.length, end))
  const next = value.slice(0, from) + emoji + value.slice(to)
  if (messageLength(next) > MAX_MESSAGE_LENGTH) return null
  return { value: next, caret: from + emoji.length }
}
