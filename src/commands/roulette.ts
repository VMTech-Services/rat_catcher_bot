import { Bot, InlineKeyboard } from "grammy";
import { InlineKeyboardMarkup } from "grammy/types";
import { randomInt, randomUUID } from "node:crypto";
import mention from "../lib/userMentioner.js";

const defaultGameText = [
    "- Значит крысы захотели сыграть в рулетку?",
    "- Я пришёл на нормальную перестрелку!",
    "- Повылезали из своих дыр... несите пули!",
    "- Нет зарраза! <b>ХВАТИТ ЖРАТЬ ПУЛИ!!!</b>",
]

const finalText = [
    "- Ох ё... ну и резня...",
    "- РЕЗНЯ!!!",
    "- Гильзы гильзы... Подметаем гильзы..."
]

const gameDesc = [
    "- Игра использует 6-зарядный револьвер.",
    "- В игре есть счётчик текущего игрока и он запоминает последнего игрока между раундами.",
    "- В начале каждого раунда, барабан наполняется случайным образом, где есть 1 пуля.",
    "- Последовательно, делается 1 попытка выстрела в каждого.",
    "- Когда кого-то убивают, раунд заканчивается, если живых больше 1, начинается новый раунд, револьвер перезаряжается и Крысолов продолжает идти по списку.",
    "- Побеждает тот кто остаётся в живых последним.",
].join("\n")

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const rouletteMemory: Record<string, {
    chatID: number
    firstMessageID: number
    lastMessageID: number
    buttons: Function
    participants: { id: number, name: string, username: string | undefined, alive: string }[]
    round: number
    currentRat: number
    revolver: boolean[],
    initiatorID: number,
    updateTimeout?: NodeJS.Timeout,
    descriptionEnabled: boolean,
    baseGameText: string,
    finalGameText: string
}> = {}

const leftoverMessages: Record<string, {
    chatID: number,
    messagesID: number[]
}> = {}

function createGame(chatID: number, initiatorID: number) {
    const gameId = randomUUID().split("-")[0]

    rouletteMemory[gameId] = {
        chatID: chatID,
        firstMessageID: 0,
        lastMessageID: 0,
        buttons: () => { },
        participants: [],
        round: 0,
        currentRat: 0,
        revolver: [],
        initiatorID,
        descriptionEnabled: true,
        baseGameText: defaultGameText[randomInt(0, defaultGameText.length - 1)],
        finalGameText: finalText[randomInt(0, finalText.length - 1)]
    }

    return gameId
}

function endGame(gameID: string) {
    const game = rouletteMemory[gameID];
    if (game && game.updateTimeout) {
        clearTimeout(game.updateTimeout); // Очищаем таймер, если игра окончена
    }
    delete rouletteMemory[gameID]
}

function rerollRevolver(gameID: string) {
    rouletteMemory[gameID].revolver = [false, false, false, false, false, false]
    rouletteMemory[gameID].revolver[randomInt(0, 5)] = true
}

// Вспомогательная функция для генерации текста со списком участников
function getParticipantsText(game: typeof rouletteMemory[string], showStatus = false) {
    if (game.participants.length === 0) return "...";

    return game.participants.map(v => {
        const userMention = v.username
            ? `${v.name} (${mention({ username: "@" + v.username, id: v.id })})`
            : mention({ username: v.name, id: v.id });

        if (!showStatus) return userMention;
        return `${userMention} ${{ alive: "живой", survived: "🥳 выжил", dead: "☠️ убит", winner: "🥳 <b>победитель!</b>" }[v.alive]}`;
    }).join("\n");
}

// Функция для безопасного и отложенного обновления сообщения
function scheduleMessageUpdate(bot: Bot, gameID: string) {
    const game = rouletteMemory[gameID];
    if (!game) return;

    // Если таймер уже запущен, просто ждем. 
    // Это не даст отправлять больше 1 запроса в 1.5 секунды.
    if (game.updateTimeout) return;

    game.updateTimeout = setTimeout(async () => {
        const currentGame = rouletteMemory[gameID];
        if (!currentGame) return; // Игра могла уже закончиться

        currentGame.updateTimeout = undefined;

        try {
            await bot.api.editMessageText(
                currentGame.chatID,
                currentGame.firstMessageID,
                currentGame.baseGameText +
                `\n\nУчастники${currentGame.participants.length > 0 ? ` (${currentGame.participants.length})` : ""}:\n` +
                getParticipantsText(currentGame),
                {
                    parse_mode: "HTML",
                    reply_markup: currentGame.buttons()
                }
            );
        } catch (error: any) {
            // Игнорируем ошибку "сообщение не изменилось" (часто бывает при спаме кнопок)
            if (!error.message?.includes("message is not modified")) {
                console.error("Ошибка при обновлении лобби рулетки:", error);
            }
        }
    }, 1500); // Задержка 1.5 секунды
}

