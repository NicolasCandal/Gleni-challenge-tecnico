const repositorioEjecucion = require('../repositories/toolExecutionRepository')

async function obtenerEjecuciones(req, res, next) {
  try {
    const { id } = req.params
    const ejecuciones = await repositorioEjecucion.listarPorConversacion(id)
    res.json({ ejecuciones })
  } catch (err) {
    next(err)
  }
}

module.exports = { obtenerEjecuciones }
