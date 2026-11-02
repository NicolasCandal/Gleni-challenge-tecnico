const router = require('express').Router()
const { chat } = require('../controllers/chatController')
const validate = require('../middlewares/validateMiddleware')
const { ChatSchema } = require('../schemas/chatSchema')
const { chatLimiter } = require('../middlewares/rateLimitMiddleware')

router.post('/', chatLimiter, validate(ChatSchema), chat)

module.exports = router
