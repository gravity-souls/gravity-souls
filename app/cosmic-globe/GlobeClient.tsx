'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw } from 'lucide-react'
import CosmicGlobe, { type GlobeStatus, type GlobeStep } from '@/components/fx/CosmicGlobe'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import { useReducedMotionPreference } from '@/lib/hooks/useBrowserPreferences'
import styles from './globe.module.css'

const STEPS = [0, 1, 2] as const

interface Props {
  /** Resolved server-side (page.tsx) from the HttpOnly session cookie —
   * this component never reads it and never calls an API. */
  signedIn: boolean
  /** True when this renders as "/" itself (the signed-out homepage) rather than
   * the dedicated /cosmic-globe route — hides the otherwise-circular
   * "Back to home" footer link. */
  standalone?: boolean
}

// Shape returned by the already-public GET /api/communities (also used
// anonymously by UniverseSearch) — just the fields this preview needs.
interface CommunityPreview {
  slug: string
  name: string
  symbol: string
  tagline: string | null
  accentColor: string
  memberCount: number
}

export default function GlobeClient({ signedIn, standalone = false }: Props) {
  const t = useTranslations('cosmicDemo')
  const tGalaxies = useTranslations('galaxies')
  const [step, setStep] = useState<GlobeStep>(0)
  const reducedMotion = useReducedMotionPreference()
  const [motionChoice, setMotionChoice] = useState<'system' | 'play' | 'pause'>('system')
  const paused = motionChoice === 'pause' || (motionChoice === 'system' && reducedMotion)
  const [resetKey, setResetKey] = useState(0)
  const [status, setStatus] = useState<GlobeStatus>('loading')
  const [featuredGalaxy, setFeaturedGalaxy] = useState<CommunityPreview | null>(null)

  function reset() {
    setStep(0)
    setResetKey((value) => value + 1)
  }

  // A real galaxy to preview before sign-up — picks the most populous one
  // from the already-public community catalogue. Planet/signal examples
  // below are deliberately illustrative instead: lib/visibility.ts's
  // canViewProfile() treats a signed-out viewer as unable to see anyone's
  // planet/post (member-visible by default), so a real one doesn't belong
  // on this pre-signup page.
  useEffect(() => {
    let cancelled = false
    fetch('/api/communities')
      .then((res) => (res.ok ? (res.json() as Promise<CommunityPreview[]>) : []))
      .then((rows) => {
        if (cancelled || rows.length === 0) return
        const featured = rows.reduce((best, row) => (row.memberCount > best.memberCount ? row : best))
        Promise.resolve().then(() => { if (!cancelled) setFeaturedGalaxy(featured) })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" prefetch={false} className={styles.brand} aria-label={t('home')}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimization needed */}
          <img src="/gravity-souls-icon.svg" alt="" className={styles.brandMark} aria-hidden="true" />
          <span>Gravity Souls</span>
        </Link>
        <div className={styles.headerActions}>
          <LanguageSwitcher variant="compact" persistToAccount={false} />
          {signedIn ? (
            <Link href="/resonance" prefetch={false} className={styles.signIn}>{t('continueToUniverse')} <ArrowRight size={14} aria-hidden="true" /></Link>
          ) : (
            <Link href="/sign-in" prefetch={false} className={styles.signIn}>{t('signIn')} <ArrowRight size={14} aria-hidden="true" /></Link>
          )}
        </div>
      </header>

      <div className={styles.experience}>
        <section className={styles.visual} aria-label={t('visualLabel')} data-status={status} data-step={step}>
          <div className={styles.coordinates} aria-hidden="true"><span>GS — 0{step + 1}</span><span>✦</span></div>
          <div className={styles.orbit} aria-hidden="true" />
          <div className={styles.stage}>
            {status !== 'ready' && <div className={styles.fallback} data-testid="globe-fallback" aria-hidden="true"><div /></div>}
            <div className={styles.renderer} style={{ opacity: status === 'ready' ? 1 : 0 }}>
              <CosmicGlobe step={step} paused={paused} allowMotion={motionChoice === 'play'} resetKey={resetKey} onStatusChange={setStatus} />
            </div>
          </div>
          <div className={styles.visualFooter}>
            <span className={styles.visualCaption}>{t('illustration')}</span>
            <div className={styles.motionControls}>
              <button type="button" onClick={() => setMotionChoice(paused ? 'play' : 'pause')} disabled={status !== 'ready'} aria-label={paused ? t('play') : t('pause')} title={paused && reducedMotion ? t('motionPreference') : undefined}>
                {paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
                <span>{paused ? t('play') : t('pause')}</span>
              </button>
              <button type="button" onClick={reset} aria-label={t('reset')}><RotateCcw size={15} aria-hidden="true" /><span>{t('reset')}</span></button>
            </div>
          </div>
          {status === 'unavailable' && <p role="status" className={styles.fallbackNotice}>{t('fallback')}</p>}
        </section>

        <section className={styles.story} aria-label={t('introLabel')}>
          <p className={styles.eyebrow}><span />{t('eyebrow')}</p>
          <h1>{t('title')} <em>{t('titleAccent')}</em></h1>
          <p className={styles.intro}>{t('intro')}</p>
          <nav className={styles.steps} aria-label={t('stepsLabel')}>
            {STEPS.map((index) => (
              <button key={index} type="button" onClick={() => setStep(index)} aria-current={step === index ? 'step' : undefined} aria-controls="globe-story">
                <span className={styles.stepNumber}>0{index + 1}</span>
                <span>{t(`steps.${index}.label`)}</span>
              </button>
            ))}
          </nav>
          <div id="globe-story" className={styles.chapter} aria-live="polite" aria-atomic="true">
            <p className={styles.chapterNumber}>{t('stepCount', { current: step + 1, total: 3 })}</p>
            <h2>{t(`steps.${step}.title`)}</h2>
            <p>{t(`steps.${step}.body`)}</p>
          </div>
          <div className={styles.chapterControls}>
            <button type="button" disabled={step === 0} onClick={() => setStep((step - 1) as GlobeStep)}><ArrowLeft size={15} aria-hidden="true" />{t('previous')}</button>
            <button type="button" disabled={step === 2} onClick={() => setStep((step + 1) as GlobeStep)}>{t('next')}<ArrowRight size={15} aria-hidden="true" /></button>
          </div>
          {signedIn ? (
            // /resonance already redirects to /onboarding when this account has
            // no active planet yet, and stays put when it does — so this single
            // link is correct either way, with no extra request from this page.
            <Link href="/resonance" prefetch={false} className={styles.primary}>{t('openPlanet')}<ArrowRight size={18} aria-hidden="true" /></Link>
          ) : (
            // Sign-up first is the encouraged path: a plain (non-onboarding-origin)
            // sign-up already redirects to /onboarding on success (app/sign-up/page.tsx),
            // so this alone produces "sign up, then calibrate" with no other wiring.
            <Link href="/sign-up" prefetch={false} className={styles.primary}>{t('create')}<ArrowRight size={18} aria-hidden="true" /></Link>
          )}
          {!signedIn && (
            // Preserves the original try-before-signup path: /onboarding still
            // works fully anonymously, stashing answers in sessionStorage and
            // auto-submitting them right after sign-up/sign-in/OAuth succeeds.
            <Link href="/onboarding" prefetch={false} className={styles.secondary}>{t('tryWithoutAccount')}</Link>
          )}
          <p className={styles.note}>{t('note')}</p>
        </section>
      </div>

      <section className={styles.preview} aria-label={t('preview.label')}>
        <p className={styles.previewEyebrow}>{t('preview.eyebrow')}</p>
        <div className={styles.previewGrid}>
          {featuredGalaxy && (
            <Link href={`/galaxy/${featuredGalaxy.slug}`} prefetch={false} className={styles.previewCard}>
              <span className={styles.previewCardIcon} style={{ color: featuredGalaxy.accentColor }} aria-hidden="true">{featuredGalaxy.symbol}</span>
              <p className={styles.previewCardTitle}>{featuredGalaxy.name}</p>
              <p className={styles.previewCardMeta}>{tGalaxies('members', { count: featuredGalaxy.memberCount })}</p>
              {featuredGalaxy.tagline && <p className={styles.previewCardBody}>{featuredGalaxy.tagline}</p>}
            </Link>
          )}

          <div className={styles.previewCard}>
            <span className={styles.previewCardBadge}>{t('preview.examplePlanet')}</span>
            <p className={styles.previewCardTitle}>{t('preview.planetName')}</p>
            <p className={styles.previewCardMeta}>{t('preview.planetTags')}</p>
            <p className={styles.previewCardBody}>{t('preview.planetTagline')}</p>
          </div>

          <div className={styles.previewCard}>
            <span className={styles.previewCardBadge}>{t('preview.exampleSignal')}</span>
            <p className={styles.previewCardBody}>{t('preview.signalBody')}</p>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>{t('footer')}</span>
        <div className={styles.footerLinks}>
          <Link href="/guide" prefetch={false}>{t('howItWorks')}<ArrowRight size={13} aria-hidden="true" /></Link>
          {!standalone && (
            <Link href="/" prefetch={false}>{t('backHome')}<ArrowRight size={13} aria-hidden="true" /></Link>
          )}
        </div>
      </footer>
    </div>
  )
}
