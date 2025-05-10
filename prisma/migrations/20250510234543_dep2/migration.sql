-- AlterTable
ALTER TABLE "Chat" ALTER COLUMN "lastCalled" SET DEFAULT to_timestamp(0),
ALTER COLUMN "lastChosen" SET DEFAULT to_timestamp(0);

-- CreateTable
CREATE TABLE "chosen_rat" (
    "id" SERIAL NOT NULL,
    "chatId" BIGINT NOT NULL,
    "ratName" TEXT NOT NULL,

    CONSTRAINT "chosen_rat_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "chosen_rat" ADD CONSTRAINT "chosen_rat_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chosen_rat" ADD CONSTRAINT "chosen_rat_ratName_fkey" FOREIGN KEY ("ratName") REFERENCES "Rat"("username") ON DELETE RESTRICT ON UPDATE CASCADE;
