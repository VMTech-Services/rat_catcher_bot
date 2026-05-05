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
    revolver: boolean[]
}> = {}

function createGame(chatID: number) {
    const gameId = randomUUID().split("-")[0]

    rouletteMemory[gameId] = {
        chatID: chatID,
        firstMessageID: 0,
        lastMessageID: 0,
        buttons: undefined,
        participants: [],
        round: 0,
        currentRat: 0,
        revolver: []
    }

    return gameId
}

function endGame(gameID: string) {
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

export async function rouletteCommand(bot: Bot) {
    //region command
    bot.command("roulette", async (ctx) => {
        if (ctx.chat.is_direct_messages) {
            ctx.reply("Эту комманду можно использовать только в чатах!")
            return
        }

        const game = createGame(ctx.chat.id)

        const buttons = new InlineKeyboard()
            .text("Участвовать", `rlt:${game}:pt`).row()
            .text("Отмена участия", `rlt:${game}:cp`).row()
            .text("Начать", `rlt:${game}:st`).row()
            .text("Отмена", `rlt:${game}:cnc`)

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
        await ctx.answerCallbackQuery()
        const gameID = ctx.match[1]
        const game = rouletteMemory[gameID]

        if (!game) {
            ctx.reply("Этой игры больше нет!")
            return
        }

        switch (ctx.match[2]) {
            //region participate
            case "pt": {
                if (game.participants.some(v => v.id === ctx.from.id)) return

                game.participants.push({ id: ctx.from.id, name: ctx.from.first_name, username: ctx.from.username, alive: true })

                await bot.api.editMessageText(
                    game.chatID,
                    game.firstMessageID,
                    defaultGameText +
                    `\n\nУчастники${game.participants.length > 0 ? ` (${game.participants.length})` : ""}:\n` +
                    game.participants.map(v => v.username
                        ?
                        `${v.name} (${mention({ username: v.username ? "@" + v.username : v.name, id: v.id })})`
                        :
                        mention({ username: v.username ? "@" + v.username : v.name, id: v.id })).join("\n"),
                    {
                        parse_mode: "HTML",
                        reply_markup: game.buttons
                    }
                )
            }; break;
            //region cancel part
            case "cp": {
                if (!game.participants.some(v => v.id === ctx.from.id)) return

                game.participants = game.participants.filter(v => v.id !== ctx.from.id);

                await bot.api.editMessageText(
                    game.chatID,
                    game.firstMessageID,
                    defaultGameText +
                    `\n\nУчастники${game.participants.length > 0 ? ` (${game.participants.length})` : ""}:\n` +
                    `${game.participants.length > 0 ? game.participants.map(v => v.username
                        ?
                        `${v.name} (${mention({ username: v.username ? "@" + v.username : v.name, id: v.id })})`
                        :
                        mention({ username: v.username ? "@" + v.username : v.name, id: v.id })).join("\n") : "..."}`,
                    {
                        parse_mode: "HTML",
                        reply_markup: game.buttons
                    }
                )
            }; break;
            //region start game
            case "st": {
                while (true) {
                    const aliveRats = game.participants.filter(rat => rat.alive)

                    if (aliveRats.length === 1) {
                        const winner = aliveRats[0]

                        await bot.api.editMessageText(
                            game.chatID,
                            game.firstMessageID,
                            defaultGameText +
                            `\n\nУчастники${game.participants.length > 0 ? ` (${game.participants.length})` : ""}:\n` +
                            `${game.participants.length > 0 ? game.participants.map(v => `${v.username
                                ?
                                `${v.name} (${mention({ username: v.username ? "@" + v.username : v.name, id: v.id })})`
                                :
                                mention({ username: v.username ? "@" + v.username : v.name, id: v.id })} ${v.alive ? "Победитель!" : "Умер"}`).join("\n") : "..."}`,
                            {
                                parse_mode: "HTML"
                            }
                        )

                        await ctx.reply(
                            [
                                `Игра окончена!\nИгра длилась ${game.round}`,
                                `Победитель: ${winner.username
                                    ?
                                    `${winner.name} (${mention({ username: winner.username ? "@" + winner.username : winner.name, id: winner.id })})`
                                    :
                                    mention({ username: winner.username ? "@" + winner.username : winner.name, id: winner.id })}`
                            ].join("\n"),
                            {
                                reply_parameters: { message_id: game.lastMessageID },
                                parse_mode: "HTML"
                            })

                        endGame(gameID)
                        return
                    }

                    rerollRevolver(gameID)

                    while (game.revolver.length > 0) {
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

                    await bot.api.editMessageText(
                        game.chatID,
                        game.firstMessageID,
                        defaultGameText +
                        `\n\nУчастники${game.participants.length > 0 ? ` (${game.participants.length})` : ""}:\n` +
                        `${game.participants.length > 0 ? game.participants.map(v => `${v.username
                            ?
                            `${v.name} (${mention({ username: v.username ? "@" + v.username : v.name, id: v.id })})`
                            :
                            mention({ username: v.username ? "@" + v.username : v.name, id: v.id })} ${v.alive ? "Живой" : "Умер"}`).join("\n") : "..."}`,
                        {
                            parse_mode: "HTML"
                        }
                    )

                    const newMsg = await ctx.reply(
                        [
                            `Раунд №${game.round}`,
                            aliveRats.map(v => `${v.name} - ${v.alive ? "выжил" : "убит"}`).join("\n")
                        ].join("\n"),
                        {
                            reply_parameters: { message_id: game.lastMessageID },
                            parse_mode: "HTML"
                        })

                    game.lastMessageID = newMsg.message_id

                    await sleep(randomInt(2000, 5000))
                }

            }; break;
            //region cancel game
            case "cnc": {
                await bot.api.editMessageText(
                    game.chatID,
                    game.firstMessageID,
                    defaultGameText +
                    "\n\n- Ладно, меня позвали куда-то ещё, <b>игра отменена</b>!",
                    { parse_mode: "HTML" }
                )

                endGame(gameID)
            }; break;
        }
    })
}