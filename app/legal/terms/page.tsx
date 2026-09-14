import Link from 'next/link'
import type { ReactNode } from 'react'

export const metadata = { title: 'Terms of Service — Gravity Souls' }

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

export default function TermsPage() {
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
        Terms of Service
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
          This is a working draft, not a finalized legal document — nothing below has been
          reviewed by counsel or approved as our actual Terms of Service yet. Sections marked
          Pending are still missing entirely; the rest is placeholder language subject to
          change. Do not rely on this page.
        </p>

        <Section title="1. Who we are">
          <p>
            <Pending>legal entity name and registered address</Pending>
          </p>
        </Section>

        <Section title="2. Acceptance of these terms">
          <p>
            By creating an account or otherwise using Gravity Souls, you agree to be bound by
            these Terms of Service. If you do not agree, you may not use the service.
          </p>
        </Section>

        <Section title="3. Eligibility">
          <p>
            Gravity Souls is available only to individuals aged 18 and older. By using the
            service, you confirm that you meet this minimum age requirement.
          </p>
        </Section>

        <Section title="4. The service">
          <p>
            Gravity Souls is a social platform for connecting with people — building a profile
            (&ldquo;planet&rdquo;), discovering communities (&ldquo;galaxies&rdquo;), and sharing
            posts and messages with other members.
          </p>
        </Section>

        <Section title="5. Accounts and conduct">
          <p>
            You are responsible for the accuracy of the information you provide and for
            activity that occurs under your account. You agree to use the service in line with
            our Community Guidelines and not to misuse, disrupt, or attempt to gain
            unauthorized access to it.
          </p>
        </Section>

        <Section title="6. Content and intellectual property">
          <p>
            You retain ownership of the content you post. By posting, you grant Gravity Souls
            the rights necessary to host, display, and distribute that content as part of
            operating the service.
          </p>
        </Section>

        <Section title="7. Termination">
          <p>
            You may stop using the service and delete your account at any time from Settings.
            We may suspend or terminate accounts that violate these terms or our Community
            Guidelines.
          </p>
        </Section>

        <Section title="8. Disclaimers and limitation of liability">
          <p>
            The service is provided &ldquo;as is,&rdquo; without warranties of any kind, to the
            fullest extent permitted by law. Gravity Souls&rsquo; liability for any claim
            arising from your use of the service is limited to the extent permitted by
            applicable law.
          </p>
        </Section>

        <Section title="9. Governing law">
          <p>
            <Pending>jurisdiction</Pending>
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            <Pending>support email</Pending>
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
