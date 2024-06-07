const path = require('path')
const fs = require('fs')


module.exports = class Utils
{
    escapeMarkdown = text => String(text).replace(/[_*[\]()~`>#+-=|{}.!]/g, "\\$&")

    chunkArray = (array, size) => {
        const chunks = []

        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size))
        }

        return chunks
    }

    getCurrentDate = () => {
        const now = new Date()
        const day = String(now.getDate()).padStart(2, '0')
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const year = now.getFullYear()

        return { day, month, year }
    }

    writeFile = (filePath, data) =>{
        const dir = path.dirname(filePath)

        fs.mkdir(dir, { recursive: true }, (err) => {
            if (err) {
                return console.error('Error creating directory', err)
            }

            fs.appendFile(filePath, data, 'utf8', (err) => {
                if (err) {
                    console.error('Error writing to file', err)
                }
            })
        })
    }
}