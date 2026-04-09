'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import GlassCard from '@/components/ui/GlassCard'
import GlowButton from '@/components/ui/GlowButton'
import { moodOptions } from '@/lib/mock-data'
import { useLanguage } from '@/contexts/language-context'
import { t } from '@/lib/translations'
import { getOrCreateUserId, buildUniverseFromInput, saveUserUniverse, buildPlanetFromInput, savePlanetProfile } from '@/lib/user'

type Step = 'idle' | 'processing' | 'mapping'

const processingLabels: Step[] = ['processing', 'mapping']

export default function CreateUniversePage() {
  const router = useRouter()
  const { lang } = useLanguage()
  const [expression, setExpression] = useState('')
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [step, setStep] = useState<Step>('idle')

  const filled = {
    expression: expression.trim().length > 0,
    mood: selectedMood !== null,
  }
  const completionCount = Object.values(filled).filter(Boolean).length

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!filled.expression) return
    setStep('processing')

    const userId = getOrCreateUserId()
    const universe = buildUniverseFromInput(expression, selectedMood, userId)
    saveUserUniverse(universe)
    const planet = buildPlanetFromInput(expression, selectedMood, userId)
    savePlanetProfile(planet)

    setTimeout(() => setStep('mapping'), 900)
    setTimeout(() => router.push('/universe/demo'), 2200)
  }

  const isSubmitting = step !== 'idle'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pt-8 pb-16">
      {/* Nebula glow */}
      <div
        className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: '520px',
          height: '400px',
          background: 'radial-gradient(ellipse, rgba(124,58,237,0.14) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-2xl flex flex-col gap-8 animate-fade-up">

        {/* Header + completion dots */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium tracking-[0.3em] text-star uppercase opacity-60">
              Universe formation
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              {t(lang, 'create.title')}
            </h1>
            <p className="text-sm text-muted leading-relaxed max-w-sm">
              {t(lang, 'create.subtitle')}
            </p>
          </div>
          {/* Completion indicator */}
          <div className="shrink-0 flex flex-col items-end gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full transition-all duration-500"
                  style={{
                    background: i < completionCount ? 'var(--star)' : 'rgba(167,139,250,0.2)',
                    boxShadow: i < completionCount ? '0 0 6px var(--star)' : 'none',
                  }}
                />
              ))}
            </div>
            <span className="text-xs text-muted opacity-50">{completionCount}/2 signals</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* ── Expression textarea ─────────────────────────────────── */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium tracking-widest text-star uppercase opacity-60">
              Your expression
            </label>
            <GlassCard className="p-0 overflow-hidden" style={{ transition: 'box-shadow 0.3s' }}>
              <textarea
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder={t(lang, 'create.text.placeholder')}
                rows={8}
                disabled={isSubmitting}
                className="w-full bg-transparent px-6 py-5 text-sm text-foreground placeholder:text-muted leading-7 resize-none outline-none disabled:opacity-40"
                maxLength={1000}
              />
              <div className="flex items-center justify-between px-6 py-3 border-t border-[rgba(167,139,250,0.08)]">
                <div className="flex items-center gap-2">
                  <div
                    className="w-1 h-1 rounded-full transition-all duration-300"
                    style={{
                      background: filled.expression ? 'var(--star)' : 'rgba(167,139,250,0.3)',
                      boxShadow: filled.expression ? '0 0 4px var(--star)' : 'none',
                    }}
                  />
                  <span className="text-xs text-muted">{expression.length} / 1000</span>
                </div>
                <span className="text-xs text-muted opacity-40 italic">no rules, no judgment</span>
              </div>
            </GlassCard>
          </div>

          {/* ── Mood chips ──────────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-medium tracking-widest text-star uppercase opacity-60">
              {t(lang, 'create.mood.label')}
            </label>
            <div className="flex flex-wrap gap-2">
              {moodOptions.map((mood) => {
                const active = selectedMood === mood.value
                return (
                  <button
                    key={mood.value}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setSelectedMood(active ? null : mood.value)}
                    className={[
                      'flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium tracking-wide transition-all duration-200 disabled:opacity-40',
                      active
                        ? 'text-[#ddd6fe] border border-[rgba(124,58,237,0.5)]'
                        : 'glass glass-hover text-muted border border-[rgba(167,139,250,0.12)] hover:text-star',
                    ].join(' ')}
                    style={active ? { background: 'rgba(124,58,237,0.25)', boxShadow: '0 0 12px rgba(124,58,237,0.2)' } : {}}
                  >
                    <span className="text-sm leading-none">{mood.symbol}</span>
                    {mood.label}
                  </button>
                )
              })}
            </div>
            {selectedMood && (
              <p className="text-xs text-muted opacity-60 italic pl-1">
                Signal locked: <span className="text-star opacity-80">{selectedMood}</span>
              </p>
            )}
          </div>

          {/* ── Image upload dropzone ────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-medium tracking-widest text-star uppercase opacity-60">
              Visual fragment{' '}
              <span className="text-muted normal-case tracking-normal font-normal opacity-50">— optional, coming soon</span>
            </label>
            <div
              onDragEnter={() => setIsDragOver(true)}
              onDragLeave={() => setIsDragOver(false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); setIsDragOver(false) }}
              className="relative rounded-xl px-6 py-10 flex flex-col items-center gap-3 transition-all duration-300 overflow-hidden cursor-not-allowed"
              style={{
                background: isDragOver
                  ? 'rgba(124,58,237,0.08)'
                  : 'rgba(255,255,255,0.02)',
                border: `1.5px dashed ${isDragOver ? 'rgba(167,139,250,0.4)' : 'rgba(167,139,250,0.12)'}`,
              }}
            >
              {/* Corner accents */}
              {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map((pos) => (
                <div
                  key={pos}
                  className={`absolute ${pos} w-3 h-3 transition-opacity duration-300`}
                  style={{
                    borderTop: pos.includes('top') ? '1px solid rgba(167,139,250,0.3)' : undefined,
                    borderBottom: pos.includes('bottom') ? '1px solid rgba(167,139,250,0.3)' : undefined,
                    borderLeft: pos.includes('left') ? '1px solid rgba(167,139,250,0.3)' : undefined,
                    borderRight: pos.includes('right') ? '1px solid rgba(167,139,250,0.3)' : undefined,
                    opacity: isDragOver ? 1 : 0.5,
                  }}
                />
              ))}
              <span
                className="text-3xl transition-all duration-300"
                style={{ color: isDragOver ? 'var(--star)' : 'rgba(167,139,250,0.3)' }}
              >
                ◌
              </span>
              <div className="text-center">
                <p className="text-xs text-muted opacity-60">Drop an image or caption</p>
                <p className="text-xs text-muted opacity-30 mt-1">
                  Visual traces will be read alongside your text
                </p>
              </div>
            </div>
          </div>

          {/* ── Submit ───────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <GlowButton
              type="submit"
              variant="primary"
              disabled={!filled.expression || isSubmitting}
              fullWidth
              className="py-4 text-base"
            >
              {step === 'idle' && 'Generate my universe'}
              {step === 'processing' && (
                <span className="flex items-center gap-3">
                  <ProcessingDots />
                  Reading your signal...
                </span>
              )}
              {step === 'mapping' && (
                <span className="flex items-center gap-3">
                  <ProcessingDots />
                  Mapping the universe...
                </span>
              )}
            </GlowButton>
            {!isSubmitting && (
              <GlowButton href="/" variant="ghost" className="text-xs whitespace-nowrap">
                Cancel
              </GlowButton>
            )}
          </div>

          {!filled.expression && (
            <p className="text-center text-xs text-muted opacity-40">
              Begin with your expression — even a single line is enough.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

function ProcessingDots() {
  return (
    <span className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block w-1.5 h-1.5 rounded-full bg-white"
          style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </span>
  )
}
