require('dotenv').config();
const { Telegraf } = require('telegraf');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const BOT_TOKEN = process.env.BOT_TOKEN;
const lines = require('./lines.json')

const chatList = {}

if (!BOT_TOKEN) {
    throw new Error('Токен бота не указан в переменных окружения!');
}

function isYesterdayOrEarlier(timestampMs) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return timestampMs < todayStart;
}

const bot = new Telegraf(BOT_TOKEN);

let botId;
bot.telegram.getMe().then(info => { botId = info.id; });

bot.on('new_chat_members', async (ctx) => {
    const added = ctx.message.new_chat_members;

    if (added.some(member => member.id === botId)) {
        for (const line of lines.join) {
            await ctx.sendMessage(line);
            await delay(3000)
        }
    }
});

bot.on('text', async (ctx) => {
    const chatId = ctx.chat.id;
    const username = ctx.from.username;

    if (!username || ctx.chat.type == 'private') return;

    if (!chatList[chatId]) {
        chatList[chatId] = {
            users: new Set(),
            lastRat: '',
            lastChosen: 0,
            lastCalled: 0
        }
    }

    chatList[chatId].users.add(`@${username}`);

    if (ctx.message.text == 'кто крыса?') {
        const currentChat = chatList[chatId]
        const currentTime = Date.now()
        const isTimeToChoose = isYesterdayOrEarlier(currentChat.lastChosen)
        switch (true) {
            case currentTime - currentChat.lastCalled < 3600000: {
                ctx.reply(lines.decline[Math.floor(Math.random() * lines.decline.length)])
            }; break;
            case (currentTime - currentChat.lastCalled > 3600000) && !isTimeToChoose: {
                chatList[chatId].lastCalled = Date.now()
                for (const line of lines.intro[Math.floor(Math.random() * lines.intro.length)]) {
                    await ctx.reply(line)
                    await delay(3000)
                }
                const randWasFound = Math.floor(Math.random() * lines.wasFound.length)
                const wasFoundLines = lines.wasFound[randWasFound]
                for (let i = 0; i < wasFoundLines.length - 2; i++) {
                    await ctx.reply(wasFoundLines[i])
                    await delay(3000)
                }
                await ctx.replyWithPhoto(
                    { source: './rat.jpg' },
                    { caption: wasFoundLines[wasFoundLines.length - 1] + chatList[chatId].lastRat }
                );
            }; break;
            case isTimeToChoose: {
                const rats = Array.from(currentChat.users)
                const randomRat = rats[Math.floor(Math.random() * rats.length)]
                chatList[chatId].lastRat = randomRat
                chatList[chatId].lastCalled = Date.now()
                chatList[chatId].lastChosen = Date.now()
                for (const line of lines.intro[Math.floor(Math.random() * lines.intro.length)]) {
                    await ctx.reply(line)
                    await delay(3000)
                }
                for (const line of lines.seacrhing[Math.floor(Math.random() * lines.seacrhing.length)]) {
                    await ctx.reply(line)
                    await delay(3000)
                }
                await ctx.replyWithPhoto(
                    { source: './rat.jpg' },
                    { caption: 'Крыса дня: ' + randomRat }
                );
            }; break;
        }
    }
});

bot.launch(() => {
    console.log('Bot started')
})

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));