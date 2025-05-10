-- CreateTable
CREATE TABLE "Chat" (
    "id" BIGINT NOT NULL,
    "lastCalled" TIMESTAMP(3) NOT NULL DEFAULT to_timestamp(0),
    "lastChosen" TIMESTAMP(3) NOT NULL DEFAULT to_timestamp(0),
    "lastRat" TEXT,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rat" (
    "username" TEXT NOT NULL,

    CONSTRAINT "Rat_pkey" PRIMARY KEY ("username")
);

-- CreateTable
CREATE TABLE "chat_rat" (
    "chatId" BIGINT NOT NULL,
    "ratName" TEXT NOT NULL,

    CONSTRAINT "chat_rat_pkey" PRIMARY KEY ("chatId","ratName")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rat_username_key" ON "Rat"("username");

-- AddForeignKey
ALTER TABLE "chat_rat" ADD CONSTRAINT "chat_rat_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rat" ADD CONSTRAINT "chat_rat_ratName_fkey" FOREIGN KEY ("ratName") REFERENCES "Rat"("username") ON DELETE RESTRICT ON UPDATE CASCADE;
