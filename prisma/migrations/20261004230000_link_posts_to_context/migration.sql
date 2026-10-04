-- Nullable reference fields preserve existing global posts.
-- The independent audience flag prevents galaxy deletion from publishing private posts.
ALTER TABLE "post" ADD COLUMN "galaxyId" TEXT,
ADD COLUMN "eventId" TEXT,
ADD COLUMN "contextRestricted" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "post_galaxyId_createdAt_idx" ON "post"("galaxyId", "createdAt");
CREATE INDEX "post_eventId_createdAt_idx" ON "post"("eventId", "createdAt");
ALTER TABLE "post" ADD CONSTRAINT "post_galaxyId_fkey" FOREIGN KEY ("galaxyId") REFERENCES "community"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "post" ADD CONSTRAINT "post_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
