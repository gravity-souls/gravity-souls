import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export default function OnboardingShell({ children }: Props) {
  return (
    <div
      className="relative flex flex-col items-center px-6 pb-16"
      style={{ paddingTop: 'calc(var(--nav-h, 64px) + 2.5rem)', minHeight: '100vh' }}
    >
      <div className="w-full max-w-lg">
        {children}
      </div>
    </div>
  )
}
