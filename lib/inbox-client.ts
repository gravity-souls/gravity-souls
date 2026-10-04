'use client'
export const INBOX_CHANGED = 'gravity-souls:inbox-changed'
export function notifyInboxChanged() {
  window.dispatchEvent(new Event(INBOX_CHANGED))
}
