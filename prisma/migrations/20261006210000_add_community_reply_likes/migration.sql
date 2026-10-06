CREATE TABLE "community_post_reply_like" (
    "id" TEXT NOT NULL,
    "replyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "community_post_reply_like_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "community_discussion_reply_like" (
    "id" TEXT NOT NULL,
    "replyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "community_discussion_reply_like_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "community_post_reply_like_replyId_userId_key" ON "community_post_reply_like"("replyId", "userId");
CREATE INDEX "community_post_reply_like_userId_createdAt_idx" ON "community_post_reply_like"("userId", "createdAt");
CREATE UNIQUE INDEX "community_discussion_reply_like_replyId_userId_key" ON "community_discussion_reply_like"("replyId", "userId");
CREATE INDEX "community_discussion_reply_like_userId_createdAt_idx" ON "community_discussion_reply_like"("userId", "createdAt");

ALTER TABLE "community_post_reply_like" ADD CONSTRAINT "community_post_reply_like_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "community_post_reply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_post_reply_like" ADD CONSTRAINT "community_post_reply_like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_discussion_reply_like" ADD CONSTRAINT "community_discussion_reply_like_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "community_discussion_reply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_discussion_reply_like" ADD CONSTRAINT "community_discussion_reply_like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
