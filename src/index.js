require('dotenv').config()
const { Telegraf } = require('telegraf')
const Bot = require('./Bot')
const Utils = require('./Utils')
const Logger = require('./Logger')
const ChatRepository = require('./ChatRepository')


const utils = new Utils()
const logger = new Logger(utils)

const bot = new Bot(
    new Telegraf(process.env.BOT_KEY),
    ['BTC', 'ETH', 'TONCOIN'],
    600_000,
    parseInt(process.env.USER_ID),
    utils,
    new ChatRepository(logger),
    logger,
)

bot.start()
