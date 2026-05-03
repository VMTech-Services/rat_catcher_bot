import db from "./db.js";
import { randomInt } from "node:crypto";

import { ratImgFiles } from "./ratImgProcessor.js";

export default async function chooseChatRat(chatId: number) {
    const chat = await db.chat.findUniqueOrThrow({
        where: {
            id: chatId
        },
        include: {
            chatUsers: {
                include: {
                    user: true
                }
            }
        }
    });

    const chatUsers = chat.chatUsers
        .flatMap(v => (v.optOut || v.user.optOut) ? [] : [v.user])
        .sort((a, b) => (a.id > b.id ? 1 : a.id < b.id ? -1 : 0));

    if (chatUsers.length === 0) {
        throw new Error("No eligible users found in this chat.");
    }

    const randomUser = chatUsers[randomInt(0, chatUsers.length)];

    const randomImgN = randomInt(0, ratImgFiles - 1)

    await db.$transaction([
        db.chatRat.create({
            data: {
                chatId: chatId,
                userId: randomUser.id,
                ratImageN: randomImgN
            }
        }),

        db.user.update({
            where: {
                id: randomUser.id
            },
            data: {
                ratCount: { increment: 1 }
            }
        }),

        db.chatUser.update({
            where: {
                userId_chatId: {
                    chatId: chatId,
                    userId: randomUser.id
                }
            },
            data: {
                ratCount: { increment: 1 }
            }
        })
    ]);

    return { randomUser, randomImgN };
}