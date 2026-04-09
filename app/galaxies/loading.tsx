// ─── Galaxies loading skeleton ────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="flex flex-col gap-4 p-6 rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(167,139,250,0.07)' }}
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0 rounded-full animate-pulse" style={{ width: 48, height: 48, background: 'rgba(167,139,250,0.08)' }} />
        <div className="flex flex-col gap-2 flex-1">
          <div className="rounded-full animate-pulse" style={{ width: '55%', height: 12, background: 'rgba(167,139,250,0.08)' }} />
          <div className="rounded-full animate-pulse" style={{ width: '80%', height: 9, background: 'rgba(167,139,250,0.05)' }} />
        </div>
      </div>
      <div className="flex gap-1.5">
        <div className="rounded-full animate-pulse" style={{ width: 52, height: 18, background: 'rgba(167,139,250,0.06)' }} />
        <div className="rounded-full animate-pulse" style={{ width: 64, height: 18, background: 'rgba(167,139,250,0.06)' }} />
        <div className="rounded-full animate-pulse" style={{ width: 44, height: 18, background: 'rgba(167,139,250,0.06)' }} />
      </div>
    </div>
  )
}

export default function GalaxiesLoading() {
  return (
    <div className="px-6 pt-8 pb-20 max-w-6xl mx-auto" style={{ paddingLeft: 'calc(var(--sidebar-w-collapsed) + 1.5rem)' }}>
      <div className="flex flex-col gap-2 mb-8">
        <div className="rounded-full animate-pulse" style={{ width: 64, height: 8, background: 'rgba(167,139,250,0.1)' }} />
        <div className="rounded-full animate-pulse" style={{ width: 180, height: 24, background: 'rgba(167,139,250,0.08)' }} />
      </div>
      <div className="flex gap-2 mb-8 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl animate-pulse shrink-0" style={{ width: 100, height: 32, background: 'rgba(167,139,250,0.06)' }} />
        ))}
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  )
}
