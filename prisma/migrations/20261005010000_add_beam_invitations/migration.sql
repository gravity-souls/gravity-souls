-- Additive contact invitations. Existing conversations/follows/messages are unchanged.
ALTER TYPE "NotificationType" ADD VALUE 'BEAM_INVITATION';
ALTER TYPE "NotificationType" ADD VALUE 'BEAM_INVITATION_ACCEPTED';
CREATE TYPE "BeamInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');
CREATE TABLE "beam_invitation" (
  "id" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "status" "BeamInvitationStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "beam_invitation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "beam_invitation_not_self" CHECK ("senderId" <> "recipientId")
);
CREATE UNIQUE INDEX "beam_invitation_senderId_recipientId_key" ON "beam_invitation"("senderId", "recipientId");
CREATE INDEX "beam_invitation_recipientId_status_createdAt_idx" ON "beam_invitation"("recipientId", "status", "createdAt");
CREATE INDEX "beam_invitation_senderId_createdAt_idx" ON "beam_invitation"("senderId", "createdAt");
ALTER TABLE "beam_invitation" ADD CONSTRAINT "beam_invitation_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "beam_invitation" ADD CONSTRAINT "beam_invitation_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
