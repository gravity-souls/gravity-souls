interface TagProps {
  label: string
  variant?: 'default' | 'accent' | 'dim'
}

const variantClasses = {
  default: 'bg-[rgba(167,139,250,0.12)] text-[var(--star)] border border-[rgba(167,139,250,0.2)]',
  accent: 'bg-[rgba(124,58,237,0.25)] text-[#c4b5fd] border border-[rgba(124,58,237,0.35)]',
  dim: 'bg-[rgba(255,255,255,0.05)] text-[var(--muted)] border border-[rgba(255,255,255,0.08)]',
}

export default function Tag({ label, variant = 'default' }: TagProps) {
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium tracking-wide ${variantClasses[variant]}`}>
      {label}
    </span>
  )
}
