ALTER TABLE "direct_message" ADD COLUMN "replyToId" TEXT;
ALTER TABLE "direct_message" ADD COLUMN "reactionVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "direct_message" ADD CONSTRAINT "direct_message_reply_not_self" CHECK ("replyToId" IS NULL OR "replyToId" <> "id");
CREATE TABLE "direct_message_reaction" (
 "id" TEXT PRIMARY KEY, "messageId" TEXT NOT NULL, "userId" TEXT NOT NULL,
 "emoji" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "direct_message_reaction_emoji" CHECK ("emoji" IN ('👍','❤️','😂','😮','😢','✨')),
 CONSTRAINT "direct_message_reaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "direct_message"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "direct_message_reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "direct_message_reaction_messageId_userId_key" ON "direct_message_reaction"("messageId","userId");
CREATE INDEX "direct_message_reaction_userId_idx" ON "direct_message_reaction"("userId");
