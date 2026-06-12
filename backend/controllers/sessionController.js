const repositorioEjecucion = require('../repositories/toolExecutionRepository')
const repositorioMensaje = require('../repositories/messageRepository')
const { filaDBADto } = require('../mappers/messageMapper')

async function obtenerEjecuciones(req, res, next) {
  try {
    const { id } = req.params
    const ejecuciones = await repositorioEjecucion.listarPorConversacion(id)
    res.json({ ejecuciones })
  } catch (err) {
    next(err)
  }
}

async function obtenerMensajes(req, res, next) {
  try {
    const { id } = req.params
    const filas = await repositorioMensaje.listarPorConversacion(id)
    const mensajes = filas.map(filaDBADto)
    res.json({ mensajes })
  } catch (err) {
    next(err)
  }
}

module.exports = { obtenerEjecuciones, obtenerMensajes }
