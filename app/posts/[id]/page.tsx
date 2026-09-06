import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PostPage({ params }: Props) {
  const { id } = await params
  redirect(`/stream/${id}`)
}
