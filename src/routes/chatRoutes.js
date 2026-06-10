const router = require('express').Router()
const { chat } = require('../controllers/chatController')
const validar = require('../middlewares/validateMiddleware')
const { EsquemaChat } = require('../schemas/chatSchema')

router.post('/', validar(EsquemaChat), chat)

module.exports = router
