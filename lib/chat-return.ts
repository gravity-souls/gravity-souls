export function chatReturnHref(id: string | null | undefined) {
  return id && /^[a-zA-Z0-9_-]{1,128}$/.test(id) ? `/messages/${encodeURIComponent(id)}` : null
}
export function withChatReturn(href: string, conversationId: string) {
  const url = new URL(href, 'https://local.invalid')
  if (chatReturnHref(conversationId)) url.searchParams.set('chat', conversationId)
  return url.pathname + url.search + url.hash
}
