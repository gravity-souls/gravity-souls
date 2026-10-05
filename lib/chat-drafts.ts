import { messageLength, MAX_MESSAGE_LENGTH, truncateMessage } from './message-limits'

export const CHAT_DRAFT_PREFIX = 'gravity:chat-draft:v1:'
export const CHAT_DRAFT_RESET = 'gravity:chat-draft-reset'
export const CHAT_DRAFT_TTL = 7 * 24 * 60 * 60 * 1000
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>
export interface ChatDraft {
  version: 1
  revision: string
  text: string
  replyToId: string | null
  clientMessageId: string
  updatedAt: number
}
export interface DraftState {
  draft: ChatDraft | null
  ready: boolean
  conflict: boolean
  unavailable: boolean
  restored: boolean
}
export function chatDraftKey(viewerId: string, conversationId: string) {
  return `${CHAT_DRAFT_PREFIX}${encodeURIComponent(viewerId)}:${encodeURIComponent(conversationId)}`
}
export function parseChatDraft(raw: string | null, now = Date.now()): ChatDraft | null {
  if (!raw || raw.length > 20000) return null
  try {
    const value = JSON.parse(raw)
    const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
    if (value.version !== 1 || typeof value.text !== 'string' || messageLength(value.text) > MAX_MESSAGE_LENGTH ||
      typeof value.revision !== 'string' || !uuid.test(value.revision) || typeof value.clientMessageId !== 'string' || !uuid.test(value.clientMessageId) ||
      (value.replyToId !== null && (typeof value.replyToId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(value.replyToId))) ||
      !Number.isFinite(value.updatedAt) || value.updatedAt > now + 60000 || now - value.updatedAt >= CHAT_DRAFT_TTL) return null
    // Never retain unexpected fields such as quote snapshots or attachment URLs.
    return { version: 1, revision: value.revision, text: value.text, replyToId: value.replyToId, clientMessageId: value.clientMessageId, updatedAt: value.updatedAt }
  } catch { return null }
}

/** Local browser drafts only. Storage revisions fence stale tabs and send acknowledgements. */
export class ChatDraftStore {
  private storage: StorageLike | null = null
  private baseline: string | null = null
  private edited = false
  private listeners = new Set<() => void>()
  private state: DraftState = { draft: null, ready: false, conflict: false, unavailable: false, restored: false }
  constructor(readonly key: string | null, private now = Date.now, private uuid = () => crypto.randomUUID()) {}
  getSnapshot = () => this.state
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private emit(update: Partial<DraftState>) {
    this.state = { ...this.state, ...update }
    for (const listener of this.listeners) listener()
  }
  private read() {
    return this.key && this.storage ? this.storage.getItem(this.key) : null
  }
  hydrate(storage: StorageLike | null) {
    this.storage = storage
    try {
      this.baseline = this.read()
      const draft = parseChatDraft(this.baseline, this.now())
      if (!draft && this.baseline && this.key) { storage?.removeItem(this.key); this.baseline = null }
      this.emit({ draft, ready: true, conflict: false, unavailable: !!this.key && !storage, restored: !!draft?.text || !!draft?.replyToId })
    } catch { this.emit({ ready: true, unavailable: true }) }
  }
  private save(draft: ChatDraft, force = false) {
    try {
      if (!this.key || !this.storage) { this.emit({ draft, unavailable: !!this.key }); return }
      const latest = this.read()
      if (!force && latest !== this.baseline) {
        this.emit({ draft, conflict: true }); return
      }
      const raw = JSON.stringify(draft)
      this.storage.setItem(this.key, raw)
      this.baseline = raw
      this.emit({ draft, conflict: false, unavailable: false })
    } catch { this.emit({ draft, unavailable: true }) }
  }
  change(text: string, replyToId: string | null) {
    if (!this.state.ready) return
    if (text === this.state.draft?.text && replyToId === this.state.draft.replyToId) return
    this.edited = true
    const draft: ChatDraft = { version: 1, text: truncateMessage(text), replyToId, revision: this.uuid(), clientMessageId: this.uuid(), updatedAt: this.now() }
    this.emit({ restored: false })
    // A conflict is resolved only through the explicit choices, never by typing again.
    if (this.state.conflict) this.emit({ draft })
    else this.save(draft)
  }
  refresh() {
    if (!this.state.ready) return
    try {
      const raw = this.read()
      if (raw === this.baseline) return
      if (this.edited && (this.state.draft?.text || this.state.draft?.replyToId)) { this.emit({ conflict: true }); return }
      this.baseline = raw
      const draft = parseChatDraft(raw, this.now())
      this.emit({ draft, conflict: false, restored: !!draft?.text || !!draft?.replyToId })
    } catch { this.emit({ unavailable: true }) }
  }
  useOther() {
    try {
      const raw = this.read()
      const draft = parseChatDraft(raw, this.now())
      this.edited = false; this.baseline = raw
      this.emit({ draft, conflict: false, restored: !!draft?.text || !!draft?.replyToId })
    } catch { this.emit({ unavailable: true }) }
  }
  keepMine() {
    if (this.state.draft) this.save({ ...this.state.draft, revision: this.uuid(), updatedAt: this.now() }, true)
  }
  prepareSend(content: string) {
    this.refresh()
    const { draft, ready, conflict } = this.state
    return ready && !conflict && draft?.text.trim() === content ? draft : null
  }
  acknowledge(sent: ChatDraft) {
    if (this.state.draft?.revision !== sent.revision) return
    try {
      if (this.read() !== this.baseline) {
        // A late successful send must never erase another tab's newer draft.
        this.edited = false; this.baseline = null
        this.emit({ draft: null }); this.refresh(); return
      }
    } catch { this.emit({ unavailable: true }) }
    this.edited = false
    this.save({ version: 1, text: '', replyToId: null, revision: this.uuid(), clientMessageId: this.uuid(), updatedAt: this.now() })
    this.emit({ restored: false })
  }
  reset() { this.baseline = null; this.edited = false; this.emit({ draft: null, ready: false, conflict: false, restored: false }) }
}

export function clearChatDrafts(storage: StorageLike) {
  const keys: string[] = []
  for (let i = 0; i < storage.length; i++) { const key = storage.key(i); if (key?.startsWith(CHAT_DRAFT_PREFIX)) keys.push(key) }
  for (const key of keys) storage.removeItem(key)
}
export function clearBrowserChatDrafts() {
  try { clearChatDrafts(window.localStorage) } catch { /* Browser storage can be disabled. */ }
  window.dispatchEvent(new Event(CHAT_DRAFT_RESET))
}
