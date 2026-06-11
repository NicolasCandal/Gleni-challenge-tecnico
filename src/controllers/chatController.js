const servicioAgente = require('../services/agentService')

async function chat(req, res, next) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const enviarEvento = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`)
  }

  try {
    const { conversationId, mensaje } = req.body

    const onChunk = (texto) => enviarEvento({ tipo: 'chunk', texto })

    const resultado = await servicioAgente.chat(conversationId ?? null, mensaje, onChunk)

    enviarEvento({ tipo: 'fin', conversationId: resultado.conversationId, assistantMessageId: resultado.assistantMessageId })
    res.end()
  } catch (err) {
    enviarEvento({ tipo: 'error', mensaje: err.message || 'Error interno del servidor' })
    res.end()
  }
}

module.exports = { chat }
