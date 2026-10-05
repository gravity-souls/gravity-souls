 'use client'
import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { REACTION_CHOICES, type ReactionEmoji, type ReactionSummary } from '@/lib/chat-interaction-types'
export default function MessageActions({ reactions=[], disabled, replyDisabled, onReply, onReact }: { reactions?: ReactionSummary[]; disabled?: boolean; replyDisabled?:boolean; onReply: () => void; onReact: (emoji: ReactionEmoji | null) => Promise<boolean> }) {
  const t=useTranslations('chatInteractions'), te=useTranslations('chatContent')
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false)
  const lock=useRef(false), pending=useRef<{emoji:ReactionEmoji|null}|null>(null)
  async function react(emoji:ReactionEmoji|null){
    if(disabled||lock.current)return
    lock.current=true;setBusy(true);setFailed(false);pending.current={emoji}
    try{if(!await onReact(emoji))throw new Error('unconfirmed');pending.current=null;setOpen(false)}
    catch{setFailed(true)}finally{lock.current=false;setBusy(false)}
  }
  return <div className="mt-2 text-xs" onKeyDown={event=>{if(event.key==='Escape')setOpen(false)}}>
    <div className="flex flex-wrap items-center gap-1">
      {reactions.map(reaction=>{const choice=REACTION_CHOICES.find(([,emoji])=>emoji===reaction.emoji);return <button key={reaction.emoji} aria-pressed={reaction.mine} aria-label={t(reaction.mine?'removeReaction':'setReaction',{emoji:te(`emoji.${choice?.[0] ?? 'thumbsUp'}`),count:reaction.count})} disabled={disabled||busy} onClick={()=>void react(reaction.mine?null:reaction.emoji)} className={`min-h-11 rounded-full border px-3 ${reaction.mine?'border-violet-300/40 bg-violet-400/15':'border-white/10'} disabled:opacity-40`}>{reaction.emoji} {reaction.count}</button>})}
      <button disabled={disabled||busy||replyDisabled} title={replyDisabled?t('quoteUnavailable'):undefined} onClick={onReply} className="min-h-11 px-2 text-slate-400 disabled:opacity-40">{t('reply')}</button>
      <button disabled={disabled||busy} onClick={()=>setOpen(value=>!value)} aria-expanded={open} className="min-h-11 px-2 text-slate-400 disabled:opacity-40">{t('react')}</button>
    </div>
    {open&&<div role="group" aria-label={t('chooseReaction')} className="mt-1 flex flex-wrap rounded-xl border border-white/10 bg-slate-950 p-1">{REACTION_CHOICES.map(([key,emoji])=><button key={key} aria-label={te(`emoji.${key}`)} disabled={disabled||busy} onClick={()=>void react(emoji)} className="flex h-11 w-11 items-center justify-center rounded-lg text-xl hover:bg-white/10 disabled:opacity-40">{emoji}</button>)}</div>}
    {busy&&<p role="status" className="py-1 text-slate-400">{t('updating')}</p>}
    {failed&&<p role="alert" className="py-1 text-rose-200">{t('reactionFailed')}<button disabled={disabled||busy} onClick={()=>{if(pending.current)void react(pending.current.emoji)}} className="ml-2 min-h-11 text-violet-200">{t('retry')}</button></p>}
  </div>
}
