-- Existing accounts keep their current onboarding access. New registrations
-- must complete the adult declaration before creating their first planet.
ALTER TABLE "user" ADD COLUMN "registrationRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user" ALTER COLUMN "registrationRequired" SET DEFAULT true;
CREATE TABLE "RegistrationBasics" (
  "userId" TEXT NOT NULL PRIMARY KEY,
  "gender" TEXT NOT NULL DEFAULT 'undisclosed',
  "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "region" TEXT NOT NULL DEFAULT '',
  "interests" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "connectionGoals" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "peoplePreferences" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "gatheringPreferences" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "adultConfirmedAt" TIMESTAMP(3) NOT NULL,
  "ageMethod" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RegistrationBasics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
