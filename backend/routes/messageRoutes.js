const router = require('express').Router()
const validar = require('../middlewares/validateMiddleware')
const { EsquemaFeedback } = require('../schemas/feedbackSchema')
const { registrarFeedback } = require('../controllers/messageController')

router.post('/:id/feedback', validar(EsquemaFeedback), registrarFeedback)

module.exports = router