import Link from 'next/link'
import RelationshipStateBadge, { type FollowState } from '@/components/social/RelationshipStateBadge'
import GlowButton from '@/components/ui/GlowButton'
import { relativeTime } from '@/lib/time'

interface PlanetSummary {
  id: string
  name: string
  avatarSymbol: string
  tagline: string | null
  visual: unknown
}

interface Props {
  status:   FollowState
  since:    string
  planet:   PlanetSummary
  onUnfollow?: () => void
  onFollowBack?: () => void
  busy?: boolean
}

export default function RelationshipCard({ status, since, planet, onUnfollow, onFollowBack, busy }: Props) {
  const visual = (planet.visual ?? {}) as { coreColor?: string; accentColor?: string }
  const coreColor = visual.coreColor ?? '#a78bfa'
  const accentColor = visual.accentColor ?? '#c4b5fd'

  return (
    <div
      className="relative flex items-center gap-4 px-4 py-4 rounded-2xl group"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${coreColor}18`,
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
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

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/planet/${planet.id}`}
            className="text-sm font-semibold hover:opacity-80 transition-opacity"
            style={{ color: 'var(--foreground)', textDecoration: 'none' }}
          >
            {planet.name}
          </Link>
          <RelationshipStateBadge status={status} compact />
        </div>

        {planet.tagline && (
          <p className="text-[11px] truncate" style={{ color: 'var(--ghost)', opacity: 0.65, fontStyle: 'italic' }}>
            {planet.tagline}
          </p>
        )}

        <p className="text-[10px]" style={{ color: 'var(--ghost)', opacity: 0.45 }}>
          {status === 'follows-you' ? 'Started following you' : 'Following since'}&nbsp;
          {relativeTime(since)}
        </p>
      </div>

      <div className="shrink-0 flex flex-col gap-1.5">
        {status === 'mutual' && (
          <GlowButton
            href={`/messages?to=${encodeURIComponent(planet.id)}`}
            variant="secondary"
            className="text-[11px] px-3 py-1.5"
          >
            Message
          </GlowButton>
        )}
        {status === 'follows-you' && onFollowBack && (
          <GlowButton
            onClick={onFollowBack}
            disabled={busy}
            variant="secondary"
            className="text-[11px] px-3 py-1.5"
          >
            Follow back
          </GlowButton>
        )}
        {status !== 'follows-you' && onUnfollow && (
          <GlowButton
            onClick={onUnfollow}
            disabled={busy}
            variant="ghost"
            className="text-[11px] px-3 py-1.5"
          >
            Unfollow
          </GlowButton>
        )}
      </div>
    </div>
  )
}
