const servicioAgente = require('../services/agentService')
const { eventoChunk, eventoUsage, eventoToolStart, eventoError, eventoFin } = require('../dtos/ChatDTO')

async function chat(req, res, next) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')

  const enviarEvento = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`)
  }

  try {
    const { conversationId, mensaje } = req.body

    const onChunk = (payload) => {
      if (typeof payload === 'string') {
        enviarEvento(eventoChunk(payload))
      } else if (payload && payload.tipo === 'usage') {
        enviarEvento(eventoUsage(payload.tokens))
      } else if (payload && payload.tipo === 'tool_start') {
        enviarEvento(eventoToolStart(payload.herramienta))
      }
    }

    const resultado = await servicioAgente.chat(conversationId ?? null, mensaje, onChunk)

    enviarEvento(eventoFin(resultado.conversationId, resultado.assistantMessageId))
    res.end()
  } catch (err) {
    enviarEvento(eventoError(err.message || 'Error interno del servidor', err.status || 500))
    res.end()
  }
}

module.exports = { chat }
