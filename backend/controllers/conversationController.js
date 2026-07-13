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

async function actualizarTituloConversacion(req, res, next) {
  try {
    const { id } = req.params
    const { titulo } = req.body

    if (typeof titulo !== 'string' || titulo.trim().length === 0) {
      return res.status(400).json({ error: 'El campo titulo es requerido y no puede estar vacio' })
    }

    const tituloNormalizado = titulo.trim().slice(0, 100)
    await repositorioConversacion.actualizarTitulo(id, tituloNormalizado)
    res.json({ id, titulo: tituloNormalizado })
  } catch (err) {
    next(err)
  }
}

async function eliminarConversacion(req, res, next) {
  try {
    const { id } = req.params
    await repositorioConversacion.eliminar(id)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}

module.exports = { listarConversaciones, actualizarTituloConversacion, eliminarConversacion }
