const router = require('express').Router()
const { obtenerEjecuciones } = require('../controllers/sessionController')

router.get('/:id/executions', obtenerEjecuciones)

module.exports = router
