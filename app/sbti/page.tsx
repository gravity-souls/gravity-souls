'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  QUESTIONS,
  SPECIAL_QUESTIONS,
  DIM_META,
  DIM_EXPLANATIONS,
  TYPE_COLORS,
  type DimKey,
} from '@/lib/sbti-data'
import { computeResult, dimScoreToPercent, type SbtiResult } from '@/lib/sbti-score'
import { getPlanetProfile, savePlanetProfile, saveSbtiResult } from '@/lib/user'
import GlowButton from '@/components/ui/GlowButton'

// ─── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'intro' | 'question' | 'special' | 'computing' | 'result'

interface Answers {
  main: Record<string, number>  // qId → value
  drinkGate?: number
  drinkTrigger?: number
}

// ─── Dimension groups for result display ───────────────────────────────────────

const DIM_GROUPS: { label: string; dims: DimKey[] }[] = [
  { label: 'Self', dims: ['S1', 'S2', 'S3'] },
  { label: 'Emotion', dims: ['E1', 'E2', 'E3'] },
  { label: 'Attitude', dims: ['A1', 'A2', 'A3'] },
  { label: 'Action', dims: ['Ac1', 'Ac2', 'Ac3'] },
  { label: 'Social', dims: ['So1', 'So2', 'So3'] },
]

// ─── Constants ─────────────────────────────────────────────────────────────────

const COMPUTING_LABELS = [
  'Scanning soul matrix…',
  'Aligning cosmic dimensions…',
  'Cross-referencing 26 archetypes…',
  'Calibrating inner universe…',
  'Crystallising your type…',
]

// ─── Page ──────────────────────────────────────────────────────────────────────

function SbtiPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [phase, setPhase] = useState<Phase>('intro')
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState<Answers>({ main: {} })
  const [specialStep, setSpecialStep] = useState<0 | 1>(0)   // gate | trigger
  const [result, setResult] = useState<SbtiResult | null>(null)
  const [computingLabel, setComputingLabel] = useState(0)
  const [saved, setSaved] = useState(false)
  const [animating, setAnimating] = useState(false)
  const computingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const nextHref = searchParams.get('next') || '/create-planet'

  // ── Computing animation ────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'computing') return
    computingRef.current = setInterval(() => {
      setComputingLabel((n) => (n + 1) % COMPUTING_LABELS.length)
    }, 700)
    const timer = setTimeout(() => {
      if (computingRef.current) clearInterval(computingRef.current)
      finalize()
    }, 3500)
    return () => {
      if (computingRef.current) clearInterval(computingRef.current)
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── Build dimAnswers and compute type ────────────────────────────────────────
  function finalize() {
    const dimAnswers = {} as Record<DimKey, [number, number]>

    // Map questions to dimensions
    for (const q of QUESTIONS) {
      const val = answers.main[q.id] ?? 2
      if (!dimAnswers[q.dim]) {
        dimAnswers[q.dim] = [val, 2]
      } else {
        dimAnswers[q.dim][1] = val
      }
    }

    const res = computeResult(dimAnswers, {
      gate: answers.drinkGate,
      trigger: answers.drinkTrigger,
    })

    saveSbtiResult({
      typeCode: res.typeCode,
      typeCn: res.type.cn,
      patternString: res.patternString,
      scores: res.scores,
      confidencePercent: res.confidencePercent,
      completedAt: new Date().toISOString(),
    })

    setResult(res)
    setPhase('result')
  }

  // ── Answer a main question ───────────────────────────────────────────────────
  function answerMain(value: number) {
    if (animating) return
    const q = QUESTIONS[qIndex]
    setAnswers((prev) => ({ ...prev, main: { ...prev.main, [q.id]: value } }))
    setAnimating(true)
    setTimeout(() => {
      setAnimating(false)
      if (qIndex + 1 < QUESTIONS.length) {
        setQIndex(qIndex + 1)
      } else {
        // Done with main questions — offer special questions
        setSpecialStep(0)
        setPhase('special')
      }
    }, 260)
  }

  // ── Answer special question ──────────────────────────────────────────────────
  function answerSpecial(value: number) {
    if (specialStep === 0) {
      setAnswers((prev) => ({ ...prev, drinkGate: value }))
      if (value === 3) {
        // Drinks → ask trigger
        setSpecialStep(1)
      } else {
        setPhase('computing')
      }
    } else {
      setAnswers((prev) => ({ ...prev, drinkTrigger: value }))
      setPhase('computing')
    }
  }

  // ── Save to planet profile ────────────────────────────────────────────────────
  function saveToProfile() {
    if (!result) return
    const profile = getPlanetProfile()
    if (!profile) return
    savePlanetProfile({
      ...profile,
      sbtiType: result.typeCode,
      sbtiCn: result.type.cn,
      sbtiPattern: result.patternString,
    })
    setSaved(true)
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'var(--background)' }}
    >
      {/* Subtle bg gradient */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(124,58,237,0.08) 0%, transparent 70%)',
        }}
      />

      {phase === 'intro' && <IntroScreen onStart={() => setPhase('question')} />}

      {phase === 'question' && (
        <QuestionScreen
          question={QUESTIONS[qIndex]}
          index={qIndex}
          total={QUESTIONS.length}
          onAnswer={answerMain}
          fading={animating}
        />
      )}

      {phase === 'special' && (
        <SpecialScreen
          question={SPECIAL_QUESTIONS[specialStep]}
          onAnswer={answerSpecial}
          onSkip={() => setPhase('computing')}
        />
      )}

      {phase === 'computing' && (
        <ComputingScreen label={COMPUTING_LABELS[computingLabel]} />
      )}

      {phase === 'result' && result && (
        <ResultScreen
          result={result}
          onSave={saveToProfile}
          saved={saved}
          hasPlanet={!!getPlanetProfile()}
          nextHref={nextHref}
          onRetake={() => {
            setPhase('intro')
            setQIndex(0)
            setAnswers({ main: {} })
            setSpecialStep(0)
            setResult(null)
            setSaved(false)
          }}
          onViewPlanet={() => router.push('/my-planet')}
          onContinue={() => router.push(nextHref)}
        />
      )}
    </div>
  )
}

