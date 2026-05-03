import db from "./db";

const verifiedUsers: number[] = []
const verifiedChats: number[] = []

/**
 * Ensures that data is present in database.
 * After first test, it will use memory instead requests to DB.
 * 
 * @param mode 
 * @param tgId 
 * @returns True after verification
 */
export async function ensure(mode: "chat" | "user", tgId: number, additionData: { tgUserName?: string, tgChatName?: string }) {
    const listEndpoing = { chat: verifiedChats, user: verifiedUsers }[mode]

    if (listEndpoing.includes(tgId)) {
        return true
    }

    let result

    if (mode === "chat") {
        result = await db.chat.count({
            where: {
                id: tgId
            }
        })
    } else {
        result = await db.user.count({
            where: {
                id: tgId
            }
        })
    }

    const userPresent = result === 1

    if (!userPresent) {
        if (mode === "chat") {
            if (!additionData.tgChatName) {
                console.error("No chat name to create new chat in DB!")
                throw 4
            }

            await db.chat.create({
                data: {
                    id: tgId,
                    chatName: additionData.tgChatName
                }
            })

            console.log(`Created new record for chat ${additionData.tgChatName}`)
        } else {
            if (!additionData.tgUserName) {
                console.error("No tg username to create new user in DB!")
                throw 3
            }

            await db.user.create({
                data: {
                    id: tgId,
                    username: additionData.tgUserName
                }
            })

            console.log(`Created new record for user ${additionData.tgUserName}`)
        }
    }

    if (!listEndpoing.includes(tgId)) {
        listEndpoing.push(tgId)

        console.log(`Logged ${{ chat: additionData.tgChatName, user: additionData.tgUserName }[mode]} into ${mode}s to memory`)
    }

    return true
}

const verifiedChatUsers: { userId: number, chatId: number }[] = []

export async function ensureChatUser(tgUserId: number, tgChatId: number) {
    // Array.some() checks values instead of object reference
    const isCached = verifiedChatUsers.some(
        (user) => user.userId === tgUserId && user.chatId === tgChatId
    );

    if (isCached) {
        return true;
    }

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

        console.log(`Created record for chat user ${tgUserId} in chat ${tgChatId}`);
    }

    verifiedChatUsers.push({
        userId: tgUserId,
        chatId: tgChatId
    });

    console.log(`Logged chat user ${tgUserId} in chat ${tgChatId} to memory`);

    return true;
}