-- Additive: interest is private and independent of attendance, approval and XP.
CREATE TABLE "event_interest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "event_interest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "event_interest_userId_eventId_key" ON "event_interest"("userId", "eventId");
CREATE INDEX "event_interest_userId_createdAt_idx" ON "event_interest"("userId", "createdAt");
CREATE INDEX "event_interest_eventId_idx" ON "event_interest"("eventId");
ALTER TABLE "event_interest" ADD CONSTRAINT "event_interest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_interest" ADD CONSTRAINT "event_interest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
