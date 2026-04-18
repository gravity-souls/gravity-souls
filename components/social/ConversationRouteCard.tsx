import Link from 'next/link'
import type { Conversation } from '@/types/social'
import type { PlanetProfile } from '@/types/planet'
import { orbitColorHex } from '@/lib/match'
import { formatConversationTime } from '@/lib/time'

// --- ConversationRouteCard ----------------------------------------------------

interface Props {
  conversation: Conversation
  otherPlanet:  PlanetProfile
  active?:      boolean
}

export default function ConversationRouteCard({ conversation, otherPlanet, active = false }: Props) {
  const color    = orbitColorHex(conversation.orbitColor)
  const lastMsg  = conversation.lastMessage
  const unread   = conversation.unreadCount > 0
  const isBeam   = lastMsg?.type === 'beam'

  return (
    <Link
      href={`/messages/${conversation.id}`}
      className="relative flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group"
      style={{
        background: active
          ? `${color}0c`
          : 'rgba(255,255,255,0.02)',
        border: active
          ? `1px solid ${color}28`
          : '1px solid rgba(167,139,250,0.07)',
        textDecoration: 'none',
      }}
    >
      {/* Left-edge orbit beam indicator */}
      <div
        className="absolute left-0 top-3 bottom-3 rounded-full"
        style={{
          width: 3,
          background: `linear-gradient(180deg, transparent, ${color}, transparent)`,
          opacity: active ? 1 : unread ? 0.7 : 0.3,
          transition: 'opacity 0.2s',
        }}
        aria-hidden="true"
      />

      {/* Planet orb */}
      <div
        className="shrink-0 relative flex items-center justify-center rounded-full"
        style={{
          width:  44,
          height: 44,
          background: `radial-gradient(circle at 35% 30%, ${otherPlanet.visual.accentColor}cc 0%, ${otherPlanet.visual.coreColor}88 50%, ${otherPlanet.visual.coreColor}20 100%)`,
          boxShadow: `0 0 0 1px ${otherPlanet.visual.coreColor}30, 0 0 12px ${otherPlanet.visual.coreColor}30`,
          fontSize: 18,
          color: otherPlanet.visual.coreColor,
        }}
      >
        {otherPlanet.avatarSymbol}

        {/* Unread indicator */}
        {unread && (
          <div
            className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 flex items-center justify-center"
            style={{
              background: color,
              borderColor: 'var(--background)',
              boxShadow: `0 0 6px ${color}`,
            }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-sm font-semibold truncate"
            style={{ color: unread ? 'var(--foreground)' : 'var(--ink)' }}
          >
            {otherPlanet.name}
          </span>
          {lastMsg && (
            <span
              className="shrink-0 text-[10px] tabular-nums"
              style={{ color: 'var(--ghost)', opacity: 0.6 }}
            >
              {formatConversationTime(lastMsg.sentAt)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isBeam && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wide"
              style={{ background: `${color}12`, border: `1px solid ${color}22`, color, flexShrink: 0 }}
            >
              beam
            </span>
          )}
          <p
            className="text-xs truncate leading-snug"
            style={{
              color: unread ? 'var(--ink)' : 'var(--ghost)',
              opacity: unread ? 0.8 : 0.55,
              fontStyle: isBeam ? 'italic' : undefined,
            }}
          >
            {lastMsg?.content ?? 'No messages yet'}
          </p>
        </div>
      </div>

      {/* Strength bar  -  subtle */}
      <div
        className="shrink-0 flex flex-col items-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      >
        <div
          className="w-1 rounded-full"
          style={{
            height: 20 + (conversation.connectionStrength / 100) * 16,
            background: `linear-gradient(180deg, ${color}88, ${color}22)`,
          }}
        />
      </div>
    </Link>
  )
}
