-- CreateTable
CREATE TABLE "chat" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "lastCalled" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastChosen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRat" TEXT,
    "lastRatImg" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "rat" (
    "username" TEXT NOT NULL PRIMARY KEY
);

-- CreateTable
CREATE TABLE "chat_rat" (
    "chatId" BIGINT NOT NULL,
    "ratName" TEXT NOT NULL,

    PRIMARY KEY ("chatId", "ratName"),
    CONSTRAINT "chat_rat_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "chat" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "chat_rat_ratName_fkey" FOREIGN KEY ("ratName") REFERENCES "rat" ("username") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chosen_rat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "chatId" BIGINT NOT NULL,
    "ratName" TEXT NOT NULL,
    CONSTRAINT "chosen_rat_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "chat" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "chosen_rat_ratName_fkey" FOREIGN KEY ("ratName") REFERENCES "rat" ("username") ON DELETE RESTRICT ON UPDATE CASCADE
);
