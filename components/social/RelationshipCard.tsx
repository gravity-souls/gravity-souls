import Link from 'next/link'
import RelationshipStateBadge, { type FollowState } from '@/components/social/RelationshipStateBadge'
import GlowButton from '@/components/ui/GlowButton'
import { relativeTime } from '@/lib/time'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import type { PlanetConfig } from '@/types/planet'

interface PlanetSummary {
  id: string
  name: string
  avatarSymbol: string
  tagline: string | null
  visual: unknown
  mood: string
  planetConfig?: PlanetConfig | null
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
  const coreColor = planet.planetConfig?.tintColor ?? visual.coreColor ?? '#a78bfa'

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
        className="shrink-0 transition-transform group-hover:scale-105"
      >
        <PlanetAvatar planetConfig={planet.planetConfig ?? undefined} size={48} glowColor={coreColor} />
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
