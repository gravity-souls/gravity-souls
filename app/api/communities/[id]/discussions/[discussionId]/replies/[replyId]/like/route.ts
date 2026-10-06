import { setCommunityReplyLiked } from '@/lib/community-reply-likes'

export async function POST(request: Request, { params }: { params: Promise<{ id: string; discussionId: string; replyId: string }> }) {
  const { id, discussionId, replyId } = await params
  return setCommunityReplyLiked(request, 'discussions', { id, parentId: discussionId, replyId })
}
