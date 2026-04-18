import type { RelationshipStatus } from '@/types/social'

// --- Status configuration -----------------------------------------------------

const STATUS_CONFIG: Record<RelationshipStatus, {
  symbol:  string
  label:   string
  color:   string
  pulse?:  boolean
}> = {
  signal:   { symbol: '◌', label: 'First signal',  color: 'rgba(167,139,250,0.55)' },
  orbit:    { symbol: '○', label: 'In orbit',       color: '#60a5fa' },
  resonant: { symbol: '◉', label: 'Resonant',       color: '#a78bfa', pulse: true },
  aligned:  { symbol: '⊙', label: 'Aligned',        color: '#fbbf24', pulse: true },
}

// --- RelationshipStateBadge ---------------------------------------------------

interface Props {
  status:   RelationshipStatus
  compact?: boolean  // just dot + label, no background pill
}

export default function RelationshipStateBadge({ status, compact = false }: Props) {
  const cfg = STATUS_CONFIG[status]

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <div
          className={cfg.pulse ? 'animate-pulse' : ''}
          style={{
            width: 6, height: 6,
            borderRadius: '50%',
            background: cfg.color,
            boxShadow: cfg.pulse ? `0 0 6px ${cfg.color}` : undefined,
          }}
        />
        <span className="text-[10px] uppercase tracking-widest" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
      style={{
        background: `${cfg.color}10`,
        border: `1px solid ${cfg.color}28`,
      }}
    >
      <span className="text-xs" style={{ color: cfg.color, lineHeight: 1 }}>
        {cfg.symbol}
      </span>
      <span className="text-[10px] uppercase tracking-widest font-medium" style={{ color: cfg.color }}>
        {cfg.label}
      </span>
    </div>
  )
}
