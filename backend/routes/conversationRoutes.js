const router = require('express').Router()
const { listarConversaciones } = require('../controllers/conversationController')

router.get('/', listarConversaciones)

module.exports = router
