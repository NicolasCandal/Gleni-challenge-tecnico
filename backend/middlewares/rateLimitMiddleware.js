const rateLimit = require('express-rate-limit')

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // Normalize IPv4-mapped IPv6 addresses so both representations
  // of the same address share a counter.
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => (req.ip ?? '').replace(/^::ffff:/, ''),
  message: {
    error: 'Too many requests. Please wait a moment and try again.'
  }
})

module.exports = { chatLimiter }
