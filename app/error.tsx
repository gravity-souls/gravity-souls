'use client'

// --- Global error boundary ----------------------------------------------------
// Catches unhandled errors in the React tree and renders a branded fallback.

import { useEffect } from 'react'
import GlowButton from '@/components/ui/GlowButton'

interface Props {
  error:  Error & { digest?: string }
  reset:  () => void
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    // Log to an error reporting service in production
    console.error('[Gravity-Souls error]', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-8">
      {/* Ambient glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 400, height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(248,113,113,0.06) 0%, transparent 70%)',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
        aria-hidden="true"
      />

      {/* Symbol */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: 72, height: 72 }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(248,113,113,0.12) 0%, transparent 70%)' }}
          aria-hidden="true"
        />
        <span
          className="relative text-3xl"
          style={{ color: '#f87171', opacity: 0.6 }}
          aria-hidden="true"
        >
          ◈
        </span>
      </div>

      {/* Copy */}
      <div className="flex flex-col gap-3 max-w-sm">
        <p className="text-eyebrow">Signal disrupted</p>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
          Something went wrong
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.65 }}>
          An unexpected error occurred while rendering this part of the universe. You can try again or return home.
        </p>
        {error.digest && (
          <p className="text-[10px] font-mono" style={{ color: 'var(--ghost)', opacity: 0.4 }}>
            {error.digest}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium tracking-wide transition-all duration-300 nebula-gradient text-white shadow-lg hover:opacity-90"
        >
          Try again
        </button>
        <GlowButton href="/" variant="ghost">
          Return to universe
        </GlowButton>
      </div>
    </div>
  )
}
