'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { explorationOrigin } from '@/lib/exploration-return'
import ExplorationReturnLink from './ExplorationReturnLink'
function ReturnLink() {
  const origin = explorationOrigin(useSearchParams().get('from'))
  return origin?.startsWith('personal-star-map-') ? <ExplorationReturnLink origin={origin} /> : null
}
export default function ContextMapReturnLink() { return <Suspense><ReturnLink /></Suspense> }
