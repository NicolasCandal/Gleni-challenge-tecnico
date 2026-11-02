const { z } = require('zod')
const feedbackRepository = require('../repositories/messageFeedbackRepository')
const { createFeedbackResponseDTO } = require('../dtos/MessageDTO')

const MessageIdSchema = z.string().uuid()

async function submitFeedback(req, res, next) {
  try {
    const idResult = MessageIdSchema.safeParse(req.params.id)
    if (!idResult.success) {
      return res.status(400).json({ error: 'The message ID must be a valid UUID' })
    }

    const { feedback } = req.body
    const savedFeedback = await feedbackRepository.upsert({
      messageId: idResult.data,
      feedback
    })

    res.status(201).json(createFeedbackResponseDTO(savedFeedback))
  } catch (err) {
    next(err)
  }
}

module.exports = { submitFeedback }