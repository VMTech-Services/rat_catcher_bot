import { Bot } from "grammy";
import "dotenv/config";
import { constantMessageListener, registerRatSelector } from "./lib/constantListener";


if (!process.env.BOT_TOKEN) {
    console.error("No bot token in ENV!")
    throw 1
}

const bot = new Bot(process.env.BOT_TOKEN)

console.log("Bot created successfully!")

await constantMessageListener(bot)

bot.command("start", async (ctx) => {
    if (ctx.chat.type === "private") {
        ctx.reply([
            "Привет!\n\n",
            "Меня зовут <b>Крысолов</b>, я ловлю крыс в чатах.\n\n",
            "Что-бы начать, меня надо пригласить в какой-то чат, и я буду там работать.\n\n",
            "Я считываю каждое отправленное сообщение что-бы собрать список крыс в каждом чате, но не бойся, я не читаю что внутри сообщений, мне и крысьих файлов достаточно...\n\n",
            "Если нужно посмотреть список команд - напиши /help\n\n",
            "После добавление в чат, напиши /start, что-бы все увидели кто я такой."
        ].join(""), { parse_mode: "HTML" })
    } else {
        ctx.reply([
            "Привет!\n\n",
            "Меня зовут <b>Крысолов</b>, я ловлю крыс в чатах. И даже в этом!\n\n",
            "Я считываю каждое ваше отправленное сообщение, что-бы собрать список крыс в этом чате, но не бойтесь, я не читаю что внутри сообщений, мне и крысьих файлов достаточно...\n\n",
            "Если нужно посмотреть список команд - напиши /help"
        ].join(""), { parse_mode: "HTML" })
    }
})

await registerRatSelector(bot)

bot.start({
    onStart: (botInfo) => {
        console.log(`Bot @${botInfo.username} statred successfully!`)
    }
})