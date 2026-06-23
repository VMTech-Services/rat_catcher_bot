import { Bot, InlineKeyboard } from "grammy";
import pkg from "../../package.json" with {type: "json"};
import globalConfig from "../globalConfig.json" with {type: "json"};
import db from "../lib/db.js";
import { participantForms, pluralize, ratForms } from "../lib/pluralize.js";
import mention from "../lib/userMentioner.js";
import { formatDate } from "../lib/dateFormatter.js";

function getChatMenu(userId: number, userName: string, initMessageId: number) {
    const text = "Выберите категорию\n" +
        `<i>(только ${mention({ username: userName, id: userId })})</i>`;

    const keyboard = new InlineKeyboard()
        .text("Последние крысы", `inf:lastrats:${userId}:${initMessageId}`).row()
        .text("Все крысы", `inf:allrats:${userId}:${initMessageId}`).row()
        .text("Закончить", `inf:rm:${userId}:${initMessageId}`);

    return { text, keyboard };
}

export default async function infoCommand(bot: Bot) {
    //region command
    bot.command("info", async (ctx) => {
        if (!ctx.from) return;

        switch (ctx.match.trim()) {
            case "chat": {
                const userName = ctx.from.username || ctx.from.first_name;
                const initMessageId = ctx.message?.message_id || 0;

                const { text, keyboard } = getChatMenu(ctx.from.id, userName, initMessageId);

                await ctx.reply(text, {
                    reply_markup: keyboard,
                    parse_mode: "HTML"
                });
            }; break;

            default: {
                if (!ctx.chat) return;

                const thisChat = await db.chat.findUnique({
                    where: { id: ctx.chat.id },
                    include: {
                        chatUsers: true,
                        chatRats: true
                    }
                });

                const chats = await db.chat.count();
                const chatUsers = await db.chatUser.count();
                const totalRatsCatched = await db.chatRat.count();

                await ctx.reply([
                    "<b>Крысолов от VMTech</b>",
                    `Версия: ${pkg.version} (${globalConfig.versionDesc})`,
                    `Ищу ${chatUsers} ${pluralize(chatUsers, ratForms)} среди ${chats} чатов`,
                    `Уже поймал ${totalRatsCatched} ${pluralize(totalRatsCatched, ratForms)} среди всех чатов`,
                    "",
                    `Чат ${thisChat?.chatName || "Неизвестен"}`,
                    `Всего ${thisChat?.chatUsers.length || 0} ${pluralize(Number(thisChat?.chatUsers.length || 0), participantForms)}`,
                    `Всего поймано ${thisChat?.chatRats.length || 0} ${pluralize(Number(thisChat?.chatRats.length || 0), ratForms)}`
                ].join("\n"), { parse_mode: "HTML" });
            }; break;
        }
    });

    //region callback query
    bot.callbackQuery(/^inf:([^:]+):(\d+):(\d+)$/, async (ctx) => {
        const action = ctx.match[1];
        const targetUserId = Number(ctx.match[2]);
        const initMessageId = Number(ctx.match[3]);

        if (ctx.from.id !== targetUserId) {
            await ctx.answerCallbackQuery({
                text: "Это меню вызвал другой человек! 🛑",
                show_alert: true
            });
            return;
        }

        switch (action) {
            case "lastrats": {
                if (!ctx.chat) return;

                const lastRats = await db.chatRat.findMany({
                    where: { chatId: ctx.chat.id },
                    orderBy: { date: "desc" },
                    take: 10,
                    include: { user: true }
                });

                const ratsList = lastRats.length > 0
                    ? lastRats.map((v, i) => `${i + 1}. ${mention({ username: v.user.username, id: Number(v.user.id) })} (${formatDate(v.date, { showTime: false })})`).join("\n")
                    : "Пока никого нет.";

                await ctx.editMessageText(
                    `Последние крысы:\n${ratsList}`,
                    {
                        reply_markup: new InlineKeyboard().text("Домой", `inf:home:${targetUserId}:${initMessageId}`),
                        parse_mode: "HTML"
                    }
                );

                await ctx.answerCallbackQuery();
            }; break;

            case "allrats": {
                if (!ctx.chat) return;

                const allRats = await db.chatUser.findMany({
                    where: { chatId: ctx.chat.id },
                    orderBy: { userId: "desc" },
                    include: { user: true }
                });

                let ratsList = allRats.map(v => `${mention({ username: v.user.username, id: Number(v.user.id) })} (${v.ratCount} раз)`).join("\n");

                if (ratsList.length > 3900) {
                    ratsList = ratsList.slice(0, 3900) + "\n\n...<i>и другие (список слишком длинный)</i>";
                }

                if (ratsList.length === 0) ratsList = "Пока никого нет.";

                await ctx.editMessageText(
                    `Все крысы:\n${ratsList}`,
                    {
                        reply_markup: new InlineKeyboard().text("Домой", `inf:home:${targetUserId}:${initMessageId}`),
                        parse_mode: "HTML"
                    }
                );

                await ctx.answerCallbackQuery();
            }; break;

            case "rm": {
                try {
                    await ctx.deleteMessage();

                    if (initMessageId !== 0 && ctx.chat) {
                        await ctx.api.deleteMessage(ctx.chat.id, initMessageId);
                    }
                } catch (e) {
                    console.log("Не удалось удалить исходное сообщение. Возможно, нет прав.");
                }

                await ctx.answerCallbackQuery();
            }; break;

            case "home": {
                const userName = ctx.from.username || ctx.from.first_name;
                const { text, keyboard } = getChatMenu(targetUserId, userName, initMessageId);

                await ctx.editMessageText(text, {
                    reply_markup: keyboard,
                    parse_mode: "HTML"
                });

                await ctx.answerCallbackQuery();
            }; break;
        }
    });
}