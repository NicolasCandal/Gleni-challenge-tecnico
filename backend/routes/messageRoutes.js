const router = require('express').Router()
const validate = require('../middlewares/validateMiddleware')
const { FeedbackSchema } = require('../schemas/feedbackSchema')
const { submitFeedback } = require('../controllers/messageController')

router.post('/:id/feedback', validate(FeedbackSchema), submitFeedback)

module.exports = router