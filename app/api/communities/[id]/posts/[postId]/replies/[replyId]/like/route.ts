import { setCommunityReplyLiked } from '@/lib/community-reply-likes'

export async function POST(request: Request, { params }: { params: Promise<{ id: string; postId: string; replyId: string }> }) {
  const { id, postId, replyId } = await params
  return setCommunityReplyLiked(request, 'posts', { id, parentId: postId, replyId })
}
