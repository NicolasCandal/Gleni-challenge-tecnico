const servicioAgente = require('../services/agentService')
const { eventoError, eventoFin } = require('../dtos/ChatDTO')

async function chat(req, res, next) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')

  const enviarEvento = (evento) => {
    res.write(`data: ${JSON.stringify(evento)}\n\n`)
  }

  try {
    const { conversationId, mensaje } = req.body

    const resultado = await servicioAgente.chat(conversationId ?? null, mensaje, enviarEvento)

    enviarEvento(eventoFin(resultado.conversationId, resultado.assistantMessageId))
    res.end()
  } catch (err) {
    enviarEvento(eventoError(err.message || 'Error interno del servidor', err.status || 500))
    res.end()
  }
}

module.exports = { chat }
