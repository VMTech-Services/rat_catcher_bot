import { Bot, InlineKeyboard } from "grammy";
import { InlineKeyboardMarkup } from "grammy/types";
import { randomInt, randomUUID } from "node:crypto";
import mention from "../lib/userMentioner.js";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const rouletteMemory: Record<string, {
    chatID: number
    firstMessageID: number
    lastMessageID: number
    buttons: InlineKeyboardMarkup | undefined
    participants: { id: number, name: string, username: string | undefined, alive: boolean }[]
    round: number
    currentRat: number
    revolver: boolean[],
    initiatorID: number,
    updateTimeout?: NodeJS.Timeout // <-- Добавили таймер для защиты от спама
}> = {}

function createGame(chatID: number, initiatorID: number) {
    const gameId = randomUUID().split("-")[0]

    rouletteMemory[gameId] = {
        chatID: chatID,
        firstMessageID: 0,
        lastMessageID: 0,
        buttons: undefined,
        participants: [],
        round: 0,
        currentRat: 0,
        revolver: [],
        initiatorID
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

const defaultGameText = [
    "- Значит крысы захотели сыграть в рулетку?\n",
    "- Так тому и быть, вот правила:\n",
    "- Нажмите кнопку \"Участвовать\" что-бы присоедениться\n- Нажмите начать что-бы.. начать.\n- Я сделаю выстрел в каждого из револьвера по очереди, когда пули кончатся, я заряжу новый барабан и продолжу так делать, пока не останется в живых кто-то 1.\n",
    "- Ну что, поиграем?"
].join("\n")

// Вспомогательная функция для генерации текста со списком участников
function getParticipantsText(game: typeof rouletteMemory[string], showStatus = false) {
    if (game.participants.length === 0) return "...";

    return game.participants.map(v => {
        const userMention = v.username
            ? `${v.name} (${mention({ username: "@" + v.username, id: v.id })})`
            : mention({ username: v.name, id: v.id });

        if (!showStatus) return userMention;
        return `${userMention} ${v.alive ? "Живой" : "<b>Умер</b>"}`;
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
                defaultGameText +
                `\n\nУчастники${currentGame.participants.length > 0 ? ` (${currentGame.participants.length})` : ""}:\n` +
                getParticipantsText(currentGame),
                {
                    parse_mode: "HTML",
                    reply_markup: currentGame.buttons
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

        const buttons = new InlineKeyboard()
            .text("Участвовать", `rlt:${game}:pt`).row()
            .text("Отмена участия", `rlt:${game}:cp`).row()
            .text(`Начать (${ctx.from.first_name})`, `rlt:${game}:st`).row()
            .text(`Отмена (${ctx.from.first_name})`, `rlt:${game}:cnc`)

        const msg = await ctx.reply(defaultGameText + `\n\nУчастники:\n...`, {
            parse_mode: "HTML",
            reply_markup: buttons
        })

        rouletteMemory[game].chatID = ctx.chat.id
        rouletteMemory[game].firstMessageID = msg.message_id
        rouletteMemory[game].lastMessageID = msg.message_id
        rouletteMemory[game].buttons = buttons
    })

    //region cg query
    bot.callbackQuery(/^rlt:(.+):(.+)$/, async (ctx) => {
        const gameID = ctx.match[1]
        const game = rouletteMemory[gameID]

        if (!game) {
            await ctx.answerCallbackQuery({
                text: "Этой игры больше нет!",
                show_alert: true
            })
            return
        }

        switch (ctx.match[2]) {
            //region participate
            case "pt": {
                if (game.participants.some(v => v.id === ctx.from.id)) {
                    await ctx.answerCallbackQuery("Вы уже участвуете!");
                    return;
                }

                game.participants.push({ id: ctx.from.id, name: ctx.from.first_name, username: ctx.from.username, alive: true });

                // Сразу отвечаем пользователю, чтобы кнопка не висела в загрузке
                await ctx.answerCallbackQuery("Вы присоединились! 🎯");

                // Запрашиваем обновление сообщения (оно произойдет с задержкой)
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

                await ctx.answerCallbackQuery("Игра начинается! 🎲");

                // Если есть запланированное обновление лобби, отменяем его, так как мы сейчас обновим всё сами
                if (game.updateTimeout) clearTimeout(game.updateTimeout);

                while (true) {
                    const aliveRats = game.participants.filter(rat => rat.alive)

                    if (aliveRats.length === 1) {
                        const winner = aliveRats[0]

                        try {
                            await bot.api.editMessageText(
                                game.chatID,
                                game.firstMessageID,
                                defaultGameText +
                                `\n\nУчастники${game.participants.length > 0 ? ` (${game.participants.length})` : ""}:\n` +
                                getParticipantsText(game, true).replace("Живой", "<b>Победитель!</b>"),
                                { parse_mode: "HTML" }
                            )

                            await ctx.reply(
                                [
                                    `Игра окончена!\nИгра длилась ${game.round} раундов`,
                                    `Победитель: ${winner.username ? `${winner.name} (@${winner.username})` : winner.name}`
                                ].join("\n"),
                                {
                                    reply_parameters: { message_id: game.lastMessageID },
                                    parse_mode: "HTML"
                                }
                            )
                        } catch (e) { console.error(e) }

                        endGame(gameID)
                        return
                    }

                    rerollRevolver(gameID)

                    while (game.revolver.length > 0) {
                        game.currentRat++
                        if (!aliveRats[game.currentRat]) {
                            game.currentRat = 0
                            continue
                        }

                        const revolerRound = game.revolver.pop()

                        if (revolerRound) {
                            aliveRats[game.currentRat].alive = false
                            game.round++
                            break
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
                            defaultGameText +
                            `\n\nУчастники${game.participants.length > 0 ? ` (${game.participants.length})` : ""}:\n` +
                            getParticipantsText(game, true),
                            { parse_mode: "HTML" }
                        )

                        const newMsg = await ctx.reply(
                            [
                                `Раунд №${game.round}`,
                                aliveRats.map(v => `${v.name} - ${v.alive ? "выжил" : "убит"}`).join("\n")
                            ].join("\n"),
                            {
                                reply_parameters: { message_id: game.lastMessageID },
                                parse_mode: "HTML"
                            }
                        )
                        game.lastMessageID = newMsg.message_id
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
                        defaultGameText +
                        "\n\n- Ладно, меня позвали куда-то ещё, <b>игра отменена</b>!",
                        { parse_mode: "HTML" }
                    )
                } catch (e) { } // Игнорируем ошибки при отмене

                endGame(gameID)
            }; break;
        }

        // На всякий случай, если в case не было ответа:
        try { await ctx.answerCallbackQuery() } catch (e) { }
    })
}