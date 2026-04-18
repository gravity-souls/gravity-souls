// --- Planet loading skeleton --------------------------------------------------

export default function PlanetLoading() {
  return (
    <div
      className="px-4 pt-6 pb-20 max-w-6xl mx-auto"
      style={{ paddingLeft: 'calc(var(--sidebar-w-collapsed) + 1rem)' }}
    >
      {/* Breadcrumb */}
      <div className="rounded-full animate-pulse mb-6" style={{ width: 120, height: 10, background: 'rgba(167,139,250,0.07)' }} />

      {/* Hero */}
      <div className="flex flex-col lg:flex-row gap-8 mb-10">
        <div className="shrink-0 flex flex-col items-center gap-4">
          <div className="rounded-full animate-pulse" style={{ width: 180, height: 180, background: 'rgba(167,139,250,0.07)' }} />
          <div className="rounded-full animate-pulse" style={{ width: 120, height: 14, background: 'rgba(167,139,250,0.06)' }} />
          <div className="rounded-full animate-pulse" style={{ width: 80, height: 10, background: 'rgba(167,139,250,0.04)' }} />
        </div>
        <div className="flex-1 flex flex-col gap-4 pt-4">
          <div className="rounded-full animate-pulse" style={{ width: '60%', height: 28, background: 'rgba(167,139,250,0.08)' }} />
          <div className="rounded-full animate-pulse" style={{ width: '80%', height: 14, background: 'rgba(167,139,250,0.05)' }} />
          <div className="flex gap-2 mt-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-full animate-pulse" style={{ width: 64, height: 22, background: 'rgba(167,139,250,0.06)' }} />
            ))}
          </div>
        </div>
      </div>

      {/* Module grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl animate-pulse"
            style={{ height: 120, background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.06)' }}
          />
        ))}
      </div>
    </div>
  )
}
