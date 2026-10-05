CREATE TABLE "push_subscription" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "sessionId" TEXT NOT NULL,
 "endpointHash" TEXT NOT NULL, "endpoint" TEXT NOT NULL,
 "p256dh" TEXT NOT NULL, "auth" TEXT NOT NULL,
 "preview" TEXT NOT NULL DEFAULT 'generic', "revision" INTEGER NOT NULL DEFAULT 1,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "push_subscription_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "session"("id") ON DELETE CASCADE,
 CONSTRAINT "push_subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE,
 CONSTRAINT "push_subscription_preview_check" CHECK ("preview" IN ('generic','sender'))
);
CREATE UNIQUE INDEX "push_subscription_endpointHash_key" ON "push_subscription"("endpointHash");
CREATE INDEX "push_subscription_userId_idx" ON "push_subscription"("userId");
CREATE TABLE "push_delivery" (
 "id" TEXT NOT NULL PRIMARY KEY, "subscriptionId" TEXT NOT NULL, "messageId" TEXT NOT NULL,
 "subscriptionRevision" INTEGER NOT NULL, "status" TEXT NOT NULL DEFAULT 'pending', "attempts" INTEGER NOT NULL DEFAULT 0,
 "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3) NOT NULL,
 "leaseUntil" TIMESTAMP(3), "leaseToken" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "push_delivery_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "push_subscription"("id") ON DELETE CASCADE,
 CONSTRAINT "push_delivery_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "direct_message"("id") ON DELETE CASCADE,
 CONSTRAINT "push_delivery_status_check" CHECK ("status" IN ('pending','sent','skipped','failed')),
 CONSTRAINT "push_delivery_attempts_check" CHECK ("attempts" BETWEEN 0 AND 3)
);
CREATE UNIQUE INDEX "push_delivery_subscriptionId_messageId_key" ON "push_delivery"("subscriptionId", "messageId");
CREATE INDEX "push_delivery_status_nextAttemptAt_idx" ON "push_delivery"("status", "nextAttemptAt");
CREATE INDEX "push_delivery_expiresAt_idx" ON "push_delivery"("expiresAt");
