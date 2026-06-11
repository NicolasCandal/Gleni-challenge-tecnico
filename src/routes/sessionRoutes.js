const router = require('express').Router()
const { obtenerEjecuciones, obtenerMensajes } = require('../controllers/sessionController')

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

router.param('id', (req, res, next, id) => {
  if (!UUID_RE.test(id)) {
    return res.status(400).json({ error: 'El parámetro id debe ser un UUID válido' })
  }
  next()
})

router.get('/:id/executions', obtenerEjecuciones)
router.get('/:id/messages', obtenerMensajes)

module.exports = router
