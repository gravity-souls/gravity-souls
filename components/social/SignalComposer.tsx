'use client'

import { useState, type KeyboardEvent } from 'react'

// --- SignalComposer -----------------------------------------------------------
// Sticky bottom composer for the conversation detail page.

interface Props {
  onSend:       (content: string) => void
  disabled?:    boolean
  placeholder?: string
  accentColor?: string
}

export default function SignalComposer({
  onSend,
  disabled = false,
  placeholder = 'Transmit a signal…',
  accentColor = '#a78bfa',
}: Props) {
  const [value, setValue] = useState('')

  function handleSend() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className="sticky bottom-0 z-10 px-4 py-3"
      style={{
        background: 'linear-gradient(0deg, rgba(3,3,15,0.97) 0%, rgba(3,3,15,0.88) 100%)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(167,139,250,0.07)',
      }}
    >
      <div
        className="flex items-end gap-3 px-4 py-2.5 rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${value.trim() ? accentColor + '30' : 'rgba(167,139,250,0.10)'}`,
          transition: 'border-color 0.2s',
        }}
      >
        {/* Textarea */}
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          aria-label={placeholder}
          rows={1}
          disabled={disabled}
          className="flex-1 bg-transparent text-sm outline-none resize-none leading-relaxed"
          style={{
            color: 'var(--ink)',
            caretColor: accentColor,
            minHeight: 24,
            maxHeight: 120,
            overflowY: 'auto',
          }}
        />

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all duration-200"
          style={{
            background: value.trim() && !disabled
              ? `linear-gradient(135deg, rgba(124,58,237,0.7), rgba(79,70,229,0.6))`
              : 'rgba(255,255,255,0.04)',
            border: `1px solid ${value.trim() && !disabled ? accentColor + '50' : 'rgba(167,139,250,0.10)'}`,
            color: value.trim() && !disabled ? '#e8e0ff' : 'var(--ghost)',
            cursor: value.trim() && !disabled ? 'pointer' : 'not-allowed',
            opacity: value.trim() && !disabled ? 1 : 0.45,
          }}
          aria-label="Send signal"
        >
          ↑
        </button>
      </div>

      <p
        className="text-center text-[9px] mt-1.5"
        style={{ color: 'var(--ghost)', opacity: 0.35 }}
      >
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  )
}
