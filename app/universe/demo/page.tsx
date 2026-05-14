import { Suspense } from 'react'
import UniverseExplorationDeck from '@/components/universe/UniverseExplorationDeck'

export default function UniverseDemoPage() {
  return (
    <Suspense fallback={null}>
      <UniverseExplorationDeck />
    </Suspense>
  )
}
