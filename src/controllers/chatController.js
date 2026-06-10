const servicioAgente = require('../services/agentService')
const servicioSesion = require('../services/sessionService')

async function chat(req, res, next) {
  try {
    let { conversationId, mensaje } = req.body

    if (!conversationId) {
      const conversacion = await servicioSesion.crearConversacion()
      conversationId = conversacion.id
    }

    const respuesta = await servicioAgente.chat(conversationId, mensaje)
    res.json({ conversationId, respuesta })
  } catch (err) {
    next(err)
  }
}

module.exports = { chat }
