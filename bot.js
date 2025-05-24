require('dotenv').config();
const { Telegraf } = require('telegraf');
const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();
const BOT_TOKEN = process.env.BOT_TOKEN;
const lines = require('./lines.json');
const fs = require('fs')
const ratImages = fs.readdirSync('./ratimages')

if (!BOT_TOKEN) throw new Error('Токен бота не указан в переменных окружения!');
const delay = ms => new Promise(res => setTimeout(res, ms));

// ---------------- helpers ----------------

// Убеждаемся, что чат есть
async function ensureChat(chatId) {
    return prisma.chat.upsert({
        where: { id: chatId },
        update: {},
        create: { id: chatId },
    });
}

// Убеждаемся, что крыса есть
async function ensureRat(username) {
    return prisma.rat.upsert({
        where: { username },
        update: {},
        create: { username },
    });
}

// Логируем выбор «крысы дня»
async function logChosenRat(chatId, ratName) {
    await prisma.chosenRat.create({
        data: { chatId, ratName }
    });
}

// Форматтер "раз"
function formatRaz(count) {
    const lastTwoDigits = count % 100;
    const lastDigit = count % 10;

    let suffix;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
        suffix = 'раз';
    } else if (lastDigit === 1) {
        suffix = 'раз';
    } else if (lastDigit >= 2 && lastDigit <= 4) {
        suffix = 'раза';
    } else {
        suffix = 'раз';
    }

    return `${count} ${suffix}`;
}

// ---------------- Bot setup ----------------

const bot = new Telegraf(BOT_TOKEN);
let botId;
bot.telegram.getMe().then(info => { botId = info.id; });

// Приветствие при добавлении бота в чат
bot.on('new_chat_members', async ctx => {
    const added = ctx.message.new_chat_members;
    if (added.some(m => m.id === botId)) {
        for (const line of lines.join) {
            await ctx.sendMessage(line);
            await delay(3000);
        }
    }
});

// ---------------- Команда /rat ----------------

bot.command('rat', async ctx => {
    const username = ctx.from.username;
    const chatId = ctx.chat.id;
    if (!username || ctx.chat.type === 'private') {
        return ctx.reply('❗ Эта команда работает только в групповом чате.');
    }

    await ensureChat(chatId);
    await ensureRat(username);

    const exists = await prisma.chatRat.findFirst({
        where: { chatId, ratName: username }
    });
    if (exists) {
        return ctx.reply(`${username}, вы уже крыса в этом чате.`);
    }

    await prisma.chatRat.create({ data: { chatId, ratName: username } });
    ctx.reply(`${username}, поздравляю — вы теперь крыса этого чата!`);
});

// ---------------- Команда /unrat ----------------

bot.command('unrat', async ctx => {
    const username = ctx.from.username;
    const chatId = ctx.chat.id;
    if (!username || ctx.chat.type === 'private') {
        return ctx.reply('❗ Эта команда работает только в групповом чате.');
    }

    const deleted = await prisma.chatRat.deleteMany({
        where: { chatId, ratName: username }
    });
    if (deleted.count) {
        ctx.reply(`${username}, вы больше не крыса этого чата.`);
    } else {
        ctx.reply(`${username}, вы и так не числились крысой.`);
    }
});

// ---------------- Команда /rattoday ----------------

