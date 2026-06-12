function crearReporteDTO({ idConversacion, totalConsultas, usoHerramientas, latenciaPromedioMs, tiposConsultados, errores, totalEjecuciones }) {
  return { idConversacion, totalConsultas, usoHerramientas, latenciaPromedioMs, tiposConsultados, errores, totalEjecuciones }
}

module.exports = { crearReporteDTO }
