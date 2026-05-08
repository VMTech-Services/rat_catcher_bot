import { Bot } from "grammy";
import infoCommand from "./info.js";
import { rouletteCommand } from "./roulette.js";
import helpCommand from "./help.js";

export default async function commandRegisterer(bot: Bot) {
    await infoCommand(bot)
    await rouletteCommand(bot)
    await helpCommand(bot)
}