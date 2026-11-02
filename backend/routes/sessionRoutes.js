const router = require('express').Router()
const { getExecutions, getMessages } = require('../controllers/sessionController')

const validateId = require('../middlewares/validateIdMiddleware')

router.param('id', validateId)

router.get('/:id/executions', getExecutions)
router.get('/:id/messages', getMessages)

module.exports = router
