require('dotenv').config()
const Bot = require('./Bot')
const Utils = require('./Utils')


const bot = new Bot(
    process.env.BOT_KEY,
    ['BTC', 'ETH', 'TONCOIN'],
    600_000,
    parseInt(process.env.USER_ID),
    new Utils(),
)

bot.start()
