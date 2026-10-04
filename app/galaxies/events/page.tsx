import { redirect } from 'next/navigation'
export default async function LegacyEventsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(await searchParams)) if (typeof value === 'string') query.set(key, value)
  redirect(`/activities${query.size ? `?${query}` : ''}`)
}
