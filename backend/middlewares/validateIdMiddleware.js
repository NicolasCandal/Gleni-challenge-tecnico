const { isUuid } = require('../schemas/idSchema')

function validateId(req, res, next, id) {
  if (!isUuid(id)) {
    return res.status(400).json({ error: 'The id parameter must be a valid UUID' })
  }
  next()
}

module.exports = validateId
