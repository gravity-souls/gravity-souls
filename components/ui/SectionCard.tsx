import type { ReactNode } from 'react'
import OrbitCard from '@/components/ui/OrbitCard'

export default function SectionCard({
  title,
  description,
  color,
  children,
}: {
  title:       string
  description: string
  color?:      string
  children:    ReactNode
}) {
  return (
    <OrbitCard glowColor={color ?? 'var(--star)'} className="p-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
            {title}
          </h2>
          <p className="text-xs leading-snug" style={{ color: 'var(--ghost)', opacity: 0.7 }}>
            {description}
          </p>
        </div>
        {children}
      </div>
    </OrbitCard>
  )
}
