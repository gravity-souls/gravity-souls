'use client'

import { useEffect, useRef, useState } from 'react'
import ParticleBeam from '@/components/fx/ParticleBeam'

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS = {
  signal: {
    label:       'Signal',
    description: 'One-shot — click to replay',
    speed:       0.65,
    density:     55,
    arcHeight:   18,
  },
  orbit: {
    label:       'Orbit',
    description: 'Continuous ambient',
    speed:       2.2,
    density:     22,
    arcHeight:   52,
  },
  pulse: {
    label:       'Pulse',
    description: 'Burst · 3 s pause · repeat',
    speed:       1.1,
    density:     40,
    arcHeight:   28,
  },
} as const

type PresetKey = keyof typeof PRESETS

// ─── Planet anchor (decorative) ───────────────────────────────────────────────

function PlanetDot({ x, y, warm }: { x: number; y: number; warm?: boolean }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position:      'absolute',
        left:          x,
        top:           y,
        width:         warm ? 18 : 14,
        height:        warm ? 18 : 14,
        borderRadius:  '50%',
        transform:     'translate(-50%, -50%)',
        pointerEvents: 'none',
        background: warm
          ? 'radial-gradient(circle at 38% 32%, rgba(240,225,190,0.70), rgba(160,120,55,0.45) 55%, rgba(40,22,8,0.10))'
          : 'radial-gradient(circle at 38% 32%, rgba(200,215,240,0.65), rgba(75,110,175,0.40) 55%, rgba(8,14,45,0.10))',
        boxShadow: warm
          ? '0 0 14px rgba(180,135,50,0.28), 0 0 5px rgba(180,135,50,0.45)'
          : '0 0 14px rgba(65,110,190,0.28), 0 0 5px rgba(65,110,190,0.45)',
      }}
    />
  )
}

// ─── Demo ─────────────────────────────────────────────────────────────────────

export default function DemoClient() {
  const stageRef = useRef<HTMLDivElement>(null)
  const [preset,  setPreset]  = useState<PresetKey>('orbit')
  const [playing, setPlaying] = useState(true)
  const [dims,    setDims]    = useState({ w: 720, h: 340 })
  // Incrementing tick re-runs the preset effect even when the preset key is unchanged (signal replay).
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const measure = () => {
      const { width, height } = el.getBoundingClientRect()
      setDims({ w: width, h: height })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    setPlaying(true)

    if (preset === 'orbit') return

    if (preset === 'signal') {
      const t = setTimeout(
        () => setPlaying(false),
        Math.round(PRESETS.signal.speed * 1000),
      )
      return () => clearTimeout(t)
    }

    // pulse: play for 1.2× crossing time, pause 3 s, repeat.
    const BURST_MS = Math.round(PRESETS.pulse.speed * 1000 * 1.2)
    let a: ReturnType<typeof setTimeout>
    let b: ReturnType<typeof setTimeout>

    function cycle() {
      a = setTimeout(() => {
        setPlaying(false)
        b = setTimeout(() => { setPlaying(true); cycle() }, 3000)
      }, BURST_MS)
    }

    cycle()
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [preset, tick])

  function selectPreset(key: PresetKey) {
    setPreset(key)
    setTick((n) => n + 1)
  }

  const from = { x: dims.w * 0.10, y: dims.h * 0.50 }
  const to   = { x: dims.w * 0.90, y: dims.h * 0.50 }

  return (
    <div
      style={{
        minHeight:      '100dvh',
        background:     '#080610',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            40,
        padding:        '48px 24px',
        fontFamily:     'system-ui, -apple-system, sans-serif',
      }}
    >
      <p
        style={{
          margin:        0,
          fontSize:      11,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color:         'rgba(255,255,255,0.22)',
        }}
      >
        ParticleBeam · demo
      </p>

      {/* Beam stage */}
      <div
        ref={stageRef}
        style={{ position: 'relative', width: '100%', maxWidth: 760, height: 340 }}
      >
        <ParticleBeam
          from={from}
          to={to}
          playing={playing}
          color="#c8bfb0"
          speed={PRESETS[preset].speed}
          density={PRESETS[preset].density}
          arcHeight={PRESETS[preset].arcHeight}
          style={{ position: 'absolute', inset: 0 }}
        />
        <PlanetDot x={from.x} y={from.y} warm />
        <PlanetDot x={to.x}   y={to.y} />
      </div>

      {/* Preset selector */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {(Object.entries(PRESETS) as [PresetKey, (typeof PRESETS)[PresetKey]][]).map(([key, val]) => {
          const active = key === preset
          return (
            <button
              key={key}
              onClick={() => selectPreset(key)}
              style={{
                padding:       '10px 22px',
                borderRadius:  10,
                border:        `1px solid ${active ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.08)'}`,
                background:    active ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)',
                color:         active ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.35)',
                cursor:        'pointer',
                fontSize:      12,
                fontWeight:    600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                lineHeight:    1,
                transition:    'border-color 150ms, color 150ms, background 150ms',
              }}
            >
              {val.label}
              <span
                style={{
                  display:       'block',
                  marginTop:     5,
                  fontSize:      10,
                  fontWeight:    400,
                  opacity:       0.55,
                  textTransform: 'none',
                  letterSpacing: '0.02em',
                }}
              >
                {val.description}
              </span>
            </button>
          )
        })}
      </div>

      {/* State indicator */}
      <p
        style={{
          margin:     0,
          fontSize:   11,
          fontFamily: 'ui-monospace, monospace',
          color:      'rgba(255,255,255,0.16)',
          textAlign:  'center',
          lineHeight: 1.7,
        }}
      >
        {playing ? '▸ playing' : '◼ stopped'}&ensp;·&ensp;
        speed {PRESETS[preset].speed}s&ensp;·&ensp;
        density {PRESETS[preset].density}/s&ensp;·&ensp;
        arc {PRESETS[preset].arcHeight}px
      </p>
    </div>
  )
}
