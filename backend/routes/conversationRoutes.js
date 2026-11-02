const router = require('express').Router()
const { listConversations, updateConversationTitle, deleteConversation } = require('../controllers/conversationController')

const validateId = require('../middlewares/validateIdMiddleware')

router.param('id', validateId)

router.get('/', listConversations)
router.patch('/:id', updateConversationTitle)
router.delete('/:id', deleteConversation)

module.exports = router
