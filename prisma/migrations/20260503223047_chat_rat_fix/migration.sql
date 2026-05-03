/*
  Warnings:

  - The primary key for the `ChatRat` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChatRat" (
    "userId" BIGINT NOT NULL,
    "chatId" BIGINT NOT NULL,
    "date" DATETIME NOT NULL PRIMARY KEY DEFAULT CURRENT_TIMESTAMP,
    "ratImageN" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ChatRat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChatRat_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ChatRat" ("chatId", "date", "ratImageN", "userId") SELECT "chatId", "date", "ratImageN", "userId" FROM "ChatRat";
DROP TABLE "ChatRat";
ALTER TABLE "new_ChatRat" RENAME TO "ChatRat";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
