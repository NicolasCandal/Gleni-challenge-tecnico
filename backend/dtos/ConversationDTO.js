function crearConversacionDTO(fila) {
  return {
    id: fila.id,
    titulo: fila.titulo ?? null,
    creadoEn: fila.created_at,
  }
}

function crearRespuestaConversacionesDTO(conversaciones) {
  return { conversaciones }
}

module.exports = { crearConversacionDTO, crearRespuestaConversacionesDTO }
