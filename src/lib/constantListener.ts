import { InputFile, InputMediaBuilder, type Bot } from "grammy";
import { ensure, ensureChatUser } from "./verifiers.js";
import chooseChatRat from "./ratSelector.js";
import mention from "./userMentioner.js";
import cron from "node-cron"
import db from "./db.js";
import { getImgPath } from "./ratImgProcessor.js";
import lines from "../lines.json" with { type: "json" };
import { randomInt } from "node:crypto";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Listens to all sent messages and adds users to bot's database, or just logs them for bot's simple life.
 * 
 * @param bot 
 */
export async function constantMessageListener(bot: Bot) {
    bot.use(async (ctx, next) => {
        if (!ctx.chat || !ctx.from) {
            console.error("No chat or user for interaction!")
            throw 5
        }

        if (ctx.from.username === bot.botInfo.username) return

        const verifiers = [
            await ensure("user", ctx.from.id, { tgUserName: ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name })
        ]

        if (ctx.chat.type !== "private") {
            verifiers.push(await ensure("chat", ctx.chat.id, { tgChatName: ctx.chat.title }))
            verifiers.push(await ensureChatUser(ctx.from.id, ctx.chat.id))
        }

        await Promise.all(verifiers)

        await next()
    })

    console.log("User and chat verifiers registered")
}

/**
 * Fires one time a day and lets to choose rats.
 * 
 * @param bot 
 */
export async function registerRatSelector(bot: Bot) {
    cron.schedule("0 12 * * *", async () => {
        console.log("Starting scheduled rat-selection!")

        const chats = await db.chat.findMany()

        console.log(`Asyncly processing ${chats.length} chats!`)

        const chatsAsync = []

        let chatsSuccess = 0

        for (const chat of chats) {
            async function ratSelectWrapper() {
                const chatId = Number(chat.id);
                const selectedUser = await chooseChatRat(chatId);

                const randomSeq = {
                    preIntro: 0,//randomInt(0, lines.preIntro.length - 1),
                    intro: 0,//randomInt(0, lines.intro.length - 1),
                    search: 0,//randomInt(0, lines.search.length - 1),
                    found: 0 //randomInt(0, lines.found.length - 1)
                };

                let currentText = "";

                let msgData: any

                let isFirstEdit = true;

                async function updateMsg(newChunk: string) {
                    if (isFirstEdit) {
                        currentText = newChunk;
                        isFirstEdit = false;
                        try {
                            msgData = await bot.api.sendMessage(chatId, currentText, { parse_mode: "HTML" });
                        } catch { return }
                    } else {
                        currentText += `\n\n${newChunk}`;
                        await bot.api.editMessageText(chatId, msgData.message_id, currentText, { parse_mode: "HTML" });
                    }
                }

                const stageSequence: Array<keyof typeof lines> = ["preIntro", "intro", "search", "found"];

                for (const stage of stageSequence) {
                    for (const line of lines[stage][randomSeq[stage]]) {
                        await sleep(randomInt(2500, 5000));
                        await updateMsg(line);
                    }
                    currentText += "\n"
                }

                await sleep(randomInt(1000, 2000));

                await bot.api.editMessageMedia(chatId, msgData.message_id, InputMediaBuilder.photo(new InputFile(getImgPath(selectedUser.randomImgN))))

                await bot.api.editMessageCaption(chatId, msgData.message_id, {
                    caption: `${currentText}\n${mention({ username: selectedUser.randomUser.username, id: Number(selectedUser.randomUser.id) })}`,
                    parse_mode: "HTML",
                    show_caption_above_media: true
                })

                chatsSuccess += 1
            }

            chatsAsync.push(ratSelectWrapper())
        }

        await Promise.all(chatsAsync)

        console.log(`${chatsSuccess}/${chats.length} chats processed succesfully!`)
    })

    console.log("Registered rat selector")
}