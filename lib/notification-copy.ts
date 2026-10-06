import en from '@/messages/en.json'
import fr from '@/messages/fr.json'
import zh from '@/messages/zh.json'
import { resolveLocale } from '@/lib/i18n-locales'

const catalogs: Record<string, Record<string, string>> = {
  en: en.notifications, fr: fr.notifications, zh: zh.notifications,
}

function parameters(template: string, value: string): Record<string, string> | null {
  if (template === value) return {}
  const names: string[] = []
  const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = template.split(/(\{\w+\})/g).map(part => {
    if (!/^\{\w+\}$/.test(part)) return escape(part)
    names.push(part.slice(1, -1))
    return '([\\s\\S]*?)'
  })
  const match = new RegExp(`^${parts.join('')}$`).exec(value)
  if (!match) return null
  const result: Record<string, string> = {}
  for (let i = 0; i < names.length; i++) {
    if (names[i] in result && result[names[i]] !== match[i + 1]) return null
    result[names[i]] = match[i + 1]
  }
  return result
}

function interpolate(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (original, key: string) => values[key] ?? original)
}

/** Recognize only exact application templates. Names, event titles and free text stay intact.
 * Existing notifications need no migration and follow the current UI language immediately. */
export function notificationCopy(notice: { title: string; body: string }, locale: string) {
  const target = catalogs[resolveLocale(locale)]
  for (const source of Object.values(catalogs)) {
    for (const key of Object.keys(source).filter(key => key.endsWith('Title'))) {
      const titleValues = parameters(source[key], notice.title)
      if (!titleValues) continue
      const bodyKey = key.slice(0, -5) + 'Body'
      // Event announcements store the author's event name as their body.
      if (!source[bodyKey]) {
        if (key !== 'eventNewTitle' && key !== 'eventProposalUpdateTitle') continue
        return { title: interpolate(target[key], titleValues), body: notice.body }
      }
      const bodyValues = parameters(source[bodyKey], notice.body)
      if (!bodyValues) continue
      if (Object.keys(titleValues).some(name => name in bodyValues && titleValues[name] !== bodyValues[name])) continue
      const values = { ...titleValues, ...bodyValues }
      return { title: interpolate(target[key], values), body: interpolate(target[bodyKey], values) }
    }
  }
  return { title: notice.title, body: notice.body }
}
