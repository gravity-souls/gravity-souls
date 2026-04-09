// Server component — pure CSS layers, no hooks needed.
// Renders the full layered cosmic atmosphere that sits beneath everything.

// Tiled SVG fractal noise rendered as a CSS background, creating a subtle
// film-grain / nebula-texture effect without any external image files.
const NOISE_URL =
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='0.055'/%3E%3C/svg%3E")`

export default function CosmicBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* ── Layer 1: Absolute void ─────────────────────────────────────── */}
      <div className="absolute inset-0" style={{ background: '#02020c' }} />

      {/* ── Layer 2: Deep violet crown — breathes slowly ──────────────── */}
      <div
        className="absolute inset-0 animate-nebula-breathe"
        style={{
          background:
            'radial-gradient(ellipse 100% 60% at 50% -8%, rgba(124,58,237,0.35) 0%, rgba(99,102,241,0.14) 42%, transparent 68%)',
        }}
      />

      {/* ── Layer 3: Secondary violet ring, offset left ───────────────── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 55% 40% at 20% 15%, rgba(139,92,246,0.14) 0%, transparent 65%)',
          animation: 'nebula-breathe 22s ease-in-out 4s infinite reverse',
        }}
      />

      {/* ── Layer 4: Deep indigo pool — bottom-right ──────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 65% 50% at 90% 92%, rgba(79,70,229,0.22) 0%, rgba(67,56,202,0.08) 45%, transparent 70%)',
        }}
      />

      {/* ── Layer 5: Cold cyan edge — far left ───────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 42% 38% at -4% 58%, rgba(14,165,233,0.1) 0%, transparent 72%)',
        }}
      />

      {/* ── Layer 6: Warm gold accent — far bottom ───────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 50% 25% at 60% 105%, rgba(245,158,11,0.07) 0%, transparent 70%)',
        }}
      />

      {/* ── Layer 7: Film-grain noise overlay ────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: NOISE_URL,
          backgroundSize: '250px 250px',
          mixBlendMode: 'overlay',
          opacity: 0.9,
        }}
      />
    </div>
  )
}
