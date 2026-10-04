interface Props {
  title: string
  eyebrow: string
  subtitle: string
  accentColor?: string
}

/** Solid text stays readable even when a browser cannot clip gradients to glyphs. */
export default function ResonanceHeader({ title, eyebrow, subtitle, accentColor = '#a78bfa' }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs uppercase tracking-[0.25em] font-medium" style={{ color: accentColor, opacity: 0.7 }}>
        {eyebrow}
      </p>
      <h1 className="text-4xl sm:text-5xl font-bold" style={{ color: 'var(--foreground)' }}>
        {title}
      </h1>
      <p className="text-sm max-w-xl" style={{ color: 'var(--ink)', opacity: 0.55 }}>
        {subtitle}
      </p>
    </div>
  )
}
