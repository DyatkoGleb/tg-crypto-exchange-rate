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

}