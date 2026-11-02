const { z } = require('zod')

const FeedbackSchema = z.object({
  feedback: z.enum(['up', 'down'])
})

module.exports = { FeedbackSchema }