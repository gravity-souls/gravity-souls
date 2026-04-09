import Link from 'next/link'
import { type ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

interface GlowButtonProps {
  children: ReactNode
  href?: string
  onClick?: () => void
  variant?: Variant
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit'
  fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:
    'nebula-gradient text-white shadow-lg hover:opacity-90 animate-pulse-glow',
  secondary:
    'glass glass-hover text-[var(--star)] border border-[rgba(167,139,250,0.3)] hover:border-[rgba(167,139,250,0.6)]',
  ghost:
    'text-[var(--star)] hover:text-white hover:bg-[rgba(167,139,250,0.08)] border border-transparent hover:border-[rgba(167,139,250,0.2)]',
}

export default function GlowButton({
  children,
  href,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false,
  type = 'button',
  fullWidth = false,
}: GlowButtonProps) {
  const base = `inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium tracking-wide transition-all duration-300 ${variantClasses[variant]} ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`

  if (href) {
    return (
      <Link href={href} className={base}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={base}>
      {children}
    </button>
  )
}
