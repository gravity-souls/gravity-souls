CREATE TABLE "chat_image" (
 "id" TEXT PRIMARY KEY, "ownerId" TEXT NOT NULL, "conversationId" TEXT NOT NULL,
 "objectKey" TEXT NOT NULL, "rawDigest" TEXT NOT NULL,
 "width" INTEGER NOT NULL, "height" INTEGER NOT NULL, "bytes" INTEGER NOT NULL,
 "ready" BOOLEAN NOT NULL DEFAULT false, "deleteRequested" BOOLEAN NOT NULL DEFAULT false,
 "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "chat_image_dimensions" CHECK ("width" BETWEEN 1 AND 2048 AND "height" BETWEEN 1 AND 2048 AND "bytes" BETWEEN 1 AND 3145728)
);
CREATE UNIQUE INDEX "chat_image_objectKey_key" ON "chat_image"("objectKey");
CREATE INDEX "chat_image_expiresAt_idx" ON "chat_image"("expiresAt");
CREATE INDEX "chat_image_ownerId_conversationId_idx" ON "chat_image"("ownerId", "conversationId");
ALTER TABLE "direct_message" ADD COLUMN "imageId" TEXT;
CREATE UNIQUE INDEX "direct_message_imageId_key" ON "direct_message"("imageId");
ALTER TABLE "direct_message" ADD CONSTRAINT "direct_message_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "chat_image"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_message" ADD CONSTRAINT "direct_message_image_shape" CHECK (
 ("type" = 'image' AND "content" = '' AND "imageId" IS NOT NULL AND "shareKind" IS NULL AND "shareTargetId" IS NULL)
 OR ("type" <> 'image' AND "imageId" IS NULL)
);
