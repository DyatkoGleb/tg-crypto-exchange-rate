const { Telegraf } = require('telegraf')
const axios = require('axios')
require('dotenv').config()


const bot = new Telegraf(process.env.BOT_KEY)
const needTokenList = ['BTC', 'ETH', 'TONCOIN']
const UPDATE_TIME = 300_000


async function getPrice(currency) {
    try {
        const response = await axios.get(`https://min-api.cryptocompare.com/data/price?fsym=${currency}&tsyms=USD`)

        return response.data.USD
    } catch (error) {
        console.error('Error fetching price:', error)
        return 'Error fetching price'
    }
}

async function createMessage() {
    let message = '📊\n'

    for (let ticker of needTokenList) {
        const price = await getPrice(ticker)

        if (ticker === 'TONCOIN') {
            ticker = 'TON'
        }

        message += ticker + ': *$' + price + '* ' + '\n'
    }

    return message
}

bot.command('prices', async (ctx) => {
    let message = await createMessage()
    let sentMessage = await ctx.replyWithMarkdown(message)

    setInterval(async () => {
        const updatedMessage = await createMessage()

        if (!updatedMessage) {
            return
        }

        if (updatedMessage !== message) {
            message = updatedMessage
            ctx.telegram.editMessageText(
                sentMessage.chat.id,
                sentMessage.message_id,
                null,
                updatedMessage,
                { parse_mode: 'Markdown' }
            ).then((result) => {
                sentMessage = result
            }).catch((error) => {
                console.error('Error editing message:', error);
            })
        }
    }, UPDATE_TIME)
})

bot.launch()
