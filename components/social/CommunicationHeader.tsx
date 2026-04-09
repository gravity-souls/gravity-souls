import Link from 'next/link'
import type { Conversation } from '@/types/social'
import type { PlanetProfile } from '@/types/planet'
import { orbitColorHex } from '@/lib/match'

// ─── CommunicationHeader ──────────────────────────────────────────────────────
// Top bar of the conversation detail page.
// Shows: back button, source planet, beam visualization, target planet, strength.

interface Props {
  conversation: Conversation
  myPlanet:     PlanetProfile
  otherPlanet:  PlanetProfile
}

export default function CommunicationHeader({ conversation, myPlanet, otherPlanet }: Props) {
  const color    = orbitColorHex(conversation.orbitColor)
  const strength = conversation.connectionStrength

  return (
    <div
      className="sticky top-0 z-20 flex items-center gap-4 px-4 py-3"
      style={{
        background: 'rgba(3,3,15,0.88)',
        backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${color}18`,
      }}
    >
      {/* Back button */}
      <Link
        href="/messages"
        className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          color: 'var(--ghost)',
          textDecoration: 'none',
        }}
        aria-label="Back to messages"
      >
        ←
      </Link>

      {/* Two planets + beam */}
      <div className="flex-1 flex items-center justify-center gap-3 min-w-0 overflow-hidden">

        {/* My planet */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 36, height: 36,
              background: `radial-gradient(circle at 35% 30%, ${myPlanet.visual.accentColor}cc 0%, ${myPlanet.visual.coreColor}88 50%, ${myPlanet.visual.coreColor}20 100%)`,
              boxShadow: `0 0 0 1px ${myPlanet.visual.coreColor}30, 0 0 10px ${myPlanet.visual.coreColor}30`,
              fontSize: 15,
              color: myPlanet.visual.coreColor,
            }}
          >
            {myPlanet.avatarSymbol}
          </div>
          <span className="text-[9px] truncate max-w-15 text-center" style={{ color: 'var(--ghost)', opacity: 0.6 }}>
            {myPlanet.name}
          </span>
        </div>

        {/* Beam line */}
        <div className="flex-1 flex flex-col items-center gap-1 min-w-0 max-w-35">
          <svg
            width="100%" height="12"
            viewBox="0 0 120 12"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="beam-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor={myPlanet.visual.coreColor}  stopOpacity="0.3" />
                <stop offset="40%"  stopColor={color} stopOpacity="0.9" />
                <stop offset="60%"  stopColor={color} stopOpacity="0.9" />
                <stop offset="100%" stopColor={otherPlanet.visual.coreColor} stopOpacity="0.3" />
              </linearGradient>
              <filter id="beam-glow">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <line
              x1="0" y1="6" x2="120" y2="6"
              stroke="url(#beam-grad)"
              strokeWidth="2"
              filter="url(#beam-glow)"
            />
          </svg>

          {/* Connection strength */}
          <div className="flex items-center gap-1">
            <div
              className="h-0.5 rounded-full"
              style={{
                width: 40,
                background: `linear-gradient(to right, ${color}22, ${color})`,
                clipPath: `inset(0 ${100 - strength}% 0 0)`,
              }}
            />
            <span className="text-[9px] tabular-nums" style={{ color, opacity: 0.7 }}>
              {strength}
            </span>
          </div>
        </div>

        {/* Other planet */}
        <Link
          href={`/planet/${otherPlanet.id}`}
          className="flex flex-col items-center gap-1 shrink-0 group"
          style={{ textDecoration: 'none' }}
        >
          <div
            className="flex items-center justify-center rounded-full transition-all group-hover:scale-105"
            style={{
              width: 36, height: 36,
              background: `radial-gradient(circle at 35% 30%, ${otherPlanet.visual.accentColor}cc 0%, ${otherPlanet.visual.coreColor}88 50%, ${otherPlanet.visual.coreColor}20 100%)`,
              boxShadow: `0 0 0 1px ${otherPlanet.visual.coreColor}30, 0 0 10px ${otherPlanet.visual.coreColor}30`,
              fontSize: 15,
              color: otherPlanet.visual.coreColor,
            }}
          >
            {otherPlanet.avatarSymbol}
          </div>
          <span className="text-[9px] truncate max-w-15 text-center" style={{ color: 'var(--ghost)', opacity: 0.6 }}>
            {otherPlanet.name}
          </span>
        </Link>
      </div>

      {/* Orbit color dot */}
      <div
        className="shrink-0 w-2 h-2 rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
        title={conversation.orbitColor}
      />
    </div>
  )
}
