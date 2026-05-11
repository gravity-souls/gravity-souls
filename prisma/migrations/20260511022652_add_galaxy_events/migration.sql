-- CreateEnum
CREATE TYPE "CommunityRole" AS ENUM ('MEMBER', 'ADMIN');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PASSED');

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('MEETUP', 'ONLINE', 'WORKSHOP', 'STARGAZING', 'DISCUSSION', 'OTHER');

-- AlterTable
ALTER TABLE "community" ADD COLUMN     "creatorId" TEXT;

-- AlterTable
ALTER TABLE "community_membership" ADD COLUMN     "role" "CommunityRole" NOT NULL DEFAULT 'MEMBER';

-- CreateTable
CREATE TABLE "event" (
    "id" TEXT NOT NULL,
    "galaxyId" TEXT NOT NULL,
    "proposerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "onlineUrl" TEXT,
    "maxAttendees" INTEGER,
    "category" "EventCategory" NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'PENDING',
    "coverImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_rsvp" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_rsvp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_galaxyId_status_date_idx" ON "event"("galaxyId", "status", "date");

-- CreateIndex
CREATE INDEX "event_proposerId_createdAt_idx" ON "event"("proposerId", "createdAt");

-- CreateIndex
CREATE INDEX "event_rsvp_userId_createdAt_idx" ON "event_rsvp"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "event_rsvp_eventId_userId_key" ON "event_rsvp"("eventId", "userId");

-- AddForeignKey
ALTER TABLE "community" ADD CONSTRAINT "community_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_galaxyId_fkey" FOREIGN KEY ("galaxyId") REFERENCES "community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_proposerId_fkey" FOREIGN KEY ("proposerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_rsvp" ADD CONSTRAINT "event_rsvp_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_rsvp" ADD CONSTRAINT "event_rsvp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
