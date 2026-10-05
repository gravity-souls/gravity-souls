 'use client'
import { useEffect, useRef, useState } from 'react'
import { notifyInboxChanged } from '@/lib/inbox-client'
import { useTranslations } from 'next-intl'
import MessageContent from './MessageContent'
import SharedMessageCard from './SharedMessageCard'
import ImageMessage from './ImageMessage'
import type { ChatMessage } from '@/lib/chat-message-types'
import type { ExplorationOrigin } from '@/lib/exploration-return'
export default function OriginalMessageDialog({ id, conversationId, origin, viewerId, onClose }: { id:string;conversationId:string;origin?:ExplorationOrigin|null;viewerId:string;onClose:()=>void }) {
  const t=useTranslations('chatInteractions'), tw=useTranslations('inboxWorkflow'), dialog=useRef<HTMLDialogElement>(null)
  const [message,setMessage]=useState<ChatMessage|null>(null),[failed,setFailed]=useState(false),[readError,setReadError]=useState(false)
  useEffect(()=>{
    dialog.current?.showModal()
    const controller=new AbortController();let loading=false
    async function load(){
      if(loading||document.hidden)return;loading=true
      try {
        const response=await fetch(`/api/conversations/${conversationId}/messages/${encodeURIComponent(id)}`,{cache:'no-store',signal:controller.signal})
        if(!response.ok)throw new Error('unavailable')
        const row=await response.json() as ChatMessage
        if(controller.signal.aborted)return
        setMessage(row);setFailed(false);if(row.readAt||row.fromId===viewerId)setReadError(false)
        // Only the fully displayed original is acknowledged, never its quote preview.
        await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()))
        if(row.fromId!==viewerId&&!row.readAt&&!document.hidden&&dialog.current?.open&&!controller.signal.aborted){
          try {
            const read=await fetch(`/api/conversations/${conversationId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:[row.id]}),signal:controller.signal})
            if(!controller.signal.aborted){setReadError(!read.ok);if(read.ok)notifyInboxChanged()}
          }catch{if(!controller.signal.aborted)setReadError(true)}
        }
      }
      catch{if(!controller.signal.aborted){setMessage(null);setFailed(true)}}finally{loading=false}
    }
    const sync=()=>void load();sync();const interval=window.setInterval(sync,10000)
    window.addEventListener('focus',sync);document.addEventListener('visibilitychange',sync)
    return()=>{controller.abort();clearInterval(interval);window.removeEventListener('focus',sync);document.removeEventListener('visibilitychange',sync)}
  },[id,conversationId,viewerId])
  return <dialog ref={dialog} onClose={onClose} aria-label={t('original')} className="max-h-[85dvh] w-[min(90vw,32rem)] rounded-2xl border border-white/15 bg-slate-950 p-4 text-white backdrop:bg-black/80">
    <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-sm">{t('original')}</h2><button autoFocus onClick={()=>dialog.current?.close()} className="min-h-11 px-3 text-sm">{t('close')}</button></div>
    {readError&&<p role="status" className="mb-2 text-xs text-amber-200">{tw('readError')}</p>}
    {failed?<p role="status">{t('quoteUnavailable')}</p>:!message?<p role="status">{t('loadingOriginal')}</p>:message.type==='image'?<ImageMessage image={message.image}/>:message.type==='share'?<SharedMessageCard card={message.share??{available:false}} conversationId={conversationId} origin={origin}/>:<MessageContent content={message.content}/>}
  </dialog>
}
