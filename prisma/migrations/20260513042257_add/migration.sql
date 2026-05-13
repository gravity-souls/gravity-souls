-- AlterTable
ALTER TABLE "post_comment" ADD COLUMN     "likeCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "post_comment_like" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_comment_like_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_comment_like_userId_createdAt_idx" ON "post_comment_like"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "post_comment_like_commentId_userId_key" ON "post_comment_like"("commentId", "userId");

-- AddForeignKey
ALTER TABLE "post_comment_like" ADD CONSTRAINT "post_comment_like_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "post_comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comment_like" ADD CONSTRAINT "post_comment_like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
