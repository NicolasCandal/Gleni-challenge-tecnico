const { z } = require('zod')

const EsquemaChat = z.object({
  conversationId: z.string().uuid().optional(),
  mensaje: z.string().min(1, 'El mensaje no puede estar vacío')
})

module.exports = { EsquemaChat }
