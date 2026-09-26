-- AlterTable
ALTER TABLE "direct_message" ADD COLUMN     "clientMessageId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "direct_message_conversationId_clientMessageId_key" ON "direct_message"("conversationId", "clientMessageId");
