function crearMensajeDTO({ id, role, content, created_at, feedback = null }) {
  return { id, role, content, creadoEn: created_at, feedback }
}

// Normaliza la fila cruda de la tabla feedback a la forma pública de la entidad,
// evitando exponer columnas internas (id, created_at, etc.).
function crearFeedbackDTO({ message_id, feedback }) {
  return { idMensaje: message_id, feedback }
}

function crearRespuestaMensajesDTO(mensajes) {
  return { mensajes }
}

function crearRespuestaFeedbackDTO(feedback) {
  return { feedback: crearFeedbackDTO(feedback) }
}

module.exports = { crearMensajeDTO, crearFeedbackDTO, crearRespuestaMensajesDTO, crearRespuestaFeedbackDTO }
