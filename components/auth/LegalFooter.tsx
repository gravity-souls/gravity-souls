import Link from 'next/link'

export default function LegalFooter() {
  return (
    <p className="text-center text-xs leading-relaxed" style={{ color: 'var(--ghost)' }}>
      By continuing, you agree to our{' '}
      <Link
        href="/legal/terms"
        className="underline transition-colors"
        style={{ color: 'var(--star)' }}
      >
        Terms of Service
      </Link>
      ,{' '}
      <Link
        href="/legal/privacy"
        className="underline transition-colors"
        style={{ color: 'var(--star)' }}
      >
        Privacy Policy
      </Link>
      , and{' '}
      <Link
        href="/legal/guidelines"
        className="underline transition-colors"
        style={{ color: 'var(--star)' }}
      >
        Community Guidelines
      </Link>
      .
    </p>
  )
}
