-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "lastRatImg" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "lastCalled" SET DEFAULT to_timestamp(0),
ALTER COLUMN "lastChosen" SET DEFAULT to_timestamp(0);
