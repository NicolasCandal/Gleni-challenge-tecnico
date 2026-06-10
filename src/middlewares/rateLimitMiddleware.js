const rateLimit = require('express-rate-limit')

const limitadorChat = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiadas consultas, esperá un momento antes de volver a intentar.'
  }
})

module.exports = { limitadorChat }
