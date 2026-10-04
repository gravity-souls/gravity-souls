'use client'

import { useTranslations } from 'next-intl'
import { messageParts } from '@/lib/chat-content'

export default function MessageContent({ content }: { content: string }) {
  const t = useTranslations('chatContent')
  return <p className="whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere]" style={{ color: 'var(--foreground)' }}>
    {messageParts(content).map((part, index) => part.href
      ? <a key={index} href={part.href} target="_blank" rel="noopener noreferrer" className="text-violet-200 underline underline-offset-2 focus-visible:outline focus-visible:outline-2" aria-label={`${part.text} (${t('opensNewTab')})`}>{part.text}</a>
      : part.text)}
  </p>
}
