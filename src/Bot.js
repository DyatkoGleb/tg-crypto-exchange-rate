const axios = require('axios')
require('dotenv').config()


module.exports = class Bot {
    API_URL = 'https://min-api.cryptocompare.com/data/pricemulti'
    ACCESS_ERROR = 'У вас нет прав на выполнение этой команды.'
    API_CURRENCY_ERROR = 'Ошибка при получении цены'
    SEND_TO_CHAT_ERROR = 'Ошибка при отправке сообщения в канал с ID'
    MAX_TICKER_LIST_LENGTH = 300

    constructor(bot, defaultTokenList, updateTime, allowedUserId, utils, chatRepository) {
        this.defaultTokenList = defaultTokenList
        this.chatRepository = chatRepository
        this.allowedUserId = allowedUserId
        this.updateTime = updateTime
        this.utils = utils
        this.bot = bot
        this.sendingInProgress = false
        this.currentPrices = {}
        this.channels = {}

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

    getUniqueChatTickers = (channelId) => {
        const tickers = []

        if (channelId) {
            tickers.push(...this.channels[channelId].tickers)
        } else {
            for (const channelId in this.channels) {
                tickers.push(...this.channels[channelId].tickers)
            }
        }

        return [...new Set(tickers)]
    }

    fillCurrentPrices = async (channelId) => {
        const chunks = this.utils.chunkArray(this.getUniqueChatTickers(channelId), this.MAX_TICKER_LIST_LENGTH)

        try {
            for (const chunk of chunks) {
                const response = await axios.get(`${this.API_URL}?fsyms=${chunk.join(',')}&tsyms=USD`)

                for (let ticker in response.data) {
                    this.currentPrices[ticker] = response.data[ticker].USD
                }
            }
        } catch (error) {
            console.error(`${this.API_CURRENCY_ERROR} :`, error)
        }
    }

    createMessage = (channelId) => {
        let message = '📊\n'

        for (let ticker of this.channels[channelId]['tickers']) {
            const price = this.currentPrices[ticker].toString().replace('.', '\\.')

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
        await this.fillCurrentPrices()

        for (const channelId in this.channels) {
            await this.sendMessageToChannels(await this.createMessage(channelId), channelId)
        }

        if (!this.sendingInProgress) {
            this.sendingInProgress = true

            setInterval(async () => {
                if (!this.sendingInProgress) {
                    this.sendingInProgress
                }

                await this.fillChannels()
                await this.fillCurrentPrices()

                for (const channelId in this.channels) {
                    try {
                        await this.sendMessageToChannels(await this.createMessage(channelId), channelId)
                    } catch ($err) {
                        console.error($err)
                    }
                }
            }, this.updateTime)
        }
    }

    fillChannelTicketsFromCommand = (chatId, command) => {
        if (!this.channels?.[chatId]?.tickers && !this.channels[chatId]) {
            this.channels[chatId] = {}
        }

        this.channels[chatId].tickers = []

        for (let i = 2; i < command.length; i++) {
            if (!this.channels[chatId].tickers) {
                this.channels[chatId].tickers = [command[i]]
            } else {
                this.channels[chatId].tickers.push(command[i])
            }
        }
    }

    handleAddCommand = async (ctx) => {
        const command = ctx.message.text.split(' ')

        if (command.length === 1) {
            const message = 'Ожидается сообщение следующего формата:\n'
                + '`' + this.utils.escapeMarkdown('/add chatId ticker1 ticker2') + '`'
                + '\n'
                + 'Например:'
                + '\n'
                + this.utils.escapeMarkdown('/add -1002185580962 BTC ETH TONCOIN')

            return this.sendMessageMd(ctx.message.chat.id, message)
        }

        const chatId = command[1]

        if (command.length === 2) {
            this.channels[chatId]['tickers'] = this.defaultTokenList
        } else {
            this.fillChannelTicketsFromCommand(chatId, command)
        }

        this.chatRepository.update(this.channels)

        await this.fillCurrentPrices(chatId)
        await this.sendMessageToChannels(await this.createMessage(chatId), chatId)
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

    startSendPricesIfTickersExist = () => {
        let hasTickers = false

        for (const key in this.channels) {
            if (this.channels[key].hasOwnProperty('tickers')) {
                hasTickers = true
                break
            }
        }

        if (hasTickers) {
            this.handleSendPrices()
        }
    }

    start = async () => {
        await this.chatRepository.createFileIfNotExists()
        await this.fillChannels()

        this.bot.command('send_prices', () => this.handleSendPrices())
        this.bot.command('add', (ctx) => this.handleAddCommand(ctx))
        this.bot.command('help', (ctx) => this.handleHelpCommand(ctx))
        this.bot.launch()

        console.info('The bot has been launched')

        this.startSendPricesIfTickersExist()
    }
}
