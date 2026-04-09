import type { Message } from '@/types/social'
import type { PlanetProfile } from '@/types/planet'
import { formatTimestamp } from '@/lib/time'

// ─── Beam message — first signal, centered ceremonial ────────────────────────

function BeamMessage({ message, sender }: { message: Message; sender: PlanetProfile }) {
  return (
    <div className="flex flex-col items-center gap-3 py-4 px-6">
      {/* Beam line */}
      <div className="flex items-center gap-3 w-full max-w-sm">
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(167,139,250,0.3))' }} />
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
          style={{
            background: `${sender.visual.coreColor}18`,
            border: `1px solid ${sender.visual.coreColor}35`,
            color: sender.visual.coreColor,
          }}
        >
          {sender.avatarSymbol}
        </div>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(167,139,250,0.3))' }} />
      </div>

      {/* Content */}
      <p
        className="text-sm italic text-center leading-relaxed max-w-sm"
        style={{ color: 'var(--ink)', opacity: 0.75 }}
      >
        &ldquo;{message.content}&rdquo;
      </p>

      {/* Beam label + time */}
      <div className="flex items-center gap-2">
        <span
          className="text-[9px] px-2 py-0.5 rounded uppercase tracking-wider"
          style={{
            background: 'rgba(167,139,250,0.08)',
            border: '1px solid rgba(167,139,250,0.18)',
            color: 'var(--star)',
          }}
        >
          First beam · {formatTimestamp(message.sentAt)}
        </span>
      </div>
    </div>
  )
}

// ─── SignalMessageBubble ──────────────────────────────────────────────────────

interface Props {
  message:      Message
  isOwn:        boolean
  senderPlanet: PlanetProfile
}

export default function SignalMessageBubble({ message, isOwn, senderPlanet }: Props) {
  if (message.type === 'beam') {
    return <BeamMessage message={message} sender={senderPlanet} />
  }

  const color = senderPlanet.visual.coreColor

  return (
    <div className={`flex items-end gap-2.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Planet mini orb (only for other's messages) */}
      {!isOwn && (
        <div
          className="shrink-0 flex items-center justify-center rounded-full mb-0.5"
          style={{
            width: 28, height: 28,
            background: `radial-gradient(circle at 35% 30%, ${senderPlanet.visual.accentColor}cc 0%, ${color}66 100%)`,
            boxShadow: `0 0 6px ${color}30`,
            fontSize: 12,
            color,
          }}
        >
          {senderPlanet.avatarSymbol}
        </div>
      )}

      {/* Bubble */}
      <div
        className="relative max-w-[72%] sm:max-w-[60%] px-4 py-2.5 rounded-2xl"
        style={
          isOwn
            ? {
                background: `linear-gradient(135deg, rgba(124,58,237,0.28) 0%, rgba(79,70,229,0.22) 100%)`,
                border: '1px solid rgba(167,139,250,0.22)',
                borderBottomRightRadius: 6,
              }
            : {
                background: 'rgba(255,255,255,0.055)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderBottomLeftRadius: 6,
              }
        }
      >
        <p
          className="text-sm leading-relaxed"
          style={{ color: isOwn ? '#e8e0ff' : 'var(--ink)', opacity: isOwn ? 0.92 : 0.82 }}
        >
          {message.content}
        </p>

        <span
          className="block mt-1 text-right text-[9px] tabular-nums"
          style={{ color: 'var(--ghost)', opacity: 0.45 }}
        >
          {formatTimestamp(message.sentAt)}
          {message.readAt && isOwn && ' · seen'}
        </span>
      </div>
    </div>
  )
}
