const { Telegraf } = require('telegraf')
const axios = require('axios')
require('dotenv').config()


const bot = new Telegraf(process.env.BOT_KEY)
const defaultTokenList = ['BTC', 'ETH', 'TONCOIN']
const UPDATE_TIME = 300_000
const sentMessages = {}
const channels = {}


async function getPrice(currency) {
    try {
        const response = await axios.get(`https://min-api.cryptocompare.com/data/price?fsym=${currency}&tsyms=USD`)
        return response.data.USD
    } catch (error) {
        console.error('Ошибка при получении цены:', error)
        return 'Ошибка при получении цены'
    }
}

async function createMessage(channelId) {
    let message = '📊\n'

    for (let ticker of channels[channelId]) {
        const price = await getPrice(ticker)

        if (ticker === 'TONCOIN') {
            ticker = 'TON'
        }

        message += `${ticker}: *$${price}* \n`
    }

    return message
}

async function sendMessageToChannels(bot, message, channelId) {
    try {
        const admins = await bot.telegram.getChatAdministrators(channelId);

        if (admins.some(admin => admin.user.id === bot.botInfo.id)) {
            if (!sentMessages[channelId]) {
                const sentMessage = await bot.telegram.sendMessage(channelId, message, { parse_mode: 'Markdown' })
                sentMessages[channelId] = sentMessage.message_id
            } else {
                const messageId = sentMessages[channelId]
                await bot.telegram.editMessageText(channelId, messageId, null, message, { parse_mode: 'Markdown' })
            }
        }
    } catch (error) {
        console.error(`Ошибка при отправке сообщения в канал с ID ${channelId}:`, error)
    }
}

bot.command('send_prices', async () => {
    for (const channelId in channels) {
        let message = await createMessage(channelId)
        await sendMessageToChannels(bot, message, channelId)

        setInterval(async () => {
            const updatedMessage = await createMessage(channelId)

            if (updatedMessage !== message) {
                message = updatedMessage
                await sendMessageToChannels(bot, updatedMessage, channelId)
            }
        }, UPDATE_TIME)
    }
})

bot.command('add', async (ctx) => {
    const message = ctx.message.text.split(' ')

    if (message.length === 1) {
        return bot.telegram.sendMessage(ctx.message.chat.id, `
            Ожидается сообщение слудующего формата:\n\`/add chatId ticker1 ticker2\`\nНапример:\n\`/add -1002185580962 BTC ETH TONCOIN\`
        `, { parse_mode: 'Markdown' })
    }

    if (message.length === 2) {
        return channels[message[1]] = defaultTokenList
    }

    for (let i = 2; i < message.length; i++) {
        if (!channels[message[1]]) {
            channels[message[1]] = [message[i]]
        } else {
            channels[message[1]].push(message[i])
        }
    }
})

bot.command('help', async (ctx) => {
    bot.telegram.sendMessage(ctx.message.chat.id,  'Доступные команды:\n'
        + '/add - Добавить канал (/add chatId ticker1 ticker2)\n'
        + '/send_prices - Запустить отправку, перерисовку цен\n'
        + '/help'
    )
})

bot.launch()
