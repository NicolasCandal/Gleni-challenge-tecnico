const repositorioConversacion = require('../repositories/conversationRepository')
const { crearConversacionDTO, crearRespuestaConversacionesDTO } = require('../dtos/ConversationDTO')

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function listarConversaciones(req, res, next) {
  try {
    const rawIds = req.query.ids
    if (!rawIds) return res.json(crearRespuestaConversacionesDTO([]))

    const ids = rawIds.split(',').map(id => id.trim()).filter(id => UUID_RE.test(id))
    if (ids.length === 0) return res.json(crearRespuestaConversacionesDTO([]))

    const filas = await repositorioConversacion.listar(ids)
    const conversaciones = filas.map(crearConversacionDTO)
    res.json(crearRespuestaConversacionesDTO(conversaciones))
  } catch (err) {
    next(err)
  }
}

module.exports = { listarConversaciones }
