const fs = require('fs').promises


module.exports = class ChatRepository {
    STORAGE_FILE_NAME = './src/storage.json'

    constructor(logger) {
        this.logger = logger
    }

    createFileIfNotExists = async () => {
        let fileHandle

        try {
            fileHandle = await fs.open(this.STORAGE_FILE_NAME, 'wx')
            await fs.writeFile(this.STORAGE_FILE_NAME, JSON.stringify({}), 'utf8')
        } catch (err) {
            if (err.code !== 'EEXIST') {
                this.logger.error('Error creating file:', err)
            }
        } finally {
            if (fileHandle) {
                await fileHandle.close()
            }
        }
    }

    get = async () => {
        try {
            const data = await fs.readFile(this.STORAGE_FILE_NAME, 'utf8')
            return JSON.parse(data)
        } catch (err) {
            this.logger.error('Error reading file:', err)
            throw err
        }
    }

    update = async (data) => {
        try {
            await fs.writeFile(this.STORAGE_FILE_NAME, JSON.stringify(data, null, 2), 'utf8')
        } catch (err) {
            this.logger.error('Error writing to file:', err)
        }
    }
}