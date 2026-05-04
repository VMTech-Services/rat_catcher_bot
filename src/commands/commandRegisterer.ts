import { Bot } from "grammy";
import infoCommand from "./info.js";

export default async function commandRegisterer(bot: Bot) {
    await infoCommand(bot)
}