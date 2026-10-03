import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import GlowButton from '@/components/ui/GlowButton'
import { LEVEL_THRESHOLDS, XP_EVENTS } from '@/lib/xp'

export const metadata = { title: 'How Gravity Souls works — Gravity Souls' }

const SECTION_KEYS = ['planet', 'galaxies', 'signals', 'resonance', 'follows'] as const
const STEP_KEYS = ['0', '1', '2', '3', '4'] as const
const XP_ACTIONS = [
  { key: 'profile', event: 'PROFILE_COMPLETED' },
  { key: 'daily', event: 'DAILY_LOGIN' },
  { key: 'post', event: 'POST_CREATED' },
  { key: 'galaxy', event: 'GALAXY_JOINED' },
  { key: 'message', event: 'RESONANCE_SENT' },
  { key: 'rsvp', event: 'EVENT_RSVP' },
  { key: 'proposal', event: 'EVENT_PROPOSED' },
  { key: 'approved', event: 'EVENT_APPROVED' },
] as const
const LEVELS = [1, 2, 3, 4, 5] as const

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-7 last:mb-0">
      <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
        {title}
      </h2>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.82 }}>
        {children}
      </p>
    </section>
  )
}

export default async function GuidePage() {
  const t = await getTranslations('guide')

  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <p className="text-eyebrow mb-4" style={{ letterSpacing: '0.12em' }}>
        {t('eyebrow')}
      </p>
      <h1 className="text-3xl font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
        {t('title')}
      </h1>
      <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--ink)', opacity: 0.75 }}>
        {t('intro')}
      </p>

      <div
        className="rounded-2xl px-6 py-8 mb-8"
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-soft)' }}
      >
        {SECTION_KEYS.map((key) => (
          <Section key={key} title={t(`sections.${key}.title`)}>
            {t(`sections.${key}.body`)}
          </Section>
        ))}
      </div>

      <div
        className="rounded-2xl px-6 py-8 mb-8"
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-soft)' }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
          {t('firstStepsTitle')}
        </h2>
        <ol className="flex flex-col gap-3">
          {STEP_KEYS.map((key, index) => (
            <li key={key} className="flex items-start gap-3 text-sm leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.82 }}>
              <span
                className="shrink-0 flex items-center justify-center rounded-full text-xs font-semibold"
                style={{ width: 22, height: 22, background: 'rgba(167,139,250,0.15)', color: 'var(--star)' }}
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <span>{t(`steps.${key}`)}</span>
            </li>
          ))}
        </ol>
      </div>

      <section id="levels" className="scroll-mt-24 rounded-2xl px-6 py-8 mb-8" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-soft)' }}>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>{t('levels.title')}</h2>
        <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--ink)', opacity: 0.82 }}>{t('levels.intro')}</p>

        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>{t('levels.earnTitle')}</h3>
        <ul className="grid gap-2 sm:grid-cols-2 mb-6">
          {XP_ACTIONS.map(({ key, event }) => (
            <li key={key} className="flex items-start justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-sm">
              <span style={{ color: 'var(--ink)' }}>{t(`levels.actions.${key}`)}</span>
              <span className="shrink-0 font-semibold" style={{ color: 'var(--star)' }}>+{XP_EVENTS[event]} XP</span>
            </li>
          ))}
        </ul>

        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>{t('levels.milestonesTitle')}</h3>
        <ol className="grid gap-2 mb-5">
          {LEVELS.map((level) => (
            <li key={level} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-sm">
              <span style={{ color: 'var(--ink)' }}>{t(`levels.milestones.${level}`)}</span>
              <span className="shrink-0 text-xs font-semibold" style={{ color: 'var(--star)' }}>{t('levels.threshold', { level, xp: LEVEL_THRESHOLDS[level] })}</span>
            </li>
          ))}
        </ol>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--ghost)' }}>{t('levels.earlyAccess')}</p>
      </section>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <GlowButton href="/sign-up" variant="primary">
          {t('cta')}
        </GlowButton>
        <GlowButton href="/" variant="ghost">
          {t('ctaSecondary')}
        </GlowButton>
      </div>
    </main>
  )
}
