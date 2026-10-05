ALTER TABLE "RegistrationBasics" ADD COLUMN "publicTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
