import { requireUser } from '@/lib/session'
import { safeApiError } from '@/lib/api-input'
import { regionSuggestions } from '@/lib/region-search'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'
import { chineseRegionSuggestions, searchableRegionQuery } from '@/lib/region-aliases'

const cache = new Map<string, { expires: number; suggestions: ReturnType<typeof regionSuggestions> }>()
export async function GET(request: Request) {
  try {
    const { user } = await requireUser()
    const owner = await prisma.user.findUnique({ where: { id: user.id }, select: { deletedAt: true } })
    if (!owner || owner.deletedAt) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const q = new URL(request.url).searchParams.get('q')?.trim() || ''
    if (!searchableRegionQuery(q) || q.length > 100) return Response.json({ suggestions: [] })
    const translated = chineseRegionSuggestions(q)
    if (translated.length) return Response.json({ suggestions: translated })
    const key = q.toLocaleLowerCase(), now = Date.now(), cached = cache.get(key)
    if (cached && cached.expires > now) return Response.json({ suggestions: cached.suggestions })
    if (!await checkRateLimit(`REGION_SEARCH:${user.id}`,60,60_000)) return Response.json({ error: 'tooManyRequests' }, { status: 429 })
    const url = new URL('https://photon.komoot.io/api/')
    url.searchParams.set('q',q); url.searchParams.set('limit','6'); url.searchParams.set('lang','en')
    for (const layer of ['city','county','state','country']) url.searchParams.append('layer',layer)
    const response = await fetch(url, { signal: AbortSignal.timeout(5000), cache: 'no-store' })
    if (!response.ok) throw new Error('Region search unavailable')
    const suggestions = regionSuggestions(await response.json())
    if (cache.size >= 200) cache.delete(cache.keys().next().value!)
    cache.set(key, { expires: now+3600_000, suggestions })
    return Response.json({ suggestions })
  } catch (error) {
    if (error instanceof Response) return error
    if (error instanceof Error && (error.name === 'TimeoutError' || error.message === 'Region search unavailable' || error instanceof TypeError)) return Response.json({ error: 'unavailable' }, { status: 503 })
    return safeApiError(error)
  }
}
