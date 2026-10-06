'use client'

import { use, useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { notifyInboxChanged } from '@/lib/inbox-client'
import ImageComposer from '@/components/messages/ImageComposer'
import ImageMessage from '@/components/messages/ImageMessage'
import MessageQuote from '@/components/messages/MessageQuote'
import MessageActions from '@/components/messages/MessageActions'
import OriginalMessageDialog from '@/components/messages/OriginalMessageDialog'
import { quotePreview, preserveReactionState, type ReactionEmoji } from '@/lib/chat-interaction-types'
import type { ChatMessage as MsgData } from '@/lib/chat-message-types'
import SignalComposer from '@/components/social/SignalComposer'
import { useChatDraft } from '@/lib/use-chat-draft'
import MessageContent from '@/components/messages/MessageContent'
import SharedMessageCard from '@/components/messages/SharedMessageCard'
import ShareComposer from '@/components/messages/ShareComposer'
import type { ShareSelection } from '@/lib/chat-share-types'
import FirstTimeHint from '@/components/hints/FirstTimeHint'
import ExplorationReturnLink from '@/components/social/ExplorationReturnLink'
import { explorationOrigin, type ExplorationOrigin } from '@/lib/exploration-return'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import { planetDisplayName } from '@/lib/planet-display-name'
import type { PlanetConfig } from '@/types/planet'
// --- Types ---

interface PlanetData {
  id: string
  name: string
  avatarSymbol: string
  visual: { coreColor: string; accentColor: string }
  planetConfig?: PlanetConfig | null
}

function mergeMessages(previous: MsgData[], incoming: MsgData[]) {
  const map = new Map(previous.map(message=>[message.id,message]))
  for (const message of incoming) map.set(message.id,preserveReactionState(map.get(message.id),message))
  return [...map.values()].sort((a,b)=>a.sentAt.localeCompare(b.sentAt)||a.id.localeCompare(b.id))
}

// --- Message bubble ----------------------------------------------------------

function MessageBubble({
  msg,
  isOwn,
  color,
  conversationId,
  origin, viewerId, partnerName, disabled, highlighted, onReply, onReact, onOpenQuote,
}: {
  msg: MsgData
  isOwn: boolean
  color: string
  conversationId: string
  origin?: ExplorationOrigin | null
  viewerId: string
  partnerName: string
  disabled: boolean
  highlighted: boolean
  onReply: () => void
  onReact: (emoji:ReactionEmoji|null) => Promise<boolean>
  onOpenQuote: (id:string) => void
}) {
  const t = useTranslations('inboxWorkflow')
  const ti = useTranslations('chatInteractions')
  const locale = useLocale()
  return (
    <div id={`message-${msg.id}`} tabIndex={-1} className={`flex rounded-2xl outline-none ${isOwn ? 'justify-end' : 'justify-start'} ${highlighted ? 'ring-2 ring-violet-300/50' : ''}`}>
      <div
        className="min-w-0 max-w-[85%] rounded-2xl px-4 py-2.5 sm:max-w-[75%]"
        style={{
          background: isOwn ? `${color}22` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isOwn ? `${color}33` : 'rgba(255,255,255,0.06)'}`,
        }}
      >
        {msg.quote && <MessageQuote quote={msg.quote} viewerId={viewerId} partnerName={partnerName} onOpen={onOpenQuote} />}
        {msg.type === 'unavailable' ? <p className="text-xs text-slate-400">{ti('messageUnavailable')}</p> : msg.type === 'image' ? <ImageMessage image={msg.image} /> : msg.type === 'share' ? <SharedMessageCard card={msg.share ?? { available: false }} conversationId={conversationId} origin={origin} /> : <MessageContent content={msg.content} />}
        {msg.type !== 'unavailable' && <MessageActions reactions={msg.reactions} disabled={disabled} replyDisabled={!quotePreview(msg).available} onReply={onReply} onReact={onReact} />}
        <span
          className="block text-[10px] mt-1 text-right"
          style={{ color: 'var(--ghost)', opacity: 0.5 }}
        >
          {isOwn && msg.readAt && <span>{t('read')} · </span>}
          {new Date(msg.sentAt).toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  )
}

// --- Conversation header -----------------------------------------------------

function ConvHeader({
  planet,
  fallbackName,
  onBack,
}: {
  planet: PlanetData | null
  fallbackName: string
  onBack: () => void
}) {
  const t = useTranslations('messagesPage')
  const color =
    planet?.planetConfig?.tintColor ?? planet?.visual?.coreColor ?? '#a78bfa'
  return (
    <div
      className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3"
      style={{
        background: 'rgba(8,6,28,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <button
        onClick={onBack}
        className="text-sm"
        style={{ color: 'var(--ghost)' }}
      >
        &#8592;
      </button>
      {planet ? (
        <PlanetAvatar
          planetConfig={planet.planetConfig ?? undefined}
          size={32}
          glowColor={color}
        />
      ) : (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
          style={{ color, background: `${color}20` }}
        >
          ?
        </div>
      )}
      <div className="flex flex-col">
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--foreground)' }}
        >
          {planetDisplayName({
            displayName: fallbackName,
            name: planet?.name,
          }) || t('unknown')}
        </span>
      </div>
      {planet && (
        <Link
          href={`/planet/${planet.id}`}
          className="ml-auto text-xs"
          style={{ color: color, opacity: 0.7 }}
        >
          {t('viewPlanet')}
        </Link>
      )}
    </div>
  )
}

// --- ConversationPage ---------------------------------------------------------

interface Props {
  params: Promise<{ id: string }>
}

function ConversationPageInner({ params }: Props) {
  const origin = explorationOrigin(useSearchParams().get('from'))
  const t = useTranslations('messagesPage')
  const tCommon = useTranslations('common')
  const tw = useTranslations('inboxWorkflow')
  const ts = useTranslations('chatShares')
  const ti = useTranslations('chatInteractions')
  const [originalId,setOriginalId] = useState<string|null>(null)
  const [highlighted,setHighlighted] = useState<string|null>(null)
  const [attachmentBusy,setAttachmentBusy] = useState(false)
  const highlightTimer = useRef<ReturnType<typeof setTimeout>|null>(null)
  useEffect(()=>()=>{if(highlightTimer.current)clearTimeout(highlightTimer.current)},[])
  const pendingImageRef = useRef<{ id: string; key: string; replyToId:string|null } | null>(null)
  const { id } = use(params)
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)
  const historyScroll = useRef<HTMLDivElement>(null)
  const olderAnchor = useRef<{ height: number; top: number } | null>(null)
  const followingLatest = useRef(true)
  const historyLoaded = useRef(false)

  const [messages, setMessages] = useState<MsgData[]>([])
  const messagesRef = useRef<MsgData[]>([])
  const pendingShareRef = useRef<{ selection: ShareSelection; clientMessageId: string; replyToId: string|null } | null>(null)
  const sendLock = useRef(false)
  useEffect(() => { messagesRef.current = messages }, [messages])
  const [otherPlanet, setOtherPlanet] = useState<PlanetData | null>(null)
  // Fallback display name when the other participant has no active planet —
  // notably a self-deleted account, whose Planet[] rows are gone but whose
  // (now tombstoned) user.name still resolves via the API's `otherUser`.
  const [otherUserName, setOtherUserName] = useState('')
  const [myUserId, setMyUserId] = useState('')
  const draft = useChatDraft(myUserId, id)
  const replyToId = draft.draft?.replyToId ?? null
  const setReplyToId = (replyId: string | null) => draft.store.change(draft.draft?.text ?? '', replyId)
  const td = useTranslations('chatDrafts')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [olderCursor, setOlderCursor] = useState<string | null>(null)
  const [canSend, setCanSend] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [readError, setReadError] = useState(false)
  const [restoredReply, setRestoredReply] = useState<MsgData | null>(null)
  const replyInHistory = messages.find(message => message.id === replyToId)

  useEffect(() => {
    if (!replyToId || replyInHistory || loadError || !myUserId) return
    const controller = new AbortController()
    let inFlight = false
    const sync = async () => {
      if (inFlight || document.hidden) return
      inFlight = true
      try {
        const response = await fetch(`/api/conversations/${id}/messages/${encodeURIComponent(replyToId)}`, { cache: 'no-store', signal: controller.signal })
        if (!response.ok) throw new Error('unavailable')
        const message = await response.json() as MsgData
        if (!controller.signal.aborted) setRestoredReply(message)
      } catch { if (!controller.signal.aborted) setRestoredReply(null) }
      finally { inFlight = false }
    }
    const refresh = () => void sync()
    refresh()
    const interval = window.setInterval(refresh, 10000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { controller.abort(); clearInterval(interval); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [id, replyToId, replyInHistory, loadError, myUserId])

  useEffect(() => {
    const controller = new AbortController()
    let inFlight = false
    async function load() {
      if (inFlight || document.hidden) return
      inFlight = true
      try {
        const response = await fetch(`/api/conversations/${id}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (response.status === 401) {
          router.replace(
            '/sign-in?next=' + encodeURIComponent('/messages/' + id),
          )
          return
        }
        if (!response.ok) throw new Error('unavailable')
        const result = await response.json()
        if (controller.signal.aborted) return
        setMessages((previous) => mergeMessages(previous, result.messages))
        setOtherPlanet(result.otherPlanet)
        setOtherUserName(result.otherUser?.name ?? '')
        setMyUserId(result.viewerId)
        setCanSend(result.canSend)
        setOlderCursor((previous) =>
          historyLoaded.current ? previous : result.olderCursor,
        )
        setLoadError('')
        // The latest page does not include previously loaded history; refresh its quotes, cards and reactions too.
        const incoming = new Set(result.messages.map((message: MsgData) => message.id))
        const olderIds = messagesRef.current.filter(message => !incoming.has(message.id)).map(message => message.id)
        for (let start = 0; start < olderIds.length; start += 100) {
          const ids = olderIds.slice(start, start + 100)
          try {
            const refreshed = await fetch(`/api/conversations/${id}/message-state`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }), signal: controller.signal })
            if (!refreshed.ok) throw new Error('failed')
            const cards = await refreshed.json()
            if (controller.signal.aborted) return
            const returned = new Set(cards.messages.map((message: MsgData) => message.id))
            setMessages(previous => mergeMessages(previous.map(message => ids.includes(message.id) && !returned.has(message.id) ? { ...message, type:'unavailable', content:'', image:null, share:{available:false}, quote:null, reactions:[] } : message), cards.messages))
          } catch {
            if (!controller.signal.aborted) setMessages(previous => previous.map(message => ids.includes(message.id) ? { ...message, share: { available: false }, quote:message.quote?{available:false}:null, reactions:[], image:null } : message))
          }
        }
        const unread = result.messages
          .filter(
            (message: MsgData) =>
              message.fromId !== result.viewerId && !message.readAt,
          )
          .map((message: MsgData) => message.id)
        if (unread.length && !document.hidden) {
          const read = await fetch(`/api/conversations/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: unread }),
            signal: controller.signal,
          })
          if (!controller.signal.aborted) {
            setReadError(!read.ok)
            if (read.ok) notifyInboxChanged()
          }
        }
      } catch {
        if (!controller.signal.aborted) {
          setLoadError(tw('conversationUnavailable'))
          setOriginalId(null)
          setMessages(previous => previous.map(message => message.type === 'share' ? { ...message, share: { available: false }, quote:message.quote?{available:false}:null, reactions:[], image:null } : message))
        }
      } finally {
        inFlight = false
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    const sync = () => void load()
    const interval = window.setInterval(sync, 10000)
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', sync)
    return () => {
      controller.abort()
      window.clearInterval(interval)
      window.removeEventListener('focus', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [id, router, tw])

  async function loadOlder() {
    if (!olderCursor || loadingOlder) return
    setLoadingOlder(true)
    followingLatest.current = false
    historyLoaded.current = true
    try {
      const response = await fetch(
        `/api/conversations/${id}?before=${encodeURIComponent(olderCursor)}`,
        { cache: 'no-store' },
      )
      if (!response.ok) throw new Error('failed')
      const result = await response.json()
      if (historyScroll.current)
        olderAnchor.current = {
          height: historyScroll.current.scrollHeight,
          top: historyScroll.current.scrollTop,
        }
      setMessages((previous) => mergeMessages(previous, result.messages))
      setOlderCursor(result.olderCursor)
      const unread = result.messages
        .filter(
          (message: MsgData) => message.fromId !== myUserId && !message.readAt,
        )
        .map((message: MsgData) => message.id)
      if (unread.length) {
        const read = await fetch(`/api/conversations/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: unread }),
        })
        setReadError(!read.ok)
        if (read.ok) notifyInboxChanged()
      }
    } catch {
      setLoadError(tw('loadError'))
    } finally {
      setLoadingOlder(false)
    }
  }

  useEffect(() => {
    if (olderAnchor.current && historyScroll.current) {
      const saved = olderAnchor.current
      historyScroll.current.scrollTop =
        saved.top + historyScroll.current.scrollHeight - saved.height
      olderAnchor.current = null
      return
    }
    if (followingLatest.current)
      bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [messages])

  async function handleSend(content: string) {
    if (sendLock.current || draft.conflict || !draft.ready) return false
    const sentDraft = draft.store.prepareSend(content)
    if (!sentDraft || sentDraft.replyToId !== replyToId) return false
    sendLock.current = true
    setSending(true)
    setSendError('')

    // The persisted draft keeps this key across retries and page reloads.
    const clientMessageId = sentDraft.clientMessageId

    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, clientMessageId, replyToId }),
      })
      if (!res.ok) { const result=await res.json(); throw new Error(result.error==='replyUnavailable'?'replyUnavailable':'delivery-unconfirmed') }
      const real = (await res.json()) as MsgData
      followingLatest.current = true
      setMessages((prev) => mergeMessages(prev, [real]))
      notifyInboxChanged()
      draft.store.acknowledge(sentDraft)
      return true
    } catch (error) {
      setSendError(error instanceof Error && error.message==='replyUnavailable' ? ti('replyUnavailable') : t('deliveryUnconfirmed'))
      return false
    } finally {
      sendLock.current = false
      setSending(false)
    }
  }

  async function handleShare(selection: ShareSelection) {
    if (sendLock.current) return false
    sendLock.current = true
    setSending(true); setSendError('')
    if (pendingShareRef.current?.selection.kind !== selection.kind || pendingShareRef.current.selection.targetId !== selection.targetId || pendingShareRef.current.replyToId !== replyToId) pendingShareRef.current = { selection, clientMessageId: crypto.randomUUID(), replyToId }
    try {
      const response = await fetch(`/api/conversations/${id}/shares`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...selection, clientMessageId: pendingShareRef.current.clientMessageId, replyToId }) })
      if (!response.ok) { const result=await response.json(); throw new Error(result.error==='replyUnavailable'?'replyUnavailable':'failed') }
      const message = await response.json() as MsgData
      followingLatest.current = true
      setMessages(previous => mergeMessages(previous, [message]))
      pendingShareRef.current = null
      setReplyToId(null)
      notifyInboxChanged()
      return true
    } catch (error) { setSendError(error instanceof Error && error.message==='replyUnavailable' ? ti('replyUnavailable') : ts('sendFailed')); return false }
    finally { sendLock.current = false; setSending(false) }
  }

  async function handleImage(imageId: string): Promise<boolean | string> {
    if (sendLock.current) return false
    sendLock.current = true; setSending(true); setSendError('')
    if (pendingImageRef.current?.id !== imageId || pendingImageRef.current.replyToId !== replyToId) pendingImageRef.current = { id: imageId, key: crypto.randomUUID(), replyToId }
    try {
      const response = await fetch(`/api/conversations/${id}/images`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageId, clientMessageId: pendingImageRef.current.key, replyToId }) })
      const result = await response.json()
      if (!response.ok) { if(result.error==='replyUnavailable')setSendError(ti('replyUnavailable')); return result.error ?? 'sendFailed' }
      followingLatest.current = true; setMessages(previous => mergeMessages(previous, [result])); notifyInboxChanged(); pendingImageRef.current = null; setReplyToId(null)
      return true
    } catch { return false }
    finally { sendLock.current = false; setSending(false) }
  }

  function selectReply(message:MsgData) {
    if(sending||attachmentBusy||!canSend||loadError)return
    setReplyToId(message.id)
    document.getElementById(`composer-${id}`)?.querySelector('textarea')?.focus()
  }
  function openOriginal(messageId:string) {
    const element=document.getElementById(`message-${messageId}`)
    if(element){ followingLatest.current=false; element.scrollIntoView({behavior:'smooth',block:'center'});element.focus({preventScroll:true});setHighlighted(messageId);if(highlightTimer.current)clearTimeout(highlightTimer.current);highlightTimer.current=setTimeout(()=>setHighlighted(null),3000) }
    else setOriginalId(messageId)
  }
  async function react(messageId:string,emoji:ReactionEmoji|null) {
    try {
      const response=await fetch(`/api/conversations/${id}/messages/${encodeURIComponent(messageId)}/reaction`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({emoji})})
      if(!response.ok)return false
      const result=await response.json()
      setMessages(previous=>previous.map(message=>message.id===messageId?preserveReactionState(message,{...message,...result}):message))
      return true
    } catch {return false}
  }

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: 'var(--background)' }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--star)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  const selectedReply = replyToId ? (loadError ? { available:false as const } : quotePreview(replyInHistory ?? (restoredReply?.id === replyToId ? restoredReply : undefined))) : null
  const composerDisabled = sending || attachmentBusy || !canSend || !!loadError || !draft.ready || draft.conflict
  const accentColor =
    otherPlanet?.planetConfig?.tintColor ??
    otherPlanet?.visual?.coreColor ??
    '#a78bfa'

  return (
    <div
      className="flex flex-col"
      style={{
        height: '100dvh',
        minHeight: '100dvh',
        background: 'var(--background)',
      }}
    >
      <ConvHeader
        planet={loadError ? null : otherPlanet}
        fallbackName={loadError ? tw('conversationUnavailable') : otherUserName}
        onBack={() => router.push('/messages')}
      />
      <ExplorationReturnLink origin={origin} />

      {loadError && (
        <p role="alert" className="px-4 py-3 text-sm text-rose-200">
          {loadError}
          <Link href="/messages" className="ml-3 text-violet-200">
            {tw('backInbox')}
          </Link>
        </p>
      )}
      {readError && (
        <p role="status" className="px-4 py-2 text-xs text-amber-200">
          {tw('readError')}
        </p>
      )}
      {/* Message list */}
      <div
        ref={historyScroll}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-3"
        onScroll={(event) => {
          const element = event.currentTarget
          followingLatest.current =
            element.scrollHeight - element.scrollTop - element.clientHeight < 80
        }}
      >
        {olderCursor && (
          <button
            disabled={loadingOlder}
            onClick={() => void loadOlder()}
            className="py-2 text-xs text-violet-200"
          >
            {tw('olderMessages')}
          </button>
        )}
        {!loadError && messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isOwn={msg.fromId === myUserId}
            color={accentColor}
            conversationId={id}
            origin={origin}
            viewerId={myUserId}
            partnerName={otherUserName}
            disabled={composerDisabled}
            highlighted={highlighted===msg.id}
            onReply={()=>selectReply(msg)}
            onReact={emoji=>react(msg.id,emoji)}
            onOpenQuote={openOriginal}
          />
        ))}

        {messages.length === 0 && (
          <p
            className="text-center text-xs italic mt-8"
            style={{ color: 'var(--ghost)', opacity: 0.45 }}
          >
            {t('sendFirstSignal')}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {myUserId && messages.some(message => message.fromId === myUserId) && (
        <div className="px-4 pb-2">
          <FirstTimeHint
            hintKey="messages-first-dm"
            title={tCommon('firstDmHintTitle')}
            body={tCommon('firstDmHintBody')}
          />
        </div>
      )}

      {/* Composer */}
      {sendError && (
        <p role="alert" className="px-4 py-2 text-sm text-red-300">
          {sendError}
        </p>
      )}
      {sending && (
        <p role="status" className="px-4 py-2 text-sm">
          {t('sendingMessage')}
        </p>
      )}
      {!canSend && (
        <p className="px-4 py-3 text-xs text-slate-400">{tw('archived')}</p>
      )}
      {selectedReply && <div className="shrink-0 px-4 pt-2"><div className="flex items-center justify-between gap-2 text-xs text-violet-200"><span>{ti('replying')}</span><button disabled={sending||attachmentBusy} onClick={()=>setReplyToId(null)} className="min-h-9 px-2">{ti('cancelReply')}</button></div><MessageQuote quote={selectedReply} viewerId={myUserId} partnerName={otherUserName}/></div>}
      <ImageComposer conversationId={id} disabled={composerDisabled} onBusyChange={setAttachmentBusy} onSend={handleImage} />
      <ShareComposer conversationId={id} disabled={composerDisabled} onSend={handleShare} />
      {!loadError && canSend && <div className="shrink-0 px-4 pt-2 text-xs text-slate-400">
        <p>{td('localOnly')}</p>
        {draft.unavailable && <p role="status" className="text-amber-200">{td('unavailable')}</p>}
        {draft.restored && <p role="status">{td('restored')}</p>}
        {draft.conflict && <div role="status" className="text-amber-200"><p>{td('conflict')}</p><div className="flex flex-wrap gap-2"><button disabled={sending || attachmentBusy} className="min-h-11 px-2" onClick={() => draft.store.useOther()}>{td('useOther')}</button><button disabled={sending || attachmentBusy} className="min-h-11 px-2" onClick={() => draft.store.keepMine()}>{td('keepMine')}</button></div></div>}
        {(draft.draft?.text || replyToId) && !draft.conflict && <button className="min-h-11" disabled={composerDisabled} onClick={() => draft.store.change('', null)}>{td('discard')}</button>}
      </div>}
      <div id={`composer-${id}`} className="shrink-0"><SignalComposer
        onSend={handleSend}
        value={loadError || !canSend ? '' : draft.draft?.text ?? ''}
        onValueChange={value => draft.store.change(value, replyToId)}
        disabled={composerDisabled}
        accentColor={accentColor}
        placeholder={t('transmitTo', {
          name: planetDisplayName({
            displayName: otherUserName,
            name: otherPlanet?.name,
          }) || t('unknown'),
        })}
      /></div>
      {originalId && !loadError && <OriginalMessageDialog key={originalId} id={originalId} conversationId={id} origin={origin} viewerId={myUserId} onClose={()=>setOriginalId(null)}/>}
    </div>
  )
}

function ConversationRoute(props: Props) {
  const { id } = use(props.params)
  return <ConversationPageInner key={id} {...props} />
}
export default function ConversationPage(props: Props) {
  return <Suspense><ConversationRoute {...props} /></Suspense>
}
