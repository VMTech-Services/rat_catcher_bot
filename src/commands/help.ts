import { Bot } from "grammy";

export default async function helpCommand(bot: Bot) {
    bot.command("help", async (ctx) => {
        ctx.reply([
            "Доступные комманды:",
            "/info - получить статистику о боте",
            "/info chat - получить статистику о текущем чате",
            "/roulette - создать лобби русской руллетки"
        ].join("\n"))
    })
}