-- AlterTable
ALTER TABLE "user" ADD COLUMN     "planetAtmoColor" TEXT NOT NULL DEFAULT '#b39ddb',
ADD COLUMN     "planetAtmoDensity" DOUBLE PRECISION NOT NULL DEFAULT 0.12,
ADD COLUMN     "planetCloudOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "planetCustomTexture" TEXT,
ADD COLUMN     "planetHasRing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "planetRingColor" TEXT NOT NULL DEFAULT '#9b7de0',
ADD COLUMN     "planetRotationSpeed" DOUBLE PRECISION NOT NULL DEFAULT 0.018,
ADD COLUMN     "planetTexture" TEXT NOT NULL DEFAULT 'jupiter.jpg',
ADD COLUMN     "planetTint" TEXT NOT NULL DEFAULT '#7c4dbf',
ADD COLUMN     "userLevel" INTEGER NOT NULL DEFAULT 1;
