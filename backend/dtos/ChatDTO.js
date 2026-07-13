function eventoChunk(texto) {
  return { tipo: 'chunk', texto }
}

function eventoUsage(tokens) {
  return { tipo: 'usage', tokens }
}

function eventoToolStart(herramienta) {
  return { tipo: 'tool_start', herramienta }
}

function eventoError(mensaje, status) {
  return { tipo: 'error', mensaje, status: status || 500 }
}

function eventoFin(conversationId, assistantMessageId, titulo) {
  return { tipo: 'fin', conversationId, assistantMessageId, titulo: titulo || null }
}

module.exports = { eventoChunk, eventoUsage, eventoToolStart, eventoError, eventoFin }
