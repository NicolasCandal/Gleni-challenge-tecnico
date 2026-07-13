const router = require('express').Router()
const { listarConversaciones, actualizarTituloConversacion, eliminarConversacion } = require('../controllers/conversationController')

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

router.param('id', (req, res, next, id) => {
  if (!UUID_RE.test(id)) return res.status(400).json({ error: 'El parametro id debe ser un UUID valido' })
  next()
})

router.get('/', listarConversaciones)
router.patch('/:id', actualizarTituloConversacion)
router.delete('/:id', eliminarConversacion)

module.exports = router
