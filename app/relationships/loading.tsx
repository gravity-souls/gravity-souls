// --- Relationships loading skeleton ------------------------------------------

function SkeletonCard() {
  return (
    <div
      className="flex items-center gap-4 px-4 py-4 rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(167,139,250,0.07)' }}
    >
      <div
        className="shrink-0 rounded-full animate-pulse"
        style={{ width: 48, height: 48, background: 'rgba(167,139,250,0.08)' }}
      />
      <div className="flex-1 flex flex-col gap-2">
        <div className="rounded-full animate-pulse" style={{ width: '35%', height: 10, background: 'rgba(167,139,250,0.08)' }} />
        <div className="rounded-full animate-pulse" style={{ width: '60%', height: 8, background: 'rgba(167,139,250,0.05)' }} />
      </div>
    </div>
  )
}

export default function RelationshipsLoading() {
  return (
    <div className="px-6 pt-8 pb-16 max-w-2xl mx-auto" style={{ paddingLeft: 'calc(var(--sidebar-w-collapsed) + 1.5rem)' }}>
      <div className="flex flex-col gap-2 mb-8">
        <div className="rounded-full animate-pulse" style={{ width: 80, height: 8, background: 'rgba(167,139,250,0.1)' }} />
        <div className="rounded-full animate-pulse" style={{ width: 160, height: 20, background: 'rgba(167,139,250,0.08)' }} />
      </div>
      <div className="flex flex-col gap-8">
        {Array.from({ length: 2 }).map((_, gi) => (
          <div key={gi} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full animate-pulse" style={{ width: 80, height: 18, background: 'rgba(167,139,250,0.08)' }} />
              <div className="flex-1 h-px" style={{ background: 'rgba(167,139,250,0.08)' }} />
            </div>
            <div className="flex flex-col gap-2">
              {Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
