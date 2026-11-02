const conversationRepository = require('../repositories/conversationRepository')
const { createConversationDTO, createConversationsResponseDTO } = require('../dtos/ConversationDTO')

const { isUuid } = require('../schemas/idSchema')

async function listConversations(req, res, next) {
  try {
    const rawIds = req.query.ids
    if (!rawIds) return res.json(createConversationsResponseDTO([]))

    const ids = rawIds.split(',').map(id => id.trim()).filter(isUuid)
    if (ids.length === 0) return res.json(createConversationsResponseDTO([]))

    const rows = await conversationRepository.list(ids)
    const conversations = rows.map(createConversationDTO)
    res.json(createConversationsResponseDTO(conversations))
  } catch (err) {
    next(err)
  }
}

async function updateConversationTitle(req, res, next) {
  try {
    const { id } = req.params
    const { title } = req.body

    if (typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'The title field is required and cannot be empty' })
    }

    const normalizedTitle = title.trim().slice(0, 100)
    await conversationRepository.updateTitle(id, normalizedTitle)
    res.json({ id, title: normalizedTitle })
  } catch (err) {
    next(err)
  }
}

async function deleteConversation(req, res, next) {
  try {
    const { id } = req.params
    await conversationRepository.remove(id)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}

module.exports = { listConversations, updateConversationTitle, deleteConversation }