export async function rouletteCommand(bot: Bot) {
    //region command
    bot.command("roulette", async (ctx) => {
        if (ctx.chat.is_direct_messages) {
            ctx.reply("Эту комманду можно использовать только в чатах!")
            return
        }

        if (!ctx.from) return

        const game = createGame(ctx.chat.id, ctx.from.id)

        const getBaseButtons = () => {
            const buttons = new InlineKeyboard()
                .text("Участвовать", `rlt:${game}:pt`).row()
                .text("Отмена участия", `rlt:${game}:cp`).row()
                .text(`Начать (${ctx.from!.first_name})`, `rlt:${game}:st`).row()
                .text(`Отмена (${ctx.from!.first_name})`, `rlt:${game}:cnc`);

            if (rouletteMemory[game].descriptionEnabled) buttons.row()
                .text("Описание игры", `rlt:${game}:desc`)
            return buttons
        };

        rouletteMemory[game].buttons = getBaseButtons

        const msg = await ctx.reply(rouletteMemory[game].baseGameText + `\n\nУчастники:\n...`, {
            parse_mode: "HTML",
            reply_markup: rouletteMemory[game].buttons()
        })

        rouletteMemory[game].chatID = ctx.chat.id
        rouletteMemory[game].firstMessageID = msg.message_id
        rouletteMemory[game].lastMessageID = msg.message_id

        leftoverMessages[game] = { chatID: ctx.chat.id, messagesID: [] }
    })

    //region cg query
    bot.callbackQuery(/^rlt:(.+):(.+)$/, async (ctx) => {
        const gameID = ctx.match[1]
        const game = rouletteMemory[gameID]

        if (!game && ctx.match[2] !== "clean") {
            await ctx.answerCallbackQuery({
                text: "Этой игры больше нет!",
                show_alert: true
            })
            return
        }

        switch (ctx.match[2]) {
            //region desc
            case "desc": {
                const msg = await bot.api.sendMessage(game.chatID, gameDesc, { reply_parameters: { message_id: game.firstMessageID } })

                leftoverMessages[gameID].messagesID.push(msg.message_id)

                await ctx.answerCallbackQuery("Вот правила!");

                game.descriptionEnabled = false

                scheduleMessageUpdate(bot, gameID);
            }; break;
            //region participate
            case "pt": {
                if (game.participants.some(v => v.id === ctx.from.id)) {
                    await ctx.answerCallbackQuery("Вы уже участвуете!");
                    return;
                }

                game.participants.push({ id: ctx.from.id, name: ctx.from.first_name, username: ctx.from.username, alive: "alive" });

                await ctx.answerCallbackQuery("Вы присоединились! 🎯");

                scheduleMessageUpdate(bot, gameID);
            }; break;

            //region cancel part
            case "cp": {
                if (!game.participants.some(v => v.id === ctx.from.id)) {
                    await ctx.answerCallbackQuery("Вы не участвуете!");
                    return;
                }

                game.participants = game.participants.filter(v => v.id !== ctx.from.id);

                await ctx.answerCallbackQuery("Вы покинули игру 🏃‍♂️");
                scheduleMessageUpdate(bot, gameID);
            }; break;

            //region start game
            case "st": {
                if (ctx.from.id !== game.initiatorID) {
                    await ctx.answerCallbackQuery("Только создатель может начать игру!");
                    return;
                }

                if (game.participants.length === 0) {
                    await ctx.answerCallbackQuery("В игре должен быть минимум 1 игрок!");
                    return;
                }

                await ctx.answerCallbackQuery("Игра начинается!");

                // Если есть запланированное обновление лобби, отменяем его, так как мы сейчас обновим всё сами
                if (game.updateTimeout) clearTimeout(game.updateTimeout);

                if (game.participants.length === 1) {
                    leftoverMessages[gameID].messagesID.push((await bot.api.sendMessage(game.chatID, "- Ой, а что это у нас тут такое?")).message_id)

                    await sleep(5000)

                    const v = game.participants[0]

                    const userMention = v.username
                        ? `${v.name} (${mention({ username: "@" + v.username, id: v.id })})`
                        : mention({ username: v.name, id: v.id });

                    leftoverMessages[gameID].messagesID.push((await bot.api.sendMessage(game.chatID, `- Ты у нас один?\n\n- Да?\n\n- ${userMention} ...`, { parse_mode: "HTML" })).message_id)

                    await sleep(5000)

                    leftoverMessages[gameID].messagesID.push((await bot.api.sendMessage(game.chatID, "- Ну ничего... <b>Я сыграю с тобой.</b>", { parse_mode: "HTML" })).message_id)

                    await sleep(2000)

                    leftoverMessages[gameID].messagesID.push((await bot.api.sendMessage(game.chatID, `<i><b>${mention({ username: "Крысолов", id: bot.botInfo.id })} присоеденился к игре!</b></i>`, { reply_parameters: { message_id: game.firstMessageID }, parse_mode: "HTML" })).message_id)

                    game.participants.push({ id: bot.botInfo.id, name: "Крысолов", username: undefined, alive: "alive" });

                    await sleep(5000)
                }

                while (true) {
                    const aliveRats = game.participants.filter(rat => rat.alive !== "dead").map(v => { v.alive = "alive"; return v })

                    if (aliveRats.length === 1) {
                        const winner = aliveRats[0]

                        game.participants[game.participants.findIndex(v => v.id === winner.id)].alive = "winner"

                        try {
                            await bot.api.editMessageText(
                                game.chatID,
                                game.firstMessageID,
                                game.finalGameText +
                                `\n\nУчастники${game.participants.length > 0 ? ` (${game.participants.length})` : ""}:\n` +
                                getParticipantsText(game, true),
                                { parse_mode: "HTML" }
                            )

                            const newMsg = await ctx.reply(
                                [
                                    `Игра окончена!\nИгра длилась ${game.round} раундов`,
                                    `Победитель: ${winner.username ? `${winner.name} (@${winner.username})` : winner.name}`
                                ].join("\n"),
                                {
                                    reply_parameters: { message_id: game.lastMessageID },
                                    parse_mode: "HTML",
                                    reply_markup: new InlineKeyboard().text("Удалить мусор", `rlt:${gameID}:clean`)
                                }
                            )

                            leftoverMessages[gameID].messagesID.push(newMsg.message_id)
                        } catch (e) { console.error(e) }

                        endGame(gameID)
                        return
                    }

                    rerollRevolver(gameID)

                    const revolverState = game.revolver.map(v => v)

                    while (game.revolver.length > 0) {
                        if (game.currentRat >= aliveRats.length) {
                            game.currentRat = 0
                        }

                        const revolerRound = game.revolver.pop()

                        if (revolerRound) {
                            aliveRats[game.currentRat].alive = "dead"
                            game.round++
                            game.currentRat++
                            break
                        } else {
                            aliveRats[game.currentRat].alive = "survived"
                            game.currentRat++
                        }
                    }

                    for (const rat of aliveRats) {
                        const editableRat = game.participants.findIndex(v => v.id == rat.id)
                        game.participants[editableRat].alive = rat.alive
                    }

                    try {
                        await bot.api.editMessageText(
                            game.chatID,
                            game.firstMessageID,
                            game.baseGameText +
                            `\n\nУчастники${game.participants.length > 0 ? ` (${game.participants.length})` : ""}:\n` +
                            getParticipantsText(game, true),
                            { parse_mode: "HTML" }
                        )

                        const newMsg = await ctx.reply(
                            [
                                `Раунд №${game.round}\n`,
                                aliveRats.map(v => `${v.name} - ${{ alive: "живой", survived: "🥳 выжил", dead: "☠️ убит" }[v.alive]}`).join("\n"),
                                `\nРевольвер: ${revolverState.map(v => v ? "☠️" : "🥳").reverse().join(", ")}`,
                                `Пропущено выстрелов: ${game.revolver.length}`
                            ].join("\n"),
                            {
                                reply_parameters: { message_id: game.lastMessageID },
                                parse_mode: "HTML"
                            }
                        )
                        game.lastMessageID = newMsg.message_id

                        leftoverMessages[gameID].messagesID.push(newMsg.message_id)
                    } catch (e) {
                        console.error("Ошибка во время игры:", e);
                    }

                    await sleep(randomInt(2000, 5000))
                }
            }; break;

            //region cancel game
            case "cnc": {
                if (ctx.from.id !== game.initiatorID) {
                    await ctx.answerCallbackQuery("Только создатель может отменить игру!");
                    return;
                }

                await ctx.answerCallbackQuery("Игра отменена!");

                try {
                    await bot.api.editMessageText(
                        game.chatID,
                        game.firstMessageID,
                        game.baseGameText +
                        "\n\n- Ладно, меня позвали куда-то ещё, <b>игра отменена</b>!",
                        { parse_mode: "HTML" }
                    )
                } catch (e) { } // Игнорируем ошибки при отмене

                endGame(gameID)
            }; break;

            case "clean": {
                await bot.api.deleteMessages(leftoverMessages[gameID].chatID, leftoverMessages[gameID].messagesID)
                delete leftoverMessages[gameID]
            }; break;
        }

        // На всякий случай, если в case не было ответа:
        try { await ctx.answerCallbackQuery() } catch (e) { }
    })
}