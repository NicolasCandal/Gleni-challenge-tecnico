const repositorioEjecucion = require('../repositories/toolExecutionRepository')
const repositorioMensaje = require('../repositories/messageRepository')
const { crearMensajeDTO, crearRespuestaMensajesDTO } = require('../dtos/MessageDTO')
const { crearEjecucionDTO, crearRespuestaEjecucionesDTO } = require('../dtos/ToolExecutionDTO')

async function obtenerEjecuciones(req, res, next) {
  try {
    const { id } = req.params
    const filas = await repositorioEjecucion.listarPorConversacion(id)
    const ejecuciones = filas.map(crearEjecucionDTO)
    res.json(crearRespuestaEjecucionesDTO(ejecuciones))
  } catch (err) {
    next(err)
  }
}

async function obtenerMensajes(req, res, next) {
  try {
    const { id } = req.params
    const filas = await repositorioMensaje.listarPorConversacion(id)
    const mensajes = filas.map(crearMensajeDTO)
    res.json(crearRespuestaMensajesDTO(mensajes))
  } catch (err) {
    next(err)
  }
}

module.exports = { obtenerEjecuciones, obtenerMensajes }
