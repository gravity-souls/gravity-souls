import type { Prisma } from '@prisma/client'
import { blockedUserIds } from '@/lib/visibility'
export async function visibleConversationWhere(
  userId: string,
): Promise<Prisma.ConversationThreadWhereInput> {
  const excluded = [...(await blockedUserIds(userId))]
  return {
    OR: [{ userAId: userId }, { userBId: userId }],
    AND: [{ userAId: { notIn: excluded } }, { userBId: { notIn: excluded } }],
  }
}
export function serializeMessage(message: {
  id: string
  senderId: string
  content: string
  type: string
  createdAt: Date
  readAt: Date | null
}) {
  return {
    id: message.id,
    fromId: message.senderId,
    content: message.content,
    type: message.type,
    sentAt: message.createdAt.toISOString(),
    readAt: message.readAt?.toISOString(),
  }
}
