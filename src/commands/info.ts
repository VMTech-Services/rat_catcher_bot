import { Bot } from "grammy";
import pkg from "../../package.json" with {type: "json"}
import db from "../lib/db.js";
import { participantForms, pluralize, ratForms } from "../lib/pluralize.js";

export default async function infoCommand(bot: Bot) {
    bot.command("info", async (ctx) => {

        const thisChat = await db.chat.findUnique({
            where: {
                id: ctx.chat.id
            },
            include: {
                chatUsers: true,
                chatRats: true
            }
        })

        const chats = await db.chat.count()
        const chatUsers = await db.chatUser.count()
        const totalRatsCatched = await db.chatRat.count()

        ctx.reply([
            "<b>Крысолов от VMTech</b>",
            `Версия: ${pkg.version}`,
            `Ищу ${chatUsers} ${pluralize(chatUsers, ratForms)} среди ${chats} чатов`,
            `Уже поймал ${totalRatsCatched} ${pluralize(totalRatsCatched, ratForms)} среди всех чатов`,
            "",
            `Чат ${thisChat?.chatName}`,
            `Всего ${thisChat?.chatUsers.length} ${pluralize(Number(thisChat?.chatUsers.length), participantForms)}`,
            `Всего поймано ${thisChat?.chatRats.length} ${pluralize(Number(thisChat?.chatRats.length), ratForms)}`
        ].join("\n"), { parse_mode: "HTML" })
    })
}