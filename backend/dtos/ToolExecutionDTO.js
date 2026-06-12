// Expone solo los campos que el cliente necesita, en camelCase. Se omite
// conversation_id porque ya viaja en la URL del endpoint y es estructura interna.
function crearEjecucionDTO({ id, tool_name, input, output, latency_ms, tokens_used, error, created_at }) {
  return {
    id,
    herramienta: tool_name,
    input,
    output,
    latenciaMs: latency_ms,
    tokensUsados: tokens_used,
    error,
    creadoEn: created_at
  }
}

function crearRespuestaEjecucionesDTO(ejecuciones) {
  return { ejecuciones }
}

module.exports = { crearEjecucionDTO, crearRespuestaEjecucionesDTO }
