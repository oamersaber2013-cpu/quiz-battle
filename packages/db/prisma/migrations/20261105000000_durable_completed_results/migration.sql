-- Legacy history rows remain readable. New room sessions persist their host and language.
ALTER TABLE "GameSession" ADD COLUMN "hostId" TEXT;
ALTER TABLE "GameSession" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "PlayerGameStat" ADD COLUMN "avatar" TEXT;
