-- AlterTable
ALTER TABLE "post_comment" ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "post_comment_postId_parentId_createdAt_idx" ON "post_comment"("postId", "parentId", "createdAt");

-- CreateIndex
CREATE INDEX "post_comment_parentId_createdAt_idx" ON "post_comment"("parentId", "createdAt");

-- AddForeignKey
ALTER TABLE "post_comment" ADD CONSTRAINT "post_comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "post_comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
