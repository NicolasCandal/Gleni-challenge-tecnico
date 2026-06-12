const rateLimit = require('express-rate-limit')

const limitadorChat = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // Normaliza ::ffff:x.x.x.x (IPv4 mapeado en IPv6) al IPv4 plano para que
  // ambas representaciones de la misma IP compartan el mismo contador.
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => (req.ip ?? '').replace(/^::ffff:/, ''),
  message: {
    error: 'Demasiadas consultas, esperá un momento antes de volver a intentar.'
  }
})

module.exports = { limitadorChat }
