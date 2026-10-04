-- CreateEnum
CREATE TYPE "GalaxyJoinPolicy" AS ENUM ('OPEN', 'APPROVAL');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "EventStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "community" ADD COLUMN     "joinPolicy" "GalaxyJoinPolicy" NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "event" ADD COLUMN     "approvalRewarded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "requiresApproval" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "event_rsvp" ADD COLUMN     "rewarded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "AttendanceStatus" NOT NULL DEFAULT 'APPROVED';

-- CreateTable
CREATE TABLE "community_join_request" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PENDING',
    "rewarded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_join_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_join_request_communityId_status_idx" ON "community_join_request"("communityId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "community_join_request_userId_communityId_key" ON "community_join_request"("userId", "communityId");

-- AddForeignKey
ALTER TABLE "community_join_request" ADD CONSTRAINT "community_join_request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_join_request" ADD CONSTRAINT "community_join_request_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing attendance/approvals already earned their rewards; never award again.
UPDATE "event_rsvp" SET "rewarded" = true;
UPDATE "event" SET "approvalRewarded" = true WHERE "status" IN ('APPROVED', 'PASSED');
