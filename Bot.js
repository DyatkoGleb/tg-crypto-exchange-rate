const axios = require('axios')
require('dotenv').config()


module.exports = class Bot {
    API_URL = 'https://min-api.cryptocompare.com/data/price'
    ACCESS_ERROR = 'У вас нет прав на выполнение этой команды.'
    API_CURRENCY_ERROR = 'Ошибка при получении цены'
    SEND_TO_CHAT_ERROR = 'Ошибка при отправке сообщения в канал с ID'

    constructor(bot, defaultTokenList, updateTime, allowedUserId, utils, chatRepository) {
        this.bot = bot
        this.defaultTokenList = defaultTokenList
        this.updateTime = updateTime
        this.channels = {}
        this.allowedUserId = allowedUserId
        this.utils = utils
        this.chatRepository = chatRepository

        this.bot.use((ctx, next) => {
            if (ctx.from.id === this.allowedUserId) {
                return next()
            } else {
                return ctx.reply(this.ACCESS_ERROR)
            }
        })
    }

    fillChannels = async () => {
        this.channels = await this.chatRepository.get()
    }

    getPrice = async (currency) => {
        try {
            const response = await axios.get(`${this.API_URL}?fsym=${currency}&tsyms=USD`)
            return response.data.USD
        } catch (error) {
            console.error(`${this.API_CURRENCY_ERROR} :`, error)
            return this.API_CURRENCY_ERROR
        }
    }

    createMessage = async (channelId) => {
        let message = '📊\n'

        // TODO: собрать тикеры для всех чатов, чтробы для каждого не просить повторяющиеся
        for (let ticker of this.channels[channelId]['tickers']) {
            let price = await this.getPrice(ticker)

            price = price.toString().replace('.', '\\.')

            if (ticker === 'TONCOIN') {
                ticker = 'TON'
            }

            message += `${ticker}: *$${price}* \n`
        }

        return message
    }

    sendMessageToChannels = async (message, channelId) => {
        try {
            const admins = await this.bot.telegram.getChatAdministrators(channelId)

            if (admins.some(admin => admin.user.id === this.bot.botInfo.id)) {
                if (!this.channels[channelId]['messageId']) {
                    const sentMessage = await this.sendMessageMd(channelId, message)
                    this.channels[channelId]['messageId'] = sentMessage.message_id
                    this.chatRepository.update(this.channels)
                } else {
                    const messageId = this.channels[channelId]['messageId']
                    await this.bot.telegram.editMessageText(channelId, messageId, null, message, { parse_mode: 'MarkdownV2' })
                }
            }
        } catch (error) {
            console.error(`${this.SEND_TO_CHAT_ERROR} ${channelId}:`, error)
        }
    }

    handleSendPrices = async () => {
        for (const channelId in this.channels) {
            let message = await this.createMessage(channelId)
            await this.sendMessageToChannels(message, channelId)
        }

        setInterval(async () => {
            await this.fillChannels()

            for (const channelId in this.channels) {
                const message = await this.createMessage(channelId)

                try {
                    await this.sendMessageToChannels(message, channelId)
                } catch ($err) {
                    console.error($err)
                }
            }
        }, this.updateTime)
    }

    handleAddCommand = (ctx) => {
        const command = ctx.message.text.split(' ')
        const message = 'Ожидается сообщение следующего формата:\n'
            + '`' + this.utils.escapeMarkdown('/add chatId ticker1 ticker2') + '`'
            + '\n'
            + 'Например:'
            + '\n'
            + this.utils.escapeMarkdown('/add -1002185580962 BTC ETH TONCOIN')

        if (command.length === 1) {
            return this.sendMessageMd(ctx.message.chat.id, message)
        }

        if (command.length === 2) {
            this.channels[command[1]]['tickers'] = this.defaultTokenList
        } else {
            if (!this.channels?.[command[1]]?.tickers && !this.channels[command[1]]) {
                this.channels[command[1]] = {}
            }

            this.channels[command[1]].tickers = []

            for (let i = 2; i < command.length; i++) {
                if (!this.channels[command[1]].tickers) {
                    this.channels[command[1]].tickers = [command[i]]
                } else {
                    this.channels[command[1]].tickers.push(command[i])
                }
            }
        }

        this.chatRepository.update(this.channels)
    }

    handleHelpCommand = (ctx) => {
        let message = this.utils.escapeMarkdown('Доступные команды:\n')
            + this.utils.escapeMarkdown('/add - Добавить канал (')
            + '`'
            + this.utils.escapeMarkdown('/add chatId ticker1 ticker2')
            + '`'
            + this.utils.escapeMarkdown(')\n')
            + this.utils.escapeMarkdown('/send_prices - Запустить отправку, перерисовку цен\n')
            + this.utils.escapeMarkdown('/help - Показать это сообщение\n')

        this.sendMessageMd(ctx.message.chat.id, message)
    }

    sendMessageMd = (chatId, text) => {
        return this.bot.telegram.sendMessage(chatId, text, { parse_mode: 'MarkdownV2' })
    }

    start = async () => {
        await this.chatRepository.createFileIfNotExists()
        await this.fillChannels()

        this.bot.command('send_prices', () => this.handleSendPrices())
        this.bot.command('add', (ctx) => this.handleAddCommand(ctx))
        this.bot.command('help', (ctx) => this.handleHelpCommand(ctx))
        this.bot.launch()

        console.log('The bot has been launched')
    }
}
