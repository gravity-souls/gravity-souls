'use client'

import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { CHAT_DRAFT_RESET, ChatDraftStore, chatDraftKey } from './chat-drafts'

export function useChatDraft(viewerId: string, conversationId: string) {
  const key = viewerId ? chatDraftKey(viewerId, conversationId) : null
  const store = useMemo(() => new ChatDraftStore(key), [key])
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  useEffect(() => {
    let storage: Storage | null = null
    try { storage = window.localStorage } catch { /* Fall back to an in-memory composer. */ }
    store.hydrate(storage)
    const refresh = () => { if (!document.hidden) store.refresh() }
    const changed = (event: StorageEvent) => {
      if (event.storageArea !== storage) return
      if (event.key === null || (event.key === key && event.newValue === null)) store.reset()
      else if (event.key === key) store.refresh()
    }
    window.addEventListener('storage', changed)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    const reset = () => store.reset()
    window.addEventListener(CHAT_DRAFT_RESET, reset)
    return () => {
      window.removeEventListener('storage', changed)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener(CHAT_DRAFT_RESET, reset)
    }
  }, [store, key])
  return { ...state, store }
}
