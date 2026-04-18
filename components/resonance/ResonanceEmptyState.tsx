import GlowButton from '@/components/ui/GlowButton'

// --- ResonanceEmptyState ------------------------------------------------------
// Shown on /resonance when the viewer is an Explorer (no planet formed yet).
// Teases the orbital system without full reveal.

export default function ResonanceEmptyState() {
  return (
    <div className="relative flex flex-col items-center justify-center gap-8 py-16 px-6">

      {/* Ghost orbit ring */}
      <div
        className="relative flex items-center justify-center"
        aria-hidden="true"
        style={{ width: 280, height: 280 }}
      >
        {/* Outer ring */}
        <div
          className="absolute rounded-full"
          style={{
            inset: 0,
            border: '1px dashed rgba(167,139,250,0.15)',
            borderRadius: '50%',
          }}
        />
        {/* Inner ring */}
        <div
          className="absolute rounded-full"
          style={{
            inset: 60,
            border: '1px dashed rgba(167,139,250,0.08)',
            borderRadius: '50%',
          }}
        />

        {/* Fogged planet dots */}
        {[
          { top: '10%',  left: '50%',  color: '#818cf8', size: 28 },
          { top: '50%',  left: '92%',  color: '#34d399', size: 24 },
          { top: '85%',  left: '72%',  color: '#f87171', size: 20 },
          { top: '80%',  left: '22%',  color: '#fbbf24', size: 22 },
          { top: '42%',  left: '4%',   color: '#a78bfa', size: 26 },
        ].map(({ top, left, color, size }, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              top, left,
              width: size, height: size,
              transform: 'translate(-50%, -50%)',
              background: color,
              opacity: 0.18,
              filter: 'blur(4px)',
              boxShadow: `0 0 12px ${color}`,
            }}
          />
        ))}

        {/* Center void */}
        <div
          className="relative z-10 w-16 h-16 rounded-full flex items-center justify-center text-2xl"
          style={{
            background: 'rgba(8,6,28,0.80)',
            border: '1px solid rgba(167,139,250,0.15)',
            color: 'rgba(167,139,250,0.25)',
            backdropFilter: 'blur(8px)',
          }}
        >
          ◌
        </div>

        {/* Fog overlay */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(4,3,18,0.85) 80%)',
          }}
        />
      </div>

      {/* Copy */}
      <div className="flex flex-col items-center gap-3 text-center max-w-xs">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
          Your orbit is empty
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.6 }}>
          Five planets are drawn into resonance with yours each day.
          Form your planet first  -  then the field aligns.
        </p>
      </div>

      <GlowButton href="/create-planet" variant="primary" className="px-8 py-3.5 text-sm">
        Begin formation
      </GlowButton>

    </div>
  )
}
