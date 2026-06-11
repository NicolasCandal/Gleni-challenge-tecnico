const servicioAgente = require('../services/agentService')

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
        enviarEvento({ tipo: 'chunk', texto: payload })
      } else if (payload && payload.tipo === 'usage') {
        enviarEvento({ tipo: 'usage', tokens: payload.tokens })
      }
    }

    const resultado = await servicioAgente.chat(conversationId ?? null, mensaje, onChunk)

    enviarEvento({ tipo: 'fin', conversationId: resultado.conversationId, assistantMessageId: resultado.assistantMessageId })
    res.end()
  } catch (err) {
    enviarEvento({ tipo: 'error', mensaje: err.message || 'Error interno del servidor', status: err.status || 500 })
    res.end()
  }
}

module.exports = { chat }
