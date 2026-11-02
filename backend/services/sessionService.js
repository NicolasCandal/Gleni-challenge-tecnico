const conversationRepository = require('../repositories/conversationRepository')
const messageRepository = require('../repositories/messageRepository')

async function createConversation() {
  return conversationRepository.create()
}

async function addMessage({ conversationId, role, content }) {
  return messageRepository.create({ conversationId, role, content })
}

async function getHistory(conversationId) {
  const messages = await messageRepository.listByConversation(conversationId)
  return messages.map(m => ({ role: m.role, content: m.content }))
}

module.exports = { createConversation, addMessage, getHistory }
