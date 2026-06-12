function eventoChunk(texto) {
  return { tipo: 'chunk', texto }
}

function eventoUsage(tokens) {
  return { tipo: 'usage', tokens }
}

function eventoToolStart(herramienta) {
  return { tipo: 'tool_start', herramienta }
}

function eventoError(mensaje, status = 500) {
  return { tipo: 'error', mensaje, status }
}

function eventoFin(conversationId, assistantMessageId) {
  return { tipo: 'fin', conversationId, assistantMessageId }
}

module.exports = { eventoChunk, eventoUsage, eventoToolStart, eventoError, eventoFin }
