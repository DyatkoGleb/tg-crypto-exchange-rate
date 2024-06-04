const { Telegraf } = require('telegraf')
const axios = require('axios')
require('dotenv').config()


module.exports = class Bot {
    constructor(botKey, defaultTokenList, updateTime, allowedUserId) {
        this.bot = new Telegraf(botKey)
        this.defaultTokenList = defaultTokenList
        this.updateTime = updateTime
        this.sentMessages = {}
        this.channels = {}
        this.allowedUserId = allowedUserId

        this.bot.use((ctx, next) => {
            if (ctx.from.id === this.allowedUserId) {
                return next()
            } else {
                return ctx.reply('У вас нет прав на выполнение этой команды.')
            }
        })
    }

    async getPrice(currency) {
        try {
            const response = await axios.get(`https://min-api.cryptocompare.com/data/price?fsym=${currency}&tsyms=USD`)
            return response.data.USD
        } catch (error) {
            console.error('Ошибка при получении цены:', error)
            return 'Ошибка при получении цены'
        }
    }

    async createMessage(channelId) {
        let message = '📊\n'
        for (let ticker of this.channels[channelId]) {
            const price = await this.getPrice(ticker)

            if (ticker === 'TONCOIN') {
                ticker = 'TON'
            }

            message += `${ticker}: *$${price}* \n`
        }
        return message
    }

    async sendMessageToChannels(message, channelId) {
        try {
            const admins = await this.bot.telegram.getChatAdministrators(channelId)

            if (admins.some(admin => admin.user.id === this.bot.botInfo.id)) {
                if (!this.sentMessages[channelId]) {
                    const sentMessage = await this.bot.telegram.sendMessage(channelId, message, { parse_mode: 'Markdown' })
                    this.sentMessages[channelId] = sentMessage.message_id
                } else {
                    const messageId = this.sentMessages[channelId]
                    await this.bot.telegram.editMessageText(channelId, messageId, null, message, { parse_mode: 'Markdown' })
                }
            }
        } catch (error) {
            console.error(`Ошибка при отправке сообщения в канал с ID ${channelId}:`, error)
        }
    }

    async handleSendPrices() {
        for (const channelId in this.channels) {
            let message = await this.createMessage(channelId)
            await this.sendMessageToChannels(message, channelId)

            setInterval(async () => {
                const updatedMessage = await this.createMessage(channelId)
                if (updatedMessage !== message) {
                    message = updatedMessage
                    await this.sendMessageToChannels(updatedMessage, channelId)
                }
            }, this.updateTime)
        }
    }

    handleAddCommand(ctx) {
        const message = ctx.message.text.split(' ')

        if (message.length === 1) {
            return this.bot.telegram.sendMessage(ctx.message.chat.id, `
                Ожидается сообщение следующего формата:\n\`/add chatId ticker1 ticker2\`\nНапример:\n\`/add -1002185580962 BTC ETH TONCOIN\`
            `, { parse_mode: 'Markdown' })
        }

        if (message.length === 2) {
            this.channels[message[1]] = this.defaultTokenList
        } else {
            for (let i = 2; i < message.length; i++) {
                if (!this.channels[message[1]]) {
                    this.channels[message[1]] = [message[i]]
                } else {
                    this.channels[message[1]].push(message[i])
                }
            }
        }
    }

    handleHelpCommand(ctx) {
        this.bot.telegram.sendMessage(ctx.message.chat.id,
            'Доступные команды:\n'
            + '/add - Добавить канал (/add chatId ticker1 ticker2)\n'
            + '/send_prices - Запустить отправку, перерисовку цен\n'
            + '/help'
        )
    }

    start() {
        this.bot.command('send_prices', () => this.handleSendPrices())
        this.bot.command('add', (ctx) => this.handleAddCommand(ctx))
        this.bot.command('help', (ctx) => this.handleHelpCommand(ctx))
        this.bot.launch()
    }
}
