'use client'

import { use, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import CommunicationHeader from '@/components/social/CommunicationHeader'
import SignalMessageBubble from '@/components/social/SignalMessageBubble'
import SignalComposer from '@/components/social/SignalComposer'
import type { Message } from '@/types/social'
import { getConversation, getMessages, getOtherPlanetId } from '@/lib/mock-conversations'
import { getPlanetById } from '@/lib/mock-planets'

// --- ConversationPage ---------------------------------------------------------

interface Props {
  params: Promise<{ id: string }>
}

export default function ConversationPage({ params }: Props) {
  const { id }   = use(params)
  const router   = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)

  const MY_PLANET_ID = 'p-aelion'

  const conversation = getConversation(id)
  const myPlanet     = getPlanetById(MY_PLANET_ID)

  const [messages, setMessages] = useState<Message[]>(() => getMessages(id))

  // Scroll to bottom on load and when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Redirect if conversation or planet not found
  useEffect(() => {
    if (!conversation || !myPlanet) router.replace('/messages')
  }, [conversation, myPlanet, router])

  if (!conversation || !myPlanet) return null

  const otherPlanetId = getOtherPlanetId(conversation, MY_PLANET_ID)
  const otherPlanet   = getPlanetById(otherPlanetId)

  if (!otherPlanet) return null

  function handleSend(content: string) {
    const msg: Message = {
      id:      `msg-local-${Date.now()}`,
      fromId:  MY_PLANET_ID,
      toId:    otherPlanetId,
      content,
      type:    'text',
      sentAt:  new Date().toISOString(),
    }
    setMessages((prev) => [...prev, msg])
  }

  return (
    <div
      className="flex flex-col"
      style={{
        minHeight: '100dvh',
        background: 'var(--background)',
      }}
    >
      {/* Sticky top header */}
      <CommunicationHeader
        conversation={conversation}
        myPlanet={myPlanet}
        otherPlanet={otherPlanet}
      />

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-4">
        {messages.map((msg) => {
          const isOwn       = msg.fromId === MY_PLANET_ID
          const senderPlanet = isOwn ? myPlanet : otherPlanet
          return (
            <SignalMessageBubble
              key={msg.id}
              message={msg}
              isOwn={isOwn}
              senderPlanet={senderPlanet}
            />
          )
        })}

        {/* Empty beam-only state hint */}
        {messages.length === 1 && messages[0].type === 'beam' && messages[0].fromId === MY_PLANET_ID && (
          <p
            className="text-center text-xs italic mt-2"
            style={{ color: 'var(--ghost)', opacity: 0.45 }}
          >
            Awaiting response from {otherPlanet.name}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Sticky composer */}
      <SignalComposer
        onSend={handleSend}
        accentColor={otherPlanet.visual.coreColor}
        placeholder={`Transmit to ${otherPlanet.name}…`}
      />
    </div>
  )
}
