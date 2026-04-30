'use client'

import Image from 'next/image'
import Link from 'next/link'

export interface ActivityEvent {
  id: string
  title: string
  subtitle?: string
  /** ISO date string */
  date: string
  time?: string
  location?: string
  tags?: string[]
  /** URL for the cover image (optional) */
  imageUrl?: string
  /** Accent color for the card */
  accentColor?: string
  href?: string
}

interface Props {
  event: ActivityEvent
  className?: string
}

/**
 * UpcomingActivityCard — displays a single upcoming event/activity
 * with cover image, title, date/time, location, and tags.
 */
export default function UpcomingActivityCard({ event, className = '' }: Props) {
  const accent = event.accentColor ?? '#a78bfa'
  const date = new Date(event.date)
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const ctaStyle = {
    background: `linear-gradient(135deg, ${accent}44 0%, ${accent}22 100%)`,
    border: `1px solid ${accent}44`,
    color: 'var(--foreground)',
    cursor: event.href ? 'pointer' : 'default',
    textDecoration: 'none',
  }

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl ${className}`}
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Cover image */}
      {event.imageUrl && (
        <div className="relative w-full h-32 overflow-hidden">
          <Image
            src={event.imageUrl}
            alt=""
            width={360}
            height={128}
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, transparent 50%, rgba(4,3,18,0.8) 100%)',
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4 flex flex-col gap-3">
        <div>
          <h4 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            {event.title}
          </h4>
          {event.subtitle && (
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--ghost)' }}>
              {event.subtitle}
            </p>
          )}
        </div>

        {/* Date & Time */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ink)' }}>
            <span style={{ opacity: 0.5 }}>📅</span>
            {dateStr}
          </span>
          {event.time && (
            <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ink)' }}>
              <span style={{ opacity: 0.5 }}>⏰</span>
              {event.time}
            </span>
          )}
        </div>

        {/* Location */}
        {event.location && (
          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ghost)' }}>
            <span style={{ opacity: 0.5 }}>📍</span>
            {event.location}
          </span>
        )}

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {event.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2.5 py-0.5 rounded-full"
                style={{
                  background: `${accent}14`,
                  border: `1px solid ${accent}28`,
                  color: accent,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        {event.href ? (
          <Link
            href={event.href}
            className="w-full py-2 rounded-lg text-xs font-medium tracking-wide transition-all text-center"
            style={ctaStyle}
          >
            View details &amp; RSVP
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="w-full py-2 rounded-lg text-xs font-medium tracking-wide transition-all opacity-60"
            style={ctaStyle}
          >
            Details coming soon
          </button>
        )}
      </div>
    </div>
  )
}
