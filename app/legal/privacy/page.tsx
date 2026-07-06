import Link from 'next/link'

export const metadata = { title: 'Privacy Policy — Gravity Souls' }

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <p
        className="text-eyebrow mb-4"
        style={{ letterSpacing: '0.12em' }}
      >
        Legal
      </p>
      <h1
        className="text-3xl font-semibold mb-6"
        style={{ color: 'var(--foreground)' }}
      >
        Privacy Policy
      </h1>
      <div
        className="rounded-2xl px-6 py-8 mb-8"
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid var(--border-soft)',
        }}
      >
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'var(--ink)', opacity: 0.72 }}
        >
          Our full Privacy Policy is being finalized. Check back soon.
        </p>
      </div>
      <Link
        href="/"
        className="text-sm transition-colors"
        style={{ color: 'var(--star)', textDecoration: 'none' }}
      >
        ← Return to the universe
      </Link>
    </main>
  )
}