// ─── Intro Screen ───────────────────────────────────────────────────────────────

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative z-10 max-w-lg w-full flex flex-col gap-8 text-center">
      <div className="flex flex-col gap-3">
        <p
          className="text-xs font-mono tracking-widest uppercase"
          style={{ color: 'var(--nebula)' }}
        >
          Soul Scan Protocol
        </p>
        <h1
          className="text-5xl sm:text-6xl font-bold tracking-tight"
          style={{ color: 'var(--foreground)' }}
        >
          SBTI
        </h1>
        <p
          className="text-lg font-medium"
          style={{ color: 'var(--star)' }}
        >
          Silly Big Personality Test
        </p>
        <p className="text-base leading-relaxed mt-2" style={{ color: 'var(--ink)', opacity: 0.75 }}>
          MBTI已经过时，SBTI来了。
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.55 }}>
          30 soul questions · 15 dimensions · 26 archetypes.
          <br />
          Find out which entity inhabits your inner cosmos.
        </p>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap gap-2 justify-center">
        {['30 Questions', '15 Dimensions', '26 Archetypes', '~5 min'].map((tag) => (
          <span
            key={tag}
            className="px-3 py-1 rounded-full text-xs font-mono"
            style={{
              background: 'rgba(124,58,237,0.12)',
              border: '1px solid rgba(124,58,237,0.25)',
              color: 'var(--star)',
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      <GlowButton onClick={onStart} variant="primary">
        Begin Soul Scan →
      </GlowButton>

      <p className="text-xs" style={{ color: 'var(--ghost)' }}>
        For entertainment purposes only
      </p>
    </div>
  )
}

// ─── Question Screen ─────────────────────────────────────────────────────────────

function QuestionScreen({
  question,
  index,
  total,
  onAnswer,
  fading,
}: {
  question: (typeof QUESTIONS)[0]
  index: number
  total: number
  onAnswer: (v: number) => void
  fading: boolean
}) {
  const progress = ((index) / total) * 100
  const dimInfo = DIM_META[question.dim]

  return (
    <div
      className="relative z-10 max-w-lg w-full flex flex-col gap-6 transition-opacity duration-200"
      style={{ opacity: fading ? 0 : 1 }}
    >
      {/* Top bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono" style={{ color: 'var(--ghost)' }}>
          <span>{index + 1} / {total}</span>
          <span style={{ color: 'var(--star)' }}>{dimInfo.enModel}</span>
        </div>
        {/* Progress bar */}
        <div className="h-0.5 rounded-full" style={{ background: 'var(--surface-2)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, var(--nebula), var(--aurora))',
            }}
          />
        </div>
      </div>

      {/* Question card */}
      <div
        className="rounded-2xl p-6 flex flex-col gap-6"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-mid)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* Dim badge */}
        <span
          className="self-start text-xs font-mono px-2 py-1 rounded-lg"
          style={{
            background: 'rgba(167,139,250,0.10)',
            color: 'var(--star)',
            border: '1px solid rgba(167,139,250,0.18)',
          }}
        >
          {dimInfo.name}
        </span>

        {/* Question text */}
        <p
          className="text-base sm:text-lg leading-relaxed font-medium"
          style={{ color: 'var(--foreground)' }}
        >
          {question.text}
        </p>

        {/* Options */}
        <div className="flex flex-col gap-2">
          {question.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onAnswer(opt.value)}
              className="w-full text-left rounded-xl px-4 py-3 text-sm leading-snug transition-all duration-150"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-soft)',
                color: 'var(--ink)',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(124,58,237,0.12)'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor =
                  'rgba(124,58,237,0.35)'
                ;(e.currentTarget as HTMLButtonElement).style.color =
                  'var(--foreground)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background =
                  'var(--surface-2)'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor =
                  'var(--border-soft)'
                ;(e.currentTarget as HTMLButtonElement).style.color =
                  'var(--ink)'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Special Screen ───────────────────────────────────────────────────────────────

function SpecialScreen({
  question,
  onAnswer,
  onSkip,
}: {
  question: (typeof SPECIAL_QUESTIONS)[0]
  onAnswer: (v: number) => void
  onSkip: () => void
}) {
  return (
    <div className="relative z-10 max-w-lg w-full flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-mono tracking-widest uppercase" style={{ color: 'var(--nebula)' }}>
          Hidden Dimension
        </p>
        <p className="text-sm" style={{ color: 'var(--ghost)' }}>
          One bonus question. Answer honestly — or skip.
        </p>
      </div>

      <div
        className="rounded-2xl p-6 flex flex-col gap-6"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-mid)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <p
          className="text-base sm:text-lg leading-relaxed font-medium"
          style={{ color: 'var(--foreground)' }}
        >
          {question.text}
        </p>

        <div className="flex flex-col gap-2">
          {question.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onAnswer(opt.value)}
              className="w-full text-left rounded-xl px-4 py-3 text-sm leading-snug transition-all duration-150"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-soft)',
                color: 'var(--ink)',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(124,58,237,0.12)'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor =
                  'rgba(124,58,237,0.35)'
                ;(e.currentTarget as HTMLButtonElement).style.color =
                  'var(--foreground)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background =
                  'var(--surface-2)'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor =
                  'var(--border-soft)'
                ;(e.currentTarget as HTMLButtonElement).style.color =
                  'var(--ink)'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onSkip}
        className="text-sm text-center transition-colors"
        style={{ color: 'var(--ghost)' }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.color = 'var(--ink)')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.color = 'var(--ghost)')
        }
      >
        Skip bonus question →
      </button>
    </div>
  )
}

