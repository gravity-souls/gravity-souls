import Link from 'next/link'
import GlowButton from '@/components/ui/GlowButton'

// --- Global 404 ---------------------------------------------------------------

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-8">
      {/* Ambient glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 400, height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
        aria-hidden="true"
      />

      {/* Symbol */}
      <div
        className="relative flex items-center justify-center animate-float"
        style={{ width: 80, height: 80 }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
          }}
          aria-hidden="true"
        />
        <span
          className="relative text-4xl"
          style={{ color: 'var(--star)', opacity: 0.5 }}
          aria-hidden="true"
        >
          ◌
        </span>
      </div>

      {/* Copy */}
      <div className="flex flex-col gap-3 max-w-sm">
        <p className="text-eyebrow">404</p>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--foreground)' }}>
          This planet doesn&apos;t exist
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.65 }}>
          The coordinates you followed lead to empty space. The planet may have drifted, or never existed.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <GlowButton href="/" variant="primary">
          Return to universe
        </GlowButton>
        <GlowButton href="/stream" variant="ghost">
          Explore the stream
        </GlowButton>
      </div>
    </div>
  )
}
