import { Bot, InlineKeyboard } from "grammy";
import { InlineKeyboardMarkup } from "grammy/types";
import { randomUUID } from "node:crypto";
import mention from "../lib/userMentioner";

const rouletteMemory: Record<string, {
    chatID: number,
    firstMessageID: number,
    lastMessageID: number,
    buttons: InlineKeyboardMarkup | undefined,
    participants: any[],
    round: number,
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
        revolver: []
    }

    return gameId
}

function endGame(gameID: string) {
    delete rouletteMemory[gameID]
}

const defaultGameText = [
    "- Значит крысы захотели сыграть в рулетку?\n",
    "- Так тому и быть, вот правила:\n",
    "- Нажмите кнопку \"Участвовать\" что-бы присоедениться\n- Нажмите начать что-бы.. начать.\n- Я сделаю выстрел в каждого из револьвера по очереди, когда пули кончатся, я заряжу новый барабан и продолжу так делать, пока не останется в живых кто-то 1.\n",
    "- Ну что, поиграем?"
].join("\n")

export async function rouletteCommand(bot: Bot) {
    bot.command("roulette", async (ctx) => {
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

    bot.callbackQuery(/^rlt:(.+):(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery()

        const game = rouletteMemory[ctx.match[1]]

        if (!game) {
            ctx.reply("Этой игры больше нет!")
            return
        }

        switch (ctx.match[2]) {
            case "pt": {
                if (game.participants.some(v => v.id === ctx.from.id)) return

                game.participants.push({ id: ctx.from.id, name: ctx.from.first_name, username: ctx.from.username })

                bot.api.editMessageText(
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
            case "cp": {
                if (!game.participants.some(v => v.id === ctx.from.id)) return

                game.participants = game.participants.filter(v => v.id !== ctx.from.id);

                bot.api.editMessageText(
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
            case "st": { }; break;
            case "cnc": {
                bot.api.editMessageText(
                    game.chatID,
                    game.firstMessageID,
                    defaultGameText +
                    "\n\n- Ладно, меня позвали куда-то ещё, <b>игра отменена</b>!",
                    { parse_mode: "HTML" }
                )

                endGame(ctx.match[1])
            }; break;
        }
    })
}