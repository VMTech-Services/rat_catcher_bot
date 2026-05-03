-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Chat" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "chatName" TEXT NOT NULL,
    "joinDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Chat" ("chatName", "id") SELECT "chatName", "id" FROM "Chat";
DROP TABLE "Chat";
ALTER TABLE "new_Chat" RENAME TO "Chat";
CREATE UNIQUE INDEX "Chat_id_key" ON "Chat"("id");
CREATE TABLE "new_ChatUser" (
    "userId" BIGINT NOT NULL,
    "chatId" BIGINT NOT NULL,
    "optOut" BOOLEAN NOT NULL DEFAULT false,
    "joinDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("userId", "chatId"),
    CONSTRAINT "ChatUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChatUser_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ChatUser" ("chatId", "optOut", "userId") SELECT "chatId", "optOut", "userId" FROM "ChatUser";
DROP TABLE "ChatUser";
ALTER TABLE "new_ChatUser" RENAME TO "ChatUser";
CREATE TABLE "new_User" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "joinDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "optOut" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_User" ("id", "optOut", "username") SELECT "id", "optOut", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
