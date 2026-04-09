// ─── Resonance loading skeleton ───────────────────────────────────────────────

export default function ResonanceLoading() {
  return (
    <div
      className="px-4 pt-8 pb-20 max-w-5xl mx-auto"
      style={{ paddingLeft: 'calc(var(--sidebar-w-collapsed) + 1rem)' }}
    >
      {/* Header skeleton */}
      <div className="flex flex-col gap-3 mb-10">
        <div className="rounded-full animate-pulse" style={{ width: 40, height: 8, background: 'rgba(167,139,250,0.1)' }} />
        <div className="rounded-full animate-pulse" style={{ width: 280, height: 36, background: 'rgba(167,139,250,0.08)' }} />
        <div className="rounded-full animate-pulse" style={{ width: 220, height: 12, background: 'rgba(167,139,250,0.05)' }} />
      </div>

      {/* Orbit placeholder */}
      <div className="flex items-center justify-center">
        <div
          className="rounded-full animate-pulse"
          style={{
            width: 420, height: 420,
            background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)',
            border: '1px solid rgba(167,139,250,0.06)',
          }}
        />
      </div>
    </div>
  )
}
