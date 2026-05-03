-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChatUser" (
    "userId" BIGINT NOT NULL,
    "chatId" BIGINT NOT NULL,
    "optOut" BOOLEAN NOT NULL DEFAULT false,
    "joinDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ratCount" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("userId", "chatId"),
    CONSTRAINT "ChatUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChatUser_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ChatUser" ("chatId", "joinDate", "optOut", "userId") SELECT "chatId", "joinDate", "optOut", "userId" FROM "ChatUser";
DROP TABLE "ChatUser";
ALTER TABLE "new_ChatUser" RENAME TO "ChatUser";
CREATE TABLE "new_User" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "joinDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ratCount" INTEGER NOT NULL DEFAULT 0,
    "optOut" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_User" ("id", "joinDate", "optOut", "username") SELECT "id", "joinDate", "optOut", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
