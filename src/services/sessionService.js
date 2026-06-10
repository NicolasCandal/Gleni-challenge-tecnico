const repositorioConversacion = require('../repositories/conversationRepository')
const repositorioMensaje = require('../repositories/messageRepository')

async function crearConversacion() {
  return repositorioConversacion.crear()
}

async function agregarMensaje({ idConversacion, rol, contenido }) {
  return repositorioMensaje.crear({ idConversacion, rol, contenido })
}

async function obtenerHistorial(idConversacion) {
  const mensajes = await repositorioMensaje.listarPorConversacion(idConversacion)
  return mensajes.map(m => ({ role: m.role, content: m.content }))
}

module.exports = { crearConversacion, agregarMensaje, obtenerHistorial }
