// --- Saved loading skeleton ---------------------------------------------------

function SkeletonCard() {
  return (
    <div
      className="flex flex-col gap-4 p-5 rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(167,139,250,0.07)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="shrink-0 rounded-full animate-pulse"
          style={{ width: 48, height: 48, background: 'rgba(167,139,250,0.08)' }}
        />
        <div className="flex flex-col gap-2 flex-1">
          <div className="rounded-full animate-pulse" style={{ width: '50%', height: 10, background: 'rgba(167,139,250,0.08)' }} />
          <div className="rounded-full animate-pulse" style={{ width: '75%', height: 8, background: 'rgba(167,139,250,0.05)' }} />
        </div>
      </div>
      <div className="flex gap-1.5">
        <div className="rounded-full animate-pulse" style={{ width: 56, height: 18, background: 'rgba(167,139,250,0.06)' }} />
        <div className="rounded-full animate-pulse" style={{ width: 48, height: 18, background: 'rgba(167,139,250,0.06)' }} />
      </div>
    </div>
  )
}

export default function SavedLoading() {
  return (
    <div className="px-6 pt-8 pb-16 max-w-5xl mx-auto" style={{ paddingLeft: 'calc(var(--sidebar-w-collapsed) + 1.5rem)' }}>
      <div className="flex flex-col gap-2 mb-8">
        <div className="rounded-full animate-pulse" style={{ width: 80, height: 8, background: 'rgba(167,139,250,0.1)' }} />
        <div className="rounded-full animate-pulse" style={{ width: 120, height: 20, background: 'rgba(167,139,250,0.08)' }} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  )
}
