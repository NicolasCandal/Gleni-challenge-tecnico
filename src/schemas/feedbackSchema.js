const { z } = require('zod')

const EsquemaFeedback = z.object({
  feedback: z.enum(['up', 'down'])
})

module.exports = { EsquemaFeedback }