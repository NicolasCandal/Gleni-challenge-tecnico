const router = require('express').Router()
const { obtenerEjecuciones, obtenerMensajes } = require('../controllers/sessionController')

router.get('/:id/executions', obtenerEjecuciones)
router.get('/:id/messages', obtenerMensajes)

module.exports = router
