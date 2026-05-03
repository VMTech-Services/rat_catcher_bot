/*
  Warnings:

  - Added the required column `chatName` to the `Chat` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Chat" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "chatName" TEXT NOT NULL
);
INSERT INTO "new_Chat" ("id") SELECT "id" FROM "Chat";
DROP TABLE "Chat";
ALTER TABLE "new_Chat" RENAME TO "Chat";
CREATE UNIQUE INDEX "Chat_id_key" ON "Chat"("id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
