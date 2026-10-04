export async function galaxyRequest<T>(
  url: string,
  method = 'GET',
  data?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    cache: 'no-store',
    ...(data !== undefined
      ? {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      : {}),
  })
  const result = await response.json()
  if (!response.ok)
    throw new Error(
      response.status === 401 ? 'signInRequired' : (result.error ?? 'failed'),
    )
  return result as T
}
