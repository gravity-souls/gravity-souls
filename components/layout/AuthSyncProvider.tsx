'use client'

import { useAuthSync } from '@/lib/hooks/useAuthSync'

/**
 * Invisible client component that syncs localStorage data to the database
 * when an authenticated user visits the app. Renders nothing.
 */
export default function AuthSyncProvider({ children }: { children: React.ReactNode }) {
  useAuthSync()
  return <>{children}</>
}
