export type FollowState = 'following' | 'mutual' | 'follows-you'

const STATUS_CONFIG: Record<FollowState, {
  symbol:  string
  label:   string
  color:   string
  pulse?:  boolean
}> = {
  following:   { symbol: '◌', label: 'Following',   color: 'rgba(167,139,250,0.55)' },
  'follows-you': { symbol: '○', label: 'Follows you', color: '#60a5fa' },
  mutual:      { symbol: '◉', label: 'Mutual',       color: '#a78bfa', pulse: true },
}

interface Props {
  status:   FollowState
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
