/** Navigation hints only. Destination APIs always recheck access. */
const safeId = (value: string | null | undefined) => !!value && /^[A-Za-z0-9_-]{1,128}$/.test(value)

export function postReturnHref(id: string | null | undefined): string | null {
  return safeId(id) ? `/stream/${encodeURIComponent(id!)}` : null
}

/** Allow only a single galaxy path and optional activity, never an arbitrary redirect. */
export function postContextReturnHref(value: string | null | undefined): string | null {
  if (!value || value.length > 2048 || !/^\/galaxy\/[^/?#\\]+(?:\?[^#]*)?(?:#events)?$/.test(value)) return null
  try {
    const url = new URL(value, 'https://local.invalid')
    const slug = decodeURIComponent(url.pathname.slice('/galaxy/'.length))
    if (!slug || slug.length > 128 || /[\s/\\?#%\u0000-\u001f\u007f]/.test(slug) || slug === '.' || slug === '..') return null
    if (url.pathname !== `/galaxy/${encodeURIComponent(slug)}` && url.pathname !== `/galaxy/${slug}`) return null
    const event = url.searchParams.get('event')
    if (event !== null && !safeId(event)) return null
    if ([...url.searchParams.keys()].some(key => key !== 'event') || url.searchParams.getAll('event').length > 1) return null
    return `/galaxy/${encodeURIComponent(slug)}${event ? `?event=${encodeURIComponent(event)}#events` : url.hash === '#events' ? '#events' : ''}`
  } catch { return null }
}

export function withPostOrigin(id: string, contextHref?: string | null): string {
  const post = postReturnHref(id)
  if (!post) return '/stream'
  const origin = postContextReturnHref(contextHref)
  return origin ? `${post}?${new URLSearchParams({ fromContext: origin })}` : post
}

export function withPostReturn(contextHref: string, postId: string): string {
  const context = postContextReturnHref(contextHref)
  if (!context) return '/stream'
  if (!postReturnHref(postId)) return context
  const url = new URL(context, 'https://local.invalid')
  url.searchParams.set('returnPost', postId)
  return url.pathname + url.search + url.hash
}
