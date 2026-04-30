import Link from 'next/link'
import type { Relationship } from '@/types/social'
import type { PlanetProfile } from '@/types/planet'
import RelationshipStateBadge from '@/components/social/RelationshipStateBadge'
import GlowButton from '@/components/ui/GlowButton'
import { relativeTime } from '@/lib/time'

// --- RelationshipCard ---------------------------------------------------------

interface Props {
  relationship: Relationship
  planet:       PlanetProfile
}

export default function RelationshipCard({ relationship, planet }: Props) {
  const { coreColor, accentColor } = planet.visual
  const lastAt = relationship.lastInteractionAt ?? relationship.updatedAt

  return (
    <div
      className="relative flex items-center gap-4 px-4 py-4 rounded-2xl group"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${coreColor}18`,
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      {/* Planet orb */}
      <Link
        href={`/planet/${planet.id}`}
        className="shrink-0 flex items-center justify-center rounded-full transition-transform group-hover:scale-105"
        style={{
          width: 48, height: 48,
          background: `radial-gradient(circle at 35% 30%, ${accentColor}cc 0%, ${coreColor}88 50%, ${coreColor}20 100%)`,
          boxShadow: `0 0 0 1px ${coreColor}30, 0 0 14px ${coreColor}30`,
          fontSize: 20,
          color: coreColor,
          textDecoration: 'none',
        }}
      >
        {planet.avatarSymbol}
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/planet/${planet.id}`}
            className="text-sm font-semibold hover:opacity-80 transition-opacity"
            style={{ color: 'var(--foreground)', textDecoration: 'none' }}
          >
            {planet.name}
          </Link>
          <RelationshipStateBadge status={relationship.status} compact />
        </div>

        {planet.tagline && (
          <p className="text-[11px] truncate" style={{ color: 'var(--ghost)', opacity: 0.65, fontStyle: 'italic' }}>
            {planet.tagline}
          </p>
        )}

        <p className="text-[10px]" style={{ color: 'var(--ghost)', opacity: 0.45 }}>
          {relationship.status === 'signal' ? 'Signal sent' : 'Last interaction'}&nbsp;
          {relativeTime(lastAt)}
        </p>
      </div>

      {/* Actions */}
      <div className="shrink-0 flex flex-col gap-1.5">
        {(relationship.status === 'resonant' || relationship.status === 'orbit') && (
          <GlowButton
            href={`/messages?to=${encodeURIComponent(planet.id)}`}
            variant="secondary"
            className="text-[11px] px-3 py-1.5"
          >
            Message
          </GlowButton>
        )}
        <GlowButton
          href={`/planet/${planet.id}`}
          variant="ghost"
          className="text-[11px] px-3 py-1.5"
        >
          View
        </GlowButton>
      </div>
    </div>
  )
}
