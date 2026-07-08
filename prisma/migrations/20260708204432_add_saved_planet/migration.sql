-- CreateTable
CREATE TABLE "saved_planet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planetId" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "label" TEXT,

    CONSTRAINT "saved_planet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_planet_userId_savedAt_idx" ON "saved_planet"("userId", "savedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "saved_planet_userId_planetId_key" ON "saved_planet"("userId", "planetId");

-- AddForeignKey
ALTER TABLE "saved_planet" ADD CONSTRAINT "saved_planet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_planet" ADD CONSTRAINT "saved_planet_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "planet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
