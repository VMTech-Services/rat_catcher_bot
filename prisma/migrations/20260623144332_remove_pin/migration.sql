/*
  Warnings:

  - You are about to drop the column `lastPinnedRatMsg` on the `Chat` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Chat" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "chatName" TEXT NOT NULL,
    "joinDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Chat" ("chatName", "id", "joinDate") SELECT "chatName", "id", "joinDate" FROM "Chat";
DROP TABLE "Chat";
ALTER TABLE "new_Chat" RENAME TO "Chat";
CREATE UNIQUE INDEX "Chat_id_key" ON "Chat"("id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