bot.command('rattoday', async ctx => {
    const chatId = ctx.chat.id;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Получаем состояние чата
    let chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) chat = await ensureChat(chatId);

    const isNewDay = chat.lastChosen < todayStart;
    const sinceLastCall = now - chat.lastCalled;

    // Случай: слишком рано (менее часа)
    if (sinceLastCall < 3600000) {
        const declineLine = lines.decline[Math.floor(Math.random() * lines.decline.length)];
        return ctx.reply(declineLine);
    }

    // Случай: уже звали сегодня, но прошло больше часа => повтор предыдущего
    if (!isNewDay) {
        // обновляем только lastCalled
        await prisma.chat.update({
            where: { id: chatId },
            data: { lastCalled: now }
        });

        // выводим по сценарию
        const intro = lines.intro[Math.floor(Math.random() * lines.intro.length)];
        for (const line of intro) { await ctx.reply(line); await delay(3000); }

        const idx = Math.floor(Math.random() * lines.wasFound.length);
        const wasFound = lines.wasFound[idx];
        for (let i = 0; i < wasFound.length - 2; i++) {
            await ctx.reply(wasFound[i]);
            await delay(3000);
        }
        await ctx.replyWithPhoto(
            { source: './ratimages/' + ratImages[chat.lastRatImg] },
            { caption: wasFound[wasFound.length - 1] + `@${chat.lastRat}` }
        );
        return;
    }

    // Случай: выбор новой «крысы дня»
    const rels = await prisma.chatRat.findMany({ where: { chatId }, include: { rat: true } });
    if (rels.length === 0) {
        return ctx.reply('В этом чате ещё нет ни одной крысы.');
    }

    // выбираем raw username
    const usernames = rels.map(r => r.rat.username);
    const rawRat = usernames[Math.floor(Math.random() * usernames.length)];

    //выбираем картинку крысы
    const randomRatImgId = Math.floor(Math.random() * ratImages.length)

    // обновляем состояние и логируем
    await prisma.chat.update({
        where: { id: chatId },
        data: {
            lastCalled: now,
            lastChosen: now,
            lastRat: rawRat,
            lastRatImg: randomRatImgId
        }
    });
    await logChosenRat(chatId, rawRat);

    // выводим по сценарию
    const intro2 = lines.intro[Math.floor(Math.random() * lines.intro.length)];
    const searchSeq = lines.seacrhing[Math.floor(Math.random() * lines.seacrhing.length)];

    for (const line of intro2) { await ctx.reply(line); await delay(3000); }
    for (const line of searchSeq) { await ctx.reply(line); await delay(3000); }
    await ctx.replyWithPhoto(
        { source: './ratimages/' + ratImages[randomRatImgId] },
        { caption: `Крыса дня: @${rawRat}` }
    );
});

// ---------------- Новая команда /rats ----------------

bot.command('rats', async ctx => {
    const chatId = ctx.chat.id;
    // Список всех «крыс» чата
    const rats = await prisma.chatRat.findMany({
        where: { chatId },
        include: { rat: true }
    });
    if (rats.length === 0) {
        await ctx.reply('В этом чате нет крыс.');
        await delay(1000)
        await ctx.reply('Не уж то я перестарался?');
        return
    }
    // Группируем по имени и считаем лог
    const counts = await prisma.chosenRat.groupBy({
        by: ['ratName'],
        where: { chatId },
        _count: { ratName: true }
    });

    await ctx.reply('Крысы чата значит...')
    await delay(1000)
    await ctx.reply('Вот же они!')
    await delay(1000)

    // Собираем ответ
    const linesOut = []
    linesOut.push(`Участвующие крысы:`);

    for (const r of rats) {
        const name = r.rat.username;
        const cntObj = counts.find(c => c.ratName === name);
        const cnt = cntObj?._count.ratName || 0;
        linesOut.push(`${name} - ${formatRaz(cnt)}`)
    }

    const recent = await prisma.chosenRat.findMany({
        where: { chatId },
        orderBy: { id: 'desc' },    // самые новые по id
        take: 5,
        include: { rat: true }      // чтобы достать username
    });

    if (recent.length > 0) {
        const lastNames = recent.map(r => r.rat.username)

        linesOut.push(`\nПоследние крысы:`);

        for (const rat in lastNames) {
            linesOut.push(`${parseInt(rat) + 1}. ${lastNames[rat]}`);
        }
    }

    await ctx.reply(linesOut.join('\n'));
});

// ---------------- Запуск ----------------

bot.launch().then(() => console.log('Bot started'));
process.once('SIGINT', () => { prisma.$disconnect(); bot.stop('SIGINT'); });
process.once('SIGTERM', () => { prisma.$disconnect(); bot.stop('SIGTERM'); });
