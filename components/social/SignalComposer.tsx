'use client'

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslations } from 'next-intl'
import { Smile, X } from 'lucide-react'
import { CHAT_EMOJI, insertMessageEmoji } from '@/lib/chat-content'
import { MAX_MESSAGE_LENGTH, messageLength, truncateMessage } from '@/lib/message-limits'

interface Props {
  onSend: (content: string) => Promise<boolean>
  disabled?: boolean
  placeholder?: string
  accentColor?: string
  value?: string
  onValueChange?: (value: string) => void
}

export default function SignalComposer({ onSend, disabled = false, placeholder, accentColor = '#a78bfa', value: controlledValue, onValueChange }: Props) {
  const t = useTranslations('chatContent')
  const tA11y = useTranslations('a11y')
  const [localValue, setLocalValue] = useState('')
  const value = controlledValue ?? localValue
  const setValue = onValueChange ?? setLocalValue
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const textarea = useRef<HTMLTextAreaElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const container = useRef<HTMLDivElement>(null)
  const palette = useRef<HTMLDivElement>(null)
  const sending = useRef(false)
  const caret = useRef<number | null>(null)
  const paletteId = useId(), hintId = useId()
  const locked = disabled || pending

  useEffect(() => {
    const input = textarea.current
    if (!input) return
    input.style.height = 'auto'
    input.style.height = `${Math.min(120, input.scrollHeight)}px`
    if (caret.current !== null) {
      input.focus()
      input.setSelectionRange(caret.current, caret.current)
      caret.current = null
    }
  }, [value])

  useEffect(() => {
    if (!open) return
    palette.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])

  async function handleSend() {
    const trimmed = value.trim()
    if (!trimmed || locked || sending.current) return
    sending.current = true
    setPending(true); setOpen(false); setError('')
    try {
      if (await onSend(trimmed)) {
        // Controlled composers clear the acknowledged revision in their owner.
        if (!onValueChange) setLocalValue('')
      }
    } catch { setError('sendFailed') }
    finally { sending.current = false; setPending(false) }
  }

  function handleKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229 && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      event.preventDefault()
      void handleSend()
    }
  }

  function addEmoji(emoji: string) {
    if (locked) return
    const input = textarea.current
    const result = insertMessageEmoji(value, input?.selectionStart ?? value.length, input?.selectionEnd ?? value.length, emoji)
    if (!result) { setError('limitReached'); return }
    caret.current = result.caret
    setValue(result.value); setError(''); setOpen(false)
    // Replacing an identical selection does not trigger the value effect.
    if (result.value === value && input) {
      input.focus(); input.setSelectionRange(result.caret, result.caret); caret.current = null
    }
  }

  return (
    <div ref={container} className="sticky bottom-0 z-10 shrink-0 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]" style={{ background: 'linear-gradient(0deg, rgba(3,3,15,0.97) 0%, rgba(3,3,15,0.88) 100%)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(167,139,250,0.07)' }} onKeyDown={event => {
      if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false); toggle.current?.focus() }
    }}>
      {open && <div ref={palette} id={paletteId} role="region" aria-label={t('emojiPicker')} className="mb-3 max-h-[30dvh] overflow-y-auto rounded-2xl border border-white/15 bg-[#14112b] p-3 shadow-xl">
        <div className="mb-2 flex items-center justify-between text-xs text-violet-100"><span>{t('emojiPicker')}</span><button type="button" onClick={() => { setOpen(false); toggle.current?.focus() }} aria-label={t('closeEmoji')} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10"><X size={16} /></button></div>
        <div className="grid grid-cols-5 gap-1 sm:grid-cols-10">{CHAT_EMOJI.map(([key, emoji]) => <button key={key} type="button" disabled={locked} onClick={() => addEmoji(emoji)} aria-label={t(`emoji.${key}`)} title={t(`emoji.${key}`)} className="flex min-h-11 items-center justify-center rounded-xl text-2xl hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300 disabled:opacity-40">{emoji}</button>)}</div>
      </div>}
      <div className="flex items-end gap-2 rounded-2xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${value.trim() ? accentColor + '30' : 'rgba(167,139,250,0.10)'}` }}>
        <button ref={toggle} type="button" disabled={locked} aria-label={t('addEmoji')} aria-expanded={open} aria-controls={paletteId} onClick={() => setOpen(v => !v)} className="flex h-11 w-10 shrink-0 items-center justify-center rounded-xl text-violet-200 hover:bg-white/10 disabled:opacity-40"><Smile size={20} /></button>
        <textarea ref={textarea} value={value} onChange={event => { setValue(truncateMessage(event.target.value)); setError('') }} onKeyDown={handleKey} placeholder={placeholder ?? t('placeholder')} aria-label={placeholder ?? t('placeholder')} aria-describedby={hintId} rows={1} maxLength={MAX_MESSAGE_LENGTH * 2} disabled={locked} className="min-w-0 flex-1 resize-none bg-transparent py-2 text-sm leading-relaxed outline-none" style={{ color: 'var(--ink)', caretColor: accentColor, minHeight: 44, maxHeight: 120, overflowY: 'auto' }} />
        <button type="button" onClick={() => void handleSend()} disabled={!value.trim() || locked} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg disabled:opacity-40" style={{ background: value.trim() && !locked ? 'linear-gradient(135deg, rgba(124,58,237,0.7), rgba(79,70,229,0.6))' : 'rgba(255,255,255,0.04)', border: `1px solid ${accentColor}30`, color: '#e8e0ff' }} aria-label={tA11y('sendSignal')}>↑</button>
      </div>
      <div id={hintId} className="mt-2 flex items-start justify-between gap-2 text-[11px] text-white/50">
        <span className="hidden [@media(hover:hover)_and_(pointer:fine)]:inline">{t('desktopHint')}</span>
        <span className="[@media(hover:hover)_and_(pointer:fine)]:hidden">{t('mobileHint')}</span>
        <span className="shrink-0">{t('characterCount', { count: messageLength(value), max: MAX_MESSAGE_LENGTH })}</span>
      </div>
      {error && <p role="status" className="mt-2 text-xs text-rose-200">{t(error)}</p>}
    </div>
  )
}
