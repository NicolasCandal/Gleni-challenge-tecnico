const repositorioMensaje = require('../repositories/messageRepository')
const repositorioEjecucion = require('../repositories/toolExecutionRepository')
const { crearReporteDTO } = require('../dtos/ReportDTO')


const definicion = {
  name: 'generate_session_report',
  description: 'Genera un reporte de la sesión actual: total de consultas, herramientas usadas, latencia promedio, tipos de dólar consultados y errores. No llama a la API externa.',
  parameters: {
    type: 'object',
    properties: {
      conversation_id: {
        type: 'string',
        description: 'ID de la conversación a reportar.'
      }
    },
    required: ['conversation_id']
  }
}

async function manejador({ conversation_id: idConversacion }) {
  const [mensajes, ejecuciones] = await Promise.all([
    repositorioMensaje.listarPorConversacion(idConversacion),
    repositorioEjecucion.listarPorConversacion(idConversacion)
  ])

  const totalConsultas = mensajes.filter(m => m.role === 'user').length

  const usoHerramientas = ejecuciones.reduce((acumulador, e) => {
    acumulador[e.tool_name] = (acumulador[e.tool_name] || 0) + 1
    return acumulador
  }, {})

  const ejecucionesConLatencia = ejecuciones.filter(e => e.latency_ms != null)
  const latenciaPromedio = ejecucionesConLatencia.length
    ? Math.round(ejecucionesConLatencia.reduce((suma, e) => suma + e.latency_ms, 0) / ejecucionesConLatencia.length)
    : null

  const tiposConsultados = [...new Set(
    ejecuciones
      .filter(e => e.input?.rate_types?.length)
      .flatMap(e => e.input.rate_types)
  )]

  const errores = ejecuciones
    .filter(e => e.error)
    .map(e => ({ herramienta: e.tool_name, error: e.error }))

  return crearReporteDTO({
    idConversacion,
    totalConsultas,
    usoHerramientas,
    latenciaPromedioMs: latenciaPromedio,
    tiposConsultados,
    errores,
    totalEjecuciones: ejecuciones.length
  })
}

module.exports = { definicion, manejador }
