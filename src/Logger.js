module.exports = class Logger
{
    #LOG_DIR = './src/log/'

    constructor(utils) {
        this.utils = utils
    }

    error = (message) => {
        this.#log('ERROR', message)
    }

    info = (message) => {
        this.#log('INFO', message)
    }

    #log = (level, message) => {
        const logMessage = `${new Date().toISOString()} [${level}] ${message}\n`

        this.utils.writeFile(this.#getLogFilePath(), logMessage)
    }

    #getLogFilePath() {
        const { day, month, year } = this.utils.getCurrentDate()

        return `${this.#LOG_DIR}log_${day}-${month}-${year}.log`
    }
}