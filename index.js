require('dotenv').config()
const Bot = require('./Bot')


const bot = new Bot(process.env.BOT_KEY, ['BTC', 'ETH', 'TONCOIN'], 300_000)

bot.start()