// ─── Computing Screen ──────────────────────────────────────────────────────────────

function ComputingScreen({ label }: { label: string }) {
  return (
    <div className="relative z-10 flex flex-col items-center gap-6 text-center">
      {/* Pulsing orbit rings */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div
          className="absolute inset-0 rounded-full animate-ping"
          style={{ background: 'rgba(124,58,237,0.15)' }}
        />
        <div
          className="absolute inset-3 rounded-full animate-pulse"
          style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)' }}
        />
        <span className="text-3xl relative z-10" style={{ color: 'var(--star)' }}>◎</span>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-lg font-medium" style={{ color: 'var(--foreground)' }}>
          {label}
        </p>
        <p className="text-xs font-mono" style={{ color: 'var(--ghost)' }}>
          Mapping your inner cosmos
        </p>
      </div>
    </div>
  )
}

// ─── Result Screen ───────────────────────────────────────────────────────────────

function ResultScreen({
  result,
  onSave,
  saved,
  hasPlanet,
  nextHref,
  onRetake,
  onContinue,
  onViewPlanet,
}: {
  result: SbtiResult
  onSave: () => void
  saved: boolean
  hasPlanet: boolean
  nextHref: string
  onRetake: () => void
  onContinue: () => void
  onViewPlanet: () => void
}) {
  const typeColor = TYPE_COLORS[result.typeCode] ?? '#a78bfa'

  return (
    <div className="relative z-10 max-w-2xl w-full flex flex-col gap-8">
      {/* Type hero */}
      <div
        className="rounded-3xl p-8 flex flex-col gap-5 text-center"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${typeColor}18 0%, var(--surface) 70%)`,
          border: `1px solid ${typeColor}30`,
          boxShadow: `0 0 60px ${typeColor}15, var(--shadow-card)`,
        }}
      >
        {/* Label */}
        <p
          className="text-xs font-mono tracking-widest uppercase"
          style={{ color: typeColor, opacity: 0.75 }}
        >
          Your Soul Archetype
        </p>

        {/* Type code */}
        <h1
          className="text-6xl sm:text-7xl font-bold tracking-tight"
          style={{
            color: typeColor,
            textShadow: `0 0 40px ${typeColor}60`,
          }}
        >
          {result.type.code}
        </h1>

        {/* Chinese name */}
        <p className="text-2xl font-medium" style={{ color: 'var(--foreground)' }}>
          {result.type.cn}
        </p>

        {/* Intro quote */}
        <p
          className="text-base italic"
          style={{ color: 'var(--ink)', opacity: 0.8 }}
        >
          「{result.type.intro}」
        </p>

        {/* Pattern */}
        <p className="text-xs font-mono" style={{ color: 'var(--ghost)' }}>
          Pattern: {result.patternString}
        </p>
        <p className="text-xs font-mono" style={{ color: 'var(--ghost)' }}>
          Match confidence: {result.confidencePercent}%
        </p>
      </div>

      {/* Description */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-soft)',
        }}
      >
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
          {result.type.desc}
        </p>
      </div>

      {/* Dimension breakdown */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-soft)' }}>
        <div
          className="px-5 py-3"
          style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-soft)' }}
        >
          <p className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--ghost)' }}>
            15 Dimension Profile
          </p>
        </div>

        <div className="divide-y divide-[rgba(167,139,250,0.08)]">
          {DIM_GROUPS.map((group) => (
            <div key={group.label} className="px-5 py-4 flex flex-col gap-3">
              <p className="text-xs font-mono uppercase" style={{ color: 'var(--nebula)' }}>
                {group.label}
              </p>
              {group.dims.map((dim) => {
                const score = result.scores[dim]
                const pct = dimScoreToPercent(score)
                const meta = DIM_META[dim]
                const explanation = DIM_EXPLANATIONS[dim][score]

                return (
                  <div key={dim} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
                        {meta.enName}
                        <span className="ml-1.5 font-mono text-[10px]" style={{ color: 'var(--ghost)' }}>
                          {score}
                        </span>
                      </span>
                      <span className="text-[10px] font-mono" style={{ color: 'var(--ghost)' }}>
                        {meta.name}
                      </span>
                    </div>
                    <div
                      className="relative h-1.5 rounded-full overflow-hidden"
                      style={{ background: 'var(--surface-2)' }}
                    >
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background:
                            score === 'L'
                              ? 'linear-gradient(90deg, #60a5fa, #818cf8)'
                              : score === 'M'
                              ? 'linear-gradient(90deg, #a78bfa, #7c3aed)'
                              : 'linear-gradient(90deg, #7c3aed, #6366f1)',
                        }}
                      />
                    </div>
                    <p className="text-[11px] leading-normal" style={{ color: 'var(--ghost)' }}>
                      {explanation}
                    </p>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pb-4">
        {!hasPlanet && (
          <GlowButton onClick={onContinue} variant="primary" fullWidth>
            Continue to Planet Creation →
          </GlowButton>
        )}
        {hasPlanet && !saved && (
          <GlowButton onClick={onSave} variant="primary" fullWidth>
            ⊙ Save to Planet Profile
          </GlowButton>
        )}
        {saved && (
          <GlowButton onClick={onViewPlanet} variant="secondary" fullWidth>
            View My Planet →
          </GlowButton>
        )}
        <GlowButton onClick={onRetake} variant="ghost" fullWidth>
          Retake Test
        </GlowButton>
      </div>

      {!hasPlanet && (
        <p className="text-xs text-center" style={{ color: 'var(--ghost)' }}>
          Next step: {nextHref}
        </p>
      )}
    </div>
  )
}

export default function SbtiPageWrapper() {
  return (
    <Suspense>
      <SbtiPage />
    </Suspense>
  )
}
