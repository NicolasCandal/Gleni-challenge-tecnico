const router = require('express').Router()
const { chat } = require('../controllers/chatController')
const validar = require('../middlewares/validateMiddleware')
const { EsquemaChat } = require('../schemas/chatSchema')
const { limitadorChat } = require('../middlewares/rateLimitMiddleware')

router.post('/', limitadorChat, validar(EsquemaChat), chat)

module.exports = router
