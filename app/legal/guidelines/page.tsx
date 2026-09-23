import Link from 'next/link'
import type { ReactNode } from 'react'
import { SUPPORT_EMAIL } from '@/lib/legal-config'

export const metadata = { title: 'Community Guidelines — Gravity Souls' }

function Pending({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-[11px] font-medium align-middle"
      style={{
        color: 'var(--star)',
        border: '1px solid var(--border-soft)',
        background: 'rgba(255,255,255,0.03)',
      }}
    >
      Pending — {children}
    </span>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-7 last:mb-0">
      <h2
        className="text-sm font-semibold mb-2"
        style={{ color: 'var(--foreground)' }}
      >
        {title}
      </h2>
      <div
        className="text-sm leading-relaxed space-y-2"
        style={{ color: 'var(--ink)', opacity: 0.82 }}
      >
        {children}
      </div>
    </section>
  )
}

export default function GuidelinesPage() {
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
        Community Guidelines
      </h1>
      <div
        className="rounded-2xl px-6 py-8 mb-8"
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid var(--border-soft)',
        }}
      >
        <p
          className="text-xs leading-relaxed mb-8"
          style={{ color: 'var(--ink)', opacity: 0.6 }}
        >
          This is a working draft of our Community Guidelines, not a finalized policy —
          treat it as a preview of what we&rsquo;re building toward, not yet in force.
        </p>

        <Section title="1. Our values">
          <p>
            Gravity Souls is a semi-anonymous social universe built around genuine connection.
            We favor thoughtful presence over performance — your planet is a space to be
            yourself, and the galaxies you join are shared spaces to be treated with the same
            care you&rsquo;d want in return.
          </p>
        </Section>

        <Section title="2. Expected behavior">
          <p>
            Be respectful, be honest about who you are, and engage with curiosity rather than
            judgment. Respect other members&rsquo; boundaries, including when someone chooses
            not to connect or replies to end a conversation.
          </p>
        </Section>

        <Section title="3. Prohibited conduct">
          <p>The following are never allowed on Gravity Souls:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Harassment, threats, or targeted abuse of another member</li>
            <li>Hate speech or content that attacks people based on who they are</li>
            <li>Impersonation of another person, planet, or organization</li>
            <li>Spam, scams, or inauthentic/automated behavior</li>
            <li>Illegal content or activity of any kind</li>
          </ul>
        </Section>

        <Section title="4. Reporting and enforcement">
          <p>
            If something violates these guidelines, you can report it directly from the
            profile, post, or message in question. Reports are reviewed by our team and are
            never disclosed to the person being reported.
          </p>
        </Section>

        <Section title="5. Consequences">
          <p>
            Depending on the severity and history of a violation, we may issue a warning,
            temporarily suspend an account, or permanently ban it from the platform.
          </p>
        </Section>

        <Section title="6. Contact">
          <p>
            {SUPPORT_EMAIL ?? <Pending>contact email</Pending>}
          </p>
        </Section>
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
