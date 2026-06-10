const servicioAgente = require('../services/agentService')

async function chat(req, res, next) {
  try {
    const { conversationId, mensaje } = req.body
    const resultado = await servicioAgente.chat(conversationId ?? null, mensaje)
    res.json(resultado)
  } catch (err) {
    next(err)
  }
}

module.exports = { chat }
