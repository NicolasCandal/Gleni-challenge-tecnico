const OpenAI = require('openai')

const clienteOpenAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

module.exports = clienteOpenAI
