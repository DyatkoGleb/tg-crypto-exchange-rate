require('dotenv').config()
const { Telegraf } = require('telegraf')
const Bot = require('./Bot')
const Utils = require('./Utils')
const ChatRepository = require('./ChatRepository')

const bot = new Bot(
    new Telegraf(process.env.BOT_KEY),
    ['BTC', 'ETH', 'TONCOIN'],
    600_000,
    parseInt(process.env.USER_ID),
    new Utils(),
    new ChatRepository()
)

bot.start()
