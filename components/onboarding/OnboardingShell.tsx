import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Optional right-column preview (steps 1–4 desktop sidebar). Hidden on mobile. */
  previewSlot?: ReactNode
}

export default function OnboardingShell({ children, previewSlot }: Props) {
  return (
    <div
      className="relative flex flex-col items-center px-6 pb-16"
      style={{ paddingTop: 'calc(var(--nav-h, 64px) + 2.5rem)', minHeight: '100vh' }}
    >
      {previewSlot ? (
        <div className="w-full max-w-5xl grid lg:grid-cols-[1fr_340px] gap-10 items-start">
          <div>{children}</div>
          <div className="hidden lg:block sticky top-24">{previewSlot}</div>
        </div>
      ) : (
        <div className="w-full max-w-lg">{children}</div>
      )}
    </div>
  )
}
