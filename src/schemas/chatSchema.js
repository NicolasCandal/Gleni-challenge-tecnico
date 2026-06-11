const { z } = require('zod')

const EsquemaChat = z.object({
  conversationId: z.string().uuid().optional(),
  mensaje: z.string().min(1, 'El mensaje no puede estar vacío').max(2000, 'El mensaje no puede superar los 2000 caracteres')
})

module.exports = { EsquemaChat }
