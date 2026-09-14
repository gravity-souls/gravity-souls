-- CreateEnum
CREATE TYPE "PolicyType" AS ENUM ('TERMS', 'PRIVACY', 'GUIDELINES');

-- CreateTable
CREATE TABLE "policy_acceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "policyType" "PolicyType" NOT NULL,
    "version" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_acceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "policy_acceptance_userId_idx" ON "policy_acceptance"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "policy_acceptance_userId_policyType_version_key" ON "policy_acceptance"("userId", "policyType", "version");

-- AddForeignKey
ALTER TABLE "policy_acceptance" ADD CONSTRAINT "policy_acceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
