module.exports = class Utils
{
    escapeMarkdown = text => String(text).replace(/[_*[\]()~`>#+-=|{}.!]/g, "\\$&")
}