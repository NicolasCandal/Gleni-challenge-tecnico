const { z } = require('zod')

const ChatSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message cannot exceed 2,000 characters')
})

module.exports = { ChatSchema }
