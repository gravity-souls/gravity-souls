'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import SectionHeader from '@/components/ui/SectionHeader'
import EmptyState from '@/components/ui/EmptyState'
import GlowButton from '@/components/ui/GlowButton'
import ConversationRouteCard from '@/components/social/ConversationRouteCard'
import type { Conversation } from '@/types/social'
import type { PlanetProfile } from '@/types/planet'
import { getUserRole } from '@/lib/user'
import { mockConversations, getOtherPlanetId } from '@/lib/mock-conversations'
import { getPlanetById } from '@/lib/mock-planets'

// --- MessagesPage -------------------------------------------------------------

export default function MessagesPage() {
  const [role, setRole]                   = useState<'explorer' | 'resonator' | null>(null)
  const [conversations, setConversations] = useState<{ conv: Conversation; planet: PlanetProfile }[]>([])

  useEffect(() => {
    const userRole = getUserRole()
    setRole(userRole)

    if (userRole === 'resonator') {
      const myId = 'p-aelion'
      const pairs = mockConversations
        .map((conv) => {
          const otherId = getOtherPlanetId(conv, myId)
          const planet  = getPlanetById(otherId)
          return planet ? { conv, planet } : null
        })
        .filter((x): x is { conv: Conversation; planet: PlanetProfile } => x !== null)

      setConversations(pairs)
    }
  }, [])

  if (role === null) return null

  return (
    <AppShell>
      <div className="px-6 pt-8 pb-16 max-w-2xl mx-auto">
        <SectionHeader
          eyebrow="Signals"
          level={1}
          title="Messages"
          subtitle="Communication beams between planets. Signals sent, signals received."
        />

        {role === 'explorer' && (
          <EmptyState
            symbol="◌"
            title="Signals require a planet"
            subtitle="Create your planet first. Only Resonators can send and receive communication beams."
            action={<GlowButton href="/create-planet" variant="primary">Awaken my planet</GlowButton>}
            className="mt-8"
          />
        )}

        {role === 'resonator' && conversations.length === 0 && (
          <EmptyState
            symbol="↗"
            title="No beams yet"
            subtitle="Find a planet that resonates and send it a first signal."
            action={<GlowButton href="/stream" variant="secondary">Explore the stream</GlowButton>}
            className="mt-8"
          />
        )}

        {role === 'resonator' && conversations.length > 0 && (
          <div className="mt-8 flex flex-col gap-2">
            {conversations.map(({ conv, planet }) => (
              <ConversationRouteCard
                key={conv.id}
                conversation={conv}
                otherPlanet={planet}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
