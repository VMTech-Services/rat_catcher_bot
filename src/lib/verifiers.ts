import db from "./db.js";

const verifiedUsers = new Map<number, string>();
const verifiedChats = new Map<number, string>();

const verifiedChatUsers = new Set<string>();

/**
 * Ensures that user and chat data is present in database.
 * After first test, it will use memory instead of requests to DB.
 * 
 * @param mode 
 * @param tgId 
 * @param additionData
 * @returns True after verification
 */
export async function ensure(mode: "chat" | "user", tgId: number, additionData: { tgUserName?: string, tgChatName?: string }) {
    const cache = mode === "chat" ? verifiedChats : verifiedUsers;

    if (cache.has(tgId)) {
        return true;
    }

    const name = mode === "chat" ? additionData.tgChatName : additionData.tgUserName;
    let result;

    if (mode === "chat") {
        result = await db.chat.count({
            where: { id: tgId }
        });
    } else {
        result = await db.user.count({
            where: { id: tgId }
        });
    }

    const isPresent = result === 1;

    if (!isPresent) {
        if (mode === "chat") {
            if (!name) {
                console.error("No chat name to create new chat in DB!");
                throw new Error("Missing chat name");
            }

            await db.chat.create({
                data: {
                    id: tgId,
                    chatName: name
                }
            });

            console.log(`Created new DB record for chat "${name}" (ID: ${tgId})`);
        } else {
            if (!name) {
                console.error("No tg username to create new user in DB!");
                throw new Error("Missing user name");
            }

            await db.user.create({
                data: {
                    id: tgId,
                    username: name
                }
            });

            console.log(`Created new DB record for user "${name}" (ID: ${tgId})`);
        }
    }

    if (!cache.has(tgId)) {
        cache.set(tgId, name || "Unknown");
        console.log(`Logged ${mode} "${name}" (ID: ${tgId}) to memory cache`);
    }

    return true;
}

/**
 * Ensures that chat+user data is present in database.
 * After first test, it will use memory instead of requests to DB.
 * 
 * @param tgUserId 
 * @param tgChatId 
 * @returns 
 */
export async function ensureChatUser(tgUserId: number, tgChatId: number) {
    const cacheKey = `${tgUserId}_${tgChatId}`;

    if (verifiedChatUsers.has(cacheKey)) {
        return true;
    }

    const userName = verifiedUsers.get(tgUserId) || "Unknown_User";
    const chatName = verifiedChats.get(tgChatId) || "Unknown_Chat";

    const result = await db.chatUser.count({
        where: {
            userId: tgUserId,
            chatId: tgChatId
        }
    });

    const isPresent = result === 1;

    if (!isPresent) {
        await db.chatUser.create({
            data: {
                userId: tgUserId,
                chatId: tgChatId
            }
        });

        console.log(`Created DB relation: User "${userName}" (ID: ${tgUserId}) joined Chat "${chatName}" (ID: ${tgChatId})`);
    }

    verifiedChatUsers.add(cacheKey);
    console.log(`Logged relation to memory: User "${userName}" (ID: ${tgUserId}) in Chat "${chatName}" (ID: ${tgChatId})`);

    return true;
}