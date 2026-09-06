import { z } from 'zod'

const MAX_JSON_BYTES = 64 * 1024

export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<
  { ok: true; data: T } | { ok: false; response: Response }
> {
  const fail = (error: string, status = 400) => ({ ok: false as const, response: Response.json({ error }, { status }) })
  if (Number(request.headers.get('content-length')) > MAX_JSON_BYTES) return fail('Request is too large', 413)
  const reader = request.body?.getReader()
  if (!reader) return fail('JSON body is required')
  let body = ''
  let size = 0
  const decoder = new TextDecoder('utf-8', { fatal: true })
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      size += chunk.value.byteLength
      if (size > MAX_JSON_BYTES) {
        await reader.cancel()
        return fail('Request is too large', 413)
      }
      body += decoder.decode(chunk.value, { stream: true })
    }
    body += decoder.decode()
    const result = schema.safeParse(JSON.parse(body))
    if (!result.success) return fail('Invalid request fields')
    return { ok: true, data: result.data }
  } catch {
    return fail('Invalid JSON body')
  } finally {
    reader.releaseLock()
  }
}

export function safeApiError(error: unknown): Response {
  if (error instanceof Response) return error
  // Never log payloads, credentials, or raw database errors.
  const reference = crypto.randomUUID()
  console.error('API request failed', { reference })
  return Response.json({ error: 'Unable to complete this request. Please try again.', reference }, { status: 500 })
}
