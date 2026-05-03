import type { Bot } from "grammy";
import { ensure, ensureChatUser } from "./verifiers";

export async function constantMessageListener(bot: Bot) {
    bot.use(async (ctx, next) => {
        if (!ctx.chat || !ctx.from) {
            console.error("No chat or user for interaction!")
            throw 5
        }

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
